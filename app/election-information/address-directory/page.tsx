import type { Metadata } from "next";
import Link from "next/link";
import { requireElectionAccess } from "@/lib/election-review";
import { PublicPageHero } from "@/components/site/PublicChrome";
import AddressDirectory from "@/components/AddressDirectory";
import LockElectionReview from "@/components/LockElectionReview";
import type { ElectionDirectory } from "@/lib/election-directory-types";
import directory from "@/data/election-directory/directory.json";
export const metadata: Metadata = { title: "Find your EMS tax", robots: { index: false, follow: false } };
export default async function AddressDirectoryPage({ searchParams }: { searchParams: Promise<{ address?: string }> }) {
  const query = await searchParams;
  await requireElectionAccess(`/election-information/address-directory${query.address ? `?address=${encodeURIComponent(query.address)}` : ""}`);
  return <main><PublicPageHero title="Find your" accent="EMS tax" description="Choose your street or subdivision. Then choose your address." />
    <LockElectionReview />
    <div className="wrap" style={{ paddingTop: 24 }}><Link href="/election-information?review=1" style={{ color: "#f0b429" }}>← Election Information</Link></div>
    <AddressDirectory directory={directory as ElectionDirectory} initialPin={query.address} />
  </main>;
}
