import Image from "next/image";
import { serenityScript } from "@/app/fonts";
import StarOfLife from "./StarOfLife";
import { LEGEND, type MissionVisionValuesContent } from "./pillars";
import {
  Candy,
  CandyCane,
  GingerbreadDefs,
  GingerbreadRoofs,
  Holly,
  Moon,
  NightSky,
  Pines,
  SnowGround,
  Sparkle,
  WaterTower,
  roofVars,
} from "./GingerbreadArt";
import s from "./GingerbreadHouse.module.css";

const VALUE_CANDIES = ["pep", "gum-r", "gum-g", "pep", "gum-y", "gum-r"] as const;

function Twine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 26" aria-hidden="true" focusable="false">
      <g fill="none" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10,24 C6,16 4,8 6,1" stroke="#fffaf2" />
        <path d="M10,24 C14,16 16,8 14,1" stroke="#fffaf2" />
        <path d="M10,24 C6,16 4,8 6,1" stroke="#d0202f" strokeDasharray="2 2.2" />
        <path d="M10,24 C14,16 16,8 14,1" stroke="#d0202f" strokeDasharray="2 2.2" />
      </g>
    </svg>
  );
}

/** Christmas look: the Millstadt EMS gingerbread house under a night sky. */
export default function GingerbreadHouse({ mission, vision, pillars, values }: MissionVisionValuesContent) {
  const script = serenityScript.className;

  return (
    <section className={s.scene} aria-label="Mission, vision and values">
      <GingerbreadDefs />
      <div className={s.sky} aria-hidden="true">
        <NightSky className={s.stars} />
        <Moon className={s.moon} />
      </div>

      <p className={s.greeting}>
        <span className={`${script} ${s.merry}`}>Merry Christmas</span>
        <span className={s.from}>
          <Sparkle className={s.fromSpark} />
          <span>from Millstadt EMS</span>
          <Sparkle className={s.fromSpark} />
        </span>
      </p>

      <div className={s.house} style={roofVars()}>
        <WaterTower className={s.tower} />

        <div className={s.roof}>
          <GingerbreadRoofs />
          <div className={s.crest}>
            <Image
              src="/images/winter/logos/christmas-crest.webp"
              alt="Millstadt EMS Christmas logo with a Santa hat"
              fill
              sizes="(min-width: 1024px) 270px, (min-width: 640px) 220px, 140px"
            />
          </div>
        </div>

        <div className={s.walls}>
          <div className={s.field} aria-hidden="true" />
          <Pines className={`${s.pines} ${s.pinesLeft}`} />
          <Pines className={`${s.pines} ${s.pinesRight}`} />

          <div className={s.mv}>
            <article className={s.panel} aria-labelledby="gb-mission">
              <h2 id="gb-mission" className={s.panelTitle}>
                <span className={script}>Mission</span>
                <Holly className={s.holly} />
              </h2>
              <p>{mission}</p>
            </article>
            <article className={s.panel} aria-labelledby="gb-vision">
              <h2 id="gb-vision" className={s.panelTitle}>
                <span className={script}>Vision</span>
                <Holly className={s.holly} />
              </h2>
              <p>{vision}</p>
            </article>
          </div>

          <div className={s.ribbon}>
            <h2 className={`${script} ${s.ribbonTitle}`}>Pillars of Excellence</h2>
            <p className={`${s.tag} ${s.tagFunction}`}>
              <Twine className={s.twine} />
              <span className={s.tagBody}>
                <StarOfLife className={s.tagStar} size={20} />
                <span className={s.tagText}>{LEGEND.function}</span>
              </span>
            </p>
            <p className={`${s.tag} ${s.tagPrinciple}`}>
              <Twine className={s.twine} />
              <span className={s.tagBody}>
                <Sparkle className={s.tagMark} />
                <span className={s.tagText}>{LEGEND.principle}</span>
              </span>
            </p>
          </div>

          <div className={s.porch}>
            <ol className={s.pillars}>
              {pillars.map((pillar) => (
                <li key={pillar.fn} className={s.pillar}>
                  <span className={s.cap} aria-hidden="true" />
                  <StarOfLife className={s.pillarStar} size={22} />
                  <h3 className={s.fn}>{pillar.fn}</h3>
                  <svg className={s.mark} viewBox="-20 -5 40 10" aria-hidden="true" focusable="false">
                    <path d="M-18,0 H-8 M8,0 H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <use href="#gb-sparkle" fill="currentColor" transform="scale(0.85)" />
                  </svg>
                  <p className={s.principle}>
                    <span className="sr-only">{LEGEND.principle}: </span>
                    {pillar.principle}
                  </p>
                  <p className={s.desc}>{pillar.desc}</p>
                  <span className={s.base} aria-hidden="true" />
                </li>
              ))}
            </ol>
          </div>

          <div className={s.values}>
            <h2 className={s.valuesTitle}>
              <Holly className={s.holly} />
              <span className={script}>Core Values</span>
              <Holly className={s.holly} flip />
            </h2>
            <ul className={s.valueList}>
              {values.map((value, i) => (
                <li key={value.label}>
                  <h3>
                    <Candy kind={VALUE_CANDIES[i % VALUE_CANDIES.length]} className={s.valueCandy} />
                    {value.label}
                  </h3>
                  <p>{value.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          <CandyCane className={`${s.cane} ${s.caneLeft}`} />
          <CandyCane className={`${s.cane} ${s.caneRight}`} />
        </div>
      </div>

      <SnowGround />
    </section>
  );
}
