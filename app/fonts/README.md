# Bundled site fonts

These WOFF2 files remove build-time and runtime dependencies on Google Fonts.

- Inter, Dancing Script, and IBM Plex Mono are open fonts distributed under the
  SIL Open Font License through Google Fonts.
- Geist and Geist Mono are bundled with Next.js and distributed under the SIL
  Open Font License.
- Only the Latin subsets and weights used by the site are included.

The application loads them through `next/font/local` in `app/fonts.ts`.
