import type { ReactNode, SVGProps } from "react";

export type SiteIconName =
  | "ambulance"
  | "calendar"
  | "cake"
  | "clipboard"
  | "community"
  | "education"
  | "external"
  | "file"
  | "heartbeat"
  | "home"
  | "image"
  | "message"
  | "newspaper"
  | "phone"
  | "pin"
  | "shield"
  | "spark"
  | "tools";

export default function SiteIcon({
  name,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { name: SiteIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

const paths: Record<SiteIconName, ReactNode> = {
  ambulance: (
    <>
      <path d="M4 16V8.6c0-.9.7-1.6 1.6-1.6h8.2c.7 0 1.3.4 1.5 1.1l.7 2.1h1.3c.5 0 1 .3 1.3.7l1.4 2.1c.2.3.3.6.3.9V16" />
      <path d="M3 16h18" />
      <path d="M7 17.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" />
      <path d="M17 17.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z" />
      <path d="M9.5 9v4" />
      <path d="M7.5 11h4" />
    </>
  ),
  calendar: (
    <>
      <path d="M7 3v3" />
      <path d="M17 3v3" />
      <path d="M4.5 8.5h15" />
      <rect x="4.5" y="5.5" width="15" height="15" rx="2.5" />
      <path d="M8 12h3" />
      <path d="M8 16h6" />
    </>
  ),
  cake: (
    <>
      <path d="M12 3v3" />
      <path d="M8 8h8a3 3 0 0 1 3 3v8H5v-8a3 3 0 0 1 3-3Z" />
      <path d="M5 14c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 1.7-.8 2-1" />
      <path d="M12 3c-1.2 1.2-1.2 2 0 3 1.2-1 1.2-1.8 0-3Z" />
    </>
  ),
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5A2.5 2.5 0 0 1 11.5 2h1A2.5 2.5 0 0 1 15 4.5V6H9V4.5Z" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
    </>
  ),
  community: (
    <>
      <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      <path d="M5.5 12.5a2.5 2.5 0 1 0 0-5" />
      <path d="M18.5 12.5a2.5 2.5 0 1 1 0-5" />
    </>
  ),
  education: (
    <>
      <path d="m3 9 9-5 9 5-9 5-9-5Z" />
      <path d="M7 11.5V16c2.8 2 7.2 2 10 0v-4.5" />
      <path d="M21 9v6" />
    </>
  ),
  external: (
    <>
      <path d="M14 5h5v5" />
      <path d="m19 5-9 9" />
      <path d="M19 14v3.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H10" />
    </>
  ),
  file: (
    <>
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v5h5" />
      <path d="M9.5 13h5" />
      <path d="M9.5 17h5" />
    </>
  ),
  heartbeat: (
    <>
      <path d="M20.5 12h-3l-2 5-3.5-10-2.5 5h-6" />
      <path d="M5.5 9.5C4.2 6.7 6.2 4 9 4c1.3 0 2.3.6 3 1.5A3.7 3.7 0 0 1 15 4c2.8 0 4.8 2.7 3.5 5.5" />
      <path d="M18 14c-1.5 2-3.7 3.8-6 5.6-1.1-.9-2.2-1.8-3.2-2.8" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M6 10v10h12V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m7 16 3.2-3.2 2.3 2.3 2.8-3.6L18 16" />
      <path d="M8.5 9.5h.01" />
    </>
  ),
  message: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-5 4v-5.5" />
      <path d="M8 8h8" />
      <path d="M8 11h5" />
    </>
  ),
  newspaper: (
    <>
      <path d="M5 5h12a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2V5Z" />
      <path d="M5 17H4a2 2 0 0 1-2-2V8h3" />
      <path d="M8 9h7" />
      <path d="M8 12h8" />
      <path d="M8 15h5" />
    </>
  ),
  phone: (
    <>
      <path d="M7 4h4l1.5 4-2.2 1.5a10 10 0 0 0 4.2 4.2L16 11.5l4 1.5v4a3 3 0 0 1-3 3A13 13 0 0 1 4 7a3 3 0 0 1 3-3Z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m18.4 5.6-2.8 2.8" />
      <path d="m8.4 15.6-2.8 2.8" />
    </>
  ),
  tools: (
    <>
      <path d="m14.7 6.3 3-3a3 3 0 0 1-3.9 3.9l-8 8a2 2 0 1 0 2.8 2.8l8-8a3 3 0 0 1 3.9-3.9l-3 3" />
      <path d="m5 5 4 4" />
      <path d="m3.5 6.5 3-3" />
    </>
  ),
};
