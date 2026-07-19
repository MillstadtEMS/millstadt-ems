# Board Portal Permission Matrix

Date: July 18, 2026

## Roles

| Role | Intended User Type |
| --- | --- |
| `admin` | Kenneth James / full Board Portal administrator |
| `ems_president` | EMS Board president |
| `ems_board` | EMS Board voting member |
| `submitter` | Staff/leadership submitter with limited leadership visibility |
| `fire_board` | Millstadt Fire Protection District Board member |
| `audit_reviewer` | Read-only governance/audit reviewer |

## Feature Access

| Feature | `admin` | `ems_president` | `ems_board` | `submitter` | `fire_board` | `audit_reviewer` |
| --- | --- | --- | --- | --- | --- | --- |
| Sign in | Yes | Yes | Yes | Yes | Yes | Yes |
| Must change seeded password | Yes | Yes | Yes | Yes | Yes | Yes |
| EMS meetings | Yes | Yes | Yes | Yes | No | Yes |
| Fire Board meetings | Yes | Yes | No | No | Yes | Yes |
| Planned attendance | Hidden unless assigned to that board | Hidden unless assigned to that board | EMS Board meetings | Hidden | Hidden | Hidden |
| Confirm official attendance | Yes | Secretary title only | Secretary title only | Secretary title only | No unless policy changes | No |
| View Board-wide questions | Yes | Yes | Yes | Yes | Within visible meeting scope | Yes |
| View leadership questions | Yes | Yes | No unless officer title grants leadership | Yes | No unless policy changes | Yes if leadership policy grants |
| View confidential review questions | Yes | Yes | Own submissions only unless president title | Own submissions only | Own submissions only | No by default |
| Submit questions | Yes | Yes | Yes | Yes | Yes for visible meeting scope | Yes if account active |
| Referendum model view | Yes | Yes | Yes | Yes | Route accessible if authenticated, but financial permission policy should be reviewed | Yes |
| EAV scenario calculate | Yes | Yes | Yes | Yes | Yes if route access allowed | Yes |
| Save EAV as model value | Yes | No | No | No | No | No |
| Upload workbook | Yes | No | No | No | No | No |
| Model review admin page | Yes | No | No | No | No | No |

## Policy Items Needing Kenneth Review

1. Whether Fire Board users should have any Referendum financial-model route access beyond Fire meeting governance.
2. Whether `audit_reviewer` should see both EMS and Fire calendars in production.
3. Whether `submitter` should retain leadership visibility for Board questions.
4. Whether secretary powers should be role-based, officer-title-based, or both.
5. Whether EAV save permission should remain `admin` only or become a separate financial-model permission.
