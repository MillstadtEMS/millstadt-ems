"use client";

/**
 * Faithful web port of /Users/kj/ECG Simulator/src/app/screens/BloodGasScreen.tsx.
 *
 * The original is a React Native screen — same engine wiring, same i-Lab Pro
 * device mockup, same printer-paper receipt, same per-question feedback flow.
 * This file translates RN primitives to plain DOM (View → div, Text → span,
 * Pressable → button, StyleSheet → inline style objects). Drops RN-only
 * concerns (SafeAreaView, useWindowDimensions → window resize, HapticPressable,
 * mastery progress logging) and the lounge already gives us auth + leaderboard.
 *
 * Layout matches the original at the 900 px breakpoint: three-column stage
 * with device | receipt | questions; stacks to a single column on phones.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ABG_INTERPRETATION_REFERENCE,
  BLOOD_GAS_MASTERY_TIERS,
} from "@/lib/lounge/games/abg-sim/abgCatalog";
import { bloodGasMasteryTierForState, bloodGasScorePercent } from "@/lib/lounge/games/abg-sim/abgEngine";
import {
  bloodGasTeachingBullets,
  dynamicCaseToBloodGasValues,
  evaluateBloodGasAnswers,
  fullBloodGasInterpretation,
  generateBloodGasCase,
  labelForBloodGasAnswer,
  visibleBloodGasQuestions,
  type BloodGasAnswerResult,
  type BloodGasLevel,
  type BloodGasQuestionId,
  type DynamicBloodGasCase,
} from "@/lib/lounge/games/abg-sim/abgDynamicEngine";
import type { BloodGasFlag, BloodGasValue } from "@/lib/lounge/games/abg-sim/abgTypes";
import { ding, buzzer, chime, isMuted, setMuted } from "../lead-ii/LeadIIAudio";

type LoungeLevelId = "beginner" | "intermediate" | "expert";

const LEVEL_TO_ENGINE: Record<LoungeLevelId, BloodGasLevel> = {
  beginner: "baby",
  intermediate: "intermediate",
  expert: "expert",
};
const LEVEL_LABEL: Record<LoungeLevelId, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Expert",
};
const LEVEL_DESC: Record<LoungeLevelId, string> = {
  beginner:     "pH + primary problem. Acidosis, alkalosis, normal. Read it off the print.",
  intermediate: "Adds compensation, oxygenation, anion gap. Same printout, more questions.",
  expert:       "Winter's, delta-delta, A-a, clinical priority. Mixed disorders show up.",
};
const LEVEL_ACCENT: Record<LoungeLevelId, string> = {
  beginner: "#2ff587",
  intermediate: "#7dd3fc",
  expert: "#f2b84b",
};

type Route =
  | { name: "intro" }
  | { name: "select" }
  | { name: "play"; level: LoungeLevelId };

export default function AbgSimApp({ playerName }: { playerName: string }) {
  const [route, setRoute] = useState<Route>({ name: "intro" });
  return (
    <div style={S.root}>
      <TopBar />
      {route.name === "intro" && <IntroScreen onAdvance={() => setRoute({ name: "select" })} />}
      {route.name === "select" && (
        <LevelSelect playerName={playerName} onPlay={(level) => setRoute({ name: "play", level })} />
      )}
      {route.name === "play" && (
        <PlayScreen level={route.level} onExit={() => setRoute({ name: "select" })} />
      )}
    </div>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────────
function TopBar() {
  const [muted, setMutedState] = useState(false);
  useEffect(() => { setMutedState(isMuted()); }, []);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", borderBottom: "1px solid #26323f",
      background: "#090d12",
    }}>
      <Link href="/lounge/games" style={{ color: "#f2b84b", fontFamily: "VT323, ui-monospace, monospace", fontSize: 18, textDecoration: "none", letterSpacing: "0.06em" }}>
        ← GAMES
      </Link>
      <button
        type="button"
        onClick={() => { const next = !muted; setMuted(next); setMutedState(next); }}
        style={{
          background: "#05070a", border: "1px solid #26323f", color: muted ? "#ff6b7a" : "#2ff587",
          fontFamily: "VT323, ui-monospace, monospace", fontSize: 18, padding: "4px 14px", borderRadius: 4, cursor: "pointer",
        }}
      >
        {muted ? "🔇 MUTED" : "🔊 SOUND"}
      </button>
    </div>
  );
}

// ── Intro screen ─────────────────────────────────────────────────────────
function IntroScreen({ onAdvance }: { onAdvance: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    chime();
    const ts = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1800),
      setTimeout(() => setStep(3), 2900),
    ];
    return () => { ts.forEach(clearTimeout); };
  }, []);
  return (
    <div onClick={onAdvance} style={{
      minHeight: "70vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      cursor: "pointer", padding: "30px 16px", fontFamily: "VT323, ui-monospace, monospace",
    }}>
      <div style={{
        fontSize: "clamp(56px, 14vw, 144px)", color: "#2ff587",
        textShadow: "0 0 18px #2ff58788",
        letterSpacing: "0.08em", lineHeight: 1, opacity: step >= 1 ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}>ABG</div>
      <div style={{
        fontSize: "clamp(18px, 4vw, 28px)", color: "#f2b84b",
        marginTop: 8, letterSpacing: "0.16em", opacity: step >= 2 ? 1 : 0,
        transition: "opacity 600ms ease-out",
      }}>i-LAB PRO · BLOOD GAS</div>
      <div style={{
        marginTop: 36, color: "#8adf9d", fontSize: 18,
        opacity: step >= 3 ? 1 : 0, transition: "opacity 600ms ease-out",
        letterSpacing: "0.12em",
      }}>TAP TO BEGIN</div>
    </div>
  );
}

// ── Level select ─────────────────────────────────────────────────────────
function LevelSelect({ playerName, onPlay }: { playerName: string; onPlay: (level: LoungeLevelId) => void }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 14px 60px", fontFamily: "VT323, ui-monospace, monospace" }}>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div style={{ color: "#f2b84b", fontSize: 18, letterSpacing: "0.2em" }}>// SELECT MODE //</div>
        <h2 style={{ color: "#2ff587", margin: "6px 0 0", fontSize: 40, letterSpacing: "0.06em" }}>
          HELLO, {playerName.toUpperCase()}
        </h2>
      </div>
      <p style={{ color: "#8adf9d", textAlign: "center", marginTop: 12, fontSize: 18, lineHeight: 1.55 }}>
        Each round prints a fresh blood gas. Read the slip, work the questions, lock the interpretation.
        Higher tiers unlock more questions per case — compensation, anion gap, Winter, delta-delta, A-a, clinical priority.
      </p>
      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {(["beginner", "intermediate", "expert"] as LoungeLevelId[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onPlay(level)}
            style={{
              background: "#090d12",
              border: "2px solid #26323f",
              borderLeft: `6px solid ${LEVEL_ACCENT[level]}`,
              borderRadius: 4,
              padding: "16px 20px",
              textAlign: "left",
              cursor: "pointer",
              color: "#2ff587",
              fontFamily: "VT323, ui-monospace, monospace",
            }}
          >
            <div style={{ fontSize: 30, letterSpacing: "0.08em" }}>{LEVEL_LABEL[level].toUpperCase()}</div>
            <div style={{ color: "#8adf9d", fontSize: 18, marginTop: 4 }}>{LEVEL_DESC[level]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Play screen — mirrors the original BloodGasScreen ────────────────────
function PlayScreen({ level: loungeLevel, onExit }: { level: LoungeLevelId; onExit: () => void }) {
  const engineLevel = LEVEL_TO_ENGINE[loungeLevel];
  const [caseNo, setCaseNo] = useState(1);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selections, setSelections] = useState<Partial<Record<BloodGasQuestionId, string>>>({});
  const [gasCase, setGasCase] = useState(() =>
    generateBloodGasCase({ mode: "ABG", level: engineLevel, seed: newSeed() })
  );
  const [isWide, setIsWide] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    function check() { setIsWide(window.innerWidth >= 900); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const values = useMemo(() => dynamicCaseToBloodGasValues(gasCase), [gasCase]);
  const questions = useMemo(() => visibleBloodGasQuestions(gasCase, engineLevel), [gasCase, engineLevel]);
  const results = useMemo(
    () => (answered ? evaluateBloodGasAnswers(gasCase, engineLevel, selections) : []),
    [answered, gasCase, engineLevel, selections]
  );
  const allAnswered = questions.every((q) => selections[q.id] !== undefined);
  const mastery = bloodGasMasteryTierForState({ right, wrong });
  const percent = bloodGasScorePercent({ right, wrong });

  function regenerate(resetCaseNo = false) {
    const nextCaseNo = resetCaseNo ? 1 : caseNo + 1;
    setCaseNo(nextCaseNo);
    setSelections({});
    setAnswered(false);
    setGasCase(generateBloodGasCase({ mode: "ABG", level: engineLevel, seed: newSeed() + nextCaseNo }));
  }

  function resetSession() {
    setRight(0); setWrong(0); setStreak(0); setBestStreak(0);
    setCaseNo(0);
    submitted.current = false;
    regenerate(true);
  }

  function submit() {
    if (!allAnswered || answered) return;
    const submittedResults = evaluateBloodGasAnswers(gasCase, engineLevel, selections);
    const allOk = submittedResults.every((r) => r.ok);
    setAnswered(true);
    if (allOk) {
      ding();
      setRight((v) => v + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      buzzer();
      setWrong((v) => v + 1);
      setStreak(0);
    }
  }

  function endSession() {
    if (!submitted.current && (right > 0 || wrong > 0)) {
      submitted.current = true;
      const score = right * 25 + bestStreak * 5;
      void fetch("/api/lounge/games/abg-sim/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score, level: loungeLevel,
          correct: right, wrong, casesFinished: right + wrong,
        }),
      });
    }
    onExit();
  }

  return (
    <div style={S.scroll}>
      <div style={S.header}>
        <button type="button" onClick={endSession} style={S.backButton}>‹ END SESSION</button>
        <div style={S.brandWrap}>
          <div style={S.brandTitle}>CARDIOMEDIC</div>
          <div style={S.brandSub}>ABG / VBG DYNAMIC CASE ENGINE · {LEVEL_LABEL[loungeLevel].toUpperCase()}</div>
        </div>
        <div style={S.statusPill}>
          <span style={{ ...S.statusDot, background: answered ? "#f2b84b" : "#2ff587" }} />
          <span style={{ ...S.statusText, color: answered ? "#f2b84b" : "#2ff587" }}>
            {answered ? "RESULT LOCKED" : `READY · CASE ${String(caseNo).padStart(3, "0")}`}
          </span>
        </div>
      </div>

      <AuditStrip right={right} wrong={wrong} streak={streak} masteryLabel={mastery.label} />

      <div style={{ ...S.stage, ...(isWide ? S.stageWide : {}) }}>
        <div style={S.deviceColumn}>
          <ILabDevice gasCase={gasCase} caseNumber={caseNo} answered={answered} />
        </div>
        <div style={S.paperColumn}>
          <DynamicReceipt gasCase={gasCase} values={values} />
        </div>
        <div style={S.questionColumn}>
          <QuestionPanel
            gasCase={gasCase}
            engineLevel={engineLevel}
            selections={selections}
            answered={answered}
            onSelect={(id, optionId) => setSelections((p) => ({ ...p, [id]: optionId }))}
          />
        </div>
      </div>

      {answered && <FeedbackPanel gasCase={gasCase} engineLevel={engineLevel} results={results} />}

      <div style={S.controlBar}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={S.masteryHeaderLabel}>MASTERY PROGRESSION</div>
          <div style={S.masteryHeaderValue}>{mastery.label} — {mastery.description}</div>
        </div>
        <div style={S.masteryRail}>
          {BLOOD_GAS_MASTERY_TIERS.map((tier) => (
            <div key={tier.id} style={S.tierBadgeColumn}>
              <div style={{ ...S.tierBadgeMini, ...(tier.id === mastery.id ? S.tierBadgeMiniActive : {}) }}>
                <span style={S.tierBadgeText}>{tier.badge}</span>
              </div>
              <span style={S.tierBadgeFullLabel}>{tier.label}</span>
            </div>
          ))}
        </div>
        <div style={S.actionRow}>
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered || answered}
            style={{ ...S.primaryButton, ...(!allAnswered || answered ? S.disabledButton : {}) }}
          >
            LOCK INTERPRETATION
          </button>
          <button type="button" onClick={() => regenerate()} style={S.secondaryButton}>
            {answered ? "PRINT NEXT SAMPLE" : "NEW SAMPLE"}
          </button>
          <button type="button" onClick={resetSession} style={S.secondaryButton}>
            RESET · {percent}%
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit strip ──────────────────────────────────────────────────────────
function AuditStrip({ right, wrong, streak, masteryLabel }: {
  right: number; wrong: number; streak: number; masteryLabel: string;
}) {
  return (
    <div style={S.auditStrip}>
      <div style={S.auditPill}>
        <span style={S.auditLabel}>CORRECT</span>
        <span style={{ ...S.auditNumber, color: "#2ff587" }}>{right}</span>
      </div>
      <div style={S.auditPill}>
        <span style={S.auditLabel}>MISSED</span>
        <span style={{ ...S.auditNumber, color: "#ff6b7a" }}>{wrong}</span>
      </div>
      <div style={S.auditPill}>
        <span style={S.auditLabel}>STREAK</span>
        <span style={{ ...S.auditNumber, color: "#fff" }}>{streak}</span>
      </div>
      <div style={{ ...S.auditPill, minWidth: 168 }}>
        <span style={S.auditLabel}>MASTERY</span>
        <span style={{ ...S.auditNumber, color: "#f2b84b", fontSize: 18 }}>{masteryLabel}</span>
      </div>
    </div>
  );
}

// ── i-Lab Pro device mockup ─────────────────────────────────────────────
function ILabDevice({ gasCase, caseNumber, answered }: {
  gasCase: DynamicBloodGasCase; caseNumber: number; answered: boolean;
}) {
  return (
    <div style={S.device}>
      <div style={S.deviceSideLeft} />
      <div style={S.deviceSideRight} />
      <div style={S.deviceTopLight} />
      <div style={S.deviceBrand}>CARDIOMEDIC</div>
      <div style={S.deviceModelRow}>
        <span style={S.deviceModel}>i-Lab Pro</span>
        <span style={S.deviceModelSub}>· Point-of-Care</span>
      </div>
      <div style={S.printSlot}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} style={S.slotTooth} />
        ))}
        <span style={S.slotPrintLabel}>PRINT</span>
      </div>
      <div style={S.lcdBezel}>
        <div style={S.lcd}>
          <div style={S.lcdTopRow}>
            <span style={S.lcdMode}>● {gasCase.sample} · pH</span>
            <span style={S.lcdTime}>CASE {String(caseNumber).padStart(3, "0")}</span>
          </div>
          <div style={S.lcdDivider} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              ["PATIENT", `SIM-${String(caseNumber).padStart(3, "0")}`],
              ["CARTRIDGE", `${gasCase.sample === "ABG" ? "CG4+" : "CG8+"} · ${gasCase.sample}`],
              ["FiO2", gasCase.fio2.toFixed(2)],
              ["OPERATOR", "CARDIOMEDIC"],
            ].map(([label, value]) => (
              <div key={label} style={S.lcdMetric}>
                <span style={S.lcdLabel}>{label}</span>
                <span style={S.lcdValue}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ ...S.resultStatus, ...(answered ? S.resultStatusLocked : {}) }}>
            <span style={{ ...S.resultStatusText, color: answered ? "#f2b84b" : "#2ff587" }}>
              {answered ? "RESULT LOCKED" : "RESULT READY"}
            </span>
            <span style={S.resultSubText}>{answered ? "TEACHING OPEN" : "PRINTING TO PAPER"}</span>
          </div>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: answered ? "100%" : "72%" }} />
          </div>
          <div style={S.analysisText}>ANALYSIS · 130s · COMPLETE</div>
        </div>
      </div>
      <div style={S.keypadArea}>
        <div style={S.navPad}>
          <span style={S.navArrow}>▲</span>
          <div style={S.navMiddleRow}>
            <span style={S.navArrow}>◀</span>
            <span style={S.navPadText}>●</span>
            <span style={S.navArrow}>▶</span>
          </div>
          <span style={S.navArrow}>▼</span>
        </div>
        <div style={S.keys}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "ENT"].map((key) => (
            <div key={key} style={{ ...S.key, ...(key === "ENT" ? S.keyEnt : {}) }}>
              <span style={{ ...S.keyText, ...(key === "ENT" ? S.keyEntText : {}) }}>{key}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={S.cartridgePort}>
        <div style={S.portLabel}>CARTRIDGE PORT</div>
        <div style={S.cartridge}>
          <div style={S.sampleWell}>
            <span style={S.sampleWellText}>{gasCase.sample === "ABG" ? "CG4+" : "CG8+"}</span>
          </div>
          <div style={S.cartridgeBody}>
            <div style={S.bloodLane} />
            <span style={S.sampleLaneText}>SAMPLE WELL · 95uL</span>
          </div>
        </div>
      </div>
      <div style={S.powerRow}>
        <span style={S.powerText}>PWR</span>
        <span style={S.powerLed} />
      </div>
    </div>
  );
}

// ── Receipt printout ─────────────────────────────────────────────────────
type ValueGroup = "BLOOD GAS" | "CALCULATED" | "ELECTROLYTES" | "METABOLITES";
const FLAG_GLYPH: Record<BloodGasFlag, string> = { "": "", L: "v", H: "^", LL: "vv", HH: "^^" };

function groupForValue(name: string): ValueGroup {
  if (["pH", "pCO2", "pO2", "HCO3", "pvCO2", "pvO2"].includes(name)) return "BLOOD GAS";
  if (["TCO2", "BEecf", "sO2", "svO2", "AG", "A-a"].includes(name)) return "CALCULATED";
  if (["Na+", "K+", "Cl-", "iCa"].includes(name)) return "ELECTROLYTES";
  return "METABOLITES";
}
function groupedValues(values: readonly BloodGasValue[]): [ValueGroup, BloodGasValue[]][] {
  const groups: Record<ValueGroup, BloodGasValue[]> = {
    "BLOOD GAS": [], CALCULATED: [], ELECTROLYTES: [], METABOLITES: [],
  };
  for (const v of values) groups[groupForValue(v.name)].push(v);
  return Object.entries(groups) as [ValueGroup, BloodGasValue[]][];
}
function flagColor(flag: BloodGasFlag): string {
  if (flag === "LL" || flag === "HH") return "#cc0000";
  if (flag === "L") return "#0066cc";
  if (flag === "H") return "#cc6600";
  return "#1a1a1a";
}

function DynamicReceipt({ gasCase, values }: { gasCase: DynamicBloodGasCase; values: readonly BloodGasValue[] }) {
  return (
    <div style={S.receipt}>
      <div style={S.receiptBrand}>CardioMedic i-Lab Pro</div>
      <div style={S.receiptSub}>Point of Care · Dynamic Blood Gas Panel</div>
      <div style={S.receiptRule} />
      <div style={S.metaRow}>
        <span style={S.metaText}>Cartridge: BGX+</span>
        <span style={S.metaText}>Sample: {gasCase.sample}</span>
      </div>
      <div style={S.metaRow}>
        <span style={S.metaText}>FiO2: {gasCase.fio2.toFixed(2)}</span>
        <span style={S.metaText}>Template: {gasCase.templateId.slice(0, 18)}</span>
      </div>
      <p style={S.contextText}>{gasCase.vignette}</p>
      {groupedValues(values).map(([group, groupValues]) => (
        <div key={group}>
          <div style={S.sectionTitle}>{group}</div>
          {groupValues.map((v) => <ReceiptValueRow key={`${gasCase.key}-${v.name}`} value={v} />)}
        </div>
      ))}
    </div>
  );
}

function ReceiptValueRow({ value }: { value: BloodGasValue }) {
  const critical = value.flag === "LL" || value.flag === "HH";
  const num = critical ? "#cc0000" : "#1a1a1a";
  return (
    <div style={S.valueRow}>
      <span style={{ ...S.valueName, color: num }}>{value.name}</span>
      <span style={S.dottedLeader} />
      <span style={{ ...S.valueNumber, color: num }}>{value.value}</span>
      <span style={S.valueUnit}>{value.unit}</span>
      <span style={{ ...S.valueFlag, color: flagColor(value.flag) }}>{FLAG_GLYPH[value.flag]}</span>
    </div>
  );
}

// ── Question panel ───────────────────────────────────────────────────────
function QuestionPanel({ gasCase, engineLevel, selections, answered, onSelect }: {
  gasCase: DynamicBloodGasCase;
  engineLevel: BloodGasLevel;
  selections: Partial<Record<BloodGasQuestionId, string>>;
  answered: boolean;
  onSelect: (id: BloodGasQuestionId, optionId: string) => void;
}) {
  const questions = visibleBloodGasQuestions(gasCase, engineLevel);
  return (
    <div style={S.questionPanel}>
      <div style={S.panelKicker}>INTERPRETATION</div>
      <div style={S.caseTitle}>{gasCase.title}</div>
      <p style={S.caseVignette}>{gasCase.vignette}</p>
      {questions.map((q) => (
        <div key={q.id} style={S.questionCard}>
          <div style={S.questionTitle}>{q.title}</div>
          <p style={S.questionHint}>{q.hint}</p>
          <div style={S.optionGrid}>
            {q.options.map((option) => {
              const selected = selections[q.id] === option.id;
              const correct = gasCase.answer[q.id] === option.id;
              const wrongLocked = answered && selected && !correct;

              let optStyle: React.CSSProperties = { ...S.option };
              let textColor = "#d7dee6";
              if (answered && correct) {
                optStyle = { ...optStyle, ...S.optionCorrect };
                textColor = "#2ff587";
              } else if (wrongLocked) {
                optStyle = { ...optStyle, ...S.optionWrong };
                textColor = "#ff8d99";
              } else if (selected && !answered) {
                optStyle = { ...optStyle, ...S.optionSelected };
                textColor = "#f2b84b";
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={answered}
                  onClick={() => onSelect(q.id, option.id)}
                  style={{ ...optStyle, cursor: answered ? "default" : "pointer" }}
                >
                  <span style={{ ...S.optionText, color: textColor }}>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Feedback panel ───────────────────────────────────────────────────────
function FeedbackPanel({ gasCase, engineLevel, results }: {
  gasCase: DynamicBloodGasCase;
  engineLevel: BloodGasLevel;
  results: readonly BloodGasAnswerResult[];
}) {
  const allCorrect = results.every((r) => r.ok);
  const missed = results.filter((r) => !r.ok);
  return (
    <div style={{ ...S.feedbackPanel, ...(allCorrect ? S.feedbackGood : S.feedbackBad) }}>
      <div style={S.feedbackTitle}>{allCorrect ? "LOCKED IN · CORRECT" : "NOT QUITE — CLEAN READ"}</div>
      <div style={S.feedbackSummary}>
        Complete interpretation: {fullBloodGasInterpretation(gasCase, engineLevel)}
      </div>
      {bloodGasTeachingBullets(gasCase, engineLevel).map((bullet, i) => (
        <div key={i} style={S.feedbackBullet}>• {bullet}</div>
      ))}
      {missed.length > 0 && (
        <div style={S.feedbackMiss}>
          Missed: {missed.map((r) => `${r.label} should be ${labelForBloodGasAnswer(r.id, r.correct)}`).join("; ")}.
        </div>
      )}
      <div style={S.referenceText}>{ABG_INTERPRETATION_REFERENCE.citation}</div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────
function newSeed(): number {
  return Date.now() % 2147483647;
}

// ── Styles (port of the original StyleSheet.create) ──────────────────────
const tabular: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };
const S = {
  root: { minHeight: "100vh", background: "#05070a", color: "white" } as React.CSSProperties,
  scroll: { padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 16 } as React.CSSProperties,
  header: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" } as React.CSSProperties,
  backButton: {
    alignSelf: "flex-start", border: "1px solid #26323f", borderRadius: 999,
    padding: "8px 12px", background: "#090d12", color: "#9aa6b0",
    fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties,
  brandWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 } as React.CSSProperties,
  brandTitle: { color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: "0.22em" } as React.CSSProperties,
  brandSub: { color: "#f2b84b", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" } as React.CSSProperties,
  statusPill: {
    display: "flex", flexDirection: "row", alignItems: "center", gap: 8,
    border: "1px solid #164b31", borderRadius: 999, padding: "7px 12px", background: "#07110c",
  } as React.CSSProperties,
  statusDot: { width: 7, height: 7, borderRadius: 999, background: "#2ff587", display: "inline-block" } as React.CSSProperties,
  statusText: { fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "#2ff587" } as React.CSSProperties,
  auditStrip: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" } as React.CSSProperties,
  auditPill: {
    minWidth: 86, borderRadius: 10, border: "1px solid #1e2a35", background: "#0a1017",
    padding: "10px 12px", display: "flex", flexDirection: "column",
  } as React.CSSProperties,
  auditLabel: { color: "#6f7b86", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em" } as React.CSSProperties,
  auditNumber: { color: "#fff", fontSize: 22, fontWeight: 900, ...tabular } as React.CSSProperties,
  stage: {
    display: "flex", flexDirection: "column", gap: 16, borderRadius: 18,
    border: "1px solid #1d2732", background: "#111821", padding: 14, overflow: "hidden",
  } as React.CSSProperties,
  stageWide: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center" } as React.CSSProperties,
  deviceColumn: { display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
  paperColumn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
  questionColumn: { flex: 1.15 } as React.CSSProperties,

  // ── i-Lab device
  device: {
    width: 280, minHeight: 580, borderRadius: 28,
    background: "#17232e", border: "1px solid #3a4a58",
    padding: "22px 24px 18px", display: "flex", flexDirection: "column", gap: 12,
    overflow: "hidden", position: "relative",
    boxShadow: "0 16px 26px rgba(0,0,0,0.45)",
  } as React.CSSProperties,
  deviceSideLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: 32, background: "#0f171f", opacity: 0.5 } as React.CSSProperties,
  deviceSideRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: 32, background: "#253542", opacity: 0.42 } as React.CSSProperties,
  deviceTopLight: { position: "absolute", top: 2, left: 32, right: 32, height: 3, borderRadius: 999, background: "#5a6878", opacity: 0.5 } as React.CSSProperties,
  deviceBrand: { textAlign: "center", color: "#9aa6b0", fontSize: 9, fontWeight: 800, letterSpacing: "0.30em" } as React.CSSProperties,
  deviceModelRow: { display: "flex", flexDirection: "row", justifyContent: "center", alignItems: "baseline", gap: 5 } as React.CSSProperties,
  deviceModel: { color: "#fff", fontSize: 16, fontWeight: 900 } as React.CSSProperties,
  deviceModelSub: { color: "#5a6878", fontSize: 10, fontWeight: 800 } as React.CSSProperties,
  printSlot: { height: 15, borderRadius: 3, background: "#020405", display: "flex", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 2, position: "relative" } as React.CSSProperties,
  slotTooth: { width: 1, height: 3, background: "#000" } as React.CSSProperties,
  slotPrintLabel: { position: "absolute", right: -1, top: 5, color: "#5a6878", fontSize: 6, fontWeight: 900, letterSpacing: "0.08em" } as React.CSSProperties,
  lcdBezel: { borderRadius: 6, border: "1px solid #020405", background: "#000", padding: 6 } as React.CSSProperties,
  lcd: { borderRadius: 3, border: "1px solid #092416", background: "#03150a", padding: 10, display: "flex", flexDirection: "column", gap: 8 } as React.CSSProperties,
  lcdTopRow: { display: "flex", flexDirection: "row", justifyContent: "space-between" } as React.CSSProperties,
  lcdMode: { color: "#2ff587", fontSize: 9, fontWeight: 900, letterSpacing: "0.14em" } as React.CSSProperties,
  lcdTime: { color: "#8adf9d", fontSize: 9, fontWeight: 800 } as React.CSSProperties,
  lcdDivider: { height: 1, background: "#0a3b22" } as React.CSSProperties,
  lcdMetric: { display: "flex", flexDirection: "row", justifyContent: "space-between" } as React.CSSProperties,
  lcdLabel: { color: "#2ff587", fontSize: 9, fontWeight: 700 } as React.CSSProperties,
  lcdValue: { color: "#2ff587", fontSize: 9, fontWeight: 900 } as React.CSSProperties,
  resultStatus: { borderRadius: 4, border: "1px solid #2ff587", background: "#0a2b1b", padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center" } as React.CSSProperties,
  resultStatusLocked: { borderColor: "#f2b84b", background: "#302907" } as React.CSSProperties,
  resultStatusText: { color: "#2ff587", fontSize: 10, fontWeight: 900, letterSpacing: "0.18em" } as React.CSSProperties,
  resultSubText: { marginTop: 2, color: "#8fa89a", fontSize: 8, fontWeight: 800, letterSpacing: "0.06em", textAlign: "center" } as React.CSSProperties,
  progressTrack: { height: 6, borderRadius: 2, overflow: "hidden", background: "#08110c" } as React.CSSProperties,
  progressFill: { height: 6, background: "#2ff587" } as React.CSSProperties,
  analysisText: { color: "#2ff587", opacity: 0.55, fontSize: 7, fontWeight: 900, letterSpacing: "0.12em" } as React.CSSProperties,
  keypadArea: { display: "flex", flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 2 } as React.CSSProperties,
  navPad: { width: 72, height: 72, borderRadius: 999, border: "1px solid #3a4a58", background: "#0b1219", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 } as React.CSSProperties,
  navMiddleRow: { display: "flex", flexDirection: "row", alignItems: "center", gap: 10 } as React.CSSProperties,
  navPadText: { color: "#2ff587", fontWeight: 900, fontSize: 12 } as React.CSSProperties,
  navArrow: { color: "#5a6878", fontSize: 10, fontWeight: 900, lineHeight: 1 } as React.CSSProperties,
  keys: { width: 132, display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 7 } as React.CSSProperties,
  key: { width: 36, height: 20, borderRadius: 4, border: "1px solid #3a4a58", background: "#0b1219", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
  keyEnt: { borderColor: "#2ff587", background: "#0a4a2a" } as React.CSSProperties,
  keyText: { color: "#9aa6b0", fontSize: 8, fontWeight: 900 } as React.CSSProperties,
  keyEntText: { color: "#2ff587" } as React.CSSProperties,
  cartridgePort: { borderRadius: 5, border: "1px solid #020405", background: "#0a1218", padding: 8, display: "flex", flexDirection: "column", gap: 6 } as React.CSSProperties,
  portLabel: { textAlign: "center", color: "#5a6878", fontSize: 8, fontWeight: 900, letterSpacing: "0.18em" } as React.CSSProperties,
  cartridge: { borderRadius: 3, border: "1px solid #5a6878", background: "#1a2530", padding: 8, display: "flex", flexDirection: "row", alignItems: "center", gap: 10 } as React.CSSProperties,
  sampleWell: { width: 46, height: 32, borderRadius: 2, background: "#f2b84b", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
  sampleWellText: { color: "#1a1614", fontSize: 8, fontWeight: 900 } as React.CSSProperties,
  cartridgeBody: { flex: 1, display: "flex", flexDirection: "column", gap: 6 } as React.CSSProperties,
  bloodLane: { height: 7, borderRadius: 2, background: "#ff4d5e", opacity: 0.65 } as React.CSSProperties,
  sampleLaneText: { color: "#9aa6b0", fontSize: 6, fontWeight: 800, textAlign: "center" } as React.CSSProperties,
  powerRow: { display: "flex", flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 7, paddingRight: 2 } as React.CSSProperties,
  powerText: { color: "#5a6878", fontSize: 7, fontWeight: 900, letterSpacing: "0.10em" } as React.CSSProperties,
  powerLed: { width: 7, height: 7, borderRadius: 4, background: "#2ff587", display: "inline-block" } as React.CSSProperties,

  // ── Receipt
  receipt: {
    width: "100%", maxWidth: 410, background: "#fbfaf2",
    borderLeft: "2px solid #e0dccd", borderRight: "1px solid #cbc5b4",
    padding: 18, boxShadow: "0 10px 18px rgba(0,0,0,0.35)",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  } as React.CSSProperties,
  receiptBrand: { color: "#1a1614", textAlign: "center", fontSize: 14, fontWeight: 900, letterSpacing: "0.18em" } as React.CSSProperties,
  receiptSub: { textAlign: "center", color: "#575044", fontSize: 11, marginTop: 2, marginBottom: 7 } as React.CSSProperties,
  receiptRule: { height: 0, borderTop: "1px dashed #716958", marginBottom: 8 } as React.CSSProperties,
  metaRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 10 } as React.CSSProperties,
  metaText: { color: "#4a4035", fontSize: 10, fontWeight: 700 } as React.CSSProperties,
  contextText: { color: "#1a1614", fontSize: 11, fontWeight: 800, marginTop: 8, marginBottom: 0, lineHeight: 1.4 } as React.CSSProperties,
  sectionTitle: {
    marginTop: 11, marginBottom: 5, padding: "3px 0",
    borderTop: "1px solid #1a1614", borderBottom: "1px solid #1a1614",
    color: "#1a1614", textAlign: "center", fontSize: 10, fontWeight: 900, letterSpacing: "0.20em",
  } as React.CSSProperties,
  valueRow: { display: "flex", flexDirection: "row", alignItems: "baseline", padding: "1px 0", gap: 4 } as React.CSSProperties,
  valueName: { fontSize: 13, fontWeight: 900, minWidth: 52 } as React.CSSProperties,
  dottedLeader: { flex: 1, borderBottom: "1px dotted #8f8878", margin: "0 4px", transform: "translateY(-3px)" } as React.CSSProperties,
  valueNumber: { fontSize: 13, fontWeight: 900, minWidth: 48, textAlign: "right" as const, ...tabular } as React.CSSProperties,
  valueUnit: { color: "#555", width: 58, paddingLeft: 8, fontSize: 10, fontWeight: 700 } as React.CSSProperties,
  valueFlag: { width: 24, paddingLeft: 2, fontSize: 11, fontWeight: 900 } as React.CSSProperties,

  // ── Question panel
  questionPanel: { borderRadius: 14, border: "1px solid #24313d", background: "#0a1017", padding: 12, display: "flex", flexDirection: "column", gap: 10 } as React.CSSProperties,
  panelKicker: { color: "#2ff587", fontSize: 10, fontWeight: 900, letterSpacing: "0.20em" } as React.CSSProperties,
  caseTitle: { color: "#fff", fontSize: 18, fontWeight: 900 } as React.CSSProperties,
  caseVignette: { color: "#aeb8c3", fontSize: 12, lineHeight: 1.4, fontWeight: 700, margin: 0 } as React.CSSProperties,
  questionCard: { borderTop: "1px solid #1e2a35", paddingTop: 10, display: "flex", flexDirection: "column", gap: 7 } as React.CSSProperties,
  questionTitle: { color: "#f2b84b", fontSize: 12, fontWeight: 900 } as React.CSSProperties,
  questionHint: { color: "#7c8996", fontSize: 11, lineHeight: 1.36, fontWeight: 700, margin: 0 } as React.CSSProperties,
  optionGrid: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 7 } as React.CSSProperties,
  option: { borderRadius: 9, border: "1px solid #26323f", background: "#101720", padding: "8px 10px", cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  optionSelected: { borderColor: "#f2b84b", background: "#2c2608" } as React.CSSProperties,
  optionCorrect: { borderColor: "#2ff587", background: "#092618" } as React.CSSProperties,
  optionWrong: { borderColor: "#ff6b7a", background: "#2b0b12" } as React.CSSProperties,
  optionText: { color: "#d7dee6", fontSize: 11, fontWeight: 800 } as React.CSSProperties,

  // ── Feedback panel
  feedbackPanel: { borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 8, border: "1px solid" } as React.CSSProperties,
  feedbackGood: { borderColor: "#2ff587", background: "#07150d" } as React.CSSProperties,
  feedbackBad: { borderColor: "#ff6b7a", background: "#19090d" } as React.CSSProperties,
  feedbackTitle: { color: "#fff", fontSize: 15, fontWeight: 900, letterSpacing: "0.10em" } as React.CSSProperties,
  feedbackSummary: { color: "#e8edf2", fontSize: 13, fontWeight: 800, lineHeight: 1.45 } as React.CSSProperties,
  feedbackBullet: { color: "#c3ccd4", fontSize: 12, lineHeight: 1.5, fontWeight: 700 } as React.CSSProperties,
  feedbackMiss: { color: "#ffb0b8", fontSize: 12, lineHeight: 1.5, fontWeight: 900 } as React.CSSProperties,
  referenceText: { color: "#7f8a95", fontSize: 10, lineHeight: 1.4, fontWeight: 700 } as React.CSSProperties,

  // ── Control bar
  controlBar: { borderRadius: 14, border: "1px solid #1d2732", background: "#090d12", padding: 12, display: "flex", flexDirection: "column", gap: 12 } as React.CSSProperties,
  masteryHeaderLabel: { color: "#f2b84b", fontSize: 10, fontWeight: 900, letterSpacing: "0.15em" } as React.CSSProperties,
  masteryHeaderValue: { color: "#e1e5dc", fontSize: 13, fontWeight: 700, lineHeight: 1.4 } as React.CSSProperties,
  masteryRail: { display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 } as React.CSSProperties,
  tierBadgeColumn: { display: "flex", flexDirection: "column", alignItems: "center", width: 60, gap: 4 } as React.CSSProperties,
  tierBadgeMini: { width: 34, height: 28, borderRadius: 8, border: "1px solid #24313d", background: "#0f1620", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties,
  tierBadgeMiniActive: { borderColor: "#f2b84b", background: "#2b2508" } as React.CSSProperties,
  tierBadgeText: { color: "#2ff587", fontSize: 11, fontWeight: 900 } as React.CSSProperties,
  tierBadgeFullLabel: { color: "#9aa0a6", fontSize: 9, fontWeight: 700, textAlign: "center" as const, lineHeight: 1.2 } as React.CSSProperties,
  actionRow: { display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 } as React.CSSProperties,
  primaryButton: { borderRadius: 10, background: "#2ff587", padding: "12px 18px", fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", color: "#04120b", border: 0, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  secondaryButton: { borderRadius: 10, border: "1px solid #2ff587", background: "#07110c", padding: "12px 18px", fontSize: 11, fontWeight: 900, letterSpacing: "0.15em", color: "#2ff587", cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  disabledButton: { opacity: 0.45, cursor: "not-allowed" } as React.CSSProperties,
};
