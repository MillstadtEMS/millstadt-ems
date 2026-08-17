import type { Metadata } from "next";
import { HUB_TITLE } from "@/lib/financials-hub/types";
import { isFinancialsHubDevelopmentEnabled } from "@/lib/financials-hub/config";
import FinancialsArchivePrototype from "./FinancialsArchivePrototype";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: HUB_TITLE,
  description:
    "Millstadt EMS financial and other public information request hub.",
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
            <h1>Financial and Other Public Requests</h1>
          </div>
          <span className="financials-status">Coming Soon</span>
        </div>
      </section>

      <section className="financials-workspace" aria-labelledby="coming-soon-heading">
        <div className="wrap financials-workspace__stack">
          <section className="financials-panel">
            <div className="financials-section-head">
              <div>
                <p className="financials-kicker">Service status</p>
                <h2 id="coming-soon-heading">Coming Soon</h2>
              </div>
            </div>
            <div className="financials-status-message">
              <p>
                The Millstadt EMS Financial and Other Public Requests hub is being prepared.
                The archive and document-access system are not currently available for
                public use.
              </p>
              <p>
                This page does not accept document requests, information requests,
                applications, uploads, comments, or submissions. No documents are
                available for viewing through this page at this time.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
