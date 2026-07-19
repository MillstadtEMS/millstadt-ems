import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export function BoardPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="board-page-header">
      <div>
        {eyebrow && <p className="board-eyebrow">{eyebrow}</p>}
        <h1 className="board-h1">{title}</h1>
        {description && <p className="board-sub">{description}</p>}
      </div>
      {actions && <div className="board-page-actions">{actions}</div>}
    </header>
  );
}

export function BoardSectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="board-section-header">
      <h2 className="board-h2">{title}</h2>
      {action}
    </div>
  );
}

export function BoardCard({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`board-card ${className}`.trim()} style={style}>{children}</section>;
}

export function BoardMetric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "good" | "warn" | "crit" | "info";
}) {
  return (
    <div className={`board-card board-metric ${tone ? `tone-${tone}` : ""}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function BoardStatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "crit" | "info" | "accent";
}) {
  return <span className={`board-chip ${tone}`}>{children}</span>;
}

export function BoardEmptyState({
  title,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  children?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="board-empty">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {actionHref && actionLabel && <Link href={actionHref} className="board-btn-secondary">{actionLabel}</Link>}
    </section>
  );
}

export function BoardActionLink({
  href,
  label,
  meta,
  count,
  tone = "neutral",
}: {
  href: string;
  label: string;
  meta?: string;
  count?: number;
  tone?: "neutral" | "good" | "warn" | "crit" | "info" | "accent";
}) {
  return (
    <Link href={href} className="board-action-row">
      <span>
        <strong>{label}</strong>
        {meta && <small>{meta}</small>}
      </span>
      {typeof count === "number" && <BoardStatusChip tone={tone}>{count}</BoardStatusChip>}
    </Link>
  );
}
