"use client";

import { Bug, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { PublicLibraryDocument } from "@/lib/financials-hub/public-library";
import { REPORT_EMAIL } from "@/lib/financials-hub/transparency-content";
import styles from "./ReportProblem.module.css";

export default function ReportProblem({ document, className = "" }: { document?: PublicLibraryDocument; className?: string }) {
  const [open, setOpen] = useState(false);
  const label = document ? "Report a Problem" : "Report a Technical Problem";
  return <>
    <button type="button" className={`${styles.trigger} ${className}`} aria-label={document ? `${label}: ${document.title}` : label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Bug aria-hidden="true"/>{label}
    </button>
    {open ? <ReportDialog document={document} onClose={() => setOpen(false)}/> : null}
  </>;
}

function ReportDialog({ document: source, onClose }: { document?: PublicLibraryDocument; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const id = useId();
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || status === "sent") return;
    if (!description.trim()) { setStatus("error"); setFeedback("Please describe the technical problem."); return; }
    sending.current = true;
    setStatus("sending");
    setFeedback("");
    try {
      const response = await fetch("/api/financials/report-problem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, ...(source ? { documentId: source.id } : {}), website }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (response.ok && result.status === "sent") {
        setStatus("sent");
        setFeedback(`Your technical report was sent to ${REPORT_EMAIL}. Thank you.`);
      } else {
        setStatus("error");
        setFeedback(result.status === "preview-disabled" ? "Sending is disabled in this local preview. Your report has not been sent." : response.status === 429 ? "Too many reports were submitted. Please try again later. This report was not sent." : "Your report could not be sent. Your description is still here; please try again later.");
      }
    } catch {
      setStatus("error");
      setFeedback("We could not confirm delivery. Your description is still here; please try again later.");
    } finally {
      sending.current = false;
    }
  }

  return createPortal(<dialog ref={dialog} onClose={onClose} onCancel={event => { if (sending.current) event.preventDefault(); }} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} className={styles.dialog}>
    <div className={styles.header}><h2 id={`${id}-title`}>Report a Technical Problem</h2><button className={styles.close} type="button" disabled={status === "sending"} aria-label="Close report window" onClick={() => dialog.current?.close()}><X aria-hidden="true"/></button></div>
    <p className={styles.context}>{source?.title ?? "Financial Transparency page"}</p>
    <p id={`${id}-help`}>For website bugs and technical problems only. <strong>Requests are not accepted.</strong></p>
    <form onSubmit={submitReport} aria-busy={status === "sending"}>
      <label htmlFor={`${id}-description`}>Describe the technical problem</label>
      <textarea id={`${id}-description`} required value={description} disabled={status === "sending" || status === "sent"} maxLength={2000} rows={5} placeholder="For example: this PDF does not open." onChange={event => { setDescription(event.target.value); setStatus("idle"); setFeedback(""); }}/>
      <div className={styles.honeypot} aria-hidden="true"><label htmlFor={`${id}-website`}>Leave this field blank</label><input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)}/></div>
      <p className={styles.privacy}>Sent directly to {REPORT_EMAIL}. Do not include private or medical information.</p>
      <div className={styles.actions}><button className={styles.send} type="submit" disabled={status === "sending" || status === "sent" || !description.trim()}><Send aria-hidden="true"/>{status === "sending" ? "Sending…" : status === "sent" ? "Sent" : "Send"}</button></div>
      {feedback ? <p className={status === "sent" ? styles.success : styles.feedback} role={status === "error" ? "alert" : "status"}>{feedback}</p> : null}
    </form>
  </dialog>, document.body);
}
