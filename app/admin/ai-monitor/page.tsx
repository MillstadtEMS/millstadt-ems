import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAnalyticsSupervisor } from "@/lib/analytics/auth";
import { publicAiMonitorConfiguration } from "@/lib/ai-monitor/config";
import { microsToDollars } from "@/lib/ai-monitor/cost";
import { currentMonthAiMonitorSpendMicros, listAiMonitorRuns } from "@/lib/ai-monitor/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Site Monitor",
  robots: { index: false, follow: false, noarchive: true },
};

async function monitorData() {
  try {
    return {
      runs: await listAiMonitorRuns(30),
      spentMicros: process.env.DATABASE_URL ? await currentMonthAiMonitorSpendMicros() : 0,
      error: null,
    };
  } catch {
    return { runs: [], spentMicros: 0, error: "Monitor storage is unavailable." };
  }
}

function verdictColor(verdict: string) {
  if (verdict === "critical") return "text-red-300";
  if (verdict === "needs_attention") return "text-amber-300";
  return "text-emerald-300";
}

export default async function AiMonitorPage() {
  if (!(await currentAnalyticsSupervisor())) redirect("/lounge");
  const config = publicAiMonitorConfiguration();
  const { runs, spentMicros, error } = config.enabled
    ? await monitorData()
    : { runs: [], spentMicros: 0, error: null };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-slate-100">
      <header className="mb-6 border-b border-white/10 pb-5">
        <p className="text-xs font-bold uppercase text-[#f0b429]">Administration</p>
        <h1 className="mt-1 text-2xl font-black">Site Monitor</h1>
        <p className="mt-2 text-sm text-slate-400">
          Read-only nightly security and weekly aggregate analytics reports.
        </p>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-[#071428] p-4">
          <div className="text-xs uppercase text-slate-500">Status</div>
          <div className="mt-1 font-bold">
            {config.ready ? "Ready" : config.enabled ? "Needs setup" : "Disabled"}
          </div>
        </div>
        <div className="border border-white/10 bg-[#071428] p-4">
          <div className="text-xs uppercase text-slate-500">Monthly estimate</div>
          <div className="mt-1 font-bold">{"$" + microsToDollars(spentMicros).toFixed(4)}</div>
        </div>
        <div className="border border-white/10 bg-[#071428] p-4">
          <div className="text-xs uppercase text-slate-500">Application cutoff</div>
          <div className="mt-1 font-bold">{"$" + config.monthlyBudgetUsd.toFixed(2)}</div>
        </div>
      </section>

      {config.missingConfiguration.length > 0 && (
        <p className="mb-6 border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Missing configuration: {config.missingConfiguration.join(", ")}
        </p>
      )}
      {error && <p className="mb-6 border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p>}

      <section>
        <h2 className="mb-3 text-lg font-bold">Recent reports</h2>
        {runs.length === 0 ? (
          <p className="border border-white/10 bg-[#071428] p-5 text-sm text-slate-400">
            No monitor runs have been recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <article key={run.id} className="border border-white/10 bg-[#071428] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase text-slate-500">
                      {run.reportType.replaceAll("_", " ")} / {new Date(run.startedAt).toLocaleString()}
                    </div>
                    <div className={"mt-1 font-bold " + verdictColor(run.report?.verdict ?? run.status)}>
                      {run.report?.verdict.replaceAll("_", " ") ?? run.status.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {"$" + microsToDollars(run.estimatedCostMicros).toFixed(4)}
                  </div>
                </div>
                {run.report ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{run.report.summary}</p>
                    {run.report.findings.length > 0 && (
                      <ul className="mt-4 space-y-3">
                        {run.report.findings.map((finding, index) => (
                          <li key={finding.title + index} className="border-l-2 border-slate-600 pl-3">
                            <div
                              className={"text-sm font-bold " + verdictColor(
                                finding.severity === "critical" || finding.severity === "high"
                                  ? "critical"
                                  : finding.severity === "medium"
                                    ? "needs_attention"
                                    : "healthy",
                              )}
                            >
                              {finding.severity}: {finding.title}
                            </div>
                            <p className="mt-1 text-sm text-slate-400">{finding.recommendation}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    {run.errorCode ? "Run ended with: " + run.errorCode : "Report pending."}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
