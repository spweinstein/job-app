# Implementation Roadmap

All terminology defers to `docs/agent-guide.md#glossary`. Acceptance criteria references point to `docs/product-spec.md`. Schema references point to `docs/technical-spec.md`.

Each phase anticipates a corresponding implementation prompt at `docs/prompts/<NN>-<feature-slug>.md`. Do not create those files now; they are out of scope for this document.

---

## Table of Contents

1. [Phase 0: Foundation](#phase-0-foundation)
2. [Phase 1: Auth](#phase-1-auth)
3. [Phase 2: Companies](#phase-2-companies)
4. [Phase 3: Applications](#phase-3-applications)
5. [Phase 4: Resumes and Cover Letters](#phase-4-resumes-and-cover-letters)
6. [Phase 5: Calendar Items](#phase-5-calendar-items)
7. [Phase 6: Automations](#phase-6-automations)
8. [Phase 7: Profile](#phase-7-profile)
9. [Phase 8: Dashboard](#phase-8-dashboard)
10. [Critical Path and Parallelization](#critical-path-and-parallelization)
11. [Non-Goals (All Phases)](#non-goals-all-phases)

---

## Phase 0: Foundation

**Prompt file (future):** `docs/prompts/00-foundation.md`

### Scope

Repository initialization, toolchain configuration, CI pipeline, Supabase project provisioning, Vercel linkage, error reporting, and one trivial passing E2E test. No application features.

### Prerequisites

None.

### Deliverables

| Deliverable | Detail |
|---|---|
| Git repository | `main` branch, `.gitignore` covering `.env*`, `node_modules`, `.next`, `supabase/.temp` |
| `package.json` | pnpm 9, Node 22; scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e` |
| TypeScript config | `tsconfig.json` per `docs/technical-spec.md#stack-pinning` |
| ESLint config | `eslint.config.mjs`: `eslint-config-next`, `@typescript-eslint/strict`, `import/order`, no warnings allowed |
| Prettier config | `prettier.config.mjs`: 2-space indent, single quotes, trailing commas |
| Tailwind CSS | `tailwind.config.ts` with `src/**` content paths |
| shadcn/ui | Initialized with `npx shadcn@latest init`; component library set up |
| Next.js App Router | `src/app/layout.tsx` (root layout, fonts), `src/app/not-found.tsx`, `src/app/error.tsx` |
| Supabase CLI | `supabase/config.toml` initialized; local stack starts with `supabase start` |
| Supabase JS client | `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts` |
| Middleware | `src/middleware.ts` with session refresh (no auth redirects yet — added in Phase 1) |
| Error infrastructure | `src/lib/errors.ts` (AppError, ErrorCode enum), `src/lib/logger.ts` (structured JSON) |
| Sentry | Initialized in `src/instrumentation.ts` and `src/app/layout.tsx`; DSN from env |
| `.env.example` | All variables from `docs/technical-spec.md#configuration` documented |
| Renovate | `renovate.json` with patch auto-merge, minor/major PR-required |
| CI pipeline | `.github/workflows/ci.yml`: lint → typecheck → unit tests → E2E → Lighthouse CI |
| Lighthouse CI | `lighthouserc.json` with LCP ≤ 2500 ms, CLS ≤ 0.1 |
| Trivial E2E test | Playwright test: navigates to `/`, asserts a 200 response (or redirect to `/login`) |
| `docs/` | All four planning documents committed |

### Test Additions Required

- `tests/e2e/smoke.spec.ts`: one test asserting the app loads without a 500 error.

### Definition of Done

A no-op PR (e.g., README update) runs the full CI pipeline:
1. `eslint .` → 0 errors, 0 warnings
2. `tsc --noEmit` → 0 errors
3. `vitest run` → all tests pass
4. `playwright test` → smoke test passes
5. Vercel preview deploy → build succeeds, no runtime errors in logs
6. Lighthouse CI → LCP ≤ 2500 ms, CLS ≤ 0.1

**No application features ship in Phase 0.**

---

## Phase 1: Auth

**Prompt file (future):** `docs/prompts/01-auth.md`

### Scope

Email/password authentication: signup, login, logout, forgot-password, reset-password. Middleware auth redirects. Profile row auto-creation trigger. No profile editing UI (that is Phase 7).

### Prerequisites

Phase 0 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `profiles` table + `handle_new_user` trigger + RLS policies (per `docs/technical-spec.md#profiles-table`) |
| Auth screens | `/login`, `/signup`, `/forgot-password`, `/reset-password` in `src/app/(auth)/` route group |
| Auth layout | `src/app/(auth)/layout.tsx`: centered card, no navigation |
| App layout | `src/app/(app)/layout.tsx`: sidebar navigation, session guard (redirect if no session) |
| Middleware | Update `src/middleware.ts` to redirect unauthenticated requests to `/login?redirect=<path>` |
| Server actions | `src/actions/auth.ts`: `signUp`, `signIn`, `signOut`, `sendPasswordResetEmail`, `resetPassword` |
| Zod schemas | `src/lib/validations/auth.ts`: `signUpSchema`, `signInSchema`, `forgotPasswordSchema`, `resetPasswordSchema` |
| Rate limiting | Login, signup, forgot-password rate limits via Upstash (per `docs/technical-spec.md#rate-limiting`) |
| Email confirmation | Supabase Auth email confirmation enabled; Supabase dashboard template configured |
| Password reset | Full flow per `docs/technical-spec.md#auth-and-session-handling` |
| Redirect preservation | `/login?redirect=<path>` honored on successful login |

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `auth#auth--signup` — all three scenarios
- `auth#auth--login` — all three scenarios
- `auth#auth--forgot-password` — both scenarios
- `auth#auth--reset-password` — all three scenarios

### Test Additions Required

- Unit: `signUpSchema` and `signInSchema` valid/invalid inputs.
- Integration: signup creates a `profiles` row; login creates a session; RLS prevents cross-user access.
- E2E: full signup → confirm → login → logout flow; full forgot-password → reset → login flow.

### State Matrix Coverage

Auth screens: all seven states per `docs/product-spec.md#auth-screens-login-signup-forgot-password-reset-password` must be covered.

### Non-Goals

- OAuth / social login.
- Profile editing UI (Phase 7).
- Multi-factor authentication.

### Definition of Done

All auth acceptance criteria from `docs/product-spec.md#auth` pass in Playwright. Middleware correctly gates all `(app)` routes. CI green.

---

## Phase 2: Companies

**Prompt file (future):** `docs/prompts/02-companies.md`

### Scope

Full CRUD for Companies: list, create, edit, delete. Company detail page showing application count. Search on list.

### Prerequisites

Phase 1 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `companies` table + RLS policies (per `docs/technical-spec.md#companies-table`) |
| Server actions | `src/actions/companies.ts`: `createCompany`, `updateCompany`, `deleteCompany`, `getCompanies`, `getCompany` |
| Zod schemas | `src/lib/validations/companies.ts`: `createCompanySchema`, `updateCompanySchema` |
| Pages | `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit` |
| Components | `CompanyCard`, `CompanyForm`, `CompanyDeleteDialog`, `CompanyList` in `src/components/companies/` |
| Search | Client-side filter on company name (no server round-trip for this scale) |
| Application count | Company detail page shows count via `SELECT count(*) FROM applications WHERE company_id = :id` |
| Supabase types | Regenerate `src/types/database.ts` after migration |

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `companies#companies--list-view` — all three scenarios
- `companies#companies--create` — both scenarios
- `companies#companies--edit` — success scenario
- `companies#companies--delete` — both scenarios (with and without applications)

### Test Additions Required

- Unit: `createCompanySchema` (valid, missing name, name too long, invalid URL).
- Integration: create/read/update/delete company; RLS — user B cannot read user A's company.
- E2E: create company → view detail → edit → delete (no applications); delete with applications confirmation dialog.

### State Matrix Coverage

`/companies` list: all seven states per `docs/product-spec.md#companies-list`.

### Non-Goals

- Bulk import of companies.
- Company logo upload.
- Company contacts (people at the company).

### Definition of Done

All companies acceptance criteria pass. Supabase types regenerated. CI green. Preview deploy shows Companies CRUD working.

---

## Phase 3: Applications

**Prompt file (future):** `docs/prompts/03-applications.md`

### Scope

Full CRUD for Applications. Application list with status and company filters. Status change UI. Application detail page with inline status selector. Links to future resume/cover letter (placeholder links, not functional). Postgres trigger for `application_status_changed` and `application_created` events (triggers write to `automation_events`, but the engine is not yet implemented).

### Prerequisites

Phase 2 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `applications` table + RLS policies + `emit_application_status_changed` trigger + `emit_application_created` trigger + `automation_events` table (needed for trigger target) (per `docs/technical-spec.md#applications-table`, `docs/technical-spec.md#automation-events-table`) |
| Server actions | `src/actions/applications.ts`: `createApplication`, `updateApplication`, `deleteApplication`, `getApplications`, `getApplication` |
| Zod schemas | `src/lib/validations/applications.ts` |
| Pages | `/applications`, `/applications/new`, `/applications/[id]`, `/applications/[id]/edit` |
| Status selector | Dropdown or segmented control showing all status enum values; updates status via `updateApplication` action |
| Filters | Status filter (multi-select), company filter (select) — both client-side |
| Company selector | `createApplication` requires selecting an existing company from a dropdown (fetched server-side) |
| Supabase types | Regenerate after migration |

**Important:** The `automation_events` table must be created in this migration even though automations are not implemented until Phase 6. The trigger functions require the target table to exist.

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `applications#applications--list-view` — both filter scenarios
- `applications#applications--create` — both scenarios
- `applications#applications--status-change` — trigger scenario
- `applications#applications--delete` — success scenario

### Test Additions Required

- Unit: `createApplicationSchema`, status enum validation.
- Integration: create application → `automation_events` row written with `trigger_type = 'application_created'`; status change → `automation_events` row with `trigger_type = 'application_status_changed'`.
- E2E: create application → change status → delete; filter by status; filter by company.

### State Matrix Coverage

`/applications` list: all seven states per `docs/product-spec.md#applications-list`.

### Non-Goals

- Attaching resume or cover letter to an application (Phase 4 adds this).
- Automation action execution (Phase 6).
- Kanban view.

### Definition of Done

All applications acceptance criteria pass. Triggers write correctly to `automation_events`. CI green.

---

## Phase 4: Resumes and Cover Letters

**Prompt file (future):** `docs/prompts/04-resumes-cover-letters.md`

### Scope

Full CRUD for Resumes and Cover Letters, including fork creation and lineage display. Structured section editor: users can add, remove, and reorder typed sections (work experience, education, skills, certifications, custom); each section has a repeatable entry form. Content stored as structured JSON per the `ResumeContentV1` schema in `docs/technical-spec.md`. Attach resume/cover letter to application. Optional DOCX or PDF file attachment on both resumes and cover letters (reference copy alongside the structured content).

### Prerequisites

Phase 3 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `resumes` table + `cover_letters` table + RLS policies + FK constraints (per `docs/technical-spec.md#resumes-table`, `docs/technical-spec.md#cover-letters-table`) |
| Migration (storage) | Create `avatars`, `resume-attachments`, and `cover-letter-attachments` buckets with storage RLS policies (storage bucket creation via Supabase CLI or migration) |
| Server actions (resumes) | `createResume`, `updateResume`, `forkResume`, `deleteResume` — reads (`getResumes`, `getResume`) are Server Component queries per the Read Pattern rule |
| Server actions (cover letters) | `createCoverLetter`, `updateCoverLetter`, `forkCoverLetter`, `deleteCoverLetter` — reads (`getCoverLetters`, `getCoverLetter`) are Server Component queries per the Read Pattern rule |
| Zod schemas | `src/lib/validations/resumes.ts`, `src/lib/validations/cover-letters.ts` |
| Content type | `ResumeContentV1` and `CoverLetterContentV1` TypeScript types in `src/types/index.ts` per `docs/technical-spec.md#resume-and-cover-letter-content-model` |
| Content editor | Section-based form editor components in `src/components/resumes/` and `src/components/cover-letters/` |
| Fork lineage | Resumes list groups forks under their root. Detail page shows parent link and list of direct forks. |
| Attachment upload | Optional DOCX or PDF upload in resume editor and cover letter editor; stored in `resume-attachments` and `cover-letter-attachments` buckets respectively; signed URL for download; stored path in `attachment_url` column |
| Application wiring | Application detail page: resume selector dropdown + cover letter selector dropdown (set `resume_id` / `cover_letter_id` on application) |
| Supabase types | Regenerate after migration |

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `resumes#resumes--list-view`
- `resumes#resumes--create`
- `resumes#resumes--fork` — both scenarios (fork creates deep copy; edit fork does not mutate source)
- `resumes#resumes--edit` — all 4 scenarios (add section; remove non-required section; contact_info cannot be removed; reorder sections)
- `resumes#resumes--delete` — both scenarios (cannot delete with descendants; can delete leaf)
- Cover letter equivalents (same criteria, `cover-letters` table/routes)

### Test Additions Required

- Unit: `forkResume` deep-copy assertion (source content unchanged after fork + edit); cycle-prevention logic in `forkResume`; section add/remove/reorder logic; `contact_info` cannot-be-removed invariant; `summary` at-most-one invariant.
- Integration: fork resume → edit fork → assert source `content` unchanged; delete resume with fork → expect RESTRICT error → user-friendly error returned; RLS cross-user fork attempt blocked.
- E2E: create resume → edit content → fork → edit fork → verify source unchanged; add section → reorder → remove non-required section → verify order; create cover letter → fork → link to application.

### State Matrix Coverage

`/resumes` list and `/cover-letters` list: all seven states.

### Non-Goals

- AI-assisted resume writing or optimization.
- Export or generation of a file from the structured JSON content (the attached DOCX/PDF is a user-uploaded reference copy, not generated from the JSON).
- Cover letter linked to a specific application at fork time is optional (user may fork without linking; linking is done from the application detail page).

### Definition of Done

All resumes and cover letters acceptance criteria pass, including section editor (add/remove/reorder) and section invariants. Fork semantics tested and passing. CI green.

---

## Phase 5: Calendar Items

**Prompt file (future):** `docs/prompts/05-calendar-items.md`

### Scope

Full CRUD for Calendar Items across all four kinds (task, event, meeting, interview). Month and list views. Task completion. Filter by kind. Link to application. Postgres trigger for `interview_scheduled` events.

### Prerequisites

Phase 3 complete. (Phase 4 is not a prerequisite but should be merged first if running serially; see [Critical Path](#critical-path-and-parallelization).)

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `calendar_items` table + RLS policies + CHECK constraints + `emit_interview_scheduled` trigger (per `docs/technical-spec.md#calendar-items-table`) |
| Server actions | `createCalendarItem`, `updateCalendarItem`, `completeTask`, `deleteCalendarItem`, `getCalendarItems` |
| Zod schemas | `src/lib/validations/calendar-items.ts` |
| Pages | `/calendar`, `/calendar/new`, `/calendar/[id]`, `/calendar/[id]/edit` |
| Month view | React calendar grid component showing items on their `start_at` date (for timed kinds) or `due_at` date (for tasks). Use `date-fns` for date math. |
| List view | Chronological list as alternative to month view; toggle between views persisted in URL param `?view=list`. |
| Kind filter | Filter by kind (multi-select); updates URL param `?kind=interview,meeting` (etc.) |
| Application filter | Dropdown to filter calendar items by linked application; updates URL param `?applicationId=<uuid>`; shows only items where `application_id` matches |
| Task complete | Inline "Mark complete" button on task card; calls `completeTask` action. |
| Application link | Interview create/edit form requires selecting an application (dropdown of user's applications). |
| Supabase types | Regenerate after migration |

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `calendar-items#calendar-items--list-and-views` — all three scenarios (month view, filter by kind, filter by application)
- `calendar-items#calendar-items--create` — all three scenarios (task, interview-with-application, interview-without-application)
- `calendar-items#calendar-items--complete-task`

### Test Additions Required

- Unit: `createCalendarItemSchema` — interview without application_id rejected; end_at before start_at rejected; task without due_at allowed.
- Integration: create interview → `automation_events` row written; interview CHECK constraint enforced (application_id required); end_after_start CHECK enforced.
- E2E: create task → mark complete; create interview linked to application → appears on calendar; filter by kind = 'interview'; filter by application.

### State Matrix Coverage

`/calendar` list, `/calendar/new`, `/calendar/[id]`, and `/calendar/[id]/edit`: all seven states per `docs/product-spec.md#state-matrices`.

### Non-Goals

- Recurring events.
- External calendar sync (Google Calendar, iCal export).
- Drag-and-drop rescheduling on the calendar grid.
- Week view (month + list views only in scope; week view deferred indefinitely).

### Definition of Done

All calendar items acceptance criteria pass. `interview_scheduled` trigger writes correctly. CI green.

---

## Phase 6: Automations

**Prompt file (future):** `docs/prompts/06-automations.md`

### Scope

Full CRUD for Automations. Edge Function consuming `automation_events`. Execution history display. All four trigger types and three action types. Task-due-soon cron. Retry logic. Resend email delivery.

### Prerequisites

Phases 1–5 complete. (All trigger-emitting tables and their triggers must exist before the engine can be tested end-to-end.)

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `automations` table + `automation_action_logs` table + RLS policies (per `docs/technical-spec.md#automations-table`, `docs/technical-spec.md#automation-action-logs-table`). `automation_events` table already created in Phase 3. |
| Server actions | `createAutomation`, `updateAutomation`, `toggleAutomation`, `deleteAutomation`, `getAutomations`, `getAutomation`, `getAutomationActionLogs` |
| Zod schemas | `src/lib/validations/automations.ts` — validates `trigger_config` and `action_config` shapes per trigger/action type |
| Pages | `/automations`, `/automations/new`, `/automations/[id]`, `/automations/[id]/edit` |
| Execution history | `/automations/[id]` shows `automation_action_logs` rows in reverse chronological order |
| Edge Function | `supabase/functions/process-automation-events/index.ts` per `docs/technical-spec.md#automations-engine` |
| Cron (task-due-soon) | Separate Edge Function or cron handler within `process-automation-events` that polls `calendar_items` every 15 minutes |
| Cron (event processing) | Supabase cron job invoking `process-automation-events` every 30 seconds (in `supabase/config.toml`) |
| Resend integration | `RESEND_API_KEY` wired in Edge Function env; `send_email` action sends to `auth.users.email` |
| Webhook route | `src/app/api/webhooks/resend/route.ts`: receives delivery status events; updates `automation_action_logs` |
| Template substitution | Variables per `docs/technical-spec.md#automations-engine` |
| Retry logic | 3 attempts, backoff 30s/5m/30m, dead-letter after 3 failures |
| Idempotency | Check `automation_action_logs` for existing `succeeded` row before executing |
| Rate limiting | N/A for actions; user-level spam prevention is achieved by only sending to the user's own email |
| Supabase types | Regenerate after migration |

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `automations#automations--list` — toggle scenario
- `automations#automations--create` — both scenarios
- `automations#automations--execution-history`
- User journey 3 (setup automation → observe it fire within 60 seconds)

### Test Additions Required

- Unit: `trigger_config` and `action_config` Zod schema validation for each combination; template variable substitution function.
- Integration: create `application_status_changed` automation → change application status → `automation_events` row written → Edge Function invoked → `automation_action_logs` row written with `status = 'succeeded'`. (Use Resend test mode in integration tests.)
- Integration: idempotency — processing same event twice results in one `succeeded` log, not two.
- Integration: retry — simulate `UPSTREAM_ERROR` on first attempt, succeed on second; assert `attempt = 2` in log.
- E2E: full user journey 3 flow (automation fires, user sees execution history).

### State Matrix Coverage

`/automations` list: all seven states per `docs/product-spec.md#automations-list`. `/automations/new`: all seven states per `docs/product-spec.md#automationsnew-create-automation-form`. `/automations/[id]`: all seven states per `docs/product-spec.md#automationsid-automation-detail--execution-history`. `/automations/[id]/edit`: all seven states per `docs/product-spec.md#automationsidedit-edit-automation`.

### Non-Goals

- Automation templates / gallery.
- Webhook action type (not in the action type enum).
- Slack/Teams notifications.
- Automation scheduling (time-based triggers beyond `task_due_soon`).
- Real-time execution feedback (polling the log table via client fetch is sufficient).

### Definition of Done

All automations acceptance criteria pass. User journey 3 passes end-to-end in Playwright (including email delivery to Resend test inbox). Edge Function deploys successfully. CI green.

---

## Phase 7: Profile

**Prompt file (future):** `docs/prompts/07-profile.md`

### Scope

Profile edit page (display name, avatar upload). Change password page. Notification preferences (email enabled toggle). Avatar stored in Supabase Storage.

### Prerequisites

Phase 1 complete; Phase 4 must have merged (avatars bucket is created there). If Phase 4 has not yet merged at the time this phase begins, create the `avatars` bucket migration here instead.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | Storage bucket `avatars` RLS policy (if not already created in Phase 4). No new tables — `profiles` table created in Phase 1. |
| Server actions | `updateProfile`, `uploadAvatar`, `changePassword` (per `docs/technical-spec.md#api-surface`) |
| Zod schemas | `src/lib/validations/profile.ts` |
| Pages | `/profile`, `/profile/change-password` |
| Avatar upload | Client-side file input → `uploadAvatar` server action → signed URL → displayed in profile page and nav |
| Notification preference | Toggle for `notification_email_enabled` on profile page; stored in `profiles` table. Automations engine checks this before sending email. |
| Supabase types | Regenerate if schema changed |

### Acceptance Criteria (must pass)

From `docs/product-spec.md`:
- `profile#profile--edit` — both scenarios (display name, avatar upload)
- `profile#profile--change-password` — both scenarios

### Test Additions Required

- Unit: `updateProfileSchema` (name required, name too long); avatar MIME type and size validation.
- Integration: `uploadAvatar` stores file in `avatars` bucket with correct path; cross-user cannot read another user's avatar.
- E2E: update display name; upload avatar; change password with correct current password; change password with wrong current password.

### State Matrix Coverage

`/profile`: all seven states per `docs/product-spec.md#profile-profile-edit`.

### Non-Goals

- Account deletion (flagged as Open Question in `docs/product-spec.md`).
- OAuth provider linking.
- Two-factor authentication.
- Dark/light mode preference stored in profile (use OS preference via CSS `prefers-color-scheme`).

### Definition of Done

All profile acceptance criteria pass. Avatar upload/display works. Notification preference gates automation email sends. CI green.

---

## Phase 8: Dashboard

**Prompt file (future):** `docs/prompts/08-dashboard.md`

### Scope

Dashboard overview page: recent applications (last 5, by `updated_at`), upcoming calendar items (next 7 days), active automation count, application status funnel chart. Quick-add application button.

### Prerequisites

Phases 1–7 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Page | `/dashboard` as the post-login landing page |
| Recent applications widget | Fetches 5 most recently updated applications; shows role title, company, status chip |
| Upcoming calendar items widget | Fetches calendar items with `start_at` or `due_at` in the next 7 days; shows title, kind, date |
| Automations count widget | Shows count of enabled automations |
| Funnel chart | Bar chart with one bar per application status (all 9 statuses shown); count derived from a single `SELECT status, count(*) GROUP BY status` aggregation query; clicking a bar navigates to `/applications?status=<status>`; hidden when user has zero applications |
| Funnel CTA card | Shown in the funnel chart area when user has no applications; wide card with distinct background color and rounded corners; prompts user to log first application; links to `/applications/new` |
| Quick-add | "Add application" button linking to `/applications/new` |
| Empty state | Shown when user has no applications and no calendar items: "Welcome! Start by adding a company." |

### Acceptance Criteria

- `docs/product-spec.md#dashboard--funnel-chart` — all 3 scenarios (correct counts per status; click bar navigates to filtered list; CTA card shown when no applications).

### Test Additions Required

- E2E: new user sees CTA card in funnel area and empty messages in other widgets; user with data sees recent applications, upcoming items, and funnel chart with correct per-status counts; clicking a funnel bar navigates to `/applications?status=<status>`.

### Non-Goals

- Notifications panel.

### Definition of Done

Dashboard renders correctly for new and existing users. New user sees CTA card in funnel area. Existing user sees funnel chart with all 9 statuses and correct counts; bar click navigates to filtered list. CI green. Preview deploy green.

---

## Critical Path and Parallelization

```
Phase 0 (Foundation)
  └── Phase 1 (Auth)
        ├── Phase 2 (Companies) ──────────────────────────────────────────┐
        │     └── Phase 3 (Applications)                                  │
        │           ├── Phase 4 (Resumes & Cover Letters) [parallel w/ 5] │
        │           ├── Phase 5 (Calendar Items)          [parallel w/ 4] │
        │           └── [Phases 4 + 5 complete] ──────────────────────────┤
        │                 └── Phase 6 (Automations)                       │
        │                       └── Phase 7 (Profile) [parallel w/ 6]    │
        │                                                                  │
        └──────────────────────────── Phase 8 (Dashboard) ────────────────┘
                                      (needs all prior phases)
```

**Parallelizable pairs (if multiple agents are deployed):**

| Parallel Pair | Condition |
|---|---|
| Phase 4 + Phase 5 | Both depend on Phase 3. No schema overlap. Can be developed concurrently on separate branches. |
| Phase 6 + Phase 7 | Phase 7 (Profile) depends only on Phase 1. Phase 6 (Automations) depends on Phases 1–5. Profile can be built concurrently while Automations is being developed, as long as the `avatars` bucket is created in Phase 4 before Phase 7 merges. |

**Merging order when parallel branches complete:** Always merge the lower-numbered phase first to avoid migration conflicts. If Phase 5 finishes before Phase 4, hold Phase 5's PR open until Phase 4 merges.

---

## Non-Goals (All Phases)

These items are explicitly out of scope for all phases in this roadmap. Agents must not implement them without a spec change:

| Non-Goal | Reason |
|---|---|
| OAuth / social login | Auth is email+password only in this version |
| Multi-user sharing or collaboration | Single-user, single-owner data model |
| Public job board scraping or auto-import | No external data sources |
| AI-assisted writing | Out of scope for this version |
| File generation from resume/cover letter JSON | Only optional DOCX/PDF upload and download; no generation from structured content |
| Recurring calendar events | Not in the `calendar_items` schema |
| External calendar sync (Google, iCal) | Out of scope |
| Slack, Teams, or SMS notifications | Only email via Resend |
| Webhook action type in automations | Not in the action type enum |
| Admin role or super-user access | Single-role application |
| Mobile native app | Web-only (responsive) |
| Internationalization / localization | English only |
| Offline mode with sync | Offline banner only; no local-first data layer |
| Billing or subscription management | No paid tier in this version |
