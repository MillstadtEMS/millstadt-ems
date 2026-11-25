// Tiny SVG kit for the chimney gag's puppets: element factories and short number formatting, so the
// per-frame attribute writes stay cheap.

const NS = "http://www.w3.org/2000/svg";

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

/** A raster part drawn at w x h room px (its file may be 2x or 3x that). */
export function img(href: string, w: number, h: number, parent?: Element): SVGImageElement {
  const node = el("image", { href, width: w, height: h, preserveAspectRatio: "none" }, parent);
  node.setAttribute("decoding", "async");
  return node;
}

export const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** translate(x y) rotate(a) translate(-ax -ay): a part pinned by its anchor (ax, ay) at (x, y), turned a degrees. */
export const pin = (x: number, y: number, a: number, ax: number, ay: number) =>
  `translate(${f(x)} ${f(y)}) rotate(${f(a)}) translate(${f(-ax)} ${f(-ay)})`;

export function show(node: Element, on: boolean) {
  const v = on ? "" : "none";
  if ((node as SVGElement).style.display !== v) (node as SVGElement).style.display = v;
}

export function attr(node: Element, name: string, value: string) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}
