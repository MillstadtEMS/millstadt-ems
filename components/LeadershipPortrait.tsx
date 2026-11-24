"use client";

import Image from "next/image";
import { leadershipPortraits, type LeadershipPortraitId } from "@/lib/leadership-portraits";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";

type Props = {
  person: LeadershipPortraitId;
  alt: string;
  initialWinter: boolean;
};

export default function LeadershipPortrait({ person, alt, initialWinter }: Props) {
  const winter = useWinterTheme(initialWinter);
  const src = winter ? `/images/winter/leadership/${person}.webp` : leadershipPortraits[person];

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill
      unoptimized
      className="object-cover object-top"
    />
  );
}
