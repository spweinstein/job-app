# Technical Specification

All terminology defers to `docs/agent-guide.md#glossary`. All resource names, field names, and error codes must match exactly.

---

## Table of Contents

1. [Stack Pinning](#stack-pinning)
2. [Repository Layout](#repository-layout)
3. [Data Model](#data-model)
   - [profiles table](#profiles-table)
   - [companies table](#companies-table)
   - [applications table](#applications-table)
   - [resumes table](#resumes-table)
   - [cover-letters table](#cover-letters-table)
   - [calendar-items table](#calendar-items-table)
   - [automations table](#automations-table)
   - [automation-events table](#automation-events-table)
   - [automation-action-logs table](#automation-action-logs-table)
4. [Migrations Strategy](#migrations-strategy)
5. [Auth and Session Handling](#auth-and-session-handling)
6. [Authorization Model](#authorization-model)
7. [API Surface](#api-surface)
8. [Error Contract](#error-contract)
9. [File Storage](#file-storage)
10. [Resume and Cover Letter Content Model](#resume-and-cover-letter-content-model)
11. [Calendar Resource Model](#calendar-resource-model)
12. [Automations Engine](#automations-engine)
13. [Email Delivery](#email-delivery)
14. [Observability](#observability)
15. [Security Baseline](#security-baseline)
16. [Performance Budgets](#performance-budgets)
17. [Testing Strategy](#testing-strategy)
18. [Environments](#environments)
19. [Configuration](#configuration)
20. [Open Questions](#open-questions)

---

## Stack Pinning

| Technology | Choice | Version |
|---|---|---|
| Runtime | Node.js | 22 (LTS) |
| Framework | Next.js App Router | 15.x |
| UI library | React | 19.x |
| Language | TypeScript | 5.x, `strict: true`, `noUncheckedIndexedAccess: true` |
| Backend / DB | Supabase (Postgres 15, Auth, RLS, Storage, Edge Functions) | Supabase CLI 2.x |
| Hosting | Vercel | Latest |
| Package manager | pnpm | 9.x (`pnpm-lock.yaml` committed) |
| ORM / query | Supabase JS client (`@supabase/supabase-js`) | 2.x |
| Validation | Zod | 3.x |
| Testing (unit) | Vitest | 2.x |
| Testing (E2E) | Playwright | 1.x |
| Linting | ESLint 9 (flat config) + `eslint-config-next` | 9.x |
| Formatting | Prettier | 3.x |
| CSS | Tailwind CSS | 4.x |
| Component library | shadcn/ui (Radix primitives + Tailwind) | Latest at init time; pin after init |
| Icons | Lucide React | Latest at init time; pin after init |
| Email | Resend | 4.x |
| Error reporting | Sentry | 8.x |
| Dependency updates | Renovate (configured to auto-merge patch, PR for minor/major) | Latest |

**TypeScript config requirements (`tsconfig.json`):**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## Repository Layout

```
/
├── .github/
│   └── workflows/
│       └── ci.yml                   # Lint, typecheck, unit tests, E2E, preview deploy gate
├── .env.local                       # Gitignored. Local dev secrets.
├── .env.example                     # Committed. Documents all required env vars.
├── docs/
│   ├── product-spec.md
│   ├── technical-spec.md
│   ├── roadmap.md
│   ├── agent-guide.md
│   └── prompts/                     # Populated in a later step; do not create files here now.
├── public/                          # Static assets (favicon, og images)
├── src/
│   ├── app/                         # Next.js App Router pages and layouts
│   │   ├── (auth)/                  # Route group: login, signup, forgot-password, reset-password
│   │   ├── (app)/                   # Route group: all authenticated routes; layout checks session
│   │   │   ├── dashboard/
│   │   │   ├── companies/
│   │   │   ├── applications/
│   │   │   ├── resumes/
│   │   │   ├── cover-letters/
│   │   │   ├── calendar/
│   │   │   ├── automations/
│   │   │   └── profile/
│   │   ├── api/
│   │   │   └── webhooks/            # Route handlers for external webhooks only
│   │   ├── layout.tsx               # Root layout: font, global CSS, Sentry init
│   │   ├── not-found.tsx            # Global 404 + FORBIDDEN page
│   │   └── error.tsx                # Global error boundary
│   ├── actions/                     # Server actions, one file per resource
│   │   ├── auth.ts
│   │   ├── companies.ts
│   │   ├── applications.ts
│   │   ├── resumes.ts
│   │   ├── cover-letters.ts
│   │   ├── calendar-items.ts
│   │   ├── automations.ts
│   │   └── profile.ts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui generated components (do not hand-edit)
│   │   └── <feature>/               # Feature-specific components, kebab-case folder per feature
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts            # createServerClient (for server actions and server components)
│   │   │   ├── client.ts            # createBrowserClient (for client components / React Query)
│   │   │   └── middleware.ts        # createMiddlewareClient
│   │   ├── validations/             # Zod schemas, one file per resource
│   │   │   ├── auth.ts
│   │   │   ├── companies.ts
│   │   │   ├── applications.ts
│   │   │   ├── resumes.ts
│   │   │   ├── cover-letters.ts
│   │   │   ├── calendar-items.ts
│   │   │   ├── automations.ts
│   │   │   └── profile.ts
│   │   ├── content-migrations.ts    # Migrates resume/cover-letter content JSON between schema versions
│   │   ├── logger.ts                # Structured JSON logger (wraps console in dev, sends to Sentry in prod)
│   │   ├── errors.ts                # AppError class, error code enum, toActionError helper
│   │   └── utils.ts                 # Pure utility functions (formatting, cn(), etc.)
│   ├── middleware.ts                 # Next.js middleware: session refresh + auth redirect
│   └── types/
│       ├── database.ts              # Generated by Supabase CLI (`supabase gen types typescript`)
│       └── index.ts                 # Hand-written app-level types and branded types
├── supabase/
│   ├── config.toml                  # Supabase CLI project config
│   ├── migrations/                  # One .sql file per migration, timestamp-prefixed
│   │   └── 20260101000000_initial_schema.sql
│   ├── functions/                   # Edge Functions
│   │   └── process-automation-events/
│   │       └── index.ts
│   └── seed.sql                     # Seed data for local dev and test environments
├── tests/
│   ├── unit/                        # Vitest unit tests (mirror src/ structure)
│   ├── integration/                 # Vitest integration tests (require local Supabase)
│   └── e2e/                         # Playwright tests
│       ├── fixtures/                # Playwright fixtures and test helpers
│       └── *.spec.ts
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.mjs
├── prettier.config.mjs
├── renovate.json
└── package.json
```

---

## Data Model

For every table: columns (Postgres type, nullability, default), foreign keys, indexes, check constraints, and exact RLS policies as SQL.

The Supabase-generated TypeScript types live at `src/types/database.ts`. Never hand-edit this file; regenerate with `supabase gen types typescript --local > src/types/database.ts`.

All tables live in the `public` schema unless noted. All `updated_at` columns are kept current by a shared trigger function:

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

Apply `CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.<table> FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();` on every table that has `updated_at`.

---

### profiles-table

**Table:** `profiles`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | — | PK; equals `auth.users.id` |
| `full_name` | `text` | NOT NULL | `''` | Display name |
| `avatar_url` | `text` | NULL | — | Storage public URL |
| `notification_email_enabled` | `boolean` | NOT NULL | `true` | Whether automations may send email |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Primary Key:** `id`

**Foreign Keys:**
- `id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:** None beyond PK (single-row-per-user access pattern).

**Trigger:** Created automatically on `auth.users` INSERT via:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**RLS Policies:**

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read only their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: denied; handled by trigger with SECURITY DEFINER
CREATE POLICY "profiles_insert_deny"
  ON public.profiles FOR INSERT
  WITH CHECK (false);

-- UPDATE: users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: denied; profile is deleted via cascade from auth.users
CREATE POLICY "profiles_delete_deny"
  ON public.profiles FOR DELETE
  USING (false);
```

---

### companies-table

**Table:** `companies`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | Max enforced by Zod (200 chars), not DB check |
| `website` | `text` | NULL | — | Valid URL; enforced by Zod |
| `notes` | `text` | NULL | — | Free text |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Primary Key:** `id`

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_companies_user_id` ON `companies(user_id)`

**RLS Policies:**

```sql
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_own"
  ON public.companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "companies_insert_own"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "companies_update_own"
  ON public.companies FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "companies_delete_own"
  ON public.companies FOR DELETE
  USING (auth.uid() = user_id);
```

---

### applications-table

**Table:** `applications`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `company_id` | `uuid` | NOT NULL | — | FK → companies |
| `role_title` | `text` | NOT NULL | — | |
| `status` | `text` | NOT NULL | `'draft'` | Constrained by CHECK |
| `job_posting_url` | `text` | NULL | — | Valid URL; Zod-enforced |
| `resume_id` | `uuid` | NULL | — | FK → resumes |
| `cover_letter_id` | `uuid` | NULL | — | FK → cover_letters |
| `notes` | `text` | NULL | — | |
| `applied_at` | `timestamptz` | NULL | — | Set when status changes to 'applied' |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:**

```sql
CONSTRAINT applications_status_check CHECK (
  status IN (
    'draft','applied','screening','interviewing',
    'offer','negotiating','accepted','rejected','withdrawn'
  )
)
```

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `company_id` → `companies(id)` ON DELETE CASCADE
- `resume_id` → `resumes(id)` ON DELETE SET NULL
- `cover_letter_id` → `cover_letters(id)` ON DELETE SET NULL

**Indexes:**
- `idx_applications_user_id` ON `applications(user_id)`
- `idx_applications_company_id` ON `applications(company_id)`
- `idx_applications_status` ON `applications(user_id, status)`

**RLS Policies:**

```sql
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications_select_own"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "applications_insert_own"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_update_own"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applications_delete_own"
  ON public.applications FOR DELETE
  USING (auth.uid() = user_id);
```

**Automation trigger (status change):**

```sql
CREATE OR REPLACE FUNCTION public.emit_application_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.automation_events (
      user_id, trigger_type, payload
    ) VALUES (
      NEW.user_id,
      'application_status_changed',
      jsonb_build_object(
        'application_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_status_changed
  AFTER UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.emit_application_status_changed();
```

**Automation trigger (`application_created`):**

```sql
CREATE OR REPLACE FUNCTION public.emit_application_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.automation_events (user_id, trigger_type, payload)
  VALUES (
    NEW.user_id,
    'application_created',
    jsonb_build_object('application_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_created
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.emit_application_created();
```

**`applied_at` trigger (sets timestamp on first transition to `'applied'`):**

```sql
CREATE OR REPLACE FUNCTION public.set_applied_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'applied' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'applied') THEN
    NEW.applied_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_set_applied_at
  BEFORE INSERT OR UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_applied_at();
```

---

### resumes-table

**Table:** `resumes`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | Display name |
| `content` | `jsonb` | NOT NULL | `'{}'::jsonb` | Versioned content; see [Resume and Cover Letter Content Model](#resume-and-cover-letter-content-model) |
| `content_version` | `integer` | NOT NULL | `1` | Schema version of `content` JSON |
| `attachment_url` | `text` | NULL | — | Storage path of uploaded DOCX or PDF; NULL if no file attached |
| `parent_id` | `uuid` | NULL | — | FK → resumes(id); NULL for root |
| `root_id` | `uuid` | NOT NULL | — | FK → resumes(id); equals `id` for root |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `parent_id` → `resumes(id)` ON DELETE RESTRICT  ← prevents deleting parent while forks exist
- `root_id` → `resumes(id)` ON DELETE RESTRICT

**Cycle prevention:** Enforced at the application layer in `src/actions/resumes.ts` by verifying the source document is not a descendant of the fork target before inserting. A CHECK constraint cannot efficiently prevent cycles in SQL; the application check is required and tested.

**Indexes:**
- `idx_resumes_user_id` ON `resumes(user_id)`
- `idx_resumes_root_id` ON `resumes(root_id)`
- `idx_resumes_parent_id` ON `resumes(parent_id)` WHERE `parent_id IS NOT NULL`

**RLS Policies:**

```sql
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resumes_select_own"
  ON public.resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "resumes_insert_own"
  ON public.resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resumes_update_own"
  ON public.resumes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "resumes_delete_own"
  ON public.resumes FOR DELETE
  USING (auth.uid() = user_id);
```

**Note:** The RESTRICT FK on `parent_id` prevents DB-level deletion of a parent while forks exist, which surfaces as a Postgres error. The application layer must check for descendants before attempting delete and return a user-friendly error (see `docs/product-spec.md#resumes--delete`).

---

### cover-letters-table

**Table:** `cover_letters`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | Display name |
| `content` | `jsonb` | NOT NULL | `'{}'::jsonb` | Versioned content; see [Resume and Cover Letter Content Model](#resume-and-cover-letter-content-model) |
| `content_version` | `integer` | NOT NULL | `1` | Schema version of `content` JSON |
| `attachment_url` | `text` | NULL | — | Storage path of uploaded DOCX or PDF; NULL if no file attached |
| `parent_id` | `uuid` | NULL | — | FK → cover_letters(id); NULL for root |
| `root_id` | `uuid` | NOT NULL | — | FK → cover_letters(id); equals `id` for root |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `parent_id` → `cover_letters(id)` ON DELETE RESTRICT
- `root_id` → `cover_letters(id)` ON DELETE RESTRICT

**Cycle prevention:** Same application-layer check as `resumes` — see `docs/technical-spec.md#resumes-table`.

**Indexes:**
- `idx_cover_letters_user_id` ON `cover_letters(user_id)`
- `idx_cover_letters_root_id` ON `cover_letters(root_id)`
- `idx_cover_letters_parent_id` ON `cover_letters(parent_id)` WHERE `parent_id IS NOT NULL`

**RLS Policies:** Identical to `resumes` — substitute `cover_letters` for `resumes` in every policy name and table reference.

**Note:** The RESTRICT FK on `parent_id` prevents DB-level deletion while forks exist. The application layer checks for descendants before attempting delete and returns a user-friendly error.

No Postgres triggers. The automation trigger for `application_created` fires on `applications` INSERT, not on cover letters.

---

### calendar-items-table

**Table:** `calendar_items`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `application_id` | `uuid` | NULL | — | FK → applications; required when kind = 'interview' (enforced by trigger) |
| `kind` | `text` | NOT NULL | — | Constrained by CHECK |
| `title` | `text` | NOT NULL | — | |
| `notes` | `text` | NULL | — | |
| `start_at` | `timestamptz` | NULL | — | Required for event, meeting, interview |
| `end_at` | `timestamptz` | NULL | — | Required for event, meeting, interview; must be ≥ start_at |
| `due_at` | `timestamptz` | NULL | — | Used for task only |
| `completed_at` | `timestamptz` | NULL | — | Set when a task is marked complete |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:**

```sql
CONSTRAINT calendar_items_kind_check CHECK (
  kind IN ('task', 'event', 'meeting', 'interview')
),
CONSTRAINT calendar_items_interview_requires_application CHECK (
  kind != 'interview' OR application_id IS NOT NULL
),
CONSTRAINT calendar_items_timed_kinds_require_start CHECK (
  kind = 'task' OR start_at IS NOT NULL
),
CONSTRAINT calendar_items_end_after_start CHECK (
  end_at IS NULL OR start_at IS NULL OR end_at > start_at
)
```

**`due_at` validation note:** `createCalendarItemSchema` must include `.refine(val => val == null || val > new Date(), { message: "Due date must be in the future." })` on `due_at`. The `updateCalendarItemSchema` omits this refine — past due dates are valid on edit (allows backdating overdue tasks).

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `application_id` → `applications(id)` ON DELETE CASCADE

**Indexes:**
- `idx_calendar_items_user_id` ON `calendar_items(user_id)`
- `idx_calendar_items_user_kind` ON `calendar_items(user_id, kind)`
- `idx_calendar_items_start_at` ON `calendar_items(user_id, start_at)` WHERE `start_at IS NOT NULL`
- `idx_calendar_items_due_at` ON `calendar_items(user_id, due_at)` WHERE `due_at IS NOT NULL`

**RLS Policies:**

```sql
ALTER TABLE public.calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_items_select_own"
  ON public.calendar_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "calendar_items_insert_own"
  ON public.calendar_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_items_update_own"
  ON public.calendar_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_items_delete_own"
  ON public.calendar_items FOR DELETE
  USING (auth.uid() = user_id);
```

**Automation trigger (interview scheduled):**

```sql
CREATE OR REPLACE FUNCTION public.emit_interview_scheduled()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind = 'interview' THEN
    INSERT INTO public.automation_events (
      user_id, trigger_type, payload
    ) VALUES (
      NEW.user_id,
      'interview_scheduled',
      jsonb_build_object(
        'calendar_item_id', NEW.id,
        'application_id', NEW.application_id,
        'start_at', NEW.start_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calendar_items_interview_scheduled
  AFTER INSERT ON public.calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.emit_interview_scheduled();
```

---

### automations-table

**Table:** `automations`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `name` | `text` | NOT NULL | — | User-defined label |
| `enabled` | `boolean` | NOT NULL | `true` | |
| `trigger_type` | `text` | NOT NULL | — | Constrained by CHECK |
| `trigger_config` | `jsonb` | NOT NULL | `'{}'::jsonb` | Conditions for this trigger (e.g., `{"status": "offer"}`) |
| `action_type` | `text` | NOT NULL | — | Constrained by CHECK |
| `action_config` | `jsonb` | NOT NULL | `'{}'::jsonb` | Parameters for the action |
| `last_fired_at` | `timestamptz` | NULL | — | Updated by Edge Function on each execution |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:**

```sql
CONSTRAINT automations_trigger_type_check CHECK (
  trigger_type IN (
    'application_status_changed',
    'application_created',
    'interview_scheduled',
    'task_due_soon'
  )
),
CONSTRAINT automations_action_type_check CHECK (
  action_type IN (
    'send_email',
    'create_task',
    'update_application_status'
  )
)
```

**`trigger_config` shape per trigger type:**

| Trigger Type | Config Shape |
|---|---|
| `application_status_changed` | `{ "to_status": "<status_enum_value>" }` — fires only when target status matches. Use `"to_status": "*"` for any status. |
| `application_created` | `{}` — no condition; fires on every new application. |
| `interview_scheduled` | `{}` — no condition; fires on every new interview. |
| `task_due_soon` | `{ "hours_before": 24 }` — checked by a cron Edge Function. |

**`action_config` shape per action type:**

| Action Type | Config Shape |
|---|---|
| `send_email` | `{ "subject": "string", "body": "string" }` — supports template variables (see [Automations Engine](#automations-engine)). |
| `create_task` | `{ "title": "string", "due_offset_hours": number \| null }` — `due_offset_hours` added to `now()` if set. |
| `update_application_status` | `{ "to_status": "<status_enum_value>" }` — the target status. |

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_automations_user_id` ON `automations(user_id)`
- `idx_automations_trigger_type` ON `automations(trigger_type)` WHERE `enabled = true`

**RLS Policies:**

```sql
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automations_select_own"
  ON public.automations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "automations_insert_own"
  ON public.automations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "automations_update_own"
  ON public.automations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "automations_delete_own"
  ON public.automations FOR DELETE
  USING (auth.uid() = user_id);
```

---

### automation-events-table

**Table:** `automation_events`

Immutable log. No UPDATE or DELETE from application code.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner (matches automation owner) |
| `trigger_type` | `text` | NOT NULL | — | Must match valid trigger type |
| `payload` | `jsonb` | NOT NULL | — | Trigger-specific data (application_id, etc.) |
| `processed_at` | `timestamptz` | NULL | — | Set by Edge Function when consumption begins |
| `idempotency_key` | `uuid` | NOT NULL | `gen_random_uuid()` | Unique per event; used by Edge Function |
| `created_at` | `timestamptz` | NOT NULL | `now()` | |

**Unique Constraint:** `UNIQUE (idempotency_key)`

**Check Constraints:**

```sql
CONSTRAINT automation_events_trigger_type_check CHECK (
  trigger_type IN (
    'application_status_changed',
    'application_created',
    'interview_scheduled',
    'task_due_soon'
  )
)
```

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- `idx_automation_events_unprocessed` ON `automation_events(created_at)` WHERE `processed_at IS NULL`
- `idx_automation_events_user_id` ON `automation_events(user_id)`

**RLS Policies:**

```sql
ALTER TABLE public.automation_events ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own events (for UI display)
CREATE POLICY "automation_events_select_own"
  ON public.automation_events FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: denied from client; rows are inserted by SECURITY DEFINER trigger functions only
CREATE POLICY "automation_events_insert_deny"
  ON public.automation_events FOR INSERT
  WITH CHECK (false);

-- UPDATE: denied from client; processed_at set by Edge Function via service role key
CREATE POLICY "automation_events_update_deny"
  ON public.automation_events FOR UPDATE
  USING (false);

-- DELETE: denied
CREATE POLICY "automation_events_delete_deny"
  ON public.automation_events FOR DELETE
  USING (false);
```

---

### automation-action-logs-table

**Table:** `automation_action_logs`

Immutable log. No UPDATE or DELETE from application code.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | NOT NULL | — | Owner |
| `automation_id` | `uuid` | NOT NULL | — | FK → automations |
| `automation_event_id` | `uuid` | NOT NULL | — | FK → automation_events |
| `action_type` | `text` | NOT NULL | — | |
| `status` | `text` | NOT NULL | — | `'succeeded'`, `'failed'`, `'retrying'` |
| `attempt` | `integer` | NOT NULL | `1` | 1-indexed retry count |
| `error_message` | `text` | NULL | — | Set on failure |
| `executed_at` | `timestamptz` | NOT NULL | `now()` | |

**Check Constraints:**

```sql
CONSTRAINT automation_action_logs_action_type_check CHECK (
  action_type IN ('send_email', 'create_task', 'update_application_status')
),
CONSTRAINT automation_action_logs_status_check CHECK (
  status IN ('succeeded', 'failed', 'retrying', 'skipped')
)
```

**Foreign Keys:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `automation_id` → `automations(id)` ON DELETE CASCADE
- `automation_event_id` → `automation_events(id)` ON DELETE CASCADE

**Indexes:**
- `idx_action_logs_automation_id` ON `automation_action_logs(automation_id, executed_at DESC)`
- `idx_action_logs_user_id` ON `automation_action_logs(user_id)`

**RLS Policies:**

```sql
ALTER TABLE public.automation_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "action_logs_select_own"
  ON public.automation_action_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "action_logs_insert_deny"
  ON public.automation_action_logs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "action_logs_update_deny"
  ON public.automation_action_logs FOR UPDATE
  USING (false);

CREATE POLICY "action_logs_delete_deny"
  ON public.automation_action_logs FOR DELETE
  USING (false);
```

---

## Migrations Strategy

- Every schema change is a standalone `.sql` file in `supabase/migrations/`.
- File naming: `YYYYMMDDHHMMSS_<short_description>.sql` (UTC timestamp). Example: `20260101000000_initial_schema.sql`.
- Applied via `supabase db push` in CI after tests pass, before preview deploy.
- No ad-hoc edits in the Supabase dashboard. The dashboard reflects what migrations have run.
- Migrations are idempotent where possible (use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). When idempotency is impossible (e.g., `ADD COLUMN`), the migration runs once in CI against a fresh DB.
- Migration rollback: write a companion `_rollback.sql` file for any destructive migration. Do not execute rollbacks automatically; they require manual approval.
- The initial migration (`20260101000000_initial_schema.sql`) creates all tables, triggers, functions, and RLS policies for the entire schema. Subsequent migrations are additive or alter specific objects.

---

## Auth and Session Handling

**Provider:** Supabase Auth (email + password only in this version).

**Cookie strategy:** `@supabase/ssr` package. Server-side: `createServerClient` with `cookies()` from `next/headers`. Client-side: `createBrowserClient`. Middleware: `createMiddlewareClient`. All three read and write the same `sb-<project-ref>-auth-token` cookie (httpOnly, Secure, SameSite=Lax, path=/).

**Session reads:**
- Server Components and Server Actions: always use `createServerClient` from `src/lib/supabase/server.ts`. Never read the session from a Client Component directly.
- Client Components: may use `createBrowserClient` only to subscribe to auth state changes (e.g., for real-time logout detection). Never call data-fetching methods from the browser client in a Client Component.

**Middleware (`src/middleware.ts`):**
1. Refresh the session cookie on every request (prevents silent expiry).
2. If the request path is not in the public routes list (`/login`, `/signup`, `/forgot-password`, `/reset-password`) and there is no valid session, redirect to `/login?redirect=<originalPath>`.
3. Public routes list is a hard-coded constant in `middleware.ts`; do not derive it dynamically.

**Public routes constant:**
```typescript
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];
```

**Password reset flow:**
1. User submits `/forgot-password` → server action calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: process.env.NEXT_PUBLIC_APP_URL + '/reset-password' })`.
2. Supabase sends an email using the "Reset Password" template (configured in Supabase dashboard, template variables: `{{ .ConfirmationURL }}`).
3. User clicks the link → navigates to `/reset-password?token_hash=<hash>&type=recovery`.
4. Page reads `token_hash` and `type` from search params. Calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` to exchange for a session.
5. If valid: show the new password form. On submit, call `supabase.auth.updateUser({ password: newPassword })`.
6. On success: sign out, redirect to `/login` with success message.
7. If token is invalid or expired: show error message and link to `/forgot-password`.

---

## Authorization Model

**Primary enforcement: RLS.** All data access goes through the Supabase client, which attaches the user's JWT to every query. RLS policies on each table enforce `auth.uid() = user_id`. No data from another user can be read or written at the database level.

**Secondary enforcement: application layer.** Every server action that operates on a specific resource by ID re-fetches the row with the user's session before performing the operation. If the row does not exist or `user_id` does not match `auth.uid()`, the action returns `FORBIDDEN` (not `NOT_FOUND`) — both cases return the same error to prevent resource enumeration.

**Worked example — `updateCompany` server action:**

```typescript
// src/actions/companies.ts
export async function updateCompany(id: string, data: UpdateCompanyInput) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { code: 'UNAUTHENTICATED', message: 'Not authenticated.' } };

  // Re-check ownership (RLS enforces this at DB level; this is defensive)
  const { data: company } = await supabase
    .from('companies')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (!company || company.user_id !== user.id) {
    return { error: { code: 'FORBIDDEN', message: 'Not found.' } };
  }

  const { error } = await supabase
    .from('companies')
    .update({ name: data.name, website: data.website, notes: data.notes })
    .eq('id', id);

  if (error) {
    logger.error('updateCompany failed', { error, userId: user.id, companyId: id });
    return { error: { code: 'INTERNAL_ERROR', message: 'Could not update company.' } };
  }

  revalidatePath(`/companies/${id}`);
  return { data: { id } };
}
```

**Edge Functions** use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for: writing `automation_action_logs`, updating `automation_events.processed_at`, and updating `automations.last_fired_at`. Service role access is limited to these three tables and only from Edge Functions.

---

## API Surface

**Decision: Server Actions for all data operations; Route Handlers for external webhooks only.**

Rationale: Server Actions co-locate with the UI, provide automatic CSRF protection, return typed results, and integrate with `revalidatePath`. Route Handlers are used only where an external HTTP caller (not a browser form) must POST to an endpoint (e.g., Resend webhooks for delivery status).

### Read Pattern

Data reads occur directly in Server Components using `createServerClient` from `src/lib/supabase/server.ts`. Never wrap a SELECT-only query in a server action. Only mutating operations (create, update, delete, upload, toggle, fork) are server actions. This applies to all resources including `getAutomationActionLogs`, which is fetched in the `/automations/[id]` Server Component.

The dashboard funnel aggregation is fetched in the Dashboard Server Component with a single `SELECT status, count(*) FROM applications WHERE user_id = $1 GROUP BY status` query; it is not a server action.

### Server Actions by Resource

All server actions live in `src/actions/<resource>.ts`. Each action:
- Is decorated with `'use server'` at the top of its file.
- Validates input with the Zod schema from `src/lib/validations/<resource>.ts`.
- Returns `{ data: T } | { error: AppError }` — never throws.
- Calls `revalidatePath` or `revalidateTag` on success.
- Logs errors via `src/lib/logger.ts`.

**Input validation pattern:**

```typescript
const parsed = createCompanySchema.safeParse(rawInput);
if (!parsed.success) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input.',
      details: parsed.error.flatten().fieldErrors,
    },
  };
}
```

### Action Inventory

| Action | File | Input Schema | Returns on Success | Revalidates |
|---|---|---|---|---|
| `signUp` | `auth.ts` | `signUpSchema` | `{}` | — |
| `signIn` | `auth.ts` | `signInSchema` | `{}` | — |
| `signOut` | `auth.ts` | `{}` | `{}` | — |
| `sendPasswordResetEmail` | `auth.ts` | `forgotPasswordSchema` | `{}` | — |
| `resetPassword` | `auth.ts` | `resetPasswordSchema` | `{}` | — |
| `createCompany` | `companies.ts` | `createCompanySchema` | `{ id: string }` | `/companies` |
| `updateCompany` | `companies.ts` | `updateCompanySchema` | `{ id: string }` | `/companies/[id]`, `/companies` |
| `deleteCompany` | `companies.ts` | `{ id: string }` | `{ id: string }` | `/companies` |
| `createApplication` | `applications.ts` | `createApplicationSchema` | `{ id: string }` | `/applications`, `/companies/[companyId]` |
| `updateApplication` | `applications.ts` | `updateApplicationSchema` | `{ id: string }` | `/applications/[id]` |
| `deleteApplication` | `applications.ts` | `{ id: string }` | `{ id: string }` | `/applications`, `/companies/[companyId]` |
| `createResume` | `resumes.ts` | `createResumeSchema` | `{ id: string }` | `/resumes` |
| `updateResume` | `resumes.ts` | `updateResumeSchema` | `{ id: string }` | `/resumes/[id]` |
| `forkResume` | `resumes.ts` | `forkResumeSchema` | `{ id: string }` | `/resumes` |
| `deleteResume` | `resumes.ts` | `{ id: string }` | `{ id: string }` | `/resumes` |
| `uploadResumeAttachment` | `resumes.ts` | `FormData` (file) | `{ attachmentUrl: string }` | `/resumes/[id]` |
| `deleteResumeAttachment` | `resumes.ts` | `{ id: string }` | `{}` | `/resumes/[id]` |
| `createCoverLetter` | `cover-letters.ts` | `createCoverLetterSchema` | `{ id: string }` | `/cover-letters` |
| `updateCoverLetter` | `cover-letters.ts` | `updateCoverLetterSchema` | `{ id: string }` | `/cover-letters/[id]` |
| `forkCoverLetter` | `cover-letters.ts` | `forkCoverLetterSchema` | `{ id: string }` | `/cover-letters` |
| `deleteCoverLetter` | `cover-letters.ts` | `{ id: string }` | `{ id: string }` | `/cover-letters` |
| `uploadCoverLetterAttachment` | `cover-letters.ts` | `FormData` (file) | `{ attachmentUrl: string }` | `/cover-letters/[id]` |
| `deleteCoverLetterAttachment` | `cover-letters.ts` | `{ id: string }` | `{}` | `/cover-letters/[id]` |
| `createCalendarItem` | `calendar-items.ts` | `createCalendarItemSchema` | `{ id: string }` | `/calendar` |
| `updateCalendarItem` | `calendar-items.ts` | `updateCalendarItemSchema` | `{ id: string }` | `/calendar/[id]` |
| `completeTask` | `calendar-items.ts` | `{ id: string }` | `{ id: string }` | `/calendar/[id]` |
| `deleteCalendarItem` | `calendar-items.ts` | `{ id: string }` | `{ id: string }` | `/calendar` |
| `createAutomation` | `automations.ts` | `createAutomationSchema` | `{ id: string }` | `/automations` |
| `updateAutomation` | `automations.ts` | `updateAutomationSchema` | `{ id: string }` | `/automations/[id]` |
| `toggleAutomation` | `automations.ts` | `{ id: string, enabled: boolean }` | `{ id: string }` | `/automations` |
| `deleteAutomation` | `automations.ts` | `{ id: string }` | `{ id: string }` | `/automations` |
| `updateProfile` | `profile.ts` | `updateProfileSchema` | `{ id: string }` | `/profile` |
| `uploadAvatar` | `profile.ts` | `FormData` (file) | `{ avatarUrl: string }` | `/profile` |
| `changePassword` | `profile.ts` | `changePasswordSchema` | `{}` | — |

### Route Handlers

| Handler | File | Purpose |
|---|---|---|
| POST `/api/webhooks/resend` | `src/app/api/webhooks/resend/route.ts` | Receive delivery status events from Resend. Verifies `Resend-Signature` header. Updates `automation_action_logs` if applicable. |

---

## Error Contract

**Canonical error shape** (TypeScript):

```typescript
type AppError = {
  code: ErrorCode;
  message: string;      // Human-readable; safe to display to user
  details?: Record<string, string[]>;  // Field-level validation errors (VALIDATION_ERROR only)
};

type ActionResult<T> = { data: T; error?: never } | { error: AppError; data?: never };
```

**`ErrorCode` enum** (in `src/lib/errors.ts`):

```typescript
export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
```

All eight codes are defined in `docs/agent-guide.md#error-codes`. No new codes without a spec change. Client components switch on `error.code` to determine UI behavior.

**HTTP status codes for Route Handlers** (map from `ErrorCode`):

| Code | HTTP Status |
|---|---|
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 422 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `UPSTREAM_ERROR` | 502 |
| `INTERNAL_ERROR` | 500 |

Server Actions do not return HTTP status codes; they return `ActionResult<T>` objects.

---

## File Storage

**Buckets:**

| Bucket Name | Access | Purpose |
|---|---|---|
| `avatars` | Private | User avatar images |
| `resume-attachments` | Private | Optional DOCX or PDF file attached to a resume |
| `cover-letter-attachments` | Private | Optional DOCX or PDF file attached to a cover letter |

**Path conventions:**

| Bucket | Path Pattern | Example |
|---|---|---|
| `avatars` | `<user_id>/avatar.<ext>` | `uuid-here/avatar.png` |
| `resume-attachments` | `<user_id>/<resume_id>/<filename>` | `uuid-here/resume-uuid/resume.docx` |
| `cover-letter-attachments` | `<user_id>/<cover_letter_id>/<filename>` | `uuid-here/cl-uuid/cover-letter.docx` |

**Signed URL policy:** All files served via signed URLs with a 1-hour TTL. Generated server-side in server actions; never generated in client components.

**Limits:**

| Bucket | Max File Size | Allowed MIME Types |
|---|---|---|
| `avatars` | 2 MB | `image/jpeg`, `image/png` |
| `resume-attachments` | 10 MB | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf` |
| `cover-letter-attachments` | 10 MB | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf` |

**Virus scanning:** Deferred. Posture: no scanning in this version. Mitigated by: signed URLs (no public access), MIME type allow-list enforced server-side, and files served only to the owning user.

**Storage RLS policies:** Supabase Storage RLS is enabled on all three buckets. Policy: `auth.uid()::text = (storage.foldername(name))[1]` — the first path segment must equal the authenticated user's ID.

---

## Resume and Cover Letter Content Model

**Storage representation:** Structured JSON (versioned schema). Rejected alternative: rich-text (ProseMirror/Tiptap HTML) — rejected because structured JSON enables field-level AI assistance, type-safe editing, and clean export without HTML parsing.

**Content schema version 1** (stored in `content_version = 1`):

Each resume is a flat array of typed sections. Section types are a closed set. The UI renders sections in ascending `order` and allows users to add, remove, and reorder them. See `docs/agent-guide.md#resume-section-types` for the closed set of valid `SectionType` values.

```typescript
// Lives in src/types/index.ts

type SectionType =
  | 'contact_info'
  | 'summary'
  | 'work_experience'
  | 'education'
  | 'skills'
  | 'certifications'
  | 'custom';

type BaseSection = {
  id: string;     // client-generated UUID; stable React list key
  type: SectionType;
  title: string;  // user-editable label, e.g. "Work Experience" or "Projects"
  order: number;  // integer; sort ascending; need not be contiguous
};

type ContactInfoSection = BaseSection & {
  type: 'contact_info';
  data: {
    fullName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
  };
};

type SummarySection = BaseSection & {
  type: 'summary';
  entries: [{ id: string; text: string }]; // exactly one entry; tuple enforces this
};

type WorkExperienceSection = BaseSection & {
  type: 'work_experience';
  entries: Array<{
    id: string;
    company: string;
    title: string;
    startDate: string;        // "YYYY-MM"
    endDate: string | null;   // null = "Present"
    bullets: string[];
  }>;
};

type EducationSection = BaseSection & {
  type: 'education';
  entries: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string | null;
    startDate: string;
    endDate: string | null;
    gpa: string | null;
  }>;
};

type SkillsSection = BaseSection & {
  type: 'skills';
  entries: Array<{
    id: string;
    category: string;
    items: string[];
  }>;
};

type CertificationsSection = BaseSection & {
  type: 'certifications';
  entries: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string | null;
  }>;
};

type CustomSection = BaseSection & {
  type: 'custom';
  entries: Array<{
    id: string;
    heading: string | null;
    body: string; // plain text paragraph
  }>;
};

export type ResumeSection =
  | ContactInfoSection
  | SummarySection
  | WorkExperienceSection
  | EducationSection
  | SkillsSection
  | CertificationsSection
  | CustomSection;

export type ResumeContentV1 = {
  schemaVersion: 1;
  sections: ResumeSection[];
};
```

**Section invariants** (enforced by `updateResume` server action, not DB CHECK):
- Exactly one `contact_info` section must be present at all times. It cannot be removed.
- At most one `summary` section may exist. It may be removed entirely.
- All other section types may appear zero or more times (e.g., two `work_experience` sections is valid).
- On save: `order` values are re-indexed to `0, 1, 2, …` in the current visual order.

**Default initial content** (populated by `createResume`):
```json
{
  "schemaVersion": 1,
  "sections": [
    { "id": "<uuid>", "type": "contact_info", "title": "Contact", "order": 0,
      "data": { "fullName": "", "email": "", "phone": null, "location": null, "linkedinUrl": null, "websiteUrl": null } },
    { "id": "<uuid>", "type": "summary",        "title": "Summary",         "order": 1,
      "entries": [{ "id": "<uuid>", "text": "" }] },
    { "id": "<uuid>", "type": "work_experience","title": "Work Experience",  "order": 2, "entries": [] },
    { "id": "<uuid>", "type": "education",      "title": "Education",        "order": 3, "entries": [] }
  ]
}
```

**Cover letter content schema version 1:**

```typescript
type CoverLetterContentV1 = {
  schemaVersion: 1;
  recipientName: string | null;
  recipientTitle: string | null;
  companyName: string | null;
  date: string | null;          // "YYYY-MM-DD"
  salutation: string;           // e.g., "Dear Hiring Manager,"
  body: string[];               // Array of paragraphs (plain text)
  closing: string;              // e.g., "Sincerely,"
  senderName: string;
};
```

**Schema migration:** When `content_version` needs to increment, write a migration function in `src/lib/content-migrations.ts` that accepts any version and returns the latest. The `updateResume` and `updateCoverLetter` actions must migrate content before saving if the stored version is less than the current.

**Fork semantics implementation:**

```typescript
// In src/actions/resumes.ts — forkResume
const source = await getResume(sourceId); // must own it
const fork = {
  user_id: user.id,
  name: input.name,
  content: structuredClone(source.content), // deep copy
  content_version: source.content_version,
  parent_id: source.id,
  root_id: source.root_id,  // carry from source, NOT source.id
};
await supabase.from('resumes').insert(fork);
```

---

## Calendar Resource Model

**Decision: Unified `calendar_items` table with a `kind` discriminator column.**

Rejected alternative: four separate tables (`tasks`, `events`, `meetings`, `interviews`) — rejected because shared queries (e.g., "all items this week"), shared RLS policies, and shared UI components are simpler with one table. The discriminator column with CHECK constraints provides sufficient type safety.

The `kind` column's closed set is defined in `docs/agent-guide.md#calendar-item-kinds`.

---

## Automations Engine

### Trigger Detection

Triggers are detected via Postgres trigger functions that write rows to `automation_events`. This ensures:
- Triggers fire atomically with the data change (same transaction).
- No polling required.
- Events survive application restarts.

The four trigger types and their Postgres implementations:

| Trigger Type | Detection Mechanism |
|---|---|
| `application_status_changed` | `AFTER UPDATE` trigger on `applications` (function: `emit_application_status_changed`) |
| `application_created` | `AFTER INSERT` trigger on `applications` (function: `emit_application_created`) |
| `interview_scheduled` | `AFTER INSERT` trigger on `calendar_items` WHERE `kind = 'interview'` (function: `emit_interview_scheduled`) |
| `task_due_soon` | Cron Edge Function runs every 15 minutes, queries `calendar_items` for tasks with `due_at` within `automation.trigger_config.hours_before` hours (default 24 if absent) and `completed_at IS NULL`; inserts events if not already emitted (idempotency: check for existing `automation_events` row with same `calendar_item_id` in payload and `trigger_type = 'task_due_soon'` within the same window) |

**`application_created` and `applied_at` triggers:** Defined in `docs/technical-spec.md#applications-table`.

**`automation_events` payload shapes per trigger type:**

| Trigger Type | Payload Shape |
|---|---|
| `application_status_changed` | `{ "application_id": "<uuid>", "old_status": "<status>", "new_status": "<status>" }` |
| `application_created` | `{ "application_id": "<uuid>" }` |
| `interview_scheduled` | `{ "calendar_item_id": "<uuid>", "application_id": "<uuid>", "start_at": "<timestamptz>" }` |
| `task_due_soon` | `{ "calendar_item_id": "<uuid>", "due_at": "<timestamptz>" }` |

### Action Execution

**Location:** Supabase Edge Function at `supabase/functions/process-automation-events/index.ts`.

**Invocation:** The Edge Function is invoked by a Supabase cron job every 30 seconds (configured in `supabase/config.toml`). It processes unprocessed events in batches of 50.

**Processing loop:**

1. SELECT unprocessed events: `WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 50`.
2. For each event, mark `processed_at = now()` immediately (claim the event; prevents double-processing).
3. Fetch all enabled automations for the event's `user_id` and `trigger_type`.
4. For each matching automation, evaluate `trigger_config` conditions against the event `payload`.
5. If conditions match:
   - **Idempotency check first**: if an `automation_action_logs` row already exists for this `automation_event_id` + `automation_id` with `status = 'succeeded'`, write a `status = 'skipped'` log row and continue.
   - **For `send_email` actions**: verify `profiles.notification_email_enabled = true` for the user. If false, write `status = 'skipped'` log row and continue.
   - **For `update_application_status` actions**: fetch the application's current `status`. If it already equals `action_config.to_status`, write `status = 'skipped'` log row and continue (prevents automation loops).
   - Otherwise, execute the action.
6. Write `automation_action_logs` row with the outcome (`succeeded`, `failed`, or `retrying`).
7. Update `automations.last_fired_at` (service role; see [Authorization Model](#authorization-model)).

**Retry policy:**

- Max attempts: 3.
- Backoff: 30 seconds, 5 minutes, 30 minutes (exponential).
- After 3 failures: write log row with `status = 'failed'` and `error_message`. Do not retry further (dead-lettered in `automation_action_logs`).
- Retry is implemented by the cron function re-querying failed events within the retry window. A failed event row gets a companion `automation_action_logs` row with `attempt` incremented.

**Idempotency:** Each `automation_events` row has an `idempotency_key` UUID. Before executing an action, the Edge Function checks `automation_action_logs` for an existing row with the same `automation_event_id` and `automation_id` and `status = 'succeeded'`. If found, skip (do not double-execute).

**Template variable substitution** (for `send_email` action):

Supported variables in `subject` and `body`:

| Variable | Resolved To |
|---|---|
| `{{application.role_title}}` | `applications.role_title` |
| `{{application.status}}` | `applications.status` |
| `{{company.name}}` | `companies.name` |
| `{{user.full_name}}` | `profiles.full_name` |
| `{{calendar_item.title}}` | `calendar_items.title` (when triggered by interview_scheduled) |

Unknown variables are replaced with `[unknown]` — never error on template substitution failure.

**Abuse prevention:** The `send_email` action sends only to the authenticated user's own email address (fetched from `auth.users` at send time, not from user-configurable input). Users cannot direct automated emails to arbitrary addresses.

**Edge Function configuration** (in `supabase/config.toml`):

```toml
[functions.process-automation-events]
verify_jwt = false  # invoked by cron, not by user JWT
```

The function authenticates itself using `SUPABASE_SERVICE_ROLE_KEY` (environment variable set in Supabase dashboard, not committed).

---

## Email Delivery

**Provider:** Resend. Rejected alternative: SendGrid — rejected; Resend has better Next.js/Vercel integration and simpler API.

**Templates needed:**

| Template | Trigger | Variables |
|---|---|---|
| Email confirmation | Supabase Auth signup | Managed by Supabase Auth; template configured in dashboard |
| Password reset | Supabase Auth forgot-password | Managed by Supabase Auth; template variable: `{{ .ConfirmationURL }}` |
| Automation `send_email` action | User-defined automation | Subject and body are user-configured; see template variable substitution above |

**Template location:** Auth emails are configured in the Supabase dashboard (not in the repo). Automation email rendering logic lives in `supabase/functions/process-automation-events/index.ts`.

**Local testing:** In local dev, Supabase's Inbucket captures all auth emails at `http://localhost:54324`. Automation emails are sent via Resend in all environments (including local dev with a Resend test API key that captures to the Resend dashboard, not delivered to real inboxes).

**Resend configuration:**
- API key: `RESEND_API_KEY` environment variable (set in Vercel + Supabase Edge Function env).
- From address: `noreply@<configured-domain>` — set in `RESEND_FROM_ADDRESS` env var.
- Domain verification: required before production sends. Deferred to production setup.

---

## Observability

**Structured logging format:** JSON. Every log line must include:

```typescript
type LogEntry = {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;         // ISO 8601
  requestId?: string;        // Propagated from middleware
  userId?: string;           // Omit if not available
  action?: string;           // Server action name
  durationMs?: number;       // For timed operations
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  [key: string]: unknown;    // Additional structured context
};
```

**Logger implementation** (`src/lib/logger.ts`): In development, pretty-prints to `stdout`. In production (detected via `process.env.NODE_ENV === 'production'`), outputs JSON to `stdout` (captured by Vercel's log drain).

**Error reporting:** Sentry. Initialize in `src/app/layout.tsx` (client) and `src/instrumentation.ts` (server). Every `INTERNAL_ERROR` and `UPSTREAM_ERROR` must be sent to Sentry with context (userId, action name, input shape without sensitive fields).

**What gets logged on every server action:**
1. Action name and user ID (at `info` level on start).
2. Duration in milliseconds (at `info` level on success).
3. Error code, message, and stack (at `error` level on failure, also sent to Sentry).

**Request tracing:** Next.js automatically propagates a request ID via headers. Capture `x-request-id` (or generate one via `crypto.randomUUID()` if absent) in middleware and attach to all log entries for the request lifecycle.

**Vercel log drain:** Configure in Vercel project settings to forward logs to a log aggregator (e.g., Axiom or Datadog). The specific aggregator is not prescribed here; configure in Vercel dashboard.

---

## Security Baseline

### CSRF

Next.js Server Actions are protected against CSRF by default (they require the `Next-Action` header, which cannot be set cross-origin). No additional CSRF token is required for server actions. Route handlers that accept POST from external callers (e.g., `/api/webhooks/resend`) must verify a request signature (Resend provides `Resend-Signature` header).

### Rate Limiting

| Endpoint | Limit | Implementation |
|---|---|---|
| `POST /login` (via server action) | 10 attempts per 15 minutes per IP | Upstash Redis rate limiter via `@upstash/ratelimit`. IP from `x-forwarded-for` header, validated and truncated to first IP only. |
| `POST /signup` | 5 per hour per IP | Same |
| `POST /forgot-password` | 3 per hour per IP | Same |
| All other server actions | No per-action rate limit | Vercel's global DDoS protection applies |

### Secret Management

- All secrets in Vercel environment variables (not committed).
- `.env.local` is gitignored; `.env.example` documents all variable names with fake values.
- Supabase service role key is set only in the Edge Function environment and Vercel (never in `NEXT_PUBLIC_*`).
- Renovate is configured to auto-merge patch updates only (reducing supply-chain attack surface for minor bumps that require review).

### Content Security Policy

Set via `next.config.ts` `headers()`:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{nonce}' https://js.sentry-cdn.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://<supabase-project-ref>.supabase.co;
  connect-src 'self' https://<supabase-project-ref>.supabase.co https://o*.ingest.sentry.io https://api.resend.com;
  frame-ancestors 'none';
```

Nonce is generated per-request in middleware and injected into the `<script>` tags via `next.config.ts` nonce support.

### Automations Threat Model

The automations engine can send emails on the user's behalf. Threat mitigations:

| Threat | Mitigation |
|---|---|
| User redirects emails to arbitrary addresses | `send_email` action sends only to `auth.users.email` — fetched server-side, not from `action_config`. |
| Automation loops (action triggers same trigger) | `update_application_status` action checks that the target status differs from the current status before updating. Additionally, idempotency key prevents the same event from executing twice. |
| Runaway cron / excessive email | Max 3 retries, then dead-letter. No automation can fire more than once per triggering event. |
| Injection via template variables | Template variables are resolved from DB values (not user-typed free text in `action_config`). The `body` and `subject` are user-typed but sent only to the user's own email and not executed as code. |
| Edge Function privilege escalation | Service role key is scoped only to write `automation_action_logs` and update `automation_events`; all other writes go through RLS-enforced user session. |

### Dependency Policy

Renovate is configured via `renovate.json`:
- Auto-merge: patch-level updates with passing CI.
- PR required: minor and major updates.
- Security alerts: auto-created as high-priority PRs regardless of semver level.

---

## Performance Budgets

| Metric | Target | Measured By |
|---|---|---|
| Largest Contentful Paint (LCP) | ≤ 2.5 s | Vercel Speed Insights / Lighthouse CI in CI |
| Interaction to Next Paint (INP) | ≤ 200 ms | Vercel Speed Insights |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | Vercel Speed Insights / Lighthouse CI |
| Server action p95 latency | ≤ 500 ms | Measured via `durationMs` in structured logs, aggregated in Vercel log drain |
| Time to First Byte (TTFB) | ≤ 600 ms | Vercel Speed Insights |

**Lighthouse CI gate:** Runs in CI on every PR against the preview deploy. Budgets: LCP ≤ 2500 ms, CLS ≤ 0.1. PR blocked if budgets are exceeded. INP is measured but not a hard block in CI (requires real-user interaction).

**Bundle size:** `next build` produces a bundle analysis report (via `@next/bundle-analyzer`). No single route chunk may exceed 200 kB gzipped. Checked manually on PRs that add new dependencies.

---

## Testing Strategy

### Layers

| Layer | Tool | What It Tests | Location |
|---|---|---|---|
| Unit | Vitest | Individual functions: Zod schemas, `src/lib/` utilities, server action business logic with mocked Supabase client, template variable substitution | `tests/unit/` |
| Integration | Vitest | Server actions against real local Supabase (`supabase start`), RLS policy enforcement (two-user tests), automation event emission | `tests/integration/` |
| End-to-End | Playwright | Full user flows in a real browser against seeded local Supabase: all Gherkin scenarios in `docs/product-spec.md` | `tests/e2e/` |

### Coverage Target

- Unit + Integration combined: 80% line coverage on `src/actions/` and `src/lib/`.
- E2E: every happy-path scenario and every empty-state scenario in `docs/product-spec.md#feature-acceptance-criteria` must have a passing Playwright test.
- Coverage is enforced by Vitest's `--coverage` flag in CI; build fails if under 80%.

### Local Supabase Setup

```bash
supabase start                    # starts local Postgres + Auth + Storage
supabase db reset                 # applies all migrations + seed.sql
pnpm vitest run --project=integration
```

Integration tests run against `http://localhost:54321` (local Supabase API) with the local anon key.

### Playwright Configuration

- Tests run against `http://localhost:3000` (started by `next start` against local Supabase).
- Fixtures in `tests/e2e/fixtures/` provide: `authenticatedPage` (pre-seeded user logged in), `emptyPage` (user with no data), `seededPage` (user with full data set).
- All E2E tests are independent: each creates and tears down its own data via the Supabase admin client.
- Browser: Chromium only in CI. Chromium + Firefox + Safari in pre-release.

### CI Gates (must all pass before merge)

1. `tsc --noEmit` (TypeScript strict check)
2. `eslint .` (zero errors, zero warnings)
3. `prettier --check .`
4. `vitest run --coverage` (unit + integration, coverage ≥ 80%)
5. `playwright test` (E2E against preview deploy or local)
6. Lighthouse CI (LCP ≤ 2500 ms, CLS ≤ 0.1)
7. Vercel preview deploy (build must succeed)

---

## Environments

| Environment | Purpose | Supabase Project | Vercel |
|---|---|---|---|
| Local | Development | Local Docker (`supabase start`) | `next dev` on port 3000 |
| Preview | PR validation | Shared dev Supabase project | Vercel preview deploy per PR |
| Production | Live users | Production Supabase project | Vercel production deploy from `main` |

**Migration promotion path:**
1. Migrations are developed locally and committed to the branch.
2. On PR open: CI runs `supabase db push --db-url <preview-db-url>` to apply migrations to the shared dev project.
3. On merge to `main`: CI runs `supabase db push --db-url <production-db-url>`.
4. Never apply migrations directly in the Supabase dashboard on any environment.

**Preview environment caveats:**
- Multiple PRs may push conflicting migrations to the shared dev project. To avoid conflicts: migration timestamps must be unique and migrations must not depend on relative ordering with other in-flight PRs.
- The preview Supabase project is reset weekly from the production schema (data excluded) via a CI cron job.

---

## Configuration

All environment variables used by the application. Every entry marked with `NEXT_PUBLIC_` is exposed to the browser.

| Variable | Required In | Purpose | Example Value |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project API URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase anonymous (public) API key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions, CI | Bypasses RLS; used only in server-side and Edge Function contexts | `eyJhbGc...` |
| `NEXT_PUBLIC_APP_URL` | All | Canonical app URL (used in password reset redirectTo) | `https://jobapp.example.com` |
| `RESEND_API_KEY` | Edge Functions, webhooks | Resend email sending | `re_...` |
| `RESEND_FROM_ADDRESS` | Edge Functions | From address for automation emails | `noreply@jobapp.example.com` |
| `RESEND_WEBHOOK_SECRET` | Vercel (webhook route) | Signature verification for Resend webhooks | `whsec_...` |
| `SENTRY_DSN` | All server-side | Sentry error reporting endpoint | `https://....ingest.sentry.io/...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side | Same DSN for client-side Sentry | Same as above |
| `SENTRY_ORG` | CI | Sentry org slug for source maps upload | `my-org` |
| `SENTRY_PROJECT` | CI | Sentry project slug | `job-app` |
| `SENTRY_AUTH_TOKEN` | CI | Token for Sentry CLI (source map uploads) | `sntrys_...` |
| `UPSTASH_REDIS_REST_URL` | Vercel | Rate limiter Redis URL | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel | Rate limiter Redis token | `...` |
| `SUPABASE_DB_URL` | CI | Postgres connection string for migration push | `postgresql://postgres:...` |

Variables are never committed. `.env.example` contains all names with placeholder values and a one-line comment describing each.

---

## Open Questions

1. **Account deletion cascade**: If the user deletes their account (`auth.users` row deleted), the cascade behavior via `ON DELETE CASCADE` on all `user_id` FKs will hard-delete all their data. Is a soft-delete / 30-day grace period required before permanent deletion?
2. **Task due-soon cron frequency**: Cron runs every 15 minutes for `task_due_soon` events. If a user expects near-real-time notifications, this may feel slow. Confirm acceptable latency.
3. **Upstash Redis dependency**: Rate limiting requires Upstash Redis as an external paid dependency. Confirm this is acceptable or whether a simpler in-memory / Vercel KV approach is preferred.
