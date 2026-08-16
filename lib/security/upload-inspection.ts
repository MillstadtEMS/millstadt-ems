const PDF = "application/pdf";
const JPEG = "image/jpeg";
const PNG = "image/png";
const WEBP = "image/webp";
const HEIC = new Set(["image/heic", "image/heif"]);
const ZIP_OFFICE = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const OLE_OFFICE = new Set(["application/msword", "application/vnd.ms-excel"]);

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function contentMatches(mime: string, bytes: Uint8Array) {
  if (mime === PDF) return ascii(bytes, 0, 5) === "%PDF-";
  if (mime === JPEG) return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (mime === PNG) return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === WEBP) return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (HEIC.has(mime)) {
    const brand = ascii(bytes, 4, 12).toLowerCase();
    return brand.includes("ftyp") && /(heic|heix|hevc|hevx|heif|mif1|msf1)/.test(brand);
  }
  if (ZIP_OFFICE.has(mime)) return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
  if (OLE_OFFICE.has(mime)) return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  return false;
}

export async function inspectUploadedFile(file: File, allowedTypes: readonly string[]) {
  const mime = file.type.toLowerCase().split(";", 1)[0].trim();
  if (!allowedTypes.includes(mime)) {
    return { ok: false as const, error: "Unsupported file type." };
  }
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (!contentMatches(mime, bytes)) {
    return { ok: false as const, error: "The file content does not match its declared type." };
  }
  return { ok: true as const, mime };
}

export const PRIVATE_DOCUMENT_TYPES = [
  PDF,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  JPEG,
  PNG,
  WEBP,
  "image/heic",
  "image/heif",
] as const;

export const CREDENTIAL_DOCUMENT_TYPES = [PDF, JPEG, PNG, WEBP, "image/heic", "image/heif"] as const;
