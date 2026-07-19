/* Board wordmark. Isolated <img> so the lint disable lives on its own line. */
import type { CSSProperties } from "react";

const SRC = {
  dark: "/board/branding/millstadt-ems-board-portal-dark.png",
  light: "/board/branding/millstadt-ems-board-portal-light.png",
  print: "/board/branding/millstadt-ems-board-portal-white-background.png",
};

export default function BoardLogo({
  style,
  className,
  alt = "Millstadt EMS Board of Directors Portal",
  variant = "light",
}: {
  style?: CSSProperties;
  className?: string;
  alt?: string;
  variant?: keyof typeof SRC;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SRC[variant]} alt={alt} className={className} style={style} />
  );
}
