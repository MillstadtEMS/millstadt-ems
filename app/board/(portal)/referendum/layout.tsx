import ReferendumNav from "@/components/board/ReferendumNav";

export const dynamic = "force-dynamic";

export default function ReferendumLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReferendumNav />
      <div className="board-notice" role="note">
        Projected financial model for the proposed EMS District. These figures do not represent current staffing or current Sage accounting results.
      </div>
      {children}
    </>
  );
}
