export const MAX_SIGNATURE_IMAGE_BYTES = 512 * 1024;
export const MAX_SIGNATURE_REQUEST_BYTES = 1024 * 1024;

const MAX_SIGNATURE_WIDTH = 4096;
const MAX_SIGNATURE_HEIGHT = 2048;
const MAX_SIGNATURE_PIXELS = 4_194_304;
const PNG_PREFIX = "data:image/png;base64,";
const JPEG_PREFIX = "data:image/jpeg;base64,";
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

export type ValidatedSignatureImage = {
  dataUrl: string;
  mimeType: "image/png" | "image/jpeg";
  byteLength: number;
  width: number;
  height: number;
};

export type SignatureImageValidation =
  | { ok: true; image: ValidatedSignatureImage }
  | { ok: false; error: string };

function validDimensions(width: number, height: number) {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_SIGNATURE_WIDTH &&
    height <= MAX_SIGNATURE_HEIGHT &&
    width * height <= MAX_SIGNATURE_PIXELS
  );
}

function pngDimensions(bytes: Buffer) {
  if (
    bytes.length < 45 ||
    !bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC) ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.subarray(12, 16).toString("ascii") !== "IHDR" ||
    bytes[26] !== 0 ||
    bytes[27] !== 0 ||
    (bytes[28] !== 0 && bytes[28] !== 1) ||
    !bytes.subarray(bytes.length - PNG_IEND.length).equals(PNG_IEND)
  ) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegDimensions(bytes: Buffer) {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    return null;
  }

  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return null;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      if (segmentLength < 8) return null;
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += segmentLength;
  }
  return null;
}

function decodedByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

export function validateSignatureImageDataUrl(input: unknown): SignatureImageValidation {
  if (typeof input !== "string") {
    return { ok: false, error: "Signature must be a PNG or JPEG image." };
  }

  const prefix = input.startsWith(PNG_PREFIX) ? PNG_PREFIX : input.startsWith(JPEG_PREFIX) ? JPEG_PREFIX : null;
  if (!prefix) return { ok: false, error: "Signature must be a PNG or JPEG image." };

  const encoded = input.slice(prefix.length);
  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) ||
    decodedByteLength(encoded) > MAX_SIGNATURE_IMAGE_BYTES
  ) {
    return { ok: false, error: "Signature image is malformed or too large." };
  }

  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 32 || bytes.length > MAX_SIGNATURE_IMAGE_BYTES || bytes.toString("base64") !== encoded) {
    return { ok: false, error: "Signature image is malformed or too large." };
  }

  const mimeType = prefix === PNG_PREFIX ? "image/png" : "image/jpeg";
  const dimensions = mimeType === "image/png" ? pngDimensions(bytes) : jpegDimensions(bytes);
  if (!dimensions || !validDimensions(dimensions.width, dimensions.height)) {
    return { ok: false, error: "Signature image is invalid or has unsupported dimensions." };
  }

  return {
    ok: true,
    image: {
      dataUrl: `${prefix}${bytes.toString("base64")}`,
      mimeType,
      byteLength: bytes.length,
      ...dimensions,
    },
  };
}
