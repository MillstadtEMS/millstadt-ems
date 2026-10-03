import type { Metadata } from "next";
import { safeReviewPath } from "@/lib/election-review-auth";
import { PublicPageHero } from "@/components/site/PublicChrome";
import styles from "./review.module.css";
export const metadata: Metadata = { title: "Election page review", robots: { index: false, follow: false } };
export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const next = safeReviewPath(query.next);
  return <main><PublicPageHero title="Election page" accent="Review" />
    <form className={styles.form} action="/api/election-review/login" method="post">
      <label htmlFor="review-password">Review password</label>
      <input id="review-password" name="password" type="password" autoComplete="current-password" maxLength={256} required />
      <input name="next" type="hidden" value={next} />
      {query.error && <p role="alert">{query.error === "wait" ? "Too many attempts. Please try again in 15 minutes." : query.error === "setup" ? "Review access is being prepared. Please try again shortly." : "That password did not match. Please try again."}</p>}
      <button type="submit">Open review</button>
    </form></main>;
}
