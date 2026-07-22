# Board Portal Navigation Map

Date: July 19, 2026

## Application Shell

Desktop:

- Collapsible left sidebar
- Compact top application bar
- Breadcrumb/page context
- Global command search
- Notifications shortcut
- Appearance control
- Account menu

Mobile:

- Compact topbar
- Slide-out drawer
- Fixed bottom quick navigation

## Primary Navigation

- Home: `/board`
- Meetings: `/board/meetings`
- Board briefings: `/board/briefings`
- Proposals: `/board/proposals`
- Decisions: `/board/decisions`
- Referendum: `/board/referendum`
- Documents: `/board/documents`
- Archive: `/board/archive`
- Notifications: `/board/notifications`
- Fire requests: `/board/requests` when permitted

## Referendum

Visible only to roles that can view the budget workbook:

- Budget workbook: `/board/referendum`

## Administration Navigation

Visible only to board admins:

- Audit: `/board/admin/audit`
- Users: `/board/admin/users`
- Visibility: `/board/admin/visibility`
- Appearance: `/board/admin/appearance`
- Administration: `/board/admin`

## Role Visibility Notes

- Fire Board users do not receive the EMS quorum calendar.
- Fire Board users can submit EMS Board attendance requests through `/board/requests`.
- EMS Board members see EMS meeting, briefing, proposal, document, archive, notification, and referendum surfaces as permitted.
- Admin-only routes redirect non-admin users to `/board`.
- Search command items are built from the visible navigation set and do not include admin-only actions for non-admin users.

## Newly Added Route Surfaces

These routes were missing before the redesign and now have safe, non-invented surfaces:

- `/board/briefings`
- `/board/proposals`
- `/board/decisions`
- `/board/documents`
- `/board/archive`
- `/board/notifications`
- `/board/settings`
- `/board/admin/appearance`
- `/board/admin/audit`
- `/board/admin/users`
- `/board/admin/visibility`
