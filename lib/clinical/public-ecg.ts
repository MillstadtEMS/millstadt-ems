export const PUBLIC_ECG_CHALLENGE_VERSION = "2026.08-foundations";

export type PublicEcgSkill = "student" | "clinician";

export type PublicEcgCase = {
  id: string;
  title: string;
  level: "Foundation" | "Clinician";
  prompt: string;
  answer: string;
  explanation: string;
  path: string;
  choices: string[];
};

export const PUBLIC_ECG_CASES: PublicEcgCase[] = [
  {
    id: "sinus",
    title: "Clean and regular",
    level: "Foundation",
    prompt: "Regular rhythm, narrow QRS, and a consistent P wave before each complex.",
    answer: "Normal sinus rhythm",
    explanation: "The strip is regular, and each narrow QRS has a consistent preceding P wave in this synthetic teaching example.",
    path: "M0 72 L22 72 L26 66 L30 72 L42 72 L46 30 L50 92 L55 72 L86 72 L91 66 L95 72 L108 72 L112 30 L116 92 L121 72 L152 72 L157 66 L161 72 L174 72 L178 30 L182 92 L187 72 L220 72 L225 66 L229 72 L242 72 L246 30 L250 92 L255 72 L288 72 L293 66 L297 72 L310 72 L314 30 L318 92 L323 72 L360 72",
    choices: ["Normal sinus rhythm", "Atrial fibrillation", "Ventricular tachycardia"],
  },
  {
    id: "afib",
    title: "Irregularly irregular",
    level: "Foundation",
    prompt: "Narrow complexes with uneven spacing and no consistent P waves.",
    answer: "Atrial fibrillation",
    explanation: "The key clue is irregularly irregular R-R spacing without organized P waves before each QRS.",
    path: "M0 74 L18 73 L24 70 L29 74 L48 74 L52 35 L56 91 L61 74 L91 75 L97 70 L102 74 L128 74 L132 36 L136 92 L141 74 L164 75 L171 71 L176 75 L193 75 L197 34 L201 92 L207 75 L248 74 L252 36 L256 90 L261 74 L281 75 L287 70 L292 74 L324 74 L328 34 L332 92 L337 74 L360 74",
    choices: ["Atrial fibrillation", "Sinus bradycardia", "Atrial flutter"],
  },
  {
    id: "flutter",
    title: "Sawtooth baseline",
    level: "Foundation",
    prompt: "Regular narrow complexes with repeating flutter-like baseline activity.",
    answer: "Atrial flutter",
    explanation: "The organized sawtooth baseline between narrow complexes points toward atrial flutter in this synthetic teaching strip.",
    path: "M0 72 L12 66 L24 78 L36 66 L48 78 L60 66 L70 72 L74 32 L78 92 L84 72 L96 66 L108 78 L120 66 L132 78 L144 66 L154 72 L158 32 L162 92 L168 72 L180 66 L192 78 L204 66 L216 78 L228 66 L238 72 L242 32 L246 92 L252 72 L264 66 L276 78 L288 66 L300 78 L312 66 L322 72 L326 32 L330 92 L336 72 L360 72",
    choices: ["Atrial flutter", "Normal sinus rhythm", "Junctional rhythm"],
  },
  {
    id: "vtach",
    title: "Wide and fast",
    level: "Clinician",
    prompt: "Regular, rapid, wide-complex rhythm in a short synthetic strip.",
    answer: "Ventricular tachycardia",
    explanation: "The wide, regular, rapid complexes are the pattern-recognition clue. Real patient care depends on the full clinical picture and local protocols.",
    path: "M0 72 L10 72 L18 38 L31 108 L45 42 L58 72 L76 72 L84 38 L97 108 L111 42 L124 72 L142 72 L150 38 L163 108 L177 42 L190 72 L208 72 L216 38 L229 108 L243 42 L256 72 L274 72 L282 38 L295 108 L309 42 L322 72 L360 72",
    choices: ["Ventricular tachycardia", "Atrial fibrillation", "First-degree AV block"],
  },
];

const chicagoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function chicagoDateKey(date = new Date()) {
  const parts = chicagoDateFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dailyCaseIndex(dateKey: string, caseCount: number) {
  if (!Number.isSafeInteger(caseCount) || caseCount <= 0) return 0;
  let hash = 0;
  for (const character of dateKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % caseCount;
}

export function casesForSkill(skill: PublicEcgSkill) {
  return skill === "student"
    ? PUBLIC_ECG_CASES.filter((item) => item.level === "Foundation")
    : PUBLIC_ECG_CASES;
}

export function orderedChallengeCases(skill: PublicEcgSkill, dateKey: string) {
  const cases = casesForSkill(skill);
  const offset = dailyCaseIndex(dateKey, cases.length);
  return [...cases.slice(offset), ...cases.slice(0, offset)];
}
