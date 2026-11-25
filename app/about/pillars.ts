export type Pillar = {
  /** Star of Life function. */
  fn: string;
  /** EMS Agenda 2050 guiding principle. */
  principle: string;
  desc: string;
};

export type CoreValue = {
  label: string;
  desc: string;
};

export type MissionVisionValuesContent = {
  mission: string;
  vision: string;
  pillars: readonly Pillar[];
  values: readonly CoreValue[];
};

export const PILLARS: readonly Pillar[] = [
  {
    fn: "Detection",
    principle: "Socially Equitable",
    desc: "Educate residents and crews. Keep 911 coverage reliable.",
  },
  {
    fn: "Reporting",
    principle: "Reliable and Prepared",
    desc: "Work with CenCom dispatch to prepare crews before arrival.",
  },
  {
    fn: "Response",
    principle: "Sustainable and Efficient",
    desc: "Keep crews ready with working ambulances, equipment and medications.",
  },
  {
    fn: "On-Scene Care",
    principle: "Inherently Safe and Effective",
    desc: "Assess and treat patients on scene or at home using clinical practice guidelines.",
  },
  {
    fn: "Care in Transit",
    principle: "Adaptable and Innovative",
    desc: "Update equipment and train crews to care for patients during transport.",
  },
  {
    fn: "Transfer to Definitive Care",
    principle: "Integrated and Seamless",
    desc: "Work with field crews, hospitals and medical control to choose the right facility.",
  },
];

export const LEGEND = {
  function: "Star of Life function",
  principle: "EMS Agenda 2050 guiding principle",
} as const;
