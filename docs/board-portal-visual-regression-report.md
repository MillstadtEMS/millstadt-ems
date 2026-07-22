# Board Portal Visual Regression Report

Date: July 19, 2026

## Build Verification

Command:

- `npm run build`

Result:

- Passed
- TypeScript passed
- Static generation completed

## Before Screenshots

Folder:

- `outputs/board-portal-visual-redesign/before/`

Captured:

- 167 screenshots
- Public home and public board-minutes control pages
- Login
- Home dashboard
- Meetings
- Individual meeting
- Requests
- Referendum workbook
- Admin pages
- Fire Board restricted views

## After Screenshots

Folder:

- `outputs/board-portal-visual-redesign/after/`

Captured:

- Public home and public board-minutes control pages
- Login
- Home dashboard
- Meetings
- Individual meeting
- Board briefings
- Proposals
- Referendum workbook
- Documents
- Archive
- Notifications
- Settings
- Administration
- Appearance and dashboard layout
- Audit

Modes and widths:

- Dark: 1440, 768, 390
- Light: 1440, 768, 390
- Public controls: 1440 and 390

Representative final screenshots:

- `outputs/board-portal-visual-redesign/after/dark-home-dashboard-1440.png`
- `outputs/board-portal-visual-redesign/after/dark-home-dashboard-390.png`
- `outputs/board-portal-visual-redesign/after/light-home-dashboard-1440.png`
- `outputs/board-portal-visual-redesign/after/light-home-dashboard-390.png`
- `outputs/board-portal-visual-redesign/after/dark-login-1440.png`
- `outputs/board-portal-visual-redesign/after/dark-admin-appearance-1440.png`

## Public Site Verification

Public routes were captured before and after:

- `/`
- `/board-minutes`

No public website files or global public navigation/header/footer components were modified. Board styling remains scoped to `.board-root`.

## Business Logic Verification

No quorum rules, meeting schedules, attendance logic, permissions, audit data, or public-minutes logic were changed.

Existing governance functions remain the source of truth for:

- Login/session enforcement
- Password-change redirect
- Role visibility
- Fire Board request access
- EMS Board meeting visibility
- Attendance recording
- Quorum calculation
- Minutes-public flag
- Budget workbook visibility

## Visual Changes Confirmed

- Transparent Board Portal lockups replace the black-square logo in the portal shell and login.
- Desktop app shell has sidebar, topbar, breadcrumb, command search, notifications, appearance, and account controls.
- Mobile has drawer and bottom navigation.
- Dashboard now uses a premium Next Meeting hero, action queue, referendum panel, and recent activity surface.
- Search/command palette opens from the topbar and Command/Ctrl+K.
- Admin Appearance and Dashboard Layout editor exists at `/board/admin/appearance`.
- Empty states exist for no proposals, archive, notifications, audit, users, and visibility pages.
- Filler-copy phrase scan returned no matches in board portal files.

## Residual Notes

- The dashboard layout editor stores presentation settings in browser local storage. It does not alter business rules or permissions.
- Documents, proposals, decisions, archive, notifications, users, visibility, and audit have safe page surfaces but no invented records.
- The local Next development overlay may appear in screenshots; it is not a shipped portal element.
