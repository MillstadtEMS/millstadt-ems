export const leadershipPortraits = {
  "jennifer-goetz": "/images/millstadt-ems/jennifer-goetz.png",
  "kenneth-james": "/images/millstadt-ems/kenneth-james-portrait.webp",
  "leo-hsu": "/images/millstadt-ems/leo-hsu.jpg",
} as const;

export type LeadershipPortraitId = keyof typeof leadershipPortraits;
