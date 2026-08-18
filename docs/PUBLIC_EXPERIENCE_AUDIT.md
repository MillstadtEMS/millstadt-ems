# Public Experience Audit

Date: August 17, 2026

Scope: public navigation, homepage entry points, footer, Kids Club, ECG Challenge,
seasonal presentation, public-only offline behavior, and the development-only
Financial & Information Transparency experience. Protected CAD polling and the
public call ticker were verified by hash and were not edited.

## Ten-Perspective Review

| Perspective | Review focus | Result and correction |
| --- | --- | --- |
| Owner and brand steward | Does the site still read as Millstadt EMS rather than a generic template? | Preserved the blue agency identity, EMS marks, homepage Serenity Prayer, compact financial entry, and existing header monitors. Removed generic status and dashboard-style copy. |
| Paramedic and clinical educator | Is the ECG experience useful without pretending to provide medical direction? | Limited the public challenge to synthetic educational cases, clear skill levels, concise rationales, and no patient data, clinical account, or leaderboard. Added reliable daily, practice, and timed modes. |
| Parent and child-safety reviewer | Can Kids Club be used without inviting unsafe play or collecting child data? | Added a guided 911 story and printable guide, removed locked-phone practice language, instructed children not to touch medicine or equipment, and kept the experience free of forms, accounts, uploads, and identifying data. |
| Keyboard and screen-reader user | Can core actions be understood and operated without a pointer? | Preserved semantic headings and links, added visible focus treatment, keyboard controls for ECG answers and navigation, meaningful button state, and print controls with clear accessible names. |
| Narrow-phone visitor | Does content fit without crowding, overlap, or tiny targets? | Kept event logos desktop-only as directed, made Kids Club headings and controls responsive, stabilized game and challenge dimensions, allowed long financial labels to wrap, and constrained the footer to the viewport. |
| Slow or offline visitor | Is the public fallback honest and useful? | Expanded the bounded public service-worker cache to the new ECG and Kids routes. Protected, live, and financial routes remain network-only and are never represented as available offline. |
| Security and privacy reviewer | Does a public feature expose records or create silent collection? | ECG and Kids features perform no data submission or local profiling. The two employee pay summaries are restricted, local-only development records; production Financials remains disabled and Coming Soon. |
| Operations and maintainability reviewer | Can staff understand and safely adjust time-based behavior? | Centralized seasonal windows, Chicago-time resolution, override, and disable controls. Added deterministic tests for DST boundaries, daily ECG selection, restricted cache paths, and child-safety copy. |
| Visual perfectionist | Are spacing, color, motion, and hierarchy disciplined? | Removed decorative public effects and fake metrics, reduced oversized radii and glow, kept seasonal styling to a restrained header accent, simplified public chrome, and condensed the footer into one agency block and one link group. |
| Repeat visitor | Is there a reason to return without cluttering the site? | Added a date-based ECG case, practice and timed variants, printable child-safety material, and restrained seasonal accents while leaving schedule and alert monitors in their existing top-bar role. |

## Acceptance Notes

- Financial & Information Transparency remains a single compact homepage entry.
- Additional financial records are restricted and separate from public Form 990s.
- The two 2025 pay summaries exist only in the ignored local document library and
  are not copied to `public/` or included in the public offline cache.
- Weather source failures remain silent. CAD polling, the call ticker, and its
  120-minute display duration remain unchanged.
- Seasonal presentation adds no automatic event claims, alerts, team logos, or
  weather data. It only changes a small, static visual accent during configured
  Chicago-time windows.
