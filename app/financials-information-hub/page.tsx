import type { Metadata } from "next";
import { HUB_TITLE } from "@/lib/financials-hub/types";
import { publicFinancialDocumentLibrary } from "@/lib/financials-hub/public-library";
import PublicDocumentLibrary from "./PublicDocumentLibrary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: HUB_TITLE,
  description:
    "View, download, enlarge, and print Millstadt EMS financial records and public disclosure documents.",
  manifest: "/financial-information.webmanifest",
  robots: { index: true, follow: true },
};

export default function FinancialsInformationHubPage() {
  return (
    <PublicDocumentLibrary
      documents={publicFinancialDocumentLibrary()}
    />
  );
}
