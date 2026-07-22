"use client";

import type { CSSProperties, DragEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, Eye, FileSpreadsheet, LockKeyhole, RefreshCw, Save, UploadCloud } from "lucide-react";
import type { BoardWorkbookCell, BoardWorkbookView, BoardWorkbookVisibilitySettings } from "@/lib/board/workbook";

function formatUpdated(value: string | null): string {
  if (!value) return "Built-in copy";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSize(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function cellStyle(cell: BoardWorkbookView["sheets"][number]["rows"][number][number]): CSSProperties | undefined {
  if (!cell.fill) return undefined;
  return {
    backgroundColor: cell.fill,
    color: cell.darkFill ? "#ffffff" : "#111820",
  };
}

export default function ReadonlyWorkbook({
  workbook,
  canUpload,
  allSheetNames,
  visibilitySettings,
}: {
  workbook: BoardWorkbookView;
  canUpload: boolean;
  allSheetNames: string[];
  visibilitySettings: BoardWorkbookVisibilitySettings | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSheet, setActiveSheet] = useState(workbook.sheets[0]?.name ?? "");
  const [activeScenario, setActiveScenario] = useState(workbook.defaultScenarioKey ?? workbook.scenarios?.[0]?.key ?? "");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [emsTabs, setEmsTabs] = useState(visibilitySettings?.emsBoard ?? allSheetNames);
  const [fireTabs, setFireTabs] = useState(visibilitySettings?.fireBoard ?? allSheetNames);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const scenarios = useMemo(() => workbook.scenarios ?? [], [workbook.scenarios]);

  useEffect(() => {
    if (!workbook.sheets.some((sheet) => sheet.name === activeSheet)) {
      setActiveSheet(workbook.sheets[0]?.name ?? "");
    }
  }, [activeSheet, workbook.sheets]);

  useEffect(() => {
    if (!scenarios.some((scenario) => scenario.key === activeScenario)) {
      setActiveScenario(workbook.defaultScenarioKey ?? scenarios[0]?.key ?? "");
    }
  }, [activeScenario, scenarios, workbook.defaultScenarioKey]);

  useEffect(() => {
    setEmsTabs(visibilitySettings?.emsBoard ?? allSheetNames);
    setFireTabs(visibilitySettings?.fireBoard ?? allSheetNames);
  }, [allSheetNames, visibilitySettings]);

  const sheet = useMemo(
    () => workbook.sheets.find((item) => item.name === activeSheet) ?? workbook.sheets[0],
    [activeSheet, workbook.sheets],
  );
  const scenarioOverrides = activeScenario ? workbook.scenarioOverrides?.[activeScenario] : undefined;
  const activeScenarioLabel = scenarios.find((scenario) => scenario.key === activeScenario)?.label;

  function renderedCell(sheetName: string, cell: BoardWorkbookCell): BoardWorkbookCell {
    const override = scenarioOverrides?.[sheetName]?.[cell.address];
    return override ? { ...cell, text: override.text, isNumber: override.isNumber } : cell;
  }

  function hasScenarioOverride(sheetName: string, cell: BoardWorkbookCell): boolean {
    return Boolean(scenarioOverrides?.[sheetName]?.[cell.address]);
  }

  async function upload(file: File | null) {
    if (!file) return;
    if (!canUpload) {
      setMessage({ ok: false, text: "Workbook updates are limited to Kenneth James and Joe Wagner." });
      return;
    }
    if (!/\.xlsx$/i.test(file.name)) {
      setMessage({ ok: false, text: "Choose an .xlsx workbook." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/board/workbook", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: data.error || "Workbook update failed." });
        return;
      }
      setMessage({ ok: true, text: "Workbook updated for the board portal." });
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
      setDragging(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files.item(0));
  }

  function toggleSheet(target: "ems" | "fire", sheetName: string) {
    const update = (current: string[]) => current.includes(sheetName)
      ? current.filter((item) => item !== sheetName)
      : [...current, sheetName];
    if (target === "ems") setEmsTabs(update);
    else setFireTabs(update);
  }

  async function saveVisibility() {
    setSavingVisibility(true);
    setMessage(null);
    try {
      const response = await fetch("/api/board/workbook/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emsBoard: emsTabs, fireBoard: fireTabs }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage({ ok: false, text: data.error || "Tab visibility update failed." });
        return;
      }
      setMessage({ ok: true, text: "Workbook tab visibility saved." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSavingVisibility(false);
    }
  }

  return (
    <div className="board-workbook-page">
      <section className="board-workbook-toolbar">
        <div className="board-workbook-meta">
          <FileSpreadsheet size={22} aria-hidden="true" />
          <div>
            <strong>{workbook.sourceName}</strong>
            <span>
              Updated {formatUpdated(workbook.updatedAt)}
              {formatSize(workbook.size) ? ` · ${formatSize(workbook.size)}` : ""}
            </span>
          </div>
        </div>

        {canUpload && (
          <div className="board-actions">
            <a className="board-btn-secondary" href={workbook.downloadUrl}>
              <Download size={16} aria-hidden="true" />
              Download source
            </a>
          </div>
        )}
      </section>

      {scenarios.length > 0 && (
        <section className="board-workbook-scenario" aria-label="Workbook scenario">
          <div className="board-workbook-meta">
            <Eye size={21} aria-hidden="true" />
            <div>
              <strong>Scenario</strong>
              <span>{activeScenarioLabel ? `${activeScenarioLabel} · view-only preview` : "View-only preview"}</span>
            </div>
          </div>
          <div className="board-workbook-segmented" role="tablist" aria-label="Scenario options">
            {scenarios.map((scenario) => (
              <button
                key={scenario.key}
                type="button"
                className={scenario.key === activeScenario ? "on" : ""}
                aria-selected={scenario.key === activeScenario}
                onClick={() => setActiveScenario(scenario.key)}
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section
        className={[
          "board-workbook-drop",
          dragging ? "is-dragging" : "",
          !canUpload ? "is-locked" : "",
        ].filter(Boolean).join(" ")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="board-workbook-drop-icon">
          {canUpload ? <UploadCloud size={24} aria-hidden="true" /> : <LockKeyhole size={22} aria-hidden="true" />}
        </div>
        <div className="board-workbook-drop-copy">
          <strong>{canUpload ? "Drop workbook here" : "Workbook updates locked"}</strong>
          <span>{canUpload ? "The new spreadsheet replaces this view for everyone." : "Kenneth James and Joe Wagner can replace the shared workbook."}</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={!canUpload || busy}
          onChange={(event) => void upload(event.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="board-btn-primary"
          disabled={!canUpload || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <RefreshCw size={16} aria-hidden="true" /> : <UploadCloud size={16} aria-hidden="true" />}
          {busy ? "Updating" : "Choose file"}
        </button>
      </section>

      {canUpload && visibilitySettings && (
        <section className="board-workbook-visibility">
          <div className="board-workbook-visibility-head">
            <div>
              <strong>Visible tabs</strong>
              <span>EMS Board and Fire Board</span>
            </div>
            <button type="button" className="board-btn-primary" disabled={savingVisibility} onClick={() => void saveVisibility()}>
              {savingVisibility ? <RefreshCw size={16} aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              {savingVisibility ? "Saving" : "Save tabs"}
            </button>
          </div>
          <div className="board-workbook-visibility-grid">
            <div>
              <h3>EMS Board</h3>
              {allSheetNames.map((name) => (
                <label key={`ems-${name}`} className="board-workbook-check">
                  <input type="checkbox" checked={emsTabs.includes(name)} onChange={() => toggleSheet("ems", name)} />
                  <span>{name}</span>
                </label>
              ))}
            </div>
            <div>
              <h3>Fire Board</h3>
              {allSheetNames.map((name) => (
                <label key={`fire-${name}`} className="board-workbook-check">
                  <input type="checkbox" checked={fireTabs.includes(name)} onChange={() => toggleSheet("fire", name)} />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className={message.ok ? "board-note board-workbook-message ok" : "board-err board-workbook-message"} role="status">
          {message.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          <span>{message.text}</span>
        </div>
      )}

      {sheet ? (
        <section className="board-workbook-viewer">
          <div className="board-workbook-tabs" role="tablist" aria-label="Workbook sheets">
            {workbook.sheets.map((item) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={item.name === sheet.name}
                className={item.name === sheet.name ? "on" : ""}
                onClick={() => setActiveSheet(item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <div className="board-workbook-sheet-head">
            <div>
              <h2 className="board-h2">{sheet.name}</h2>
              <span>{sheet.totalRows} rows · {sheet.totalCols} columns</span>
            </div>
            {sheet.truncated && <span className="board-chip warn">Preview truncated</span>}
          </div>

          <div className="board-workbook-table-wrap">
            <table className="board-workbook-table">
              <colgroup>
                {sheet.columns.map((column) => (
                  <col key={column.label} style={column.width ? { width: column.width } : undefined} />
                ))}
              </colgroup>
              <tbody>
                {sheet.rows.map((row, rowIndex) => (
                  <tr key={`${sheet.name}-${rowIndex}`}>
                    {row.map((cell) => {
                      const rendered = renderedCell(sheet.name, cell);
                      return (
                        <td
                          key={cell.id}
                          className={[
                            rendered.isNumber ? "num" : "",
                            rendered.isFormula ? "formula" : "",
                            hasScenarioOverride(sheet.name, cell) ? "scenario-value" : "",
                            rendered.text ? "" : "blank",
                          ].filter(Boolean).join(" ")}
                          colSpan={rendered.colSpan}
                          rowSpan={rendered.rowSpan}
                          title={rendered.formula}
                          style={cellStyle(rendered)}
                        >
                          {rendered.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="board-empty">
          <h2>No workbook tabs are visible for your account.</h2>
        </section>
      )}
    </div>
  );
}
