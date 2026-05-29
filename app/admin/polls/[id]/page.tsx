import { notFound, redirect } from "next/navigation";
import { currentEmployee } from "@/lib/lounge/auth";
import { getPoll, listPollResponses } from "@/lib/lounge/polls";
import PollResultsClient from "@/components/lounge/PollResultsClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PollResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await currentEmployee();
  if (!session) redirect("/lounge/login");
  if (!session.isAdmin) redirect("/lounge");
  const poll = await getPoll(id);
  if (!poll) notFound();
  const responses = await listPollResponses(id);
  return <PollResultsClient poll={poll} initialResponses={responses} />;
}
