import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { electionIsPublic, REVIEW_COOKIE, safeReviewPath, verifyReviewToken } from "./election-review-auth";
export async function hasElectionAccess() {
  return electionIsPublic() || verifyReviewToken((await cookies()).get(REVIEW_COOKIE)?.value);
}
export async function requireElectionAccess(path = "/election-information") {
  if (!await hasElectionAccess()) redirect(`/election-review?next=${encodeURIComponent(safeReviewPath(path))}`);
}
