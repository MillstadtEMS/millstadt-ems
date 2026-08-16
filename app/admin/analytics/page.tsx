import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAnalyticsSupervisor } from "@/lib/analytics/auth";
import AnalyticsDashboard from "./AnalyticsDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website Analytics",
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AnalyticsPage() {
  if (!(await currentAnalyticsSupervisor())) redirect("/lounge");
  return <AnalyticsDashboard />;
}
