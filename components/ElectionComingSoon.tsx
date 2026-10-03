import { PublicPageHero } from "@/components/site/PublicChrome";
export default function ElectionComingSoon() {
  return <main>
    <PublicPageHero title="Election" accent="Information" description="Coming soon." />
    <div className="wrap" style={{ minHeight: "48vh", display: "flex", alignItems: "end", paddingBottom: 24 }}>
      <a href="/api/election-review/lock?next=review" style={{ fontSize: 12, color: "#aebfd5", textUnderlineOffset: 3 }}>Review</a>
    </div>
  </main>;
}
