# Site Security Route Inventory

Generated from the checked-out source on 2026-08-16. This is a source inventory, not proof that deployment, database, vendor, or network controls are correctly configured.

- Pages: 149
- API handlers: 266

## Pages

| Route | Access family | Source |
| --- | --- | --- |
| `/about` | Public | `app/about/page.tsx` |
| `/admin/admin-tools` | Administrator | `app/admin/admin-tools/page.tsx` |
| `/admin/analytics` | Administrator | `app/admin/analytics/page.tsx` |
| `/admin/announcements` | Administrator | `app/admin/announcements/page.tsx` |
| `/admin/applicants/[id]` | Administrator | `app/admin/applicants/[id]/page.tsx` |
| `/admin/applicants` | Administrator | `app/admin/applicants/page.tsx` |
| `/admin/budget-documents` | Administrator | `app/admin/budget-documents/page.tsx` |
| `/admin/bulletin` | Administrator | `app/admin/bulletin/page.tsx` |
| `/admin/calls` | Administrator | `app/admin/calls/page.tsx` |
| `/admin/calls/reports` | Administrator | `app/admin/calls/reports/page.tsx` |
| `/admin/cert-types` | Administrator | `app/admin/cert-types/page.tsx` |
| `/admin/changelog` | Administrator | `app/admin/changelog/page.tsx` |
| `/admin/classes` | Administrator | `app/admin/classes/page.tsx` |
| `/admin/commercial-club` | Administrator | `app/admin/commercial-club/page.tsx` |
| `/admin/dev-tools` | Administrator | `app/admin/dev-tools/page.tsx` |
| `/admin/employees/[id]/forms/[formId]` | Administrator | `app/admin/employees/[id]/forms/[formId]/page.tsx` |
| `/admin/employees/[id]` | Administrator | `app/admin/employees/[id]/page.tsx` |
| `/admin/employees/[id]/writeups/[writeupId]` | Administrator | `app/admin/employees/[id]/writeups/[writeupId]/page.tsx` |
| `/admin/employees/new` | Administrator | `app/admin/employees/new/page.tsx` |
| `/admin/employees` | Administrator | `app/admin/employees/page.tsx` |
| `/admin/filing-cabinet/[id]` | Administrator | `app/admin/filing-cabinet/[id]/page.tsx` |
| `/admin/filing-cabinet` | Administrator | `app/admin/filing-cabinet/page.tsx` |
| `/admin/financials` | Administrator | `app/admin/financials/page.tsx` |
| `/admin/forms/[assignmentId]` | Administrator | `app/admin/forms/[assignmentId]/page.tsx` |
| `/admin/forms` | Administrator | `app/admin/forms/page.tsx` |
| `/admin/hospitals/[id]` | Administrator | `app/admin/hospitals/[id]/page.tsx` |
| `/admin/hospitals/new` | Administrator | `app/admin/hospitals/new/page.tsx` |
| `/admin/hospitals` | Administrator | `app/admin/hospitals/page.tsx` |
| `/admin/hospitals/suggestions` | Administrator | `app/admin/hospitals/suggestions/page.tsx` |
| `/admin/incidents` | Administrator | `app/admin/incidents/page.tsx` |
| `/admin/inventory-editor` | Administrator | `app/admin/inventory-editor/page.tsx` |
| `/admin/inventory-reports` | Administrator | `app/admin/inventory-reports/page.tsx` |
| `/admin/inventory-settings` | Administrator | `app/admin/inventory-settings/page.tsx` |
| `/admin/login-analytics` | Administrator | `app/admin/login-analytics/page.tsx` |
| `/admin/login` | Administrator | `app/admin/login/page.tsx` |
| `/admin/media` | Administrator | `app/admin/media/page.tsx` |
| `/admin/notices/[id]` | Administrator | `app/admin/notices/[id]/page.tsx` |
| `/admin/onboarding/[recordId]` | Administrator | `app/admin/onboarding/[recordId]/page.tsx` |
| `/admin/onboarding` | Administrator | `app/admin/onboarding/page.tsx` |
| `/admin/onboarding/template` | Administrator | `app/admin/onboarding/template/page.tsx` |
| `/admin` | Administrator | `app/admin/page.tsx` |
| `/admin/personnel-dashboard` | Administrator | `app/admin/personnel-dashboard/page.tsx` |
| `/admin/polls/[id]` | Administrator | `app/admin/polls/[id]/page.tsx` |
| `/admin/polls/new` | Administrator | `app/admin/polls/new/page.tsx` |
| `/admin/polls` | Administrator | `app/admin/polls/page.tsx` |
| `/admin/senior-center` | Administrator | `app/admin/senior-center/page.tsx` |
| `/admin/submissions/[id]` | Administrator | `app/admin/submissions/[id]/page.tsx` |
| `/admin/submissions` | Administrator | `app/admin/submissions/page.tsx` |
| `/admin/testimonials` | Administrator | `app/admin/testimonials/page.tsx` |
| `/admin/truck-checks/[id]` | Administrator | `app/admin/truck-checks/[id]/page.tsx` |
| `/admin/truck-checks` | Administrator | `app/admin/truck-checks/page.tsx` |
| `/admin/truckcheck-dashboard` | Administrator | `app/admin/truckcheck-dashboard/page.tsx` |
| `/admin/truckwash` | Administrator | `app/admin/truckwash/page.tsx` |
| `/admin/visual-editor` | Administrator | `app/admin/visual-editor/page.tsx` |
| `/admin/volunteers` | Administrator | `app/admin/volunteers/page.tsx` |
| `/admin/website-config` | Administrator | `app/admin/website-config/page.tsx` |
| `/billing` | Public | `app/billing/page.tsx` |
| `/billing/run-number` | Public | `app/billing/run-number/page.tsx` |
| `/board-minutes` | Board portal | `app/board-minutes/page.tsx` |
| `/board/admin/appearance` | Board portal | `app/board/(portal)/admin/appearance/page.tsx` |
| `/board/admin/audit` | Board portal | `app/board/(portal)/admin/audit/page.tsx` |
| `/board/admin` | Board portal | `app/board/(portal)/admin/page.tsx` |
| `/board/admin/users` | Board portal | `app/board/(portal)/admin/users/page.tsx` |
| `/board/admin/visibility` | Board portal | `app/board/(portal)/admin/visibility/page.tsx` |
| `/board/archive` | Board portal | `app/board/(portal)/archive/page.tsx` |
| `/board/briefings` | Board portal | `app/board/(portal)/briefings/page.tsx` |
| `/board/decisions` | Board portal | `app/board/(portal)/decisions/page.tsx` |
| `/board/documents` | Board portal | `app/board/(portal)/documents/page.tsx` |
| `/board/meetings/[id]` | Board portal | `app/board/(portal)/meetings/[id]/page.tsx` |
| `/board/meetings` | Board portal | `app/board/(portal)/meetings/page.tsx` |
| `/board/notifications` | Board portal | `app/board/(portal)/notifications/page.tsx` |
| `/board` | Board portal | `app/board/(portal)/page.tsx` |
| `/board/proposals` | Board portal | `app/board/(portal)/proposals/page.tsx` |
| `/board/referendum` | Board portal | `app/board/(portal)/referendum/page.tsx` |
| `/board/requests` | Board portal | `app/board/(portal)/requests/page.tsx` |
| `/board/settings` | Board portal | `app/board/(portal)/settings/page.tsx` |
| `/board/change-password` | Board portal | `app/board/change-password/page.tsx` |
| `/board/login` | Board portal | `app/board/login/page.tsx` |
| `/bulletin` | Public | `app/bulletin/page.tsx` |
| `/careers/apply` | Public | `app/careers/apply/page.tsx` |
| `/careers` | Public | `app/careers/page.tsx` |
| `/commercial-club` | Public | `app/commercial-club/page.tsx` |
| `/community-education` | Public | `app/community-education/page.tsx` |
| `/community-education/stroke-tool` | Public | `app/community-education/stroke-tool/page.tsx` |
| `/community-education/vitals` | Public | `app/community-education/vitals/page.tsx` |
| `/contact` | Public | `app/contact/page.tsx` |
| `/donate` | Public | `app/donate/page.tsx` |
| `/events` | Public | `app/events/page.tsx` |
| `/financials-information-hub` | Public | `app/financials-information-hub/page.tsx` |
| `/fleet` | Public | `app/fleet/page.tsx` |
| `/forms/birthday-station` | Public | `app/forms/birthday-station/page.tsx` |
| `/forms/birthday` | Public | `app/forms/birthday/page.tsx` |
| `/forms/education-request` | Public | `app/forms/education-request/page.tsx` |
| `/forms/employment` | Public | `app/forms/employment/page.tsx` |
| `/forms/equipment-request` | Public | `app/forms/equipment-request/page.tsx` |
| `/forms/event-request` | Public | `app/forms/event-request/page.tsx` |
| `/forms` | Public | `app/forms/page.tsx` |
| `/forms/ride-along` | Public | `app/forms/ride-along/page.tsx` |
| `/gallery` | Public | `app/gallery/page.tsx` |
| `/inventory/backstock` | Inventory | `app/inventory/backstock/page.tsx` |
| `/inventory/login` | Inventory | `app/inventory/login/page.tsx` |
| `/inventory` | Inventory | `app/inventory/page.tsx` |
| `/inventory/scan/[token]` | Inventory | `app/inventory/scan/[token]/page.tsx` |
| `/inventory/state` | Inventory | `app/inventory/state/page.tsx` |
| `/kids-club/activities` | Public | `app/kids-club/activities/page.tsx` |
| `/kids-club/badge/[slug]` | Public | `app/kids-club/badge/[slug]/page.tsx` |
| `/kids-club/games` | Public | `app/kids-club/games/page.tsx` |
| `/kids-club` | Public | `app/kids-club/page.tsx` |
| `/kids-club/printables` | Public | `app/kids-club/printables/page.tsx` |
| `/leadership` | Public | `app/leadership/page.tsx` |
| `/links` | Public | `app/links/page.tsx` |
| `/lounge/about-me` | Employee Lounge | `app/lounge/about-me/page.tsx` |
| `/lounge/acks` | Employee Lounge | `app/lounge/acks/page.tsx` |
| `/lounge/certs` | Employee Lounge | `app/lounge/certs/page.tsx` |
| `/lounge/change-password` | Employee Lounge | `app/lounge/change-password/page.tsx` |
| `/lounge/feed` | Employee Lounge | `app/lounge/feed/page.tsx` |
| `/lounge/forms/[id]` | Employee Lounge | `app/lounge/forms/[id]/page.tsx` |
| `/lounge/forms` | Employee Lounge | `app/lounge/forms/page.tsx` |
| `/lounge/games/abg-sim` | Employee Lounge | `app/lounge/games/abg-sim/page.tsx` |
| `/lounge/games/lead-ii` | Employee Lounge | `app/lounge/games/lead-ii/page.tsx` |
| `/lounge/games` | Employee Lounge | `app/lounge/games/page.tsx` |
| `/lounge/goodbye` | Employee Lounge | `app/lounge/goodbye/page.tsx` |
| `/lounge/hospitals` | Employee Lounge | `app/lounge/hospitals/page.tsx` |
| `/lounge/incidents` | Employee Lounge | `app/lounge/incidents/page.tsx` |
| `/lounge/login` | Employee Lounge | `app/lounge/login/page.tsx` |
| `/lounge/maintenance` | Employee Lounge | `app/lounge/maintenance/page.tsx` |
| `/lounge/messages` | Employee Lounge | `app/lounge/messages/page.tsx` |
| `/lounge/my-file` | Employee Lounge | `app/lounge/my-file/page.tsx` |
| `/lounge/notifications` | Employee Lounge | `app/lounge/notifications/page.tsx` |
| `/lounge` | Employee Lounge | `app/lounge/page.tsx` |
| `/lounge/policies` | Employee Lounge | `app/lounge/policies/page.tsx` |
| `/lounge/security` | Employee Lounge | `app/lounge/security/page.tsx` |
| `/lounge/ticker-control` | Employee Lounge | `app/lounge/ticker-control/page.tsx` |
| `/lounge/truckwash` | Employee Lounge | `app/lounge/truckwash/page.tsx` |
| `/medical-control` | Public | `app/medical-control/page.tsx` |
| `/movies` | Public | `app/movies/page.tsx` |
| `/news` | Public | `app/news/page.tsx` |
| `/` | Public | `app/page.tsx` |
| `/privacy` | Public | `app/privacy/page.tsx` |
| `/senior-center` | Public | `app/senior-center/page.tsx` |
| `/statistics` | Public | `app/statistics/page.tsx` |
| `/testimonials` | Public | `app/testimonials/page.tsx` |
| `/traffic` | Public | `app/traffic/page.tsx` |
| `/truckcheck/login` | Truck check | `app/truckcheck/login/page.tsx` |
| `/truckcheck` | Truck check | `app/truckcheck/page.tsx` |
| `/truckcheck/submitted` | Truck check | `app/truckcheck/submitted/page.tsx` |
| `/weather-test` | Public | `app/weather-test/page.tsx` |
| `/weather` | Public | `app/weather/page.tsx` |
| `/whats-happening` | Public | `app/whats-happening/page.tsx` |

## API Handlers

The signal column is deliberately conservative. A missing source-auth signal is a review flag, not automatic proof of exposure; middleware, signed tokens, webhook validation, or intentionally public behavior may apply.

| Route | Methods | Access family | Review signals | Source |
| --- | --- | --- | --- | --- |
| `/api/admin/acks/[id]/roster` | GET | Administrator | source auth check | `app/api/admin/acks/[id]/roster/route.ts` |
| `/api/admin/analytics/exports/[token]` | GET | Administrator | source auth check | `app/api/admin/analytics/exports/[token]/route.ts` |
| `/api/admin/analytics/exports` | POST | Administrator | source auth check | `app/api/admin/analytics/exports/route.ts` |
| `/api/admin/analytics/holds` | POST | Administrator | source auth check | `app/api/admin/analytics/holds/route.ts` |
| `/api/admin/analytics/security` | POST | Administrator | source auth check | `app/api/admin/analytics/security/route.ts` |
| `/api/admin/analytics/summary` | GET | Administrator | source auth check | `app/api/admin/analytics/summary/route.ts` |
| `/api/admin/announcements` | GET, POST, PATCH, DELETE | Administrator | source auth check | `app/api/admin/announcements/route.ts` |
| `/api/admin/applicants/[id]` | GET, PATCH | Administrator | external delivery, source auth check | `app/api/admin/applicants/[id]/route.ts` |
| `/api/admin/applicants` | GET | Administrator | source auth check | `app/api/admin/applicants/route.ts` |
| `/api/admin/budget-documents` | POST, GET | Administrator | upload/blob, source auth check | `app/api/admin/budget-documents/route.ts` |
| `/api/admin/bulletin` | GET, POST, PATCH, DELETE | Administrator | source auth check | `app/api/admin/bulletin/route.ts` |
| `/api/admin/cad-poll` | POST | Administrator | external delivery | `app/api/admin/cad-poll/route.ts` |
| `/api/admin/calls/[id]` | GET | Administrator | none detected | `app/api/admin/calls/[id]/route.ts` |
| `/api/admin/calls/categories` | GET, POST, PATCH, DELETE | Administrator | none detected | `app/api/admin/calls/categories/route.ts` |
| `/api/admin/calls/hover-settings` | GET, PUT | Administrator | none detected | `app/api/admin/calls/hover-settings/route.ts` |
| `/api/admin/calls/reports` | GET | Administrator | none detected | `app/api/admin/calls/reports/route.ts` |
| `/api/admin/calls` | GET, POST, PATCH, DELETE | Administrator | PHI/sensitive terms, external delivery | `app/api/admin/calls/route.ts` |
| `/api/admin/cert-types/[id]` | PATCH, DELETE | Administrator | source auth check | `app/api/admin/cert-types/[id]/route.ts` |
| `/api/admin/cert-types` | GET, POST | Administrator | source auth check | `app/api/admin/cert-types/route.ts` |
| `/api/admin/changelog` | GET | Administrator | source auth check | `app/api/admin/changelog/route.ts` |
| `/api/admin/classes/[id]/requirements` | PUT | Administrator | source auth check | `app/api/admin/classes/[id]/requirements/route.ts` |
| `/api/admin/classes/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/classes/[id]/route.ts` |
| `/api/admin/classes` | GET, POST | Administrator | source auth check | `app/api/admin/classes/route.ts` |
| `/api/admin/commercial-club/fetch` | POST | Administrator | upload/blob, source auth check | `app/api/admin/commercial-club/fetch/route.ts` |
| `/api/admin/commercial-club` | POST | Administrator | upload/blob, source auth check | `app/api/admin/commercial-club/route.ts` |
| `/api/admin/dev/test-user/ack` | POST | Administrator | source auth check | `app/api/admin/dev/test-user/ack/route.ts` |
| `/api/admin/dev/test-user/notification` | POST | Administrator | source auth check | `app/api/admin/dev/test-user/notification/route.ts` |
| `/api/admin/dev/test-user/reset` | POST | Administrator | source auth check | `app/api/admin/dev/test-user/reset/route.ts` |
| `/api/admin/dev/test-user` | GET | Administrator | source auth check | `app/api/admin/dev/test-user/route.ts` |
| `/api/admin/employees/[id]/certs-overview` | GET | Administrator | source auth check | `app/api/admin/employees/[id]/certs-overview/route.ts` |
| `/api/admin/employees/[id]/certs` | POST | Administrator | upload/blob, source auth check | `app/api/admin/employees/[id]/certs/route.ts` |
| `/api/admin/employees/[id]/classes` | GET, PUT | Administrator | source auth check | `app/api/admin/employees/[id]/classes/route.ts` |
| `/api/admin/employees/[id]/files/[fileId]` | DELETE | Administrator | upload/blob, source auth check | `app/api/admin/employees/[id]/files/[fileId]/route.ts` |
| `/api/admin/employees/[id]/files` | GET, POST | Administrator | upload/blob, source auth check | `app/api/admin/employees/[id]/files/route.ts` |
| `/api/admin/employees/[id]/forms` | GET | Administrator | source auth check | `app/api/admin/employees/[id]/forms/route.ts` |
| `/api/admin/employees/[id]/photo` | POST, DELETE | Administrator | upload/blob, source auth check | `app/api/admin/employees/[id]/photo/route.ts` |
| `/api/admin/employees/[id]/reset-2fa` | POST | Administrator | source auth check | `app/api/admin/employees/[id]/reset-2fa/route.ts` |
| `/api/admin/employees/[id]/reset-password` | POST | Administrator | source auth check | `app/api/admin/employees/[id]/reset-password/route.ts` |
| `/api/admin/employees/[id]` | GET, PATCH, DELETE | Administrator | PHI/sensitive terms, source auth check | `app/api/admin/employees/[id]/route.ts` |
| `/api/admin/employees/[id]/ssn` | GET | Administrator | PHI/sensitive terms, source auth check | `app/api/admin/employees/[id]/ssn/route.ts` |
| `/api/admin/employees` | GET, POST | Administrator | source auth check | `app/api/admin/employees/route.ts` |
| `/api/admin/financials/access-requests/[id]/agreement` | GET | Administrator | source auth check | `app/api/admin/financials/access-requests/[id]/agreement/route.ts` |
| `/api/admin/financials/access-requests/[id]/approve` | POST | Administrator | source auth check | `app/api/admin/financials/access-requests/[id]/approve/route.ts` |
| `/api/admin/financials/access-requests/[id]/deny` | POST | Administrator | source auth check | `app/api/admin/financials/access-requests/[id]/deny/route.ts` |
| `/api/admin/financials/access-requests/[id]/expire` | POST | Administrator | source auth check | `app/api/admin/financials/access-requests/[id]/expire/route.ts` |
| `/api/admin/financials/access-requests/[id]/revoke` | POST | Administrator | source auth check | `app/api/admin/financials/access-requests/[id]/revoke/route.ts` |
| `/api/admin/financials/access-requests` | GET | Administrator | source auth check | `app/api/admin/financials/access-requests/route.ts` |
| `/api/admin/financials/accuracy-reports/[id]/agreement` | GET | Administrator | source auth check | `app/api/admin/financials/accuracy-reports/[id]/agreement/route.ts` |
| `/api/admin/financials/accuracy-reports/[id]` | PATCH | Administrator | source auth check | `app/api/admin/financials/accuracy-reports/[id]/route.ts` |
| `/api/admin/financials/accuracy-reports/[id]/upload` | GET | Administrator | source auth check | `app/api/admin/financials/accuracy-reports/[id]/upload/route.ts` |
| `/api/admin/financials/accuracy-reports` | GET | Administrator | source auth check | `app/api/admin/financials/accuracy-reports/route.ts` |
| `/api/admin/financials/audit-events` | GET | Administrator | source auth check | `app/api/admin/financials/audit-events/route.ts` |
| `/api/admin/financials/documents/[id]/file` | GET | Administrator | source auth check | `app/api/admin/financials/documents/[id]/file/route.ts` |
| `/api/admin/financials/documents/[id]` | PATCH | Administrator | source auth check | `app/api/admin/financials/documents/[id]/route.ts` |
| `/api/admin/financials/documents` | GET, POST | Administrator | upload/blob, source auth check | `app/api/admin/financials/documents/route.ts` |
| `/api/admin/financials/reset` | POST | Administrator | source auth check | `app/api/admin/financials/reset/route.ts` |
| `/api/admin/form-assignments/[id]/csv` | GET | Administrator | source auth check | `app/api/admin/form-assignments/[id]/csv/route.ts` |
| `/api/admin/form-assignments/[id]/remind` | POST | Administrator | source auth check | `app/api/admin/form-assignments/[id]/remind/route.ts` |
| `/api/admin/form-assignments/[id]` | GET | Administrator | source auth check | `app/api/admin/form-assignments/[id]/route.ts` |
| `/api/admin/form-assignments` | GET, POST | Administrator | source auth check | `app/api/admin/form-assignments/route.ts` |
| `/api/admin/form-requests/[id]/approve` | POST | Administrator | source auth check | `app/api/admin/form-requests/[id]/approve/route.ts` |
| `/api/admin/form-requests/[id]/deny` | POST | Administrator | source auth check | `app/api/admin/form-requests/[id]/deny/route.ts` |
| `/api/admin/form-requests` | GET | Administrator | source auth check | `app/api/admin/form-requests/route.ts` |
| `/api/admin/forms/[id]/blank-pdf` | GET | Administrator | source auth check | `app/api/admin/forms/[id]/blank-pdf/route.ts` |
| `/api/admin/forms/[id]/finalize` | POST | Administrator | upload/blob, external delivery, source auth check | `app/api/admin/forms/[id]/finalize/route.ts` |
| `/api/admin/forms/[id]/pdf` | GET | Administrator | source auth check | `app/api/admin/forms/[id]/pdf/route.ts` |
| `/api/admin/forms/[id]/rescind` | POST | Administrator | source auth check | `app/api/admin/forms/[id]/rescind/route.ts` |
| `/api/admin/forms/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/forms/[id]/route.ts` |
| `/api/admin/forms/awaiting-review` | GET | Administrator | source auth check | `app/api/admin/forms/awaiting-review/route.ts` |
| `/api/admin/forms/insights` | GET | Administrator | source auth check | `app/api/admin/forms/insights/route.ts` |
| `/api/admin/forms` | GET, POST | Administrator | source auth check | `app/api/admin/forms/route.ts` |
| `/api/admin/hospital-suggestions/[id]` | PATCH | Administrator | source auth check | `app/api/admin/hospital-suggestions/[id]/route.ts` |
| `/api/admin/hospital-suggestions` | GET | Administrator | source auth check | `app/api/admin/hospital-suggestions/route.ts` |
| `/api/admin/hospitals/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/hospitals/[id]/route.ts` |
| `/api/admin/hospitals` | GET, POST | Administrator | source auth check | `app/api/admin/hospitals/route.ts` |
| `/api/admin/inventory/email-order` | POST | Administrator | source auth check | `app/api/admin/inventory/email-order/route.ts` |
| `/api/admin/inventory/items/[id]` | PATCH, DELETE | Administrator | source auth check | `app/api/admin/inventory/items/[id]/route.ts` |
| `/api/admin/inventory/items/reorder` | POST | Administrator | source auth check | `app/api/admin/inventory/items/reorder/route.ts` |
| `/api/admin/inventory/items` | GET, POST | Administrator | source auth check | `app/api/admin/inventory/items/route.ts` |
| `/api/admin/inventory/qr-pdf` | POST | Administrator | source auth check | `app/api/admin/inventory/qr-pdf/route.ts` |
| `/api/admin/inventory/qr` | GET, POST, DELETE | Administrator | source auth check | `app/api/admin/inventory/qr/route.ts` |
| `/api/admin/inventory/reports` | GET, POST | Administrator | upload/blob, source auth check | `app/api/admin/inventory/reports/route.ts` |
| `/api/admin/inventory/settings` | PATCH | Administrator | source auth check | `app/api/admin/inventory/settings/route.ts` |
| `/api/admin/login-analytics` | GET | Administrator | source auth check | `app/api/admin/login-analytics/route.ts` |
| `/api/admin/login` | POST | Administrator | none detected | `app/api/admin/login/route.ts` |
| `/api/admin/logout` | POST | Administrator | none detected | `app/api/admin/logout/route.ts` |
| `/api/admin/media` | GET, POST, DELETE | Administrator | source auth check | `app/api/admin/media/route.ts` |
| `/api/admin/media/upload` | POST | Administrator | upload/blob, source auth check | `app/api/admin/media/upload/route.ts` |
| `/api/admin/onboarding/records/[id]/finalize` | POST | Administrator | upload/blob, source auth check | `app/api/admin/onboarding/records/[id]/finalize/route.ts` |
| `/api/admin/onboarding/records/[id]/items/[itemId]` | PATCH | Administrator | source auth check | `app/api/admin/onboarding/records/[id]/items/[itemId]/route.ts` |
| `/api/admin/onboarding/records/[id]/rescind` | POST | Administrator | source auth check | `app/api/admin/onboarding/records/[id]/rescind/route.ts` |
| `/api/admin/onboarding/records/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/onboarding/records/[id]/route.ts` |
| `/api/admin/onboarding/records/[id]/signatures` | POST | Administrator | source auth check | `app/api/admin/onboarding/records/[id]/signatures/route.ts` |
| `/api/admin/onboarding/records/[id]/upload` | POST | Administrator | upload/blob, source auth check | `app/api/admin/onboarding/records/[id]/upload/route.ts` |
| `/api/admin/onboarding/records` | GET, POST | Administrator | source auth check | `app/api/admin/onboarding/records/route.ts` |
| `/api/admin/onboarding/template/items/[id]` | PATCH, DELETE | Administrator | source auth check | `app/api/admin/onboarding/template/items/[id]/route.ts` |
| `/api/admin/onboarding/template` | GET, POST | Administrator | source auth check | `app/api/admin/onboarding/template/route.ts` |
| `/api/admin/onboarding/template/sections/[id]` | PATCH, DELETE | Administrator | source auth check | `app/api/admin/onboarding/template/sections/[id]/route.ts` |
| `/api/admin/personnel-dashboard` | GET | Administrator | source auth check | `app/api/admin/personnel-dashboard/route.ts` |
| `/api/admin/personnel-records/[id]/attachments` | GET, POST, DELETE | Administrator | upload/blob, source auth check | `app/api/admin/personnel-records/[id]/attachments/route.ts` |
| `/api/admin/personnel-records/[id]/audit` | GET | Administrator | source auth check | `app/api/admin/personnel-records/[id]/audit/route.ts` |
| `/api/admin/personnel-records/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/personnel-records/[id]/route.ts` |
| `/api/admin/personnel-records/packet` | GET | Administrator | source auth check | `app/api/admin/personnel-records/packet/route.ts` |
| `/api/admin/personnel-records` | GET, POST | Administrator | source auth check | `app/api/admin/personnel-records/route.ts` |
| `/api/admin/polls/[id]/responses` | GET | Administrator | source auth check | `app/api/admin/polls/[id]/responses/route.ts` |
| `/api/admin/polls/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/polls/[id]/route.ts` |
| `/api/admin/polls` | GET, POST | Administrator | source auth check | `app/api/admin/polls/route.ts` |
| `/api/admin/profile-change-requests/[id]` | PATCH | Administrator | PHI/sensitive terms, source auth check | `app/api/admin/profile-change-requests/[id]/route.ts` |
| `/api/admin/profile-change-requests` | GET | Administrator | source auth check | `app/api/admin/profile-change-requests/route.ts` |
| `/api/admin/senior-center` | POST | Administrator | upload/blob, source auth check | `app/api/admin/senior-center/route.ts` |
| `/api/admin/submissions` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/submissions/route.ts` |
| `/api/admin/testimonials` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/testimonials/route.ts` |
| `/api/admin/truckcheck-dashboard` | GET | Administrator | source auth check | `app/api/admin/truckcheck-dashboard/route.ts` |
| `/api/admin/truckwash/[id]` | DELETE | Administrator | source auth check | `app/api/admin/truckwash/[id]/route.ts` |
| `/api/admin/visual-editor/content` | GET, POST, PUT | Administrator | none detected | `app/api/admin/visual-editor/content/route.ts` |
| `/api/admin/visual-editor` | POST, DELETE | Administrator | none detected | `app/api/admin/visual-editor/route.ts` |
| `/api/admin/volunteers/[id]` | PATCH, DELETE | Administrator | source auth check | `app/api/admin/volunteers/[id]/route.ts` |
| `/api/admin/volunteers/hours` | GET, PUT, DELETE | Administrator | source auth check | `app/api/admin/volunteers/hours/route.ts` |
| `/api/admin/volunteers` | GET, POST | Administrator | source auth check | `app/api/admin/volunteers/route.ts` |
| `/api/admin/writeups/[id]/finalize` | POST | Administrator | upload/blob, external delivery, source auth check | `app/api/admin/writeups/[id]/finalize/route.ts` |
| `/api/admin/writeups/[id]/pdf` | GET | Administrator | source auth check | `app/api/admin/writeups/[id]/pdf/route.ts` |
| `/api/admin/writeups/[id]/rescind` | POST | Administrator | upload/blob, external delivery, source auth check | `app/api/admin/writeups/[id]/rescind/route.ts` |
| `/api/admin/writeups/[id]` | GET, PATCH, DELETE | Administrator | source auth check | `app/api/admin/writeups/[id]/route.ts` |
| `/api/admin/writeups` | GET, POST | Administrator | source auth check | `app/api/admin/writeups/route.ts` |
| `/api/analytics/community-area` | POST | Public | none detected | `app/api/analytics/community-area/route.ts` |
| `/api/analytics/events` | POST | Public | none detected | `app/api/analytics/events/route.ts` |
| `/api/apply` | GET, POST | Public | upload/blob, external delivery | `app/api/apply/route.ts` |
| `/api/board/calendar` | POST | Board portal | source auth check | `app/api/board/calendar/route.ts` |
| `/api/board/change-password` | POST | Board portal | source auth check | `app/api/board/change-password/route.ts` |
| `/api/board/fire-requests` | POST | Board portal | source auth check | `app/api/board/fire-requests/route.ts` |
| `/api/board/login` | POST | Board portal | none detected | `app/api/board/login/route.ts` |
| `/api/board/logout` | POST | Board portal | source auth check | `app/api/board/logout/route.ts` |
| `/api/board/meetings/attendance` | POST | Board portal | source auth check | `app/api/board/meetings/attendance/route.ts` |
| `/api/board/meetings/confirm` | POST | Board portal | source auth check | `app/api/board/meetings/confirm/route.ts` |
| `/api/board/meetings/minutes/draft` | POST | Board portal | source auth check | `app/api/board/meetings/minutes/draft/route.ts` |
| `/api/board/meetings/minutes/finalize` | POST | Board portal | source auth check | `app/api/board/meetings/minutes/finalize/route.ts` |
| `/api/board/meetings/minutes/pdf` | GET | Board portal | source auth check | `app/api/board/meetings/minutes/pdf/route.ts` |
| `/api/board/meetings/minutes` | POST | Board portal | source auth check | `app/api/board/meetings/minutes/route.ts` |
| `/api/board/meetings/question` | POST | Board portal | source auth check | `app/api/board/meetings/question/route.ts` |
| `/api/board/session/refresh` | POST | Board portal | source auth check | `app/api/board/session/refresh/route.ts` |
| `/api/board/workbook` | POST | Board portal | upload/blob, source auth check | `app/api/board/workbook/route.ts` |
| `/api/board/workbook/visibility` | POST | Board portal | source auth check | `app/api/board/workbook/visibility/route.ts` |
| `/api/bulletin` | GET, POST | Public | none detected | `app/api/bulletin/route.ts` |
| `/api/cad/hover-settings` | GET | Public | none detected | `app/api/cad/hover-settings/route.ts` |
| `/api/cad/latest` | GET | Public | none detected | `app/api/cad/latest/route.ts` |
| `/api/cad/log` | GET | Public | none detected | `app/api/cad/log/route.ts` |
| `/api/cad/poll` | GET, POST | Public | external delivery | `app/api/cad/poll/route.ts` |
| `/api/cad/stats` | GET | Public | PHI/sensitive terms | `app/api/cad/stats/route.ts` |
| `/api/cad/top-categories` | GET | Public | none detected | `app/api/cad/top-categories/route.ts` |
| `/api/commercial-club/docs` | GET | Public | upload/blob | `app/api/commercial-club/docs/route.ts` |
| `/api/commercial-club/latest` | GET | Public | upload/blob | `app/api/commercial-club/latest/route.ts` |
| `/api/contact` | GET, POST | Public | external delivery | `app/api/contact/route.ts` |
| `/api/cron/analytics-retention` | GET | Scheduled job | none detected | `app/api/cron/analytics-retention/route.ts` |
| `/api/cron/board-calendar-reminders` | GET | Scheduled job | external delivery | `app/api/cron/board-calendar-reminders/route.ts` |
| `/api/cron/cert-alerts` | GET | Scheduled job | none detected | `app/api/cron/cert-alerts/route.ts` |
| `/api/cron/fetch-newsletters` | GET | Scheduled job | upload/blob | `app/api/cron/fetch-newsletters/route.ts` |
| `/api/cron/forms-weekly-digest` | GET | Scheduled job | external delivery | `app/api/cron/forms-weekly-digest/route.ts` |
| `/api/cron/submission-reminders` | GET | Scheduled job | external delivery | `app/api/cron/submission-reminders/route.ts` |
| `/api/financials/access-requests/me` | GET | Public | none detected | `app/api/financials/access-requests/me/route.ts` |
| `/api/financials/access-requests` | GET, POST | Public | none detected | `app/api/financials/access-requests/route.ts` |
| `/api/financials/accuracy-reports` | GET, POST | Public | upload/blob | `app/api/financials/accuracy-reports/route.ts` |
| `/api/financials/documents/[documentId]/access` | GET | Public | none detected | `app/api/financials/documents/[documentId]/access/route.ts` |
| `/api/financials/documents/catalog` | GET | Public | none detected | `app/api/financials/documents/catalog/route.ts` |
| `/api/financials/form-990/[id]/html` | GET | Public | none detected | `app/api/financials/form-990/[id]/html/route.ts` |
| `/api/financials/form-990/[id]/pdf` | GET | Public | none detected | `app/api/financials/form-990/[id]/pdf/route.ts` |
| `/api/financials/form-990/catalog` | GET | Public | none detected | `app/api/financials/form-990/catalog/route.ts` |
| `/api/financials/status` | GET | Public | none detected | `app/api/financials/status/route.ts` |
| `/api/financials/viewer-sessions/[sessionId]/pages/[pageNumber]` | GET | Public | none detected | `app/api/financials/viewer-sessions/[sessionId]/pages/[pageNumber]/route.ts` |
| `/api/financials/viewer-sessions` | POST | Public | none detected | `app/api/financials/viewer-sessions/route.ts` |
| `/api/inventory/history` | GET | Inventory | source auth check | `app/api/inventory/history/route.ts` |
| `/api/inventory/items/[id]` | GET, PATCH | Inventory | source auth check | `app/api/inventory/items/[id]/route.ts` |
| `/api/inventory/items` | GET | Inventory | source auth check | `app/api/inventory/items/route.ts` |
| `/api/inventory/logout` | POST | Inventory | none detected | `app/api/inventory/logout/route.ts` |
| `/api/inventory/scan/[token]` | GET, PATCH | Inventory | none detected | `app/api/inventory/scan/[token]/route.ts` |
| `/api/inventory/seed-state` | POST | Inventory | source auth check | `app/api/inventory/seed-state/route.ts` |
| `/api/inventory/seed` | POST | Inventory | source auth check | `app/api/inventory/seed/route.ts` |
| `/api/inventory/submit` | POST | Inventory | source auth check | `app/api/inventory/submit/route.ts` |
| `/api/lounge/acks/[id]/ack` | POST | Employee Lounge | upload/blob, source auth check | `app/api/lounge/acks/[id]/ack/route.ts` |
| `/api/lounge/acks/[id]` | DELETE | Employee Lounge | source auth check | `app/api/lounge/acks/[id]/route.ts` |
| `/api/lounge/acks/[id]/view` | POST | Employee Lounge | source auth check | `app/api/lounge/acks/[id]/view/route.ts` |
| `/api/lounge/acks` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/acks/route.ts` |
| `/api/lounge/birthdays/today` | GET | Employee Lounge | source auth check | `app/api/lounge/birthdays/today/route.ts` |
| `/api/lounge/certs/[id]` | DELETE | Employee Lounge | upload/blob, source auth check | `app/api/lounge/certs/[id]/route.ts` |
| `/api/lounge/certs` | GET, POST | Employee Lounge | upload/blob, source auth check | `app/api/lounge/certs/route.ts` |
| `/api/lounge/change-password` | POST | Employee Lounge | source auth check | `app/api/lounge/change-password/route.ts` |
| `/api/lounge/feed/[id]/comments` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/feed/[id]/comments/route.ts` |
| `/api/lounge/feed/[id]/pin` | POST | Employee Lounge | source auth check | `app/api/lounge/feed/[id]/pin/route.ts` |
| `/api/lounge/feed/[id]/react` | POST | Employee Lounge | source auth check | `app/api/lounge/feed/[id]/react/route.ts` |
| `/api/lounge/feed/[id]` | GET, DELETE | Employee Lounge | source auth check | `app/api/lounge/feed/[id]/route.ts` |
| `/api/lounge/feed/[id]/save` | POST | Employee Lounge | source auth check | `app/api/lounge/feed/[id]/save/route.ts` |
| `/api/lounge/feed/comments/[commentId]` | DELETE | Employee Lounge | source auth check | `app/api/lounge/feed/comments/[commentId]/route.ts` |
| `/api/lounge/feed/media` | POST | Employee Lounge | upload/blob, source auth check | `app/api/lounge/feed/media/route.ts` |
| `/api/lounge/feed` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/feed/route.ts` |
| `/api/lounge/files` | GET | Employee Lounge | upload/blob, source auth check | `app/api/lounge/files/route.ts` |
| `/api/lounge/form-requests` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/form-requests/route.ts` |
| `/api/lounge/forms/[id]` | GET, PATCH | Employee Lounge | upload/blob, source auth check | `app/api/lounge/forms/[id]/route.ts` |
| `/api/lounge/forms` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/forms/route.ts` |
| `/api/lounge/games/abg-sim/leaderboard` | GET | Employee Lounge | source auth check | `app/api/lounge/games/abg-sim/leaderboard/route.ts` |
| `/api/lounge/games/abg-sim/score` | POST | Employee Lounge | source auth check | `app/api/lounge/games/abg-sim/score/route.ts` |
| `/api/lounge/games/lead-ii/leaderboard` | GET | Employee Lounge | source auth check | `app/api/lounge/games/lead-ii/leaderboard/route.ts` |
| `/api/lounge/games/lead-ii/score` | POST | Employee Lounge | source auth check | `app/api/lounge/games/lead-ii/score/route.ts` |
| `/api/lounge/heartbeat` | POST | Employee Lounge | source auth check | `app/api/lounge/heartbeat/route.ts` |
| `/api/lounge/hospitals/eta` | GET | Employee Lounge | source auth check | `app/api/lounge/hospitals/eta/route.ts` |
| `/api/lounge/hospitals/suggestions` | POST | Employee Lounge | source auth check | `app/api/lounge/hospitals/suggestions/route.ts` |
| `/api/lounge/incidents/[id]/admin-note` | POST | Employee Lounge | source auth check | `app/api/lounge/incidents/[id]/admin-note/route.ts` |
| `/api/lounge/incidents/[id]` | GET, DELETE | Employee Lounge | source auth check | `app/api/lounge/incidents/[id]/route.ts` |
| `/api/lounge/incidents/[id]/status` | POST | Employee Lounge | source auth check | `app/api/lounge/incidents/[id]/status/route.ts` |
| `/api/lounge/incidents/blob` | GET | Employee Lounge | upload/blob, source auth check | `app/api/lounge/incidents/blob/route.ts` |
| `/api/lounge/incidents/photo` | POST | Employee Lounge | upload/blob, source auth check | `app/api/lounge/incidents/photo/route.ts` |
| `/api/lounge/incidents` | GET, POST | Employee Lounge | upload/blob, PHI/sensitive terms, source auth check | `app/api/lounge/incidents/route.ts` |
| `/api/lounge/login` | POST | Employee Lounge | external delivery | `app/api/lounge/login/route.ts` |
| `/api/lounge/logout` | POST, GET | Employee Lounge | source auth check | `app/api/lounge/logout/route.ts` |
| `/api/lounge/maintenance/[id]` | PATCH, DELETE | Employee Lounge | source auth check | `app/api/lounge/maintenance/[id]/route.ts` |
| `/api/lounge/maintenance` | GET, POST | Employee Lounge | external delivery, source auth check | `app/api/lounge/maintenance/route.ts` |
| `/api/lounge/me/phone-verify/confirm` | POST | Employee Lounge | source auth check | `app/api/lounge/me/phone-verify/confirm/route.ts` |
| `/api/lounge/me/phone-verify/send` | POST | Employee Lounge | external delivery, source auth check | `app/api/lounge/me/phone-verify/send/route.ts` |
| `/api/lounge/me/photo` | POST, DELETE | Employee Lounge | upload/blob, source auth check | `app/api/lounge/me/photo/route.ts` |
| `/api/lounge/me/profile` | GET, PUT | Employee Lounge | PHI/sensitive terms, source auth check | `app/api/lounge/me/profile/route.ts` |
| `/api/lounge/me/required-acks` | GET | Employee Lounge | source auth check | `app/api/lounge/me/required-acks/route.ts` |
| `/api/lounge/me` | GET | Employee Lounge | source auth check | `app/api/lounge/me/route.ts` |
| `/api/lounge/messages/[id]/react` | POST | Employee Lounge | source auth check | `app/api/lounge/messages/[id]/react/route.ts` |
| `/api/lounge/messages/[id]` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/messages/[id]/route.ts` |
| `/api/lounge/messages/dm` | POST | Employee Lounge | source auth check | `app/api/lounge/messages/dm/route.ts` |
| `/api/lounge/messages/group` | POST | Employee Lounge | source auth check | `app/api/lounge/messages/group/route.ts` |
| `/api/lounge/messages/media` | POST | Employee Lounge | upload/blob, source auth check | `app/api/lounge/messages/media/route.ts` |
| `/api/lounge/messages` | GET | Employee Lounge | source auth check | `app/api/lounge/messages/route.ts` |
| `/api/lounge/my-file/[id]/acknowledge` | POST | Employee Lounge | source auth check | `app/api/lounge/my-file/[id]/acknowledge/route.ts` |
| `/api/lounge/my-file` | GET | Employee Lounge | source auth check | `app/api/lounge/my-file/route.ts` |
| `/api/lounge/notifications/[id]/read` | POST | Employee Lounge | source auth check | `app/api/lounge/notifications/[id]/read/route.ts` |
| `/api/lounge/notifications/read-all` | POST | Employee Lounge | source auth check | `app/api/lounge/notifications/read-all/route.ts` |
| `/api/lounge/notifications` | GET | Employee Lounge | source auth check | `app/api/lounge/notifications/route.ts` |
| `/api/lounge/policies/[id]` | GET, DELETE | Employee Lounge | upload/blob, source auth check | `app/api/lounge/policies/[id]/route.ts` |
| `/api/lounge/policies/[id]/save` | POST | Employee Lounge | source auth check | `app/api/lounge/policies/[id]/save/route.ts` |
| `/api/lounge/policies` | GET, POST | Employee Lounge | upload/blob, source auth check | `app/api/lounge/policies/route.ts` |
| `/api/lounge/polls/[id]/respond` | POST | Employee Lounge | source auth check | `app/api/lounge/polls/[id]/respond/route.ts` |
| `/api/lounge/polls` | GET | Employee Lounge | source auth check | `app/api/lounge/polls/route.ts` |
| `/api/lounge/presence` | GET, POST | Employee Lounge | source auth check | `app/api/lounge/presence/route.ts` |
| `/api/lounge/profile-change-requests` | GET, POST | Employee Lounge | upload/blob, external delivery, source auth check | `app/api/lounge/profile-change-requests/route.ts` |
| `/api/lounge/roster` | GET | Employee Lounge | source auth check | `app/api/lounge/roster/route.ts` |
| `/api/lounge/setup-2fa` | GET, POST | Employee Lounge | none detected | `app/api/lounge/setup-2fa/route.ts` |
| `/api/lounge/sms-login-code/send` | POST | Employee Lounge | none detected | `app/api/lounge/sms-login-code/send/route.ts` |
| `/api/lounge/sms-login-code/verify` | POST | Employee Lounge | none detected | `app/api/lounge/sms-login-code/verify/route.ts` |
| `/api/lounge/sso/[target]` | GET | Employee Lounge | source auth check | `app/api/lounge/sso/[target]/route.ts` |
| `/api/lounge/ticker-control/calls` | GET, POST, PATCH, DELETE | Employee Lounge | PHI/sensitive terms, external delivery, source auth check | `app/api/lounge/ticker-control/calls/route.ts` |
| `/api/lounge/today-events` | GET | Employee Lounge | source auth check | `app/api/lounge/today-events/route.ts` |
| `/api/lounge/truckwash` | GET, POST | Employee Lounge | external delivery, source auth check | `app/api/lounge/truckwash/route.ts` |
| `/api/lounge/trusted-devices` | GET, DELETE | Employee Lounge | source auth check | `app/api/lounge/trusted-devices/route.ts` |
| `/api/lounge/verify-2fa` | POST | Employee Lounge | none detected | `app/api/lounge/verify-2fa/route.ts` |
| `/api/lounge/version` | GET | Employee Lounge | none detected | `app/api/lounge/version/route.ts` |
| `/api/lounge/webauthn/assert-finish` | POST | Employee Lounge | none detected | `app/api/lounge/webauthn/assert-finish/route.ts` |
| `/api/lounge/webauthn/assert-start` | POST | Employee Lounge | none detected | `app/api/lounge/webauthn/assert-start/route.ts` |
| `/api/lounge/webauthn/credentials` | GET, DELETE | Employee Lounge | source auth check | `app/api/lounge/webauthn/credentials/route.ts` |
| `/api/lounge/webauthn/register-finish` | POST | Employee Lounge | source auth check | `app/api/lounge/webauthn/register-finish/route.ts` |
| `/api/lounge/webauthn/register-start` | POST | Employee Lounge | source auth check | `app/api/lounge/webauthn/register-start/route.ts` |
| `/api/metar` | GET | Public | external delivery | `app/api/metar/route.ts` |
| `/api/millstadt-news` | GET | Public | none detected | `app/api/millstadt-news/route.ts` |
| `/api/privacy/preferences` | GET, POST | Public | none detected | `app/api/privacy/preferences/route.ts` |
| `/api/public/board-minutes/has-published` | GET | Public | none detected | `app/api/public/board-minutes/has-published/route.ts` |
| `/api/revalidate` | POST | Public | none detected | `app/api/revalidate/route.ts` |
| `/api/senior-center/docs` | GET | Public | upload/blob | `app/api/senior-center/docs/route.ts` |
| `/api/sms/reply` | POST | Public | upload/blob, external delivery | `app/api/sms/reply/route.ts` |
| `/api/testimonials/approve` | GET | Public | none detected | `app/api/testimonials/approve/route.ts` |
| `/api/truckcheck/logout` | POST | Truck check | none detected | `app/api/truckcheck/logout/route.ts` |
| `/api/truckcheck/photo` | POST | Truck check | upload/blob, source auth check | `app/api/truckcheck/photo/route.ts` |
| `/api/truckcheck/submit` | POST | Truck check | upload/blob, source auth check | `app/api/truckcheck/submit/route.ts` |
