# Board Portal Design System

Date: July 19, 2026  
Scope: Board Portal only, under `.board-root`

## Identity

The Board Portal uses a separate governance identity from the public Millstadt EMS site:

- Transparent EMS emblem lockup
- `MILLSTADT EMS`
- `BOARD OF DIRECTORS PORTAL`
- Restrained brass accent
- Technical map/grid motif limited to the portal shell

Brand assets:

- `public/board/branding/millstadt-ems-board-portal-dark.png`
- `public/board/branding/millstadt-ems-board-portal-light.png`
- `public/board/branding/millstadt-ems-board-portal-white-background.png`

The dark and light lockups are transparent PNGs. The white-background version is opaque for print/PDF/email use.

## Typography

Primary portal font:

- Mona Sans Variable through `@fontsource-variable/mona-sans`

Monospace:

- IBM Plex Mono, reserved for compact technical metadata and identifiers

Hierarchy:

- Main page title: 34-40px
- Section heading: 22-25px
- Card title: 14-16px
- Main values: 28-36px
- Body text: 15-16px
- Metadata: 12-13px

## Color Tokens

Tokens live in `app/board/board.css` and are scoped under `.board-root`.

Dark appearance:

- Background `#081018`
- Sidebar `#0C1621`
- Top bar `#101B26`
- Surface `#13202C`
- Raised `#192938`
- Hover `#203344`
- Border `#2A3B4C`
- Text `#F5F3EE`, `#ADB8C3`, `#7E8C99`
- Brass `#B88A48`, hover `#D1A45F`
- Success `#5CA77D`, warning `#D2A04A`, error `#D26C63`, info `#6B93B8`

Light appearance:

- Background `#F2F1ED`
- Sidebar/topbar/surface `#FFFFFF`
- Raised `#F8F7F4`
- Hover `#EEECE7`
- Border `#D7D4CD`
- Text `#111820`, `#53616E`, `#7D8892`
- Brass `#8B622B`, hover `#704B20`

Appearance modes:

- Automatic
- Light
- Dark

Preference is stored on the device in `localStorage` and applied only to `.board-root`.

## Core Components

Reusable components added:

- `BoardAppShell`
- `BoardAppearanceControl`
- `BoardSearchPalette`
- `BoardPrimitives`
- `BoardPlaceholderPage`
- `DashboardLayoutEditor`

Reusable UI classes:

- `.board-card`
- `.board-btn-primary`
- `.board-btn-secondary`
- `.board-chip`
- `.board-empty`
- `.board-action-row`
- `.board-metric`
- `.board-tw`

## Interaction Rules

- Buttons use brass fill for primary actions and neutral bordered surfaces for secondary actions.
- Search opens with Command/Ctrl+K.
- Sidebar collapse is saved locally.
- Mobile navigation uses a drawer plus bottom quick navigation.
- Motion is 150-220ms and disabled under `prefers-reduced-motion`.
- Focus rings are visible and board-scoped.

## Dashboard Layout Controls

Admin route:

- `/board/admin/appearance`

Controls:

- Drag/drop dashboard widgets
- Move up/down controls
- Hide/show widgets
- Role visibility toggles
- Comfortable/compact density
- Desktop/tablet/mobile preview
- Reset
- Save changes
- Publish changes

The editor stores presentation configuration only and does not modify role permissions, financial assumptions, quorum rules, meeting data, or public visibility rules.
