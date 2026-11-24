"use client";

import Image, { type ImageProps } from "next/image";
import { crewPhotoSource } from "@/lib/seasonal/crew-photo";
import { useWinterTheme } from "@/lib/seasonal/useWinterTheme";

export default function WinterCrewPhoto({ src, initialWinter, alt, ...props }: Omit<ImageProps, "src"> & { src: string; initialWinter: boolean }) {
  const source = crewPhotoSource(src, useWinterTheme(initialWinter));
  return <Image {...props} src={source} alt={alt} />;
}
