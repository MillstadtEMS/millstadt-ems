# Environment Variable Inventory

No values are recorded here. `Required` means required when the named workflow/environment is enabled, not required for the pre-launch Coming Soon deployment.

## Financial hub

| Name | Purpose | Scope | Required |
| --- | --- | --- | --- |
| `MILLSTADT_INFORMATION_HUB_ENV` | Explicit hub environment classification | Server, all hub deployments | Yes; `production` pre-launch |
| `MILLSTADT_INFORMATION_HUB_ENABLED` | Development feature gate | Server, development only | Yes for local full app; false production |
| `MILLSTADT_INFORMATION_HUB_ALLOW_REQUESTS` | Development request/report API gate | Server, development only | Yes for local request tests |
| `MILLSTADT_INFORMATION_HUB_ALLOW_VIEWER` | Development controlled-viewer gate | Server, development only | Yes for local viewer tests |
| `MILLSTADT_INFORMATION_HUB_ALLOW_DOCUMENT_APIS` | Development restricted-document API gate | Server, development only | Yes for local document tests |
| `MILLSTADT_INFORMATION_HUB_ALLOW_PUBLIC_990S` | Development public-990 API gate | Server, development only | Yes for local public PDF tests |
| `MILLSTADT_INFORMATION_HUB_SYNTHETIC_DATA_ONLY` | Requires synthetic fixture mode | Server, development only | Yes; true for pre-launch testing |
| `MILLSTADT_INFORMATION_HUB_DEV_ADMIN_CODE` | Optional server-only development admin bypass | Server, local/automated only | Optional; never production |
| `MILLSTADT_INFORMATION_HUB_TEST_DELIVERY_ENABLED` | Explicit test-email transport gate | Server, local/protected test only | Optional; false by default |
| `MILLSTADT_INFORMATION_HUB_TEST_SINK_DOMAIN` | Allowlists a reserved test recipient domain | Server, test delivery only | Required if test delivery enabled |
| `MILLSTADT_INFORMATION_HUB_TEST_RECIPIENT_ALLOWLIST` | Exact-address allowlist for authorized non-sink test recipients | Server, local/protected test only | Optional; values must remain in ignored environment configuration |
| `MILLSTADT_INFORMATION_HUB_TEST_ADMIN_EMAILS` | Test admin recipients; every value is filtered by the sink-domain or exact-address allowlist | Server, test delivery only | Required if test delivery enabled |

Production financial recipient, sender, database, object-storage, scanner, outbox, and post-`GO LIVE` feature variables do not exist yet and must be designed after the corresponding blockers are resolved. Do not repurpose the development variables for production.

## Website analytics and privacy

Optional analytics fail closed. `ANALYTICS_PRODUCTION_ENABLED=true` does not activate collection unless every required configuration/review field is valid. The age-range survey and precise location remain disabled in source.

| Name | Purpose | Scope | Required |
| --- | --- | --- | --- |
| `ANALYTICS_PRODUCTION_ENABLED` | Final production runtime switch | Server | Explicit true only after all review gates; false by default |
| `ANALYTICS_DEVELOPMENT_ENABLED` | Local optional-analytics switch | Server, development only | Optional |
| `ANALYTICS_DEVELOPMENT_MEMORY_STORE` | Explicit synthetic in-memory analytics store | Server, development only | Optional; never production |
| `ANALYTICS_PRIVACY_CONTACT` | Published privacy contact | Server-rendered privacy page | Required before optional collection |
| `ANALYTICS_JURISDICTIONS` | Reviewed operating jurisdictions | Server | Required before optional collection |
| `ANALYTICS_SYSTEM` | Approved first-party system or provider | Server | Required before optional collection |
| `ANALYTICS_DATA_CATEGORIES` | Approved collected-data categories | Server | Required before optional collection |
| `ANALYTICS_SUPERVISOR_EMPLOYEE_IDS` | Named lounge employee IDs authorized for website analytics | Server secret | Required; never public |
| `ANALYTICS_SERVICE_PROVIDER_CONTRACTS` | Records provider-contract review or approved first-party-only determination | Server | Required before optional collection |
| `ANALYTICS_SECURITY_CONTROLS_REVIEWED` | Security-control approval gate | Server | Required true |
| `ANALYTICS_BREACH_RESPONSE_CONTACTS` | Protected incident/breach contacts or procedure reference | Server | Required |
| `ANALYTICS_CHILDREN_PRIVACY_SETTING` | Reviewed child-directed-content setting | Server | Required |
| `ANALYTICS_HEALTH_INFORMATION_EXCLUSIONS_REVIEWED` | Confirms health/EMS exclusions were reviewed | Server | Required true |
| `ANALYTICS_GEOLOCATION_SETTING` | Reviewed broad-location setting; does not enable precise location | Server | Required |
| `ANALYTICS_AGE_RANGE_SETTING` | Reviewed age-survey setting; source currently disables the survey | Server | Required |
| `ANALYTICS_CONSENT_SETTINGS_REVIEWED` | Consent and preference review gate | Server | Required true |
| `ANALYTICS_LEGAL_REVIEW_APPROVED` | Records completion of required legal review without claiming legal compliance | Server | Required true |
| `ANALYTICS_ROLE_CONFIGURATION_REVIEWED` | Admin/Supervisor role review gate | Server | Required true |
| `ANALYTICS_RETENTION_DELETION_REVIEWED` | Retention/deletion process review gate | Server | Required true |
| `ANALYTICS_BACKUP_CONTROLS_REVIEWED` | Hosting/database backup-control review gate | Server | Required true |
| `ANALYTICS_INCIDENT_RESPONSE_DOCUMENTED` | Incident-response procedure review gate | Server | Required true |
| `ANALYTICS_HASH_KEY` | HMAC key for consent tokens and pseudonymous identifiers | Server secret | Required |
| `ANALYTICS_SECURITY_ENCRYPTION_KEY` | AES-GCM key for raw security identifiers | Server secret | Required |
| `ANALYTICS_CONSENT_VERSION` | Public optional-consent version | Server | Optional override |
| `ANALYTICS_MINIMUM_GROUP_SIZE` | Geography/survey reporting suppression threshold; minimum 15 | Server | Optional; defaults to 15 |
| `ANALYTICS_COMMUNITY_SURVEY_ENABLED` | Enables the voluntary, unlinked broad-area survey | Server | Optional; false by default |
| `ANALYTICS_RETENTION_SECURITY_DAYS` | Raw protected security-log retention | Server | Explicit value required |
| `ANALYTICS_RETENTION_EVENT_DAYS` | Aggregate/pseudonymous event retention | Server | Explicit value required |
| `ANALYTICS_RETENTION_VISITOR_DAYS` | First-party recurring-browser identifier retention | Server | Explicit value required |
| `ANALYTICS_RETENTION_GEOGRAPHY_DAYS` | Broad geography and community-survey retention | Server | Explicit value required |
| `ANALYTICS_RETENTION_AGE_SURVEY_DAYS` | Disabled age-survey retention; normally zero | Server | Explicit value required |
| `ANALYTICS_RETENTION_PRECISE_LOCATION_DAYS` | Disabled precise-location retention; normally zero | Server | Explicit value required |
| `ANALYTICS_RETENTION_RESTRICTED_DOCUMENT_AUDIT_DAYS` | Separate document-audit policy period | Server | Explicit value required |
| `ANALYTICS_RETENTION_REQUEST_PDF_DAYS` | Separate signed request-PDF policy period | Server | Explicit value required |
| `ANALYTICS_RETENTION_ADMIN_ACTION_DAYS` | Analytics admin audit and released-hold retention | Server | Explicit value required |
| `ANALYTICS_RETENTION_INCIDENT_HOLD_DAYS` | Maximum duration of an active security-incident preservation hold | Server | Explicit value required |
| `ANALYTICS_RETENTION_CONSENT_DAYS` | Consent-choice record and consent-cookie retention | Server | Explicit value required |

The scheduled `/api/cron/analytics-retention` route requires the existing `CRON_SECRET`. See `ANALYTICS_DATA_GOVERNANCE.md` for deletion, hold, export, and backup boundaries.

## Shared application runtime

| Name | Purpose | Scope | Required |
| --- | --- | --- | --- |
| `NODE_ENV` | Framework runtime mode and production security boundary | Server/build | Set by framework |
| `NEXT_DIST_DIR` | Isolated Next build directory used by tests/build verification | Build/test | Optional |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL used in links/metadata | Client + server | Required for deployed link-generating workflows |
| `NEXTAUTH_URL` | Existing authentication/base URL fallback | Server | Required where existing auth workflow uses it |
| `NEXT_PUBLIC_BUILD_ID` | Optional public build identifier | Client + server | Optional |
| `VERCEL_URL` | Hosting-provided deployment hostname | Server/build | Hosting-provided |
| `VERCEL_GIT_COMMIT_SHA` | Hosting-provided release commit identifier | Server/build | Hosting-provided |
| `GITHUB_SHA` | CI-provided release commit fallback | Server/build | Optional |
| `DATABASE_URL` | Existing board/lounge PostgreSQL connection | Server/scripts | Required for those workflows; not a financial production store |
| `ADMIN_PASSWORD` | Existing legacy administrator login secret | Server | Required if legacy admin login is enabled |
| `ADMIN_PHONE_NUMBER` | Existing SMS approval/admin destination | Server | Required only for that SMS workflow |
| `LOUNGE_ENCRYPTION_KEY` | Encrypts/signs existing lounge data/session material | Server | Required for lounge production |
| `TRUCKCHECK_PASSWORD` | Truck-check session signing/credential secret | Server | Required for truck-check production |
| `INVENTORY_PASSWORD` | Inventory initialization/access secret | Server | Required for inventory production |
| `APPROVAL_SECRET` | Existing testimonial approval-link signing secret | Server | Required for that workflow |
| `CRON_SECRET` | Authorizes existing scheduled routes | Server/hosting scheduler | Required where cron endpoints are enabled |
| `CAD_POLL_SECRET` | Authorizes CAD Gmail polling endpoint | Server/scheduler | Required when CAD polling is enabled |
| `OPENAI_API_KEY` | Existing optional OpenAI-powered application functions | Server | Required only when those functions are enabled |
| `BLOB_READ_WRITE_TOKEN` | Existing Vercel Blob upload access | Server/scripts | Required for blob-writing workflows |
| `VE_SECRET` | Existing Visual Editor integration secret | Server | Required only when integration enabled |
| `VISUAL_EDITOR_PASSWORD` | Existing Visual Editor access password | Server | Required only when integration enabled |

## Existing email, SMS, and scripts

| Name | Purpose | Scope | Required |
| --- | --- | --- | --- |
| `GMAIL_CLIENT_ID` | Existing Gmail OAuth client ID | Server/scripts | Required for Gmail send/poll workflows |
| `GMAIL_CLIENT_SECRET` | Existing Gmail OAuth client secret | Server/scripts | Required for Gmail send/poll workflows |
| `GMAIL_REFRESH_TOKEN` | Existing Gmail OAuth refresh token | Server/scripts | Required for Gmail send/poll workflows |
| `GMAIL_USER` | Existing Gmail account identity | Server/scripts | Required for Gmail send/poll workflows |
| `GMAIL_SEARCH_QUERY` | Optional CAD inbox query override | Server | Optional |
| `TWILIO_ACCOUNT_SID` | Existing Twilio account identifier | Server | Required for enabled SMS workflows |
| `TWILIO_AUTH_TOKEN` | Existing Twilio credential | Server | Required for enabled SMS workflows |
| `TWILIO_FROM_NUMBER` | Existing Twilio sender number | Server | Required for enabled SMS workflows |
| `BOARD_DEV_SHARED_PASSWORD` | Existing board development seed/login secret | Server/scripts, development only | Required only for that development workflow |
| `HOME` | Locates user files in an existing asset-import script | Local script | OS-provided |

## Documented legacy names not referenced by current runtime source

These names exist in checked-in example configuration or historical setup documentation. Their continued need must be confirmed by the owning module before cleanup: `EMAIL_USER`, `EMAIL_PASS`, `NEXT_PUBLIC_BASE_URL`, `BOARD_INITIAL_TEMP_PASSWORD`, `BOARD_DEV_PASSWORD`, `ENABLE_ACTUAL_FINANCIALS`, `ENABLE_ACTUAL_CASH_FLOW`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `REFERENDUM_WORKBOOK_DRIVE_ID`, `REFERENDUM_WORKBOOK_ITEM_ID`, `REFERENDUM_WORKBOOK_EXPECTED_FOLDER`, `REFERENDUM_WORKBOOK_EXPECTED_FILENAME`, `REFERENDUM_WORKBOOK_EXPECTED_ACCOUNT`, and `BOARD_SYNC_SECRET`.
