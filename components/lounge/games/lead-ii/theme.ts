/** Same constants as src/lib/design/vintageMedical.ts in the native app. */
export const LEAD_II_COLORS = {
  black: "#030503",
  panel: "#080b08",
  shell: "#11120e",
  shellEdge: "#2f3328",
  deepGreen: "#0b2a16",
  phosphor: "#2ff587",
  phosphorDim: "#8adf9d",
  amber: "#f2b84b",
  amberDim: "#9f7630",
  danger: "#ff5e4f",
  creamPaper: "#fff6f1",
} as const;

/** Font stack identical to VT323 in feel, with web fallbacks. */
export const LEAD_II_FONT = `"VT323", "Courier New", ui-monospace, monospace`;
