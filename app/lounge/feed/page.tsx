import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The wall now lives on the /lounge home page. Keep this path as a permanent
// redirect so old links keep working.
export default function FeedRedirect() {
  redirect("/lounge");
}
