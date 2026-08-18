# Employment Application Field Audit

Scope: new public applications submitted through `/careers/apply` and `/api/apply`.

Historical encrypted submissions and any historical database values are preserved. This audit changes only what a new applicant is asked to provide and what new submissions accept or display.

## Required Contact

| Fields | Decision |
| --- | --- |
| `first_name`, `last_name` | Keep required for applicant identity. |
| `middle_name` | Keep optional. |
| `phone`, `email` | Keep required for applicant contact and duplicate-submission controls. |
| `address`, `city_state_zip` | Keep optional during the initial application. |
| `dob` | Keep required because the current hiring workflow uses it for eligibility and protected administrator review. It remains encrypted and is omitted from email. |

## Employment Eligibility

| Fields | Decision |
| --- | --- |
| `position`, `employment_type` | Keep required to route the application. |
| `authorized_us` | Keep required. |
| `felony`, `excluded_medicare`, `license_suspended` | Keep required because they affect employment and EMS eligibility review. |
| `background_explain` | Keep optional and shown only when explanation is needed. |
| `consents`, `certified`, `signature_data_url`, `applicant_signed_at` | Keep for application attestation and consent. Signature data remains encrypted and omitted from email. |

## EMS Credentials

| Fields | Decision |
| --- | --- |
| Primary and additional license type/state/number/expiration | Keep. These are directly relevant to EMS scope and credential verification. |
| NREMT level/number/expiration | Keep optional because not every role requires the same NREMT credential. |
| `additional_certs` | Keep as structured certification data used in protected review. |
| `years_ems`, `years_als`, `years_cc` | Keep as concise experience screening fields. |

## Driving Eligibility

| Fields | Decision |
| --- | --- |
| `dl_state`, `dl_expiry` | Keep optional for initial eligibility review. |
| `valid_dl`, `cdl`, `accidents`, `violations`, `dl_suspension`, `driving_explain` | Keep because ambulance operation is an operational job requirement. |
| Driver-license number | Removed from the initial website application. Collect later only through an approved protected HR workflow if needed. |

## Education and Work History

| Fields | Decision |
| --- | --- |
| `hs_name`, `hs_grad`, `college_education` | Keep optional. |
| `work_history`, `references` | Keep for hiring review. |
| `why_millstadt`, `five_year_goals` | Keep optional as short applicant-response fields. |

## Availability

| Fields | Decision |
| --- | --- |
| `days_available`, `hours_available`, `preferred_shift` | Keep because they represent recurring schedule constraints. |
| `availability` | Keep as optional free text for exceptions not represented by the structured fields. |

## Removed From New Applications

| Field | Reason |
| --- | --- |
| Social Security number | Unnecessarily invasive for an initial public application. |
| Driver-license number | Unnecessarily sensitive for an initial public application. |
| Immunization uploads | High-risk health information and file handling are not needed at initial application. |
| DEA registration number and expiration | Not needed for initial applicant screening and explicitly retired from the new-application workflow. |

## Data Flow Verification

- The public form no longer renders retired fields.
- The strict server schema rejects retired fields instead of silently storing them.
- New-submission storage receives only the parsed schema output.
- Protected administrator review and generated application print/PDF output omit retired fields.
- Notification email contains no applicant details and only links to the protected record.
- Historical encrypted submissions are not rewritten, migrated, or deleted.
