import type { Metadata } from "next";
import { HUB_TITLE } from "@/lib/financials-hub/types";
import { publicFinancialDocumentLibrary } from "@/lib/financials-hub/public-library";
import PublicDocumentLibrary from "./PublicDocumentLibrary";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const description =
  "View, download, enlarge, and print Millstadt EMS financial records and public disclosure documents.";
const shareTitle = "Millstadt EMS Financial Transparency";
const shareImage = {
  url: "https://www.millstadtems.org/images/financial-transparency/millstadt-ems-financial-transparency.png",
  width: 1536,
  height: 1024,
  alt: shareTitle,
};

export const metadata: Metadata = {
  title: HUB_TITLE,
  description,
  alternates: {
    canonical: "https://www.millstadtems.org/financials-information-hub",
  },
  openGraph: {
    type: "website",
    url: "https://www.millstadtems.org/financials-information-hub",
    title: shareTitle,
    description,
    siteName: "Millstadt Ambulance Service",
    images: [{ ...shareImage, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description,
    images: [shareImage],
  },
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
