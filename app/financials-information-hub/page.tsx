import type { Metadata } from "next";
import { HUB_TITLE } from "@/lib/financials-hub/types";
import { isFinancialsHubDevelopmentEnabled } from "@/lib/financials-hub/config";
import FinancialsArchivePrototype from "./FinancialsArchivePrototype";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: HUB_TITLE,
  description:
    "Millstadt EMS financial information and document-access request hub.",
  manifest: "/financial-information.webmanifest",
  robots: { index: false, follow: false, noarchive: true },
};

export default function FinancialsInformationHubPage() {
  if (isFinancialsHubDevelopmentEnabled()) {
    return <FinancialsArchivePrototype />;
  }

  return <ProductionComingSoon />;
}

function ProductionComingSoon() {
  return (
    <main className="financials-page mems-information-hub-print-guard">
      <section className="financials-compact-hero">
        <div className="wrap financials-compact-hero__inner">
          <div>
            <p className="financials-kicker">Millstadt Ambulance Service</p>
            <h1>Financial Records Request</h1>
            <p className="financials-hero-copy">
              This online request service is currently under construction.
            </p>
          </div>
          <span className="financials-status">Coming Soon</span>
        </div>
      </section>

      <section className="financials-public-panel">
        <div className="wrap">
          <div className="financials-notice">
            <div>
              <h2>Coming Soon</h2>
              <p>This online request service is currently under construction.</p>
            </div>
            <div className="financials-ledger" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
