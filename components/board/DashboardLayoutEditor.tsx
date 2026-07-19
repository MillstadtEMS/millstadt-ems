"use client";

import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Save, Send, Smartphone, Tablet, Monitor, Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BoardCard, BoardStatusChip } from "./BoardPrimitives";

type Density = "comfortable" | "compact";
type Preview = "desktop" | "tablet" | "mobile";
type Role = "ems_board" | "ems_president" | "admin" | "submitter" | "fire_board";

interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  roles: Role[];
}

const ROLES: Array<{ id: Role; label: string }> = [
  { id: "ems_board", label: "EMS" },
  { id: "ems_president", label: "President" },
  { id: "admin", label: "Admin" },
  { id: "submitter", label: "Operations" },
  { id: "fire_board", label: "Fire" },
];

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "next-meeting", label: "Next meeting", visible: true, roles: ["ems_board", "ems_president", "admin", "submitter"] },
  { id: "action-queue", label: "Action queue", visible: true, roles: ["ems_board", "ems_president", "admin", "submitter", "fire_board"] },
  { id: "referendum", label: "Budget model", visible: true, roles: ["ems_board", "ems_president", "admin", "submitter"] },
  { id: "recent-activity", label: "Recent activity", visible: true, roles: ["ems_board", "ems_president", "admin", "submitter", "fire_board"] },
];

const DRAFT_KEY = "board_dashboard_layout_admin_draft";
const PUBLISHED_KEY = "board_dashboard_layout_published";

export default function DashboardLayoutEditor() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [density, setDensity] = useState<Density>("comfortable");
  const [preview, setPreview] = useState<Preview>("desktop");
  const [dragging, setDragging] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as { widgets?: WidgetConfig[]; density?: Density };
        if (Array.isArray(parsed.widgets)) setWidgets(parsed.widgets);
        if (parsed.density === "compact" || parsed.density === "comfortable") setDensity(parsed.density);
      } catch {
        setWidgets(DEFAULT_WIDGETS);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.visible), [widgets]);

  function move(id: string, direction: -1 | 1) {
    setWidgets((current) => {
      const index = current.findIndex((widget) => widget.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function toggleVisibility(id: string) {
    setWidgets((current) => current.map((widget) => widget.id === id ? { ...widget, visible: !widget.visible } : widget));
  }

  function toggleRole(id: string, role: Role) {
    setWidgets((current) => current.map((widget) => {
      if (widget.id !== id) return widget;
      const roles = widget.roles.includes(role) ? widget.roles.filter((item) => item !== role) : [...widget.roles, role];
      return { ...widget, roles };
    }));
  }

  function onDrop(targetId: string) {
    if (!dragging || dragging === targetId) return;
    setWidgets((current) => {
      const from = current.findIndex((widget) => widget.id === dragging);
      const to = current.findIndex((widget) => widget.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDragging(null);
  }

  function save() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ widgets, density }));
    setMessage("Draft saved.");
  }

  function publish() {
    window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify({ widgets, density, publishedAt: new Date().toISOString() }));
    setMessage("Dashboard layout published on this device.");
  }

  function reset() {
    setWidgets(DEFAULT_WIDGETS);
    setDensity("comfortable");
    setPreview("desktop");
    setMessage("Default layout restored.");
  }

  return (
    <div className="board-layout-editor">
      {message && <div className="board-empty compact" role="status">{message}</div>}
      <div className="board-actions">
        <button type="button" className="board-btn-secondary" onClick={reset}><RotateCcw size={16} aria-hidden="true" />Reset</button>
        <button type="button" className="board-btn-secondary" onClick={save}><Save size={16} aria-hidden="true" />Save changes</button>
        <button type="button" className="board-btn-primary" onClick={publish}><Send size={16} aria-hidden="true" />Publish changes</button>
      </div>

      <div className="board-editor-grid">
        <BoardCard>
          <h2 className="board-h2">Dashboard widgets</h2>
          <div className="board-widget-list" style={{ marginTop: 14 }}>
            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                className="board-widget-item"
                draggable
                onDragStart={() => setDragging(widget.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(widget.id)}
              >
                <div className="board-widget-head">
                  <strong><GripVertical size={15} aria-hidden="true" /> {widget.label}</strong>
                  <div className="board-widget-controls">
                    <button type="button" onClick={() => move(widget.id, -1)} aria-label={`Move ${widget.label} up`} disabled={index === 0}><ArrowUp size={15} aria-hidden="true" /></button>
                    <button type="button" onClick={() => move(widget.id, 1)} aria-label={`Move ${widget.label} down`} disabled={index === widgets.length - 1}><ArrowDown size={15} aria-hidden="true" /></button>
                    <button type="button" onClick={() => toggleVisibility(widget.id)} aria-label={`${widget.visible ? "Hide" : "Show"} ${widget.label}`}>
                      {widget.visible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <div className="board-role-toggles">
                  {ROLES.map((role) => (
                    <label key={role.id}>
                      <input type="checkbox" checked={widget.roles.includes(role.id)} onChange={() => toggleRole(widget.id, role.id)} />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </BoardCard>

        <BoardCard>
          <div className="board-page-actions" style={{ justifyContent: "space-between" }}>
            <div className="board-appearance">
              <button type="button" className={density === "comfortable" ? "on" : ""} onClick={() => setDensity("comfortable")}>Comfortable</button>
              <button type="button" className={density === "compact" ? "on" : ""} onClick={() => setDensity("compact")}>Compact</button>
            </div>
            <div className="board-appearance">
              <button type="button" className={preview === "desktop" ? "on" : ""} onClick={() => setPreview("desktop")} title="Desktop preview"><Monitor size={16} aria-hidden="true" /></button>
              <button type="button" className={preview === "tablet" ? "on" : ""} onClick={() => setPreview("tablet")} title="Tablet preview"><Tablet size={16} aria-hidden="true" /></button>
              <button type="button" className={preview === "mobile" ? "on" : ""} onClick={() => setPreview("mobile")} title="Mobile preview"><Smartphone size={16} aria-hidden="true" /></button>
            </div>
          </div>

          <div className={`board-preview-frame ${preview}`} style={{ marginTop: 16 }}>
            <div className="board-dashboard" style={{ gap: density === "compact" ? 10 : 16 }}>
              {visibleWidgets.map((widget) => (
                <div key={widget.id} className="board-card">
                  <BoardStatusChip tone={widget.visible ? "accent" : "neutral"}>{widget.roles.length} roles</BoardStatusChip>
                  <h3 style={{ margin: "10px 0 4px", fontSize: 17 }}>{widget.label}</h3>
                  <p className="board-updated" style={{ margin: 0 }}>Presentation only. Permissions remain unchanged.</p>
                </div>
              ))}
              {visibleWidgets.length === 0 && <div className="board-empty">No widgets visible in this preview.</div>}
            </div>
          </div>
        </BoardCard>
      </div>
    </div>
  );
}
