import Image from "next/image";
import StarOfLife from "./StarOfLife";
import { LEGEND, type MissionVisionValuesContent } from "./pillars";
import t from "./PillarsTemple.module.css";

/* Stone gradients shared by the pediment, capitals and bases. */
function TempleDefs() {
  return (
    <svg className={t.defs} width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="tp-tympanum" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081830" />
          <stop offset="0.6" stopColor="#0f2649" />
          <stop offset="1" stopColor="#163360" />
        </linearGradient>
        <radialGradient id="tp-tympanum-glow" cx="0.5" cy="1" r="0.6">
          <stop offset="0" stopColor="#f0b429" stopOpacity="0.16" />
          <stop offset="1" stopColor="#f0b429" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tp-abacus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf9" />
          <stop offset="0.55" stopColor="#ebe5da" />
          <stop offset="1" stopColor="#d2c9b8" />
        </linearGradient>
        <linearGradient id="tp-echinus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d0c0" />
          <stop offset="0.35" stopColor="#f4f0e8" />
          <stop offset="1" stopColor="#cfc5b3" />
        </linearGradient>
        <linearGradient id="tp-torus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f9f6f0" />
          <stop offset="0.5" stopColor="#e6dfd2" />
          <stop offset="1" stopColor="#bdb29d" />
        </linearGradient>
        <linearGradient id="tp-plinth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3efe7" />
          <stop offset="1" stopColor="#d6cdbd" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Pediment() {
  const roof = "0,200 500,0 1000,200";
  return (
    <svg className={t.pedimentArt} viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polygon points={roof} fill="url(#tp-tympanum)" />
      <polygon points={roof} fill="url(#tp-tympanum-glow)" />
      {/* Raking cornice: strokes keep a constant thickness however the pediment stretches. */}
      <polyline points={roof} fill="none" stroke="#04101f" strokeWidth="32" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
      <polyline points={roof} fill="none" stroke="#e8e2d6" strokeWidth="27" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
      <polyline points={roof} fill="none" stroke="#f8f5ef" strokeWidth="13" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" opacity="0.75" />
      <polyline points={roof} fill="none" stroke="#c39a45" strokeWidth="1.6" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Capital() {
  return (
    <svg className={t.capital} viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M3,12 H197 C192,22 186,29 181,31 H19 C14,29 8,22 3,12 Z" fill="url(#tp-echinus)" />
      <rect x="0" y="0" width="200" height="12.5" fill="url(#tp-abacus)" />
      <path d="M0,0.5 H200" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M0,12.5 H200" stroke="#a3967e" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M19,31.5 H181 M20,33.5 H180" stroke="#ab9f88" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ColumnBase() {
  return (
    <svg className={t.columnBase} viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="9" y="0" width="182" height="11" rx="5.5" fill="url(#tp-torus)" />
      <rect x="13" y="11" width="174" height="3" fill="#b9ae99" />
      <rect x="0" y="14" width="200" height="16" fill="url(#tp-plinth)" />
      <path d="M0,14.5 H200" stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.9" />
      <path d="M0,29.5 H200" stroke="#9b8f78" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Normal-season look: the Pillars of Excellence temple. */
export default function PillarsTemple({ mission, vision, pillars, values }: MissionVisionValuesContent) {
  return (
    <section className={t.scene} aria-label="Mission, vision and values">
      <TempleDefs />
      <div className={t.temple}>
        <div className={t.pediment}>
          <Pediment />
          <div className={t.logo}>
            <div className={t.logoImage}>
              <Image
                src="/images/millstadt-ems/logo.png"
                alt="Millstadt EMS"
                fill
                sizes="(min-width: 1024px) 220px, (min-width: 640px) 180px, 130px"
              />
            </div>
          </div>
        </div>
        <div className={t.cornice} aria-hidden="true" />

        <div className={t.tablet}>
          <article aria-labelledby="tp-mission">
            <h2 id="tp-mission">Mission</h2>
            <p>{mission}</p>
          </article>
          <span className={t.tabletRule} aria-hidden="true" />
          <article aria-labelledby="tp-vision">
            <h2 id="tp-vision">Vision</h2>
            <p>{vision}</p>
          </article>
        </div>

        <div className={t.frieze}>
          <h2 className={t.friezeTitle}>Pillars of Excellence</h2>
        </div>
        <ul className={t.legend} aria-label="Legend">
          <li>
            <StarOfLife className={t.legendStar} size={19} />
            {LEGEND.function}
          </li>
          <li>
            <span className={t.legendMark} aria-hidden="true" />
            {LEGEND.principle}
          </li>
        </ul>

        <div className={t.colonnade}>
          <ol className={t.columns}>
            {pillars.map((pillar) => (
              <li key={pillar.fn} className={t.column}>
                <Capital />
                <StarOfLife className={t.columnStar} size={24} />
                <h3 className={t.fn}>{pillar.fn}</h3>
                <span className={t.mark} aria-hidden="true" />
                <p className={t.principle}>
                  <span className="sr-only">{LEGEND.principle}: </span>
                  {pillar.principle}
                </p>
                <p className={t.desc}>{pillar.desc}</p>
                <ColumnBase />
              </li>
            ))}
          </ol>
        </div>

        <div className={t.stylobate}>
          <h2 className={t.valuesTitle}>Core Values</h2>
          <ul className={t.values}>
            {values.map((value) => (
              <li key={value.label}>
                <h3>{value.label}</h3>
                <p>{value.desc}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className={t.steps} aria-hidden="true">
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}
