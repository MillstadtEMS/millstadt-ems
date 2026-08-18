import type { OpenedBoardDocument } from "./document-storage";

export const PRIVATE_DOCUMENT_CACHE_CONTROL = "no-store, private";

export interface ByteRange {
  start: number;
  end: number;
}

export function parseSingleByteRange(
  header: string | null,
  size: number,
): ByteRange | null | "invalid" {
  if (!header) return null;
  if (!Number.isSafeInteger(size) || size < 0) return "invalid";
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size === 0) return "invalid";

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= size ||
    requestedEnd < start
  ) {
    return "invalid";
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

function sliceByteStream(
  source: ReadableStream<Uint8Array>,
  range: ByteRange,
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const targetLength = range.end - range.start + 1;
  let sourceOffset = 0;
  let emitted = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (emitted < targetLength) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const chunkStart = sourceOffset;
        sourceOffset += value.byteLength;
        if (sourceOffset <= range.start) continue;

        const from = Math.max(0, range.start - chunkStart);
        const available = value.subarray(from);
        const remaining = targetLength - emitted;
        const selected = available.subarray(0, remaining);
        if (selected.byteLength > 0) {
          emitted += selected.byteLength;
          controller.enqueue(selected);
        }

        if (emitted >= targetLength) {
          controller.close();
          await reader.cancel("Requested byte range completed");
        }
        return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._ -]/g, "_").trim().slice(0, 160) || "document";
}

function privateDocumentHeaders(
  contentType: string,
  filename: string,
  disposition: "attachment" | "inline",
): Headers {
  return new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": PRIVATE_DOCUMENT_CACHE_CONTROL,
    "Content-Disposition": `${disposition}; filename="${safeFilename(filename)}"`,
    "Content-Type": contentType,
    "Vary": "Cookie",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  });
}

export function createPrivateDocumentResponse(
  document: OpenedBoardDocument,
  rangeHeader: string | null,
  options: {
    filename: string;
    disposition?: "attachment" | "inline";
  },
): Response {
  const range = parseSingleByteRange(rangeHeader, document.size);
  const headers = privateDocumentHeaders(
    document.contentType,
    options.filename,
    options.disposition ?? "attachment",
  );

  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${document.size}`);
    headers.set("Content-Length", "0");
    void document.stream.cancel("Unsatisfiable byte range");
    return new Response(null, { status: 416, headers });
  }

  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${document.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new Response(sliceByteStream(document.stream, range), { status: 206, headers });
  }

  headers.set("Content-Length", String(document.size));
  return new Response(document.stream, { status: 200, headers });
}
