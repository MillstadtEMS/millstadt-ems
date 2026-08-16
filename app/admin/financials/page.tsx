import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin/auth";
import { isFinancialsHubDevelopmentEnabled } from "@/lib/financials-hub/config";
import FinancialsAdminReview from "./FinancialsAdminReview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Financial Information Review",
  description: "Admin review for development financial information requests.",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function FinancialsAdminPage() {
  if (!isFinancialsHubDevelopmentEnabled()) notFound();
  if (!(await isAdminAuthed())) redirect("/lounge/login");
  return <FinancialsAdminReview />;
}
