import Link from "next/link";
import type { ReactNode } from "react";
import SiteIcon, { type SiteIconName } from "./SiteIcon";

export function PublicPageHero({
  eyebrow,
  title,
  accent,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="mems-page-hero">
      <div className="wrap">
        <div className="mems-page-hero__grid">
          <div className="mems-page-hero__copy">
            <div className="mems-eyebrow">
              <span />
              {eyebrow}
            </div>
            <h1>
              {title}
              {accent && <span>{accent}</span>}
            </h1>
            {description && <p>{description}</p>}
          </div>
          {children && <div className="mems-page-hero__aside">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function PublicActionCard({
  href,
  title,
  description,
  label,
  badge,
  icon,
  tone = "blue",
}: {
  href: string;
  title: string;
  description: string;
  label: string;
  badge?: string;
  icon: SiteIconName;
  tone?: "blue" | "gold" | "cyan" | "green" | "purple" | "red";
}) {
  return (
    <Link href={href} className={`mems-action-card tone-${tone}`}>
      <div className="mems-action-card__top">
        <span className="mems-icon-tile">
          <SiteIcon name={icon} />
        </span>
        {badge && <span className="mems-badge">{badge}</span>}
      </div>
      <div className="mems-action-card__copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="mems-card-link">
        {label}
        <SiteIcon name="external" />
      </span>
    </Link>
  );
}

export function PublicMetric({
  label,
  value,
  tone = "gold",
}: {
  label: string;
  value: ReactNode;
  tone?: "gold" | "cyan" | "blue" | "green" | "red";
}) {
  return (
    <div className={`mems-metric tone-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function PublicCallout({
  eyebrow,
  title,
  body,
  href,
  label,
  icon = "shield",
}: {
  eyebrow: string;
  title: string;
  body: ReactNode;
  href?: string;
  label?: string;
  icon?: SiteIconName;
}) {
  const inner = (
    <>
      <span className="mems-icon-tile">
        <SiteIcon name={icon} />
      </span>
      <div>
        <span className="mems-callout__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {href && label && <span className="mems-card-link">{label}<SiteIcon name="external" /></span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="mems-callout">
        {inner}
      </Link>
    );
  }
  return <section className="mems-callout">{inner}</section>;
}
