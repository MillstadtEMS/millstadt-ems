# Millstadt EMS Elite Implementation Progress

## Baseline

- Original master-prompt reference: `52eb73eedf86e90c19e332c503e20e3cc9b02899`
- Elite implementation baseline: `d4270d9f922fa79b81094a68ef0f91c7989d7fb6`
- Working branch: `feat/elite-master-implementation`
- Parent development branch: `feat/millstadt-ems-information-hub-request-approval-dev-only`
- GitHub tracker: issue `#13`
- Deployment policy: preview/development only unless the owner separately requests production.

The owner separately directed production promotions on August 17, 2026. The current
verified production deployment is `dpl_HCgWxmDjEyPfLST6PUzgh3TDXwCh`, build
`83a8477c`, at `https://www.millstadtems.org/`. Remaining master work continues on
the isolated development branch.

## Protected Areas

These values were recorded at elite baseline `d4270d9`:

| Area | Baseline invariant |
| --- | --- |
| CAD polling | `app/api/cad/poll/route.ts` SHA-256 `fa5918fb0bf2f46ac5c58beecbea5c9220b749c0c1c19598f4215a0c86fed63c` |
| Public ticker | `components/cad/CallTicker.tsx` SHA-256 `119b2cd80079463b0cf0ac07f2a1d70272908c3ee084a9a9ddf9dc21e06e5756` |
| Ticker duration | `ACTIVE_MINUTES = 120` |
| Homepage Financial Information hero entry | SHA-256 `3d94ea2a14dfcc6e243321d2c9a7a5ea1b9287fc6890262ea3a4aebb198c3dcf` |
| Navigation Financial Information entry | SHA-256 `312b9cb33439630cec0851b960c2f9329975278835d50356464138ff332c7249` |

Run `npm run test:elite-protected` before every checkpoint commit.

On August 17, 2026, the owner explicitly retired the second, wide homepage
Financial Information feature entry. The protected homepage invariant now requires
exactly one entry: the compact button in the hero. Production Financials remains
Coming Soon, and all public financial APIs remain disabled.

## Completed Checkpoints

### Phase 1: Serenity Prayer Homepage Finish

- Status: complete and verified in production at the owner's direction.
- Commits: `985a360`, `d4270d9`
- Files: `app/page.tsx`, `components/SerenityPrayer.tsx`, transparent PNG asset.
- Behavior: homepage-only closing section after Support/Donate and before the footer;
  cursive prayer; transparent, fully contained Star of Life/cross; eager image load;
  desktop and mobile sizing; no animation or controls.
- Verification: targeted ESLint, TypeScript, full Next.js build, desktop/mobile browser
  screenshots, console review, live production DOM and image check.
- Preview: `https://millstadt-g6qrkrvx8-kennethjames-7371s-projects.vercel.app`
- Production deployment explicitly requested by owner:
  `https://millstadt-5pg3wox6m-kennethjames-7371s-projects.vercel.app`
- Revert: `git revert d4270d9`, then `git revert 985a360`.

### Phase 5: Header-Only Community Monitors

- Status: complete to the authorized schedule-only scope and verified in production.
- Commits: `bca6d31`, `eef9052`, `83a8477`.
- Owner-directed presentation: no new public dashboard or permanent team buttons.
  `/community/today` redirects home. Verified items appear only in the existing top
  bar when they apply that day.
- One logo represents each brand, including doubleheaders or multiple same-brand
  events. Distinct brands alternate from the EMS and Lounge sides while retaining a
  consistent full-size treatment. Event logos are desktop-only; phone navigation is
  unchanged and remains reserved for weather warnings and existing controls.
- Hover, keyboard focus, and click/tap expose source-attributed details. Times use
  military time first with a 12-hour value in parentheses.
- Connected sources: official MLB Cardinals schedule, official NHL Blues schedule,
  official CITY SC calendar, Millstadt EMS public calendar, St. James official
  calendar, Millstadt CCSD official athletics feed, Belleville West official
  athletics feed, and a local solar-eclipse calculation.
- Visibility starts at 07:00 America/Chicago. Normal game-day display ends at local
  midnight; late games use the documented two-hour carryover rule. Same-brand events
  are deduplicated into one logo.
- Weather failures remain silent rather than displaying an inaccurate unavailable
  banner. Multiple real warnings rotate one at a time, with the complete list
  available on hover, focus, or tap.
- Source requests use timeouts, schema validation, five-minute revalidation, and
  per-source failure isolation. Manual school, flag, and sky entries require an
  explicit verified marker and source URL.
- Production deployment: `dpl_HCgWxmDjEyPfLST6PUzgh3TDXwCh`.
- Verification: targeted ESLint, TypeScript, 118-route optimized build, protected
  invariant test, 50 financial integration checks, desktop and 390px browser review,
  live API review, and a ten-perspective audit.
- Revert: `git revert 83a8477`, then `git revert eef9052`, then `git revert bca6d31`.

## Current Checkpoint

### Foundation Guardrails and Phase 2 Inventory

- Status: in progress.
- Scope: protected-area test, testimonial moderation, inventory mutation
  authentication and iOS contract, truthful weather states, employment DEA removal,
  and direct professional form copy.
- Real email/SMS sends: prohibited during development verification.
- Fictional data only for security and output tests.
- Five owner-supplied public Form 990 PDFs are loaded only in the ignored local
  development library. The archive labels the misnamed file as tax year 2021 and
  orders the real filings 2023, 2022, 2021, 2020, 2019. No real PDF is tracked by Git
  or available in production.

## Remaining Phases

- Complete foundation security and reliability.
- Build complete PDF and email registries; render fictional samples.
- Consolidate public design and accessibility patterns.
- Finish Kids Club, public ECG, seasonal themes, and repeat-visit features.
- Run the full acceptance matrix and ten-perspective final audit.
- Publish and verify preview checkpoints only unless the owner gives a separate,
  explicit production instruction.

## Known External Dependencies

- Licensed/authorized live-score provider credentials or contract. Official
  schedule-only behavior is active without this dependency.
- Official school closure/safety notice integration and administrator approval
  workflow. Athletics/calendar feeds are connected where available.
- Official federal and Illinois flag-status sources suitable for automation.
- Curated meteor-shower and conjunction source. Solar-eclipse calculation is active;
  other sky notices require a verified manual record.
- Owner-approved notification recipients and production delivery configuration.
- Medical-director review for advanced public ECG content.
