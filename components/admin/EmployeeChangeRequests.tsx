"use client";

import { useCallback, useEffect, useState } from "react";

interface ChangeRequest {
  id: string;
  employeeId: string;
  fieldKey: string;
  fieldLabel: string;
  proposedValue: string | null;
  comments: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  shareWithEmployee: boolean;
  status: "pending" | "approved" | "denied";
  adminDecisionNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function EmployeeChangeRequests({ employeeId }: { employeeId: string }) {
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionDraft, setDecisionDraft] = useState<Record<string, { notes: string; applyValue: boolean; share: boolean }>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/profile-change-requests?employeeId=${encodeURIComponent(employeeId)}`, { cache: "no-store" });
      if (!r.ok) { setRequests([]); return; }
      const d = await r.json();
      setRequests(Array.isArray(d.requests) ? d.requests : []);
    } catch {
      setRequests([]);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  function draftFor(id: string, share: boolean) {
    return decisionDraft[id] ?? { notes: "", applyValue: true, share };
  }

  function patchDraft(id: string, patch: Partial<{ notes: string; applyValue: boolean; share: boolean }>) {
    setDecisionDraft((s) => ({ ...s, [id]: { ...draftFor(id, false), ...patch } }));
  }

  async function decide(req: ChangeRequest, status: "approved" | "denied") {
    setBusyId(req.id);
    setError(null);
    const d = draftFor(req.id, req.shareWithEmployee);
    try {
      const r = await fetch(`/api/admin/profile-change-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminDecisionNotes: d.notes || null,
          applyValue: status === "approved" ? d.applyValue : false,
          shareWithEmployee: d.share,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j?.error ?? "Could not save your decision.");
        return;
      }
      await load();
    } catch {
      setError("Could not save your decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleShare(req: ChangeRequest, share: boolean) {
    setBusyId(req.id);
    try {
      await fetch(`/api/admin/profile-change-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareWithEmployee: share }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (requests === null) {
    return <div className="text-slate-500 text-sm py-4">Loading change requests…</div>;
  }
  if (requests.length === 0) {
    return <div className="text-slate-500 text-sm py-4">No change requests yet.</div>;
  }

  return (
    <div id="change-requests" className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {requests.map((req) => {
        const d = draftFor(req.id, req.shareWithEmployee);
        const isPending = req.status === "pending";
        return (
          <div
            key={req.id}
            className={`rounded-2xl border p-4 ${
              isPending
                ? "bg-amber-500/5 border-amber-500/30"
                : req.status === "approved"
                  ? "bg-emerald-500/5 border-emerald-500/25"
                  : "bg-red-500/5 border-red-500/25"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-white font-bold text-sm">{req.fieldLabel}</span>
              <StatusPill status={req.status} />
              <span className="text-slate-500 text-xs ml-auto">{fmtDateTime(req.createdAt)}</span>
            </div>

            {req.proposedValue && (
              <div className="mb-2 text-sm">
                <span className="text-slate-500">Requested value: </span>
                <span className="text-slate-200 font-semibold">{req.proposedValue}</span>
              </div>
            )}

            {req.comments && (
              <div className="mb-2 text-sm">
                <div className="text-slate-500 text-xs uppercase tracking-wider mb-1">Comments</div>
                <div className="text-slate-300 whitespace-pre-wrap">{req.comments}</div>
              </div>
            )}

            {req.attachmentUrl && (
              <div className="mb-3 flex items-center gap-3 text-sm">
                <span className="text-slate-500">Attachment:</span>
                <a
                  href={req.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 underline hover:text-amber-200"
                >
                  {req.attachmentName ?? "Open attachment"}
                </a>
                <label className="ml-auto flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPending ? d.share : req.shareWithEmployee}
                    disabled={busyId === req.id}
                    onChange={(e) => {
                      if (isPending) {
                        patchDraft(req.id, { share: e.target.checked });
                      } else {
                        toggleShare(req, e.target.checked);
                      }
                    }}
                    style={{ accentColor: "#f0b429" }}
                  />
                  Share with employee
                </label>
              </div>
            )}

            {isPending && (
              <div className="space-y-2">
                <textarea
                  value={d.notes}
                  onChange={(e) => patchDraft(req.id, { notes: e.target.value })}
                  placeholder="Note to the employee (optional)…"
                  rows={2}
                  className="w-full bg-[#040d1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200"
                />
                {req.proposedValue && (
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={d.applyValue}
                      onChange={(e) => patchDraft(req.id, { applyValue: e.target.checked })}
                      style={{ accentColor: "#f0b429" }}
                    />
                    Apply the requested value to {req.fieldLabel} when approving.
                  </label>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => decide(req, "approved")}
                    className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={() => decide(req, "denied")}
                    className="bg-red-500/15 border border-red-500/40 text-red-200 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-red-500/25 disabled:opacity-50"
                  >
                    Deny
                  </button>
                </div>
              </div>
            )}

            {!isPending && req.adminDecisionNotes && (
              <div className="text-xs text-slate-400 mt-2">
                <span className="uppercase tracking-wider">Note: </span>
                <span className="text-slate-300">{req.adminDecisionNotes}</span>
              </div>
            )}
            {!isPending && req.decidedAt && (
              <div className="text-xs text-slate-500 mt-1">Decided {fmtDateTime(req.decidedAt)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: ChangeRequest["status"] }) {
  const styles =
    status === "approved" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : status === "denied"   ? "bg-red-500/15 text-red-300 border-red-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles}`}>
      {status}
    </span>
  );
}
