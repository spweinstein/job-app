# Technical Spec — Schema

All tables live in the `public` schema. All `updated_at` columns are kept current by a shared `set_updated_at()` BEFORE UPDATE trigger function. Apply this trigger to every table that has `updated_at`. The Supabase-generated TypeScript types live at `src/types/database.ts`; never hand-edit this file.

---

## profiles

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | — | PK; equals `auth.users.id` |
| `full_name` | `text` | NOT NULL | `''` | |
| `avatar_url` | `text` | NULL | — | Storage public URL |
| `notification_email_enabled` | `boolean` | NOT NULL | `true` | Whether automations may send email |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Foreign Keys:** `id` → `auth.users(id)` ON DELETE CASCADE

**Trigger:** AFTER INSERT on `auth.users` (SECURITY DEFINER): inserts a `profiles` row with `id = NEW.id` and `full_name` from `raw_user_meta_data`, defaulting to `''`.

**RLS:**

| Operation | Rule |
|---|---|
| SELECT | Own profile only (`id = auth.uid()`) |
| INSERT | Denied — row created by the `auth.users` INSERT trigger |
| UPDATE | Own profile only |
| DELETE | Denied — cascades from `auth.users` deletion |

---

## companies

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | Max enforced by Zod (200 chars) |
| `website` | `text` | NULL | — | Valid URL; Zod-enforced |
| `notes` | `text` | NULL | — | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:** `idx_companies_user_id` ON `companies(user_id)`

**RLS:** Own rows only for SELECT, INSERT, UPDATE, DELETE (`user_id = auth.uid()`).

---

## applications

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `company_id` | `uuid` | NOT NULL | — | FK → companies |
| `role_title` | `text` | NOT NULL | — | |
| `status` | `text` | NOT NULL | `'draft'` | Constrained by CHECK (9 values) |
| `job_posting_url` | `text` | NULL | — | Valid URL; Zod-enforced |
| `resume_id` | `uuid` | NULL | — | FK → resumes |
| `cover_letter_id` | `uuid` | NULL | — | FK → cover_letters |
| `notes` | `text` | NULL | — | |
| `applied_at` | `timestamptz` | NULL | — | Set when status changes to 'applied' |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:** `status` must be one of the 9 values in `docs/agent-guide.md#application-statuses`.

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `company_id` → `companies(id)` ON DELETE CASCADE
- `resume_id` → `resumes(id)` ON DELETE SET NULL
- `cover_letter_id` → `cover_letters(id)` ON DELETE SET NULL

**Indexes:**
- `idx_applications_user_id` ON `applications(user_id)`
- `idx_applications_company_id` ON `applications(company_id)`
- `idx_applications_status` ON `applications(user_id, status)`

**RLS:** Own rows only (`user_id = auth.uid()`).

**Triggers:**
- AFTER UPDATE (SECURITY DEFINER): if `status` changed, inserts into `automation_events` with `trigger_type = 'application_status_changed'` and payload `{application_id, old_status, new_status}`.
- AFTER INSERT (SECURITY DEFINER): inserts into `automation_events` with `trigger_type = 'application_created'` and payload `{application_id}`.
- BEFORE INSERT OR UPDATE: if `status = 'applied'` and previous status was not `'applied'` (or this is an INSERT), sets `applied_at = now()`.

---

## resumes

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | Display name |
| `content` | `jsonb` | NOT NULL | `'{}'::jsonb` | Versioned content; see `content-model.md` |
| `content_version` | `integer` | NOT NULL | `1` | Schema version of `content` JSON |
| `attachment_url` | `text` | NULL | — | Storage path of DOCX or PDF; NULL if none |
| `parent_id` | `uuid` | NULL | — | FK → resumes(id); NULL for root |
| `root_id` | `uuid` | NOT NULL | — | FK → resumes(id); equals `id` for root |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `parent_id` → `resumes(id)` ON DELETE RESTRICT ← prevents deleting parent while forks exist
- `root_id` → `resumes(id)` ON DELETE RESTRICT

**Cycle prevention:** Enforced at the application layer in `src/actions/resumes.ts`. A CHECK constraint cannot efficiently prevent cycles; the application check is required and tested.

**Indexes:**
- `idx_resumes_user_id` ON `resumes(user_id)`
- `idx_resumes_root_id` ON `resumes(root_id)`
- `idx_resumes_parent_id` ON `resumes(parent_id)` WHERE `parent_id IS NOT NULL`

**RLS:** Own rows only (`user_id = auth.uid()`).

**Note:** The RESTRICT FK on `parent_id` surfaces as a Postgres error when deleting a parent with forks. The application layer must check for descendants before attempting delete and return a user-friendly error.

---

## cover_letters

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | Display name |
| `content` | `jsonb` | NOT NULL | `'{}'::jsonb` | Versioned content; see `content-model.md` |
| `content_version` | `integer` | NOT NULL | `1` | Schema version |
| `attachment_url` | `text` | NULL | — | Storage path of DOCX or PDF; NULL if none |
| `parent_id` | `uuid` | NULL | — | FK → cover_letters(id); NULL for root |
| `root_id` | `uuid` | NOT NULL | — | FK → cover_letters(id); equals `id` for root |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `parent_id` → `cover_letters(id)` ON DELETE RESTRICT
- `root_id` → `cover_letters(id)` ON DELETE RESTRICT

**Indexes:** Same pattern as `resumes` — `idx_cover_letters_user_id`, `idx_cover_letters_root_id`, `idx_cover_letters_parent_id`.

**RLS:** Identical to `resumes` — own rows only.

---

## calendar_items

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `application_id` | `uuid` | NULL | — | FK → applications; required when kind = 'interview' |
| `kind` | `text` | NOT NULL | — | Constrained by CHECK |
| `title` | `text` | NOT NULL | — | |
| `notes` | `text` | NULL | — | |
| `start_at` | `timestamptz` | NULL | — | Required for event, meeting, interview |
| `end_at` | `timestamptz` | NULL | — | Required for event, meeting, interview; must be strictly after start_at |
| `due_at` | `timestamptz` | NULL | — | Used for task only |
| `completed_at` | `timestamptz` | NULL | — | Set when a task is marked complete |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:**
- `kind` must be one of the 4 values in `docs/agent-guide.md#calendar-item-kinds`.
- `kind = 'interview'` requires `application_id IS NOT NULL`.
- `kind` ∈ {event, meeting, interview} requires `start_at IS NOT NULL`.
- `end_at > start_at` (strict; zero-duration events are invalid).

**`due_at` validation note:** `createCalendarItemSchema` must include `.refine(val => val == null || val > new Date(), { message: "Due date must be in the future." })` on `due_at`. The `updateCalendarItemSchema` omits this refine — past due dates are valid on edit.

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `application_id` → `applications(id)` ON DELETE CASCADE

**Indexes:**
- `idx_calendar_items_user_id` ON `calendar_items(user_id)`
- `idx_calendar_items_user_kind` ON `calendar_items(user_id, kind)`
- `idx_calendar_items_start_at` ON `calendar_items(user_id, start_at)` WHERE `start_at IS NOT NULL`
- `idx_calendar_items_due_at` ON `calendar_items(user_id, due_at)` WHERE `due_at IS NOT NULL`

**RLS:** Own rows only (`user_id = auth.uid()`).

**Trigger:** AFTER INSERT (SECURITY DEFINER): if `kind = 'interview'`, inserts into `automation_events` with `trigger_type = 'interview_scheduled'` and payload `{calendar_item_id, application_id, start_at}`.

---

## automations

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | User-defined label |
| `enabled` | `boolean` | NOT NULL | `true` | |
| `trigger_type` | `text` | NOT NULL | — | Constrained by CHECK |
| `trigger_config` | `jsonb` | NOT NULL | `'{}'::jsonb` | Conditions for this trigger |
| `action_type` | `text` | NOT NULL | — | Constrained by CHECK |
| `action_config` | `jsonb` | NOT NULL | `'{}'::jsonb` | Parameters for the action |
| `last_fired_at` | `timestamptz` | NULL | — | Updated by Edge Function on each execution |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:** `trigger_type` must be one of the 4 values in `docs/agent-guide.md#automation-trigger-types`; `action_type` must be one of the 3 values in `docs/agent-guide.md#automation-action-types`.

**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_automations_user_id` ON `automations(user_id)`
- `idx_automations_trigger_type` ON `automations(trigger_type)` WHERE `enabled = true`

**RLS:** Own rows only (`user_id = auth.uid()`).

---

## automation_events

Immutable log. No UPDATE or DELETE from application code.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `trigger_type` | `text` | NOT NULL | — | Must match valid trigger type |
| `payload` | `jsonb` | NOT NULL | — | Trigger-specific data |
| `processed_at` | `timestamptz` | NULL | — | Set by Edge Function when consumption begins |
| `idempotency_key` | `uuid` | NOT NULL | `gen_random_uuid()` | Unique per event |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Unique Constraint:** `UNIQUE (idempotency_key)`

**Check Constraints:** `trigger_type` must be one of the 4 values in `docs/agent-guide.md#automation-trigger-types`.

**Foreign Keys:** `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_automation_events_unprocessed` ON `automation_events(created_at)` WHERE `processed_at IS NULL`
- `idx_automation_events_user_id` ON `automation_events(user_id)`

**RLS:**

| Operation | Rule |
|---|---|
| SELECT | Own rows only (`user_id = auth.uid()`) |
| INSERT | Denied — rows written only by SECURITY DEFINER trigger functions |
| UPDATE | Denied — `processed_at` updated only by Edge Function via service role |
| DELETE | Denied |

---

## automation_action_logs

Immutable log. No UPDATE or DELETE from application code.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `automation_id` | `uuid` | NOT NULL | — | FK → automations |
| `automation_event_id` | `uuid` | NOT NULL | — | FK → automation_events |
| `action_type` | `text` | NOT NULL | — | |
| `status` | `text` | NOT NULL | — | `'succeeded'`, `'failed'`, `'retrying'`, `'skipped'` |
| `attempt` | `integer` | NOT NULL | `1` | 1-indexed retry count |
| `error_message` | `text` | NULL | — | Set on failure |
| `executed_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:** `action_type` constrained to 3 values in `docs/agent-guide.md#automation-action-types`; `status` ∈ `{'succeeded', 'failed', 'retrying', 'skipped'}`.

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `automation_id` → `automations(id)` ON DELETE CASCADE
- `automation_event_id` → `automation_events(id)` ON DELETE CASCADE

**Indexes:**
- `idx_action_logs_automation_id` ON `automation_action_logs(automation_id, executed_at DESC)`
- `idx_action_logs_user_id` ON `automation_action_logs(user_id)`

**RLS:**

| Operation | Rule |
|---|---|
| SELECT | Own rows only (`user_id = auth.uid()`) |
| INSERT | Denied — written only by Edge Function via service role |
| UPDATE | Denied |
| DELETE | Denied |

---

## Migrations Strategy

- Every schema change is a standalone `.sql` file in `supabase/migrations/`.
- File naming: `YYYYMMDDHHMMSS_<short_description>.sql` (UTC timestamp).
- Applied via `supabase db push` in CI after tests pass, before preview deploy.
- No ad-hoc edits in the Supabase dashboard.
- Migrations are idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- Migration rollback: write a companion `_rollback.sql` for any destructive migration. Do not execute rollbacks automatically; they require manual approval.
- The initial migration (`20260101000000_initial_schema.sql`) creates all tables, triggers, functions, and RLS policies. Subsequent migrations are additive or alter specific objects.
