"use client";

import { useState, useRef, useEffect } from "react";

export default function BudgetDocumentsAdmin() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentMeta, setCurrentMeta] = useState<{ size?: number; uploadedAt?: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/budget-documents")
      .then(r => r.json())
      .then(data => {
        if (data.url) {
          setCurrentUrl(data.url);
          setCurrentMeta({ size: data.size, uploadedAt: data.uploadedAt });
        }
      })
      .catch(() => {});
  }, []);

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setStatus("error");
      setMsg("File must be a PDF.");
      return;
    }
    setFile(f);
    setStatus("idle");
    setMsg("");
  }

  async function upload() {
    if (!file) return;
    setStatus("uploading");
    setMsg("");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/budget-documents", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMsg(json.error ?? "Upload failed.");
      } else {
        setStatus("done");
        setMsg("Document uploaded successfully.");
        setCurrentUrl(json.url);
        setFile(null);
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Try again.");
    }
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">
            Internal Documents
          </span>
        </div>
        <h1 className="text-3xl font-black text-white">
          Draft Annual Budget &amp; Strategic Overview
        </h1>
        <p className="text-slate-400 text-sm mt-1.5">
          Upload and manage the draft budget document. This page is only visible to
          admin users and is <strong className="text-slate-300">not published</strong> on the
          public website.
        </p>
      </div>

      {/* Current document */}
      {currentUrl && (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-7 mb-6">
          <h2 className="text-white font-black text-lg mb-4">Current Document</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#f0b429]">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">
                Millstadt EMS — FY 2025–2026 Budget (DRAFT)
              </p>
              {currentMeta?.size && (
                <p className="text-slate-500 text-xs mt-0.5">
                  {formatBytes(currentMeta.size)}
                  {currentMeta.uploadedAt &&
                    ` · Uploaded ${new Date(currentMeta.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`}
                </p>
              )}
            </div>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-[#f0b429] hover:bg-[#f5c842] text-[#040d1a] font-black px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              View PDF
            </a>
          </div>
        </div>
      )}

      {/* Upload */}
      <div className="bg-[#071428] border border-white/10 rounded-2xl p-7">
        <h2 className="text-white font-black text-lg mb-6">
          {currentUrl ? "Replace Document" : "Upload Document"}
        </h2>

        <div
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer mb-6 ${
            dragging
              ? "border-[#f0b429]/80 bg-[#f0b429]/10 scale-[1.01]"
              : file
              ? "border-[#f0b429]/40 bg-[#f0b429]/5"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/5"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0] ?? null); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-[#f0b429] mx-auto mb-3">
                <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
              </svg>
              <p className="text-[#f0b429] font-bold mb-1">{file.name}</p>
              <p className="text-slate-500 text-sm">
                {formatBytes(file.size)} · Click to change
              </p>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-slate-600 mx-auto mb-3">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
              </svg>
              <p className="text-white font-bold mb-1">Drop PDF here</p>
              <p className="text-slate-500 text-sm">or click to browse</p>
            </>
          )}
        </div>

        {file && status === "idle" && (
          <button
            onClick={upload}
            className="w-full bg-[#f0b429] hover:bg-[#f5c842] text-[#040d1a] font-black py-3.5 rounded-xl transition-colors text-sm mb-4"
          >
            Upload PDF
          </button>
        )}

        {status === "uploading" && (
          <div className="w-full py-3.5 rounded-xl bg-white/5 text-slate-400 text-sm font-bold text-center animate-pulse mb-4">
            Uploading…
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm justify-center py-2 mb-4">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            {msg}
          </div>
        )}

        {status === "error" && (
          <p className="text-red-400 text-sm text-center font-bold mb-4">{msg}</p>
        )}
      </div>

      <p className="text-slate-700 text-xs text-center mt-6">
        This document is only accessible through the admin panel. It is not linked
        from any public-facing page on millstadtems.org.
      </p>
    </div>
  );
}
