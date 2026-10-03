import { electionIsPublic } from "@/lib/election-review-auth";

export default function LockElectionReview() {
  if (electionIsPublic()) return null;
  return <div className="wrap" style={{ display: "flex", justifyContent: "flex-end", paddingTop: 18 }}>
    <form action="/api/election-review/lock" method="post">
      <button type="submit" style={{ minHeight: 44, padding: "8px 14px", border: "1px solid #526b89", borderRadius: 5, background: "#071428", color: "#f0b429", font: "inherit", cursor: "pointer" }}>Lock review</button>
    </form>
  </div>;
}
