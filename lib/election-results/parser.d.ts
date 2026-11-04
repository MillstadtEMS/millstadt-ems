// The pinned Next.js package includes this server-side parser without type declarations.
declare module "next/dist/compiled/node-html-parser" {
  interface HTMLElement {
    readonly text: string;
    readonly previousElementSibling: HTMLElement | null;
    getAttribute(name: string): string | undefined;
    closest(selector: string): HTMLElement | null;
    querySelector(selector: string): HTMLElement | null;
    querySelectorAll(selector: string): HTMLElement[];
  }
  function parse(html: string): HTMLElement;
}

declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
