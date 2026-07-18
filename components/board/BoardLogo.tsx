/* Board wordmark. Isolated <img> so the lint disable lives on its own line. */
import type { CSSProperties } from "react";

export default function BoardLogo({ style, className, alt = "Millstadt EMS — Board of Directors" }: { style?: CSSProperties; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/board/mems-bod-logo.png" alt={alt} className={className} style={style} />
  );
}
