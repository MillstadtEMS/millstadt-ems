"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Mic, MicOff, ShieldCheck } from "lucide-react";
import SignaturePad from "@/components/lounge/SignaturePad";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function MeetingMinutesEditor({
  meetingId,
  initialMinutes,
  initialPublic,
  initialRawTranscript,
  finalizedBy,
  finalizedAt,
  canFinalize,
}: {
  meetingId: number;
  initialMinutes: string | null;
  initialPublic: boolean;
  initialRawTranscript: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  canFinalize: boolean;
}) {
  const router = useRouter();
  const [minutesText, setMinutesText] = useState(initialMinutes ?? "");
  const [rawTranscript, setRawTranscript] = useState(initialRawTranscript ?? "");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [minutesPublic, setMinutesPublic] = useState(initialPublic);
  const [signature, setSignature] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function startListening() {
    setMsg(null);
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setMsg({ ok: false, text: "Live transcription is not supported in this browser. Paste a transcript into the private transcript box instead." });
      return;
    }
    const rec = new Recognition();
    recognitionRef.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += `${result[0].transcript.trim()}\n`;
        else interim += result[0].transcript;
      }
      if (finalText) setRawTranscript((current) => `${current}${current.endsWith("\n") || current.length === 0 ? "" : "\n"}${finalText}`);
      setInterimTranscript(interim.trim());
    };
    rec.onerror = () => {
      setListening(false);
      setMsg({ ok: false, text: "The browser stopped listening. Check microphone permission and try again." });
    };
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setMsg({ ok: false, text: "Could not start microphone listening. Check browser microphone permission." });
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
    setInterimTranscript("");
  }

  async function createDraft() {
    setDraftBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/board/meetings/minutes/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, rawTranscript: `${rawTranscript}\n${interimTranscript}`.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not create a draft." });
        return;
      }
      setMinutesText(data.draftText || "");
      setMsg({ ok: true, text: "Clean draft created. Secretary review is still required before signing." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setDraftBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/board/meetings/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, minutesText: minutesText.trim() || null, minutesPublic: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not save minutes." });
        return;
      }
      setMsg({ ok: true, text: "Draft saved. Finalize with secretary signature to make it official." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!signature) {
      setMsg({ ok: false, text: "Secretary signature is required to finalize minutes." });
      return;
    }
    setFinalizeBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/board/meetings/minutes/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, minutesText: minutesText.trim(), minutesPublic, signatureDataUrl: signature }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not finalize minutes." });
        return;
      }
      setSignature(null);
      setMsg({ ok: true, text: "Minutes finalized and official PDF is ready." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setFinalizeBusy(false);
    }
  }

  return (
    <div className="board-card" style={{ maxWidth: 920 }}>
      <div className="board-actions" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <span className={finalizedAt ? "board-chip good" : "board-chip warn"}>
            {finalizedAt ? `Finalized by ${finalizedBy ?? "Secretary"}` : "Draft - secretary signature required"}
          </span>
        </div>
        {finalizedAt && (
          <a className="board-btn-secondary" href={`/api/board/meetings/minutes/pdf?meetingId=${meetingId}`} target="_blank" rel="noreferrer">
            <FileText size={16} aria-hidden="true" />
            Official PDF
          </a>
        )}
      </div>

      <section style={{ background: "var(--b-raise)", border: "1px solid var(--b-hair)", borderRadius: 8, padding: 16, marginBottom: 14 }}>
        <div className="board-section-header" style={{ margin: "0 0 12px" }}>
          <div>
            <h2 className="board-h2" style={{ fontSize: 19 }}>Live transcript</h2>
            <p className="board-sub" style={{ marginTop: 4 }}>Private working transcript. Use it to draft minutes; it is not the official record.</p>
          </div>
          <button className={listening ? "board-btn-secondary" : "board-submit"} type="button" onClick={listening ? stopListening : startListening}>
            {listening ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
            {listening ? "Stop listening" : "Start listening"}
          </button>
        </div>
        <textarea
          className="board-input"
          rows={5}
          value={rawTranscript + (interimTranscript ? `\n${interimTranscript}` : "")}
          onChange={(event) => { setRawTranscript(event.target.value); setInterimTranscript(""); }}
          placeholder="Press Start listening during the meeting, or paste a transcript here."
          style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
        <div className="board-actions" style={{ marginTop: 12 }}>
          <button className="board-btn-secondary" type="button" disabled={draftBusy || listening} onClick={createDraft}>
            {draftBusy ? "Drafting..." : "Create clean minutes draft"}
          </button>
          <button className="board-btn-ghost" type="button" disabled={listening || rawTranscript.length === 0} onClick={() => { setRawTranscript(""); setInterimTranscript(""); }}>
            Clear transcript
          </button>
        </div>
      </section>

      <div className="board-field" style={{ margin: 0 }}>
        <label htmlFor="meeting-minutes">Meeting minutes draft</label>
        <textarea
          id="meeting-minutes"
          className="board-input"
          rows={8}
          value={minutesText}
          onChange={(event) => setMinutesText(event.target.value)}
          style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, fontSize: 13.5, color: "var(--b-ink-2)" }}>
        <input type="checkbox" checked={minutesPublic} onChange={(event) => setMinutesPublic(event.target.checked)} />
        Share finalized minutes on the public website after secretary signature
      </label>
      <div className="board-actions" style={{ marginTop: 14 }}>
        <button className="board-submit" style={{ width: "auto", padding: "10px 20px" }} type="button" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save minutes"}
        </button>
      </div>

      <section style={{ background: "var(--b-raise)", border: "1px solid var(--b-hair)", borderRadius: 8, padding: 16, marginTop: 18 }}>
        <h2 className="board-h2" style={{ fontSize: 19 }}>Finalize official minutes</h2>
        <p className="board-sub" style={{ marginBottom: 14 }}>
          Secretary signature is required. Signing creates the official PDF and certifies the minutes are accurate and complete.
        </p>
        {canFinalize ? (
          <>
            <SignaturePad value={signature} onChange={setSignature} label="Secretary signature" height={132} disabled={finalizeBusy} />
            <div className="board-actions" style={{ marginTop: 14 }}>
              <button className="board-submit" type="button" disabled={finalizeBusy || !signature || minutesText.trim().length < 40} onClick={finalize}>
                <ShieldCheck size={16} aria-hidden="true" />
                {finalizeBusy ? "Finalizing..." : "Finalize and create official PDF"}
              </button>
            </div>
          </>
        ) : (
          <div className="board-empty compact" style={{ margin: 0 }}>
            Only the secretary can sign and finalize the official minutes PDF.
          </div>
        )}
      </section>
      {msg && <p style={{ margin: "10px 0 0", color: msg.ok ? "var(--b-good)" : "var(--b-crit)", fontSize: 13 }}>{msg.text}</p>}
    </div>
  );
}
