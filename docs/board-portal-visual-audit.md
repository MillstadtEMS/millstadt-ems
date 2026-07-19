# Millstadt EMS Board Portal Visual Audit

Date: July 19, 2026  
Branch: `codex/board-portal-visual-redesign`  
Baseline screenshot folder: `outputs/board-portal-visual-redesign/before/`

## Scope Reviewed

Captured 167 baseline screenshots against the local development site at `http://localhost:3000`.

Widths reviewed: 1440, 1280, 1024, 768, 430, 390, and 375 pixels.

Routes captured:

- Public control pages: `/`, `/board-minutes`
- Login: `/board/login`
- Core portal: `/board`, `/board/meetings`, `/board/meetings/2`, `/board/requests`
- Referendum: `/board/referendum`, `/board/referendum/detailed`, `/board/referendum/levy`, `/board/referendum/forecast`, `/board/referendum/debt`, `/board/referendum/fleet`, `/board/referendum/staffing`
- Administration: `/board/admin`, `/board/admin/model-review`
- Legacy finance pages: `/board/budget`, `/board/cashflow`, `/board/debt`, `/board/forecast`, `/board/levy`, `/board/personnel`, `/board/trucks`
- Restricted-role smoke views: Fire Board dev login `/board`, `/board/requests`

Requested standalone routes not present in the current route map before redesign:

- `/board/briefings`
- `/board/proposals`
- `/board/decisions`
- `/board/documents`
- `/board/archive`
- `/board/notifications`
- `/board/settings`
- `/board/admin/audit`
- `/board/admin/users`
- `/board/admin/visibility`
- `/board/admin/appearance`

## Representative Baseline Screenshots

- Home desktop: `outputs/board-portal-visual-redesign/before/home-dashboard-1440.png`
- Home mobile: `outputs/board-portal-visual-redesign/before/home-dashboard-390.png`
- Login desktop: `outputs/board-portal-visual-redesign/before/login-1440.png`
- Meetings desktop: `outputs/board-portal-visual-redesign/before/meetings-1440.png`
- Individual meeting mobile: `outputs/board-portal-visual-redesign/before/individual-meeting-390.png`
- Referendum overview desktop: `outputs/board-portal-visual-redesign/before/referendum-overview-1440.png`
- Model review mobile: `outputs/board-portal-visual-redesign/before/model-review-390.png`

The screenshot manifest reported no document-level horizontal overflow in the baseline pass.

## Findings

### What Looks Unfinished

- The dashboard has a basic page-title/card structure and does not yet feel like a command center.
- The top bar only contains identity and sign-out controls. It lacks page context, search, notifications, appearance controls, and an account menu.
- Most pages use inline styles heavily, creating uneven spacing, labels, chips, and component hierarchy.
- The admin area exposes only workbook/model status links; dashboard appearance/layout controls are absent.
- Several requested portal sections have no page surface yet, so navigation cannot feel complete.

### What Looks Generic

- Quick-access cards are large, identical, and mostly text-only.
- The current sidebar is functional but reads as a simple admin menu rather than a premium governance shell.
- Login uses a conventional split layout with a plain form card and no portal-specific motif.
- Tables and status blocks are serviceable but not visually differentiated enough for executive/governance software.

### What Looks AI-Generated Or Template-Like

- Repeated card patterns dominate the dashboard.
- Page copy such as "Millstadt EMS Board workspace" and section explanations feel like placeholder scaffolding.
- The current visual language lacks a custom motif beyond the EMS logo.

### Navigation Issues

- Desktop navigation is too shallow and does not distinguish primary board work from administration.
- Referendum subnavigation is separate from the primary shell rather than being clearly expandable in the sidebar.
- Mobile navigation uses a small `<details>` menu, not a dedicated drawer or bottom action surface.
- Missing requested sections make the information architecture feel incomplete.

### Branding Issues

- The portal uses `public/board/mems-bod-logo.png`, a square RGB image with a permanent black background.
- The black square reads like an inserted image rather than a professional lockup.
- Existing transparent lockup files are present but are not used consistently in the shell or login.
- The portal does not yet use a strong, straight "MILLSTADT EMS / BOARD OF DIRECTORS PORTAL" responsive lockup.

### Mobile Issues

- Mobile is readable and does not show document-level horizontal overflow, but the experience is cramped.
- The menu button and small logo compete with account/sign-out controls.
- Quick-access cards stay oversized and force excessive scrolling.
- Table pages rely on horizontal scrolling instead of mobile card treatment.
- The dashboard lacks stacked primary actions for attendance, briefing, and packet access.

### Accessibility And Interaction Issues

- Focus rings exist, but modal/drawer/search focus management is not present because those surfaces do not exist.
- Icon-only navigation is absent, but future icon controls need accessible labels.
- Hover/focus/pressed/disabled states are inconsistent across inline-styled buttons and links.
- Reduced motion is partially respected through board CSS, but future shell motion needs explicit reduced-motion handling.

### What Should Be Preserved

- Board-specific CSS is already scoped under `.board-root`, protecting the public site.
- Login/session redirects, password-change guard, role checks, Fire Board restrictions, meeting attendance, quorum logic, minutes-public flag, and referendum model pages are functional.
- The current dark visual base is a reasonable starting point and should be refined rather than discarded.
- The no-public-minutes behavior is already supported by the data layer and should not be changed.

## Corrections Required

- Generate and use transparent, tightly cropped Board Portal lockups.
- Replace the current shell with a collapsible desktop sidebar, compact topbar, mobile drawer, and bottom mobile actions.
- Add role-aware search/command palette and appearance controls.
- Redesign `/board` as a live command center using existing meeting, attendance, question, quorum, and visibility data only.
- Add safe empty-state surfaces for requested sections that lack backing data, without inventing records.
- Move repeated inline visual patterns into reusable board components and scoped CSS.
- Add an admin-only Appearance & Dashboard Layout page for safe presentation configuration.
- Improve mobile dashboard, tables, forms, buttons, and empty states.
- Keep public pages unchanged and keep financial/business logic untouched.
