/**
 * Kids Club layout — scoped CSS fallback ONLY for this route.
 *
 * Why this file exists: in the project's Tailwind v4 setup, padding and margin
 * utilities (.p-*, .py-*, .pt-*, .mt-*, etc.) compile to
 *   padding-block: calc(var(--spacing) * N)
 * but resolve to 0 at runtime — every page across the site is affected, but
 * older pages mask it with explicit `<div className="h-N">` spacers. The Kids
 * Club page leans on padding/margin utilities for its layout, so without this
 * file the eyebrows clip to the edge and sections stack with no breathing room.
 *
 * The CSS below is scoped to `[data-kc]` and redefines only the spacing classes
 * actually used inside /kids-club. It does NOT modify globals.css, the nav,
 * the weather ticker, or any other route's CSS.
 */
const KC_SCOPED_CSS = `
[data-kc] .p-2{padding:.5rem}[data-kc] .p-3{padding:.75rem}[data-kc] .p-4{padding:1rem}[data-kc] .p-5{padding:1.25rem}[data-kc] .p-6{padding:1.5rem}[data-kc] .p-7{padding:1.75rem}[data-kc] .p-8{padding:2rem}[data-kc] .p-9{padding:2.25rem}[data-kc] .p-10{padding:2.5rem}[data-kc] .p-12{padding:3rem}
[data-kc] .px-1{padding-left:.25rem;padding-right:.25rem}[data-kc] .px-2{padding-left:.5rem;padding-right:.5rem}[data-kc] .px-3{padding-left:.75rem;padding-right:.75rem}[data-kc] .px-4{padding-left:1rem;padding-right:1rem}[data-kc] .px-5{padding-left:1.25rem;padding-right:1.25rem}[data-kc] .px-7{padding-left:1.75rem;padding-right:1.75rem}
[data-kc] .py-2{padding-top:.5rem;padding-bottom:.5rem}[data-kc] .py-4{padding-top:1rem;padding-bottom:1rem}[data-kc] .py-5{padding-top:1.25rem;padding-bottom:1.25rem}[data-kc] .py-16{padding-top:4rem;padding-bottom:4rem}[data-kc] .py-20{padding-top:5rem;padding-bottom:5rem}[data-kc] .py-24{padding-top:6rem;padding-bottom:6rem}[data-kc] .py-28{padding-top:7rem;padding-bottom:7rem}[data-kc] .py-32{padding-top:8rem;padding-bottom:8rem}
[data-kc] .pt-1{padding-top:.25rem}[data-kc] .pt-2{padding-top:.5rem}[data-kc] .pt-3{padding-top:.75rem}[data-kc] .pt-5{padding-top:1.25rem}[data-kc] .pt-6{padding-top:1.5rem}[data-kc] .pt-10{padding-top:2.5rem}[data-kc] .pt-14{padding-top:3.5rem}
[data-kc] .pb-1{padding-bottom:.25rem}[data-kc] .pb-7{padding-bottom:1.75rem}
[data-kc] .mt-1{margin-top:.25rem}[data-kc] .mt-3{margin-top:.75rem}[data-kc] .mt-4{margin-top:1rem}[data-kc] .mt-5{margin-top:1.25rem}[data-kc] .mt-6{margin-top:1.5rem}[data-kc] .mt-8{margin-top:2rem}[data-kc] .mt-9{margin-top:2.25rem}[data-kc] .mt-10{margin-top:2.5rem}[data-kc] .mt-16{margin-top:4rem}[data-kc] .mt-20{margin-top:5rem}[data-kc] .mt-auto{margin-top:auto}
[data-kc] .mb-8{margin-bottom:2rem}[data-kc] .mb-9{margin-bottom:2.25rem}
[data-kc] .mr-0{margin-right:0}[data-kc] .mx-auto{margin-left:auto;margin-right:auto}
@media (min-width:640px){
[data-kc] .sm\\:p-6{padding:1.5rem}[data-kc] .sm\\:p-8{padding:2rem}
[data-kc] .sm\\:pt-2{padding-top:.5rem}
[data-kc] .sm\\:px-5{padding-left:1.25rem;padding-right:1.25rem}
[data-kc] .sm\\:mt-5{margin-top:1.25rem}
[data-kc] .sm\\:mb-9{margin-bottom:2.25rem}
}
@media (min-width:768px){
[data-kc] .md\\:p-5{padding:1.25rem}[data-kc] .md\\:p-7{padding:1.75rem}[data-kc] .md\\:p-8{padding:2rem}[data-kc] .md\\:p-9{padding:2.25rem}[data-kc] .md\\:p-10{padding:2.5rem}[data-kc] .md\\:p-12{padding:3rem}
[data-kc] .md\\:py-24{padding-top:6rem;padding-bottom:6rem}[data-kc] .md\\:py-28{padding-top:7rem;padding-bottom:7rem}[data-kc] .md\\:py-32{padding-top:8rem;padding-bottom:8rem}
}
@media (min-width:1024px){
[data-kc] .lg\\:p-12{padding:3rem}
[data-kc] .lg\\:mr-0{margin-right:0}
}
@keyframes kc-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(34,211,238,0.55)); }
  50%      { filter: drop-shadow(0 0 14px rgba(34,211,238,0.95)) drop-shadow(0 0 22px rgba(34,211,238,0.5)); }
}
`;

export default function KidsClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-kc>
      <style dangerouslySetInnerHTML={{ __html: KC_SCOPED_CSS }} />
      {children}
    </div>
  );
}
