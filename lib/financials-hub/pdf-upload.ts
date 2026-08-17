import {
  DOCUMENT_UPLOAD_MAX_BYTES,
  DOCUMENT_UPLOAD_MAX_PAGES,
  DocumentLibraryError,
} from "./document-library";

const PDF_HEADER = Buffer.from("%PDF-");
const PDF_EOF = Buffer.from("%%EOF");

export async function inspectUploadedPdf(pdf: Buffer) {
  if (!pdf.length || pdf.length > DOCUMENT_UPLOAD_MAX_BYTES) {
    throw new DocumentLibraryError("The PDF must be 20 MB or smaller.");
  }
  if (!pdf.subarray(0, PDF_HEADER.length).equals(PDF_HEADER)) {
    throw new DocumentLibraryError("The selected file is not a valid PDF.");
  }
  const trailingBytes = pdf.subarray(Math.max(0, pdf.length - 4096));
  if (!trailingBytes.includes(PDF_EOF)) {
    throw new DocumentLibraryError("The PDF appears incomplete or corrupted.");
  }

  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = getDocument({
      data: new Uint8Array(pdf),
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const document = await loadingTask.promise;

    if (document.numPages < 1 || document.numPages > DOCUMENT_UPLOAD_MAX_PAGES) {
      await document.destroy();
      throw new DocumentLibraryError("The PDF must contain between 1 and 200 pages.");
    }

    const actions = await document.getJSActions();
    if (actions && Object.keys(actions).length > 0) {
      await document.destroy();
      throw new DocumentLibraryError("PDFs containing embedded scripts are not accepted.");
    }
    const attachments = await document.getAttachments();
    if (attachments && Object.keys(attachments).length > 0) {
      await document.destroy();
      throw new DocumentLibraryError("PDFs containing embedded attachments are not accepted.");
    }

    const pages: string[] = [];
    let extractedCharacters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const text = await page.getTextContent();
      const pageText = text.items
        .map((item) => ("str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : ""))
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const accessibleText =
        pageText || `Page ${pageNumber} contains no extractable text.`;
      extractedCharacters += accessibleText.length;
      if (extractedCharacters > 5_000_000) {
        await document.destroy();
        throw new DocumentLibraryError("The PDF contains too much extracted text.");
      }
      pages.push(accessibleText);
    }

    await document.destroy();
    return { pageCount: pages.length, pages };
  } catch (error) {
    if (error instanceof DocumentLibraryError) throw error;
    console.error(
      "[financials hub] PDF inspection failed",
      error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError",
    );
    throw new DocumentLibraryError(
      "The PDF could not be opened. Password-protected or damaged PDFs are not accepted.",
    );
  }
}
