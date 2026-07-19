import { redirect } from "next/navigation";
import FireMeetingRequestForm from "@/components/board/FireMeetingRequestForm";
import { currentBoardUser } from "@/lib/board/auth";
import {
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  getActiveEmsBoardRecipients,
  getFireMeetingRequests,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return "Date not set";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function BoardRequestsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const canSubmit = canSubmitFireMeetingRequest(user);
  const canReview = canReviewFireMeetingRequests(user);
  if (!canSubmit && !canReview) redirect("/board");

  const [recipients, requests] = await Promise.all([
    getActiveEmsBoardRecipients(),
    getFireMeetingRequests(user),
  ]);
  const names = new Map(recipients.map((recipient) => [recipient.id, `${recipient.name}${recipient.officerTitle ? `, ${recipient.officerTitle}` : ""}`]));

  function requestedLabel(scope: string, ids: string[]): string {
    if (scope === "all") return "All EMS board members";
    if (scope === "president") return "EMS board president";
    const selected = ids.map((id) => names.get(id)).filter(Boolean);
    return selected.length ? selected.join("; ") : "Specific EMS board member(s)";
  }

  return (
    <>
      <p className="board-eyebrow">Requests</p>
      <h1 className="board-h1">Fire Board Attendance Requests</h1>
      <p className="board-sub">Fire Board users can request EMS board attendance and state why the person or group is being requested.</p>

      {canSubmit && (
        <div style={{ marginTop: 24 }}>
          <FireMeetingRequestForm recipients={recipients} />
        </div>
      )}

      <h2 className="board-h2">{canReview ? "Submitted requests" : "Your requests"}</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {requests.length === 0 && <div className="board-card"><p style={{ margin: 0 }}>No requests submitted yet.</p></div>}
        {requests.map((request) => (
          <div key={request.id} className="board-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
              <span className="board-chip">{request.status}</span>
              <span style={{ fontFamily: "var(--b-mono)", fontSize: 10.5, color: "var(--b-muted)", textTransform: "uppercase" }}>
                {fmtDate(request.date)}{request.startTime ? ` · ${request.startTime}` : ""}
              </span>
            </div>
            <p style={{ margin: 0, fontWeight: 700 }}>{request.meetingTitle}</p>
            <p style={{ margin: "5px 0 0", color: "var(--b-muted)", fontSize: 13.5 }}>
              Requested: {requestedLabel(request.requestedScope, request.requestedUserIds)}
              {request.location ? ` · ${request.location}` : ""}
            </p>
            <p style={{ margin: "10px 0 0", color: "var(--b-ink-2)", whiteSpace: "pre-wrap" }}>{request.reason}</p>
            <p style={{ margin: "10px 0 0", color: "var(--b-faint)", fontSize: 12.5 }}>Submitted by {request.requesterName}</p>
          </div>
        ))}
      </div>
    </>
  );
}
