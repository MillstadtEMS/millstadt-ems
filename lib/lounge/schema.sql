-- Millstadt EMS Employee Lounge — Neon Postgres schema.
-- Ported from the original Supabase schema in
-- ~/Desktop/Stuff/millstadt-employee-lounge/supabase/schema.sql, with two
-- structural changes:
--
--   1. Every table is prefixed `lounge_` so it can't collide with main-site
--      tables that already exist in this DB (`cad_calls`, `inventory_items`,
--      `site_content`, etc.). Both apps use shape-different versions of some
--      of those names; the prefix keeps them isolated.
--   2. There is now an actual employees table with auth columns. The RN app
--      delegated identity to Supabase Auth; this port handles it ourselves
--      with scrypt password hashes and a session cookie (same pattern as
--      lib/inventory/auth.ts).
--
-- Idempotent: re-runnable. All objects use IF NOT EXISTS / DO NOTHING.
--
-- Apply via:
--   psql "$DATABASE_URL" -f lib/lounge/schema.sql
-- OR via the seed script (which runs this first):
--   node scripts/lounge-init.mjs

-- ═══════════════════════════════════════════════════════════════════════
-- EMPLOYEES (auth + personnel record)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_employees (
    id                    TEXT PRIMARY KEY,
    username              TEXT UNIQUE NOT NULL,
    first_name            TEXT NOT NULL,
    last_name             TEXT NOT NULL,
    certification         TEXT,
    position              TEXT,
    email                 TEXT,
    phone                 TEXT,
    dob                   DATE,
    ssn_encrypted         TEXT,  -- AES-256-GCM, admin-only decrypt
    photo_url             TEXT,
    password_hash         TEXT NOT NULL,  -- scrypt(salt:hash) format
    must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin              BOOLEAN NOT NULL DEFAULT FALSE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    hire_date             DATE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_employees_username_idx
    ON lounge_employees (LOWER(username));
CREATE INDEX IF NOT EXISTS lounge_employees_active_idx
    ON lounge_employees (is_active);

-- Personal/About-Me fields employees fill in themselves.
-- These are added via ALTER for safety on existing DBs.
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_street      TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_city        TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_state       TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS address_zip         TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS driver_license_num  TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS driver_license_state TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec_name             TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec_relationship     TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec_phone            TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec2_name            TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec2_relationship    TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS ec2_phone           TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS shirt_size          TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS pant_size           TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS jacket_size         TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS allergies           TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS medical_conditions  TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS blood_type          TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT;
ALTER TABLE lounge_employees ADD COLUMN IF NOT EXISTS totp_enrolled_at      TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════
-- PERSONNEL RECORDS (admin-only personnel file)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_personnel_records (
    id                       TEXT PRIMARY KEY,
    employee_id              TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    category                 TEXT NOT NULL,   -- 'conduct' | 'performance' | 'attendance' | 'accommodations' | 'clinical' | 'positive' | 'attachments'
    record_type              TEXT NOT NULL,   -- e.g. 'verbal_counseling', 'written_warning', 'commendation', 'ada_accommodation', ...
    title                    TEXT NOT NULL,
    summary                  TEXT,
    action_taken             TEXT,
    severity                 TEXT NOT NULL DEFAULT 'informational',  -- informational | coaching | minor | moderate | serious | critical
    status                   TEXT NOT NULL DEFAULT 'active',          -- draft | active | pending_review | resolved | archived
    incident_date            DATE,
    created_by               TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    supervisor_id            TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    witnesses                TEXT,
    related_unit             TEXT,
    related_call             TEXT,
    follow_up_required       BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_due_date       DATE,
    follow_up_completed_at   TIMESTAMPTZ,
    employee_visible         BOOLEAN NOT NULL DEFAULT FALSE,
    restricted_visibility    BOOLEAN NOT NULL DEFAULT FALSE,  -- medical/ADA/accommodation — HR-only
    acknowledgment_required  BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at          TIMESTAMPTZ,
    acknowledged_signature   TEXT,           -- base64 PNG
    employee_response        TEXT,
    related_policy           TEXT,
    related_record_id        TEXT REFERENCES lounge_personnel_records(id) ON DELETE SET NULL,
    locked                   BOOLEAN NOT NULL DEFAULT FALSE,
    retention_category       TEXT,
    archive_date             DATE,
    -- Accommodation-specific fields (used only when category='accommodations')
    accommodation_type       TEXT,
    accommodation_start      DATE,
    accommodation_end        DATE,
    accommodation_review     DATE,
    work_limitations         TEXT,
    approved_by              TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    admin_notes              TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_pr_employee_idx
    ON lounge_personnel_records (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_pr_category_idx
    ON lounge_personnel_records (category, status);
CREATE INDEX IF NOT EXISTS lounge_pr_ack_idx
    ON lounge_personnel_records (employee_id, acknowledgment_required)
    WHERE acknowledgment_required = TRUE AND acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS lounge_pr_followup_idx
    ON lounge_personnel_records (follow_up_due_date)
    WHERE follow_up_required = TRUE AND follow_up_completed_at IS NULL;
CREATE INDEX IF NOT EXISTS lounge_pr_accommodation_review_idx
    ON lounge_personnel_records (accommodation_review)
    WHERE category = 'accommodations' AND status = 'active';

CREATE TABLE IF NOT EXISTS lounge_personnel_attachments (
    id                  TEXT PRIMARY KEY,
    record_id           TEXT NOT NULL REFERENCES lounge_personnel_records(id) ON DELETE CASCADE,
    employee_id         TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    file_name           TEXT NOT NULL,
    file_url            TEXT NOT NULL,    -- Vercel Blob URL
    file_mime           TEXT,
    file_size           INTEGER,
    document_category   TEXT,
    visibility_level    TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'employee' | 'restricted_hr'
    admin_notes         TEXT,
    employee_notes      TEXT,
    replaced_by_id      TEXT REFERENCES lounge_personnel_attachments(id) ON DELETE SET NULL,
    uploaded_by         TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_pa_record_idx
    ON lounge_personnel_attachments (record_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS lounge_pa_employee_idx
    ON lounge_personnel_attachments (employee_id);

-- Audit log: who touched a personnel record/attachment and what they did.
CREATE TABLE IF NOT EXISTS lounge_personnel_audit (
    id              BIGSERIAL PRIMARY KEY,
    record_id       TEXT REFERENCES lounge_personnel_records(id) ON DELETE CASCADE,
    attachment_id   TEXT REFERENCES lounge_personnel_attachments(id) ON DELETE CASCADE,
    employee_id     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,  -- subject employee
    actor_id        TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,  -- who did the action
    action          TEXT NOT NULL,   -- view | create | update | upload | download | delete | archive | visibility_change | acknowledge
    detail          JSONB,
    ip              TEXT,
    user_agent      TEXT,
    at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_paudit_record_idx
    ON lounge_personnel_audit (record_id, at DESC);
CREATE INDEX IF NOT EXISTS lounge_paudit_employee_idx
    ON lounge_personnel_audit (employee_id, at DESC);

-- Per-employee captured signatures (truck check + inventory submissions).
CREATE TABLE IF NOT EXISTS lounge_signatures (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    purpose         TEXT NOT NULL,   -- 'truckcheck' | 'inventory' | other
    reference_id    TEXT,            -- FK string into the related submission table
    image_data_url  TEXT NOT NULL,   -- base64 PNG (kept small: 600x180)
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_signatures_employee_idx
    ON lounge_signatures (employee_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS lounge_signatures_reference_idx
    ON lounge_signatures (purpose, reference_id);

-- Per-employee files: certs, licenses, write-ups, misc personnel files.
CREATE TABLE IF NOT EXISTS lounge_employee_files (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    file_type       TEXT NOT NULL,  -- 'cert' | 'license' | 'writeup' | 'other'
    title           TEXT NOT NULL,
    file_url        TEXT NOT NULL,  -- Vercel Blob URL
    file_mime       TEXT,
    notes           TEXT,
    expires_on      DATE,            -- for certs/licenses with expiry
    uploaded_by     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_employee_files_employee_idx
    ON lounge_employee_files (employee_id, uploaded_at DESC);

-- Session log (audit trail of logins; nice-to-have).
CREATE TABLE IF NOT EXISTS lounge_login_log (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    username_tried  TEXT NOT NULL,
    success         BOOLEAN NOT NULL,
    ip              TEXT,
    user_agent      TEXT,
    at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_login_log_employee_idx
    ON lounge_login_log (employee_id, at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- FEED (wall / shift-to-shift messages)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_feed_posts (
    id              TEXT PRIMARY KEY,
    author_id       TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    body            TEXT NOT NULL DEFAULT '',
    media           JSONB,
    repost_of       TEXT REFERENCES lounge_feed_posts(id) ON DELETE SET NULL,
    repost_count    INT  NOT NULL DEFAULT 0,
    pinned          BOOLEAN NOT NULL DEFAULT FALSE,
    highlighted     BOOLEAN NOT NULL DEFAULT FALSE,
    saved_by        TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_feed_posts_created_idx
    ON lounge_feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_feed_posts_pinned_idx
    ON lounge_feed_posts (pinned) WHERE pinned = TRUE;

CREATE TABLE IF NOT EXISTS lounge_feed_post_reactions (
    post_id     TEXT NOT NULL REFERENCES lounge_feed_posts(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS lounge_feed_post_comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES lounge_feed_posts(id) ON DELETE CASCADE,
    author_id  TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    parent_id  TEXT REFERENCES lounge_feed_post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_feed_comments_post_idx
    ON lounge_feed_post_comments (post_id, created_at ASC);

-- ═══════════════════════════════════════════════════════════════════════
-- MESSAGING (DM + group chat)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_conversations (
    id               TEXT PRIMARY KEY,
    kind             TEXT NOT NULL CHECK (kind IN ('dm', 'group')),
    title            TEXT,
    participant_ids  TEXT[] NOT NULL,
    read_by          JSONB  NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_conversations_participants_idx
    ON lounge_conversations USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS lounge_conversations_updated_idx
    ON lounge_conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS lounge_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES lounge_conversations(id) ON DELETE CASCADE,
    author_id       TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    body            TEXT NOT NULL DEFAULT '',
    media           JSONB,
    reactions       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_messages_conv_idx
    ON lounge_messages (conversation_id, created_at ASC);

-- ═══════════════════════════════════════════════════════════════════════
-- ACKNOWLEDGMENTS (eyes-on notices)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_acks (
    id                       TEXT PRIMARY KEY,
    title                    TEXT NOT NULL,
    body                     TEXT NOT NULL,
    category                 TEXT NOT NULL,
    created_by               TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    requires_acknowledgment  BOOLEAN NOT NULL DEFAULT FALSE,
    media                    JSONB,
    attachment_uri           TEXT,
    attachment_name          TEXT,
    attachment_type          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_acks_created_idx
    ON lounge_acks (created_at DESC);

CREATE TABLE IF NOT EXISTS lounge_ack_states (
    ack_id            TEXT NOT NULL REFERENCES lounge_acks(id) ON DELETE CASCADE,
    user_id           TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    viewed_at         TIMESTAMPTZ,
    acknowledged_at   TIMESTAMPTZ,
    PRIMARY KEY (ack_id, user_id)
);
CREATE INDEX IF NOT EXISTS lounge_ack_states_user_idx
    ON lounge_ack_states (user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- OPEN SHIFTS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_open_shifts (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    target        TEXT NOT NULL DEFAULT 'all',
    created_by    TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'open',
    awarded_to    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    awarded_at    TIMESTAMPTZ,
    awarded_by    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    canceled_at   TIMESTAMPTZ,
    canceled_by   TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_open_shifts_status_idx
    ON lounge_open_shifts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS lounge_open_shift_responses (
    shift_id   TEXT NOT NULL REFERENCES lounge_open_shifts(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    response   TEXT NOT NULL CHECK (response IN ('available', 'unavailable', 'bid')),
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (shift_id, user_id)
);
-- Allow 'bid' on existing installs (idempotent: drops old constraint if any).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'lounge_open_shift_responses'
      AND constraint_name = 'lounge_open_shift_responses_response_check'
  ) THEN
    ALTER TABLE lounge_open_shift_responses DROP CONSTRAINT lounge_open_shift_responses_response_check;
  END IF;
  ALTER TABLE lounge_open_shift_responses
    ADD CONSTRAINT lounge_open_shift_responses_response_check
    CHECK (response IN ('available', 'unavailable', 'bid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- OPS REQUESTS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_ops_requests (
    id             TEXT PRIMARY KEY,
    created_by     TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    category       TEXT NOT NULL,
    description    TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'submitted',
    admin_comment  JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_ops_requests_created_idx
    ON lounge_ops_requests (created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- INCIDENT REPORTS
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_incident_reports (
    id                   TEXT PRIMARY KEY,
    created_by           TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    review_status        TEXT NOT NULL DEFAULT 'pending',
    incident_date        TEXT,
    incident_time        TEXT,
    city                 TEXT,
    specific_location    TEXT,
    unit_involved        TEXT,
    media                JSONB,
    admin_notes          JSONB NOT NULL DEFAULT '[]'::jsonb,
    payload              JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_incidents_created_idx
    ON lounge_incident_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS lounge_incidents_status_idx
    ON lounge_incident_reports (review_status);

-- ═══════════════════════════════════════════════════════════════════════
-- POLICIES
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_policies (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    summary     TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    document    JSONB,
    version     TEXT,
    created_by  TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    updated_by  TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    saved_by    TEXT[] NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_policies_updated_idx
    ON lounge_policies (updated_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- TRUCK CHECKS + WASHES + WASHING SCHEDULE
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_truck_checks (
    id              TEXT PRIMARY KEY,
    unit            TEXT NOT NULL,
    kind            TEXT NOT NULL,
    date_iso        TEXT NOT NULL,
    time_hhmm       TEXT NOT NULL,
    submitted_by_id TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS lounge_truck_checks_unit_idx
    ON lounge_truck_checks (unit, submitted_at DESC);

-- Item-level tracking, durations, pencil-whip flags, partner.
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS overall_status TEXT;        -- 'pass' | 'issues' | 'failed'
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS pencil_whip_flag TEXT;      -- 'normal' | 'review' | 'possible_whip'
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS pencil_whip_reasons JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS attendant2_id TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS attendant2_name TEXT;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS odometer INTEGER;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE lounge_truck_checks ADD COLUMN IF NOT EXISTS pdf_url TEXT;
CREATE INDEX IF NOT EXISTS lounge_truck_checks_flag_idx
    ON lounge_truck_checks (pencil_whip_flag, submitted_at DESC) WHERE pencil_whip_flag IS NOT NULL;
CREATE INDEX IF NOT EXISTS lounge_truck_checks_employee_idx
    ON lounge_truck_checks (submitted_by_id, submitted_at DESC);

-- Per-item rows so we can compute trends, abnormal histories, leak detection.
CREATE TABLE IF NOT EXISTS lounge_truck_check_items (
    id                  TEXT PRIMARY KEY,
    truck_check_id      TEXT NOT NULL REFERENCES lounge_truck_checks(id) ON DELETE CASCADE,
    unit                TEXT NOT NULL,
    category            TEXT NOT NULL,
    item_key            TEXT NOT NULL,
    label               TEXT NOT NULL,
    response_type       TEXT NOT NULL,    -- 'passfail' | 'status' | 'fluid' | 'numeric' | 'tire_psi' | 'stock'
    status              TEXT,
    numeric_value       NUMERIC,
    unit_of_measure     TEXT,
    amount_added        NUMERIC,
    amount_unit         TEXT,
    comment             TEXT,
    is_abnormal         BOOLEAN NOT NULL DEFAULT FALSE,
    requires_follow_up  BOOLEAN NOT NULL DEFAULT FALSE,
    trend_group         TEXT,
    checked_at          TIMESTAMPTZ NOT NULL,
    checked_by_id       TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_tci_check_idx
    ON lounge_truck_check_items (truck_check_id);
CREATE INDEX IF NOT EXISTS lounge_tci_trend_idx
    ON lounge_truck_check_items (unit, trend_group, checked_at DESC);
CREATE INDEX IF NOT EXISTS lounge_tci_abnormal_idx
    ON lounge_truck_check_items (is_abnormal, checked_at DESC) WHERE is_abnormal = TRUE;
CREATE INDEX IF NOT EXISTS lounge_tci_unit_key_idx
    ON lounge_truck_check_items (unit, item_key, checked_at DESC);

-- Photos attached to the truck check.
CREATE TABLE IF NOT EXISTS lounge_truck_check_photos (
    id              TEXT PRIMARY KEY,
    truck_check_id  TEXT NOT NULL REFERENCES lounge_truck_checks(id) ON DELETE CASCADE,
    file_url        TEXT NOT NULL,    -- Vercel Blob URL
    caption         TEXT,
    item_key        TEXT,             -- optional: tie a photo to a specific item
    uploaded_by_id  TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_tcp_check_idx
    ON lounge_truck_check_photos (truck_check_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS lounge_truck_washes (
    id                   TEXT PRIMARY KEY,
    unit                 TEXT NOT NULL,
    date_iso             TEXT NOT NULL,
    time_hhmm            TEXT NOT NULL,
    crew1_id             TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    crew2_id             TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    washed_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,
    floors_mopped        BOOLEAN NOT NULL DEFAULT FALSE,
    exempted             BOOLEAN NOT NULL DEFAULT FALSE,
    exemption_reason     TEXT,
    exemption_notes      TEXT,
    submitted_by_id      TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_truck_washes_unit_idx
    ON lounge_truck_washes (unit, submitted_at DESC);

CREATE TABLE IF NOT EXISTS lounge_washing_state (
    unit                 TEXT PRIMARY KEY,
    status               TEXT NOT NULL DEFAULT 'due',
    last_completed_at    TIMESTAMPTZ,
    last_completed_by    TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    scheduled_for        TIMESTAMPTZ,
    scheduled_by         TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    notes                TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO lounge_washing_state (unit, status) VALUES
    ('m3925', 'due'), ('m3926', 'due'), ('m3935', 'due')
    ON CONFLICT (unit) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- INVENTORY (backstock + state) — Lounge-side; separate from main-site inventory
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lounge_inventory_items (
    id              TEXT PRIMARY KEY,
    inventory_type  TEXT NOT NULL,
    category_id     TEXT NOT NULL,
    category_name   TEXT NOT NULL,
    category_slug   TEXT NOT NULL,
    name            TEXT NOT NULL,
    location        TEXT,
    par             INT  NOT NULL DEFAULT 0,
    current_stock   INT  NOT NULL DEFAULT 0,
    prior_stock     INT,
    expired_qty     INT  NOT NULL DEFAULT 0,
    vendor_source   TEXT,
    notes           TEXT,
    skip_order      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INT  NOT NULL DEFAULT 0,
    version         INT  NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS lounge_inventory_items_type_cat_idx
    ON lounge_inventory_items (inventory_type, category_slug, sort_order);

CREATE TABLE IF NOT EXISTS lounge_inventory_submissions (
    id              TEXT PRIMARY KEY,
    inventory_type  TEXT NOT NULL,
    category_slug   TEXT NOT NULL,
    items_updated   INT  NOT NULL DEFAULT 0,
    notes           TEXT,
    submitted_by    TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_inventory_submissions_type_idx
    ON lounge_inventory_submissions (inventory_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- CLASSES + CERTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════
--
-- Classes = admin-defined roles (EMT, Paramedic, Board Member). Employees
-- can hold multiple classes. Each class declares a list of cert_types
-- that members must keep current. Built-in cert_types are seeded
-- (DL, EMT/Paramedic/PHRN License, BLS/ACLS/ITLS/PALS, Vaccination,
-- NIMS 100/200/300/400/700/800); admins can add more.

CREATE TABLE IF NOT EXISTS lounge_classes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lounge_employee_classes (
    employee_id TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    class_id    TEXT NOT NULL REFERENCES lounge_classes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    PRIMARY KEY (employee_id, class_id)
);
CREATE INDEX IF NOT EXISTS lounge_employee_classes_class_idx
    ON lounge_employee_classes (class_id);

CREATE TABLE IF NOT EXISTS lounge_cert_types (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL UNIQUE,
    slug                TEXT NOT NULL UNIQUE,
    requires_expiration BOOLEAN NOT NULL DEFAULT TRUE,
    -- JSON array of day thresholds, e.g. [120, 90, 60, 30].
    -- The "final 7 days every day" + "expired" behavior is implicit.
    alert_thresholds    JSONB NOT NULL DEFAULT '[120, 90, 60, 30]'::jsonb,
    is_built_in         BOOLEAN NOT NULL DEFAULT FALSE,
    created_by          TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lounge_class_requirements (
    class_id     TEXT NOT NULL REFERENCES lounge_classes(id) ON DELETE CASCADE,
    cert_type_id TEXT NOT NULL REFERENCES lounge_cert_types(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, cert_type_id)
);

CREATE TABLE IF NOT EXISTS lounge_employee_certs (
    id                       TEXT PRIMARY KEY,
    employee_id              TEXT NOT NULL REFERENCES lounge_employees(id) ON DELETE CASCADE,
    cert_type_id             TEXT NOT NULL REFERENCES lounge_cert_types(id) ON DELETE CASCADE,
    file_url                 TEXT NOT NULL,
    file_mime                TEXT,
    file_name                TEXT,
    issued_on                DATE,
    expires_on               DATE,
    notes                    TEXT,
    -- For the cron: which threshold did we last email about for this cert?
    -- Values are the day-number (120, 90, 60, 30, 7, 0=expired). NULL = never.
    last_alerted_threshold   INT,
    last_alerted_at          TIMESTAMPTZ,
    uploaded_by              TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    uploaded_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_employee_certs_employee_idx
    ON lounge_employee_certs (employee_id);
CREATE INDEX IF NOT EXISTS lounge_employee_certs_type_idx
    ON lounge_employee_certs (cert_type_id);
CREATE INDEX IF NOT EXISTS lounge_employee_certs_expires_idx
    ON lounge_employee_certs (expires_on) WHERE expires_on IS NOT NULL;

-- Audit log of every alert email actually sent (employee + admin digests).
CREATE TABLE IF NOT EXISTS lounge_cert_alert_log (
    id           BIGSERIAL PRIMARY KEY,
    cert_id      TEXT REFERENCES lounge_employee_certs(id) ON DELETE SET NULL,
    employee_id  TEXT REFERENCES lounge_employees(id) ON DELETE SET NULL,
    threshold    INT,
    audience     TEXT NOT NULL,     -- 'employee' | 'admin_digest'
    sent_to      TEXT,
    success      BOOLEAN NOT NULL,
    error        TEXT,
    sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_cert_alert_log_cert_idx
    ON lounge_cert_alert_log (cert_id, sent_at DESC);

-- ── Built-in cert types ────────────────────────────────────────────────
-- All slugs lowercase + dash-separated. Built-in flag = TRUE so the UI
-- can hide the delete button (admins can still edit the alert schedule).
INSERT INTO lounge_cert_types (id, name, slug, requires_expiration, is_built_in) VALUES
    ('builtin-drivers-license',   'Driver''s License',              'drivers-license',   TRUE,  TRUE),
    ('builtin-emt-license',       'EMT License',                    'emt-license',       TRUE,  TRUE),
    ('builtin-paramedic-license', 'Paramedic License',              'paramedic-license', TRUE,  TRUE),
    ('builtin-phrn-license',      'PHRN License',                   'phrn-license',      TRUE,  TRUE),
    ('builtin-bls',               'BLS',                            'bls',               TRUE,  TRUE),
    ('builtin-acls',              'ACLS',                           'acls',              TRUE,  TRUE),
    ('builtin-itls',              'ITLS',                           'itls',              TRUE,  TRUE),
    ('builtin-pals',              'PALS',                           'pals',              TRUE,  TRUE),
    ('builtin-vaccination',       'Vaccination Proof',              'vaccination',       FALSE, TRUE),
    ('builtin-nims-100',          'NIMS 100',                       'nims-100',          FALSE, TRUE),
    ('builtin-nims-200',          'NIMS 200',                       'nims-200',          FALSE, TRUE),
    ('builtin-nims-300',          'NIMS 300',                       'nims-300',          FALSE, TRUE),
    ('builtin-nims-400',          'NIMS 400',                       'nims-400',          FALSE, TRUE),
    ('builtin-nims-700',          'NIMS 700',                       'nims-700',          FALSE, TRUE),
    ('builtin-nims-800',          'NIMS 800',                       'nims-800',          FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;
