# Implementation Roadmap

All terminology defers to `docs/agent-guide.md#glossary`. Acceptance criteria references point to `docs/product-spec/`. Schema references point to `docs/technical-spec/`.

Each phase anticipates a corresponding implementation prompt at `docs/prompts/<NN>-<feature-slug>.md`. Do not create those files now.

---

## Conventions for All Phases

The following apply to every phase unless explicitly overridden:

- **After every migration:** run `supabase gen types typescript --local > src/types/database.ts`.
- **Default Definition of Done:** all cited acceptance criteria pass in the E2E suite; `tsc --noEmit` and `eslint .` exit 0; preview deploy green.
- **State matrices:** verify all UI states (per `docs/product-spec/<feature>.md`) for every screen introduced or modified in the phase.
- **Agent context:** before starting, create `docs/agents/claude/<branch-slug>/decisions.md` and `docs/agents/claude/<branch-slug>/open-questions.md` for your branch. See `CLAUDE.md` for the entry format.

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

**Reading list:** `docs/technical-spec/index.md`, `docs/technical-spec/testing.md`

### Scope

Repository initialization, toolchain configuration, CI pipeline, Supabase project provisioning, Vercel linkage, error reporting, and one trivial passing E2E test. No application features.

### Prerequisites

None.

### Deliverables

| Deliverable | Detail |
|---|---|
| Git repository | `main` branch, `.gitignore` covering `.env*`, `node_modules`, `.next`, `supabase/.temp` |
| `package.json` | pnpm 9, Node 22; scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e` |
| TypeScript config | `tsconfig.json` per `docs/technical-spec/index.md#stack-pinning` |
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
| `.env.example` | All variables from `docs/technical-spec/testing.md#configuration` documented |
| Renovate | `renovate.json` with patch auto-merge, minor/major PR-required |
| CI pipeline | `.github/workflows/ci.yml`: lint → typecheck → unit tests → E2E → Lighthouse CI |
| Lighthouse CI | `lighthouserc.json` with LCP ≤ 2500 ms, CLS ≤ 0.1 |
| Trivial E2E test | Playwright test: navigates to `/`, asserts a 200 response (or redirect to `/login`) |
| `docs/` | All planning documents committed |

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

**Reading list:** `docs/product-spec/auth.md`, `docs/technical-spec/schema.md#profiles`, `docs/technical-spec/auth.md`, `docs/technical-spec/api-surface.md`, `docs/technical-spec/security.md#rate-limiting`

### Scope

Email/password authentication: signup, login, logout, forgot-password, reset-password. Middleware auth redirects. Profile row auto-creation trigger. No profile editing UI (that is Phase 7).

### Prerequisites

Phase 0 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `profiles` table + `handle_new_user` trigger + RLS policies (per `docs/technical-spec/schema.md#profiles`) |
| Auth screens | `/login`, `/signup`, `/forgot-password`, `/reset-password` in `src/app/(auth)/` route group |
| Auth layout | `src/app/(auth)/layout.tsx`: centered card, no navigation |
| App layout | `src/app/(app)/layout.tsx`: sidebar navigation, session guard (redirect if no session) |
| Middleware | Update `src/middleware.ts` to redirect unauthenticated requests to `/login?redirect=<path>` |
| Server actions | `src/actions/auth.ts`: `signUp`, `signIn`, `signOut`, `sendPasswordResetEmail`, `resetPassword` |
| Zod schemas | `src/lib/validations/auth.ts`: `signUpSchema`, `signInSchema`, `forgotPasswordSchema`, `resetPasswordSchema` |
| Rate limiting | Login, signup, forgot-password rate limits via Upstash (per `docs/technical-spec/security.md#rate-limiting`) |
| Email confirmation | Supabase Auth email confirmation enabled; Supabase dashboard template configured |
| Password reset | Full flow per `docs/technical-spec/auth.md#password-reset-flow` |
| Redirect preservation | `/login?redirect=<path>` honored on successful login |

### Acceptance Criteria (must pass)

From `docs/product-spec/auth.md`:
- Signup — all three scenarios
- Login — all three scenarios
- Forgot Password — both scenarios
- Reset Password — all three scenarios

### Test Additions Required

- Unit: `signUpSchema` and `signInSchema` valid/invalid inputs.
- Integration: signup creates a `profiles` row; login creates a session; RLS prevents cross-user access.
- E2E: full signup → confirm → login → logout flow; full forgot-password → reset → login flow.

### State Matrix Coverage

`/login`, `/signup`, `/forgot-password`, `/reset-password` — see `docs/product-spec/auth.md#state-matrices`.

### Definition of Done

All auth acceptance criteria pass in Playwright. Middleware correctly gates all `(app)` routes.

---

## Phase 2: Companies

**Prompt file (future):** `docs/prompts/02-companies.md`

**Reading list:** `docs/product-spec/companies.md`, `docs/technical-spec/schema.md#companies`, `docs/technical-spec/api-surface.md`

### Scope

Full CRUD for Companies: list, create, edit, delete. Company detail page showing application count. Search on list.

### Prerequisites

Phase 1 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `companies` table + RLS policies (per `docs/technical-spec/schema.md#companies`) |
| Server actions | `src/actions/companies.ts`: `createCompany`, `updateCompany`, `deleteCompany` |
| Zod schemas | `src/lib/validations/companies.ts`: `createCompanySchema`, `updateCompanySchema` |
| Pages | `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit` |
| Components | `CompanyCard`, `CompanyForm`, `CompanyDeleteDialog`, `CompanyList` in `src/components/companies/` |
| Search | Client-side filter on company name (no server round-trip for this scale) |
| Application count | Company detail page shows count via `SELECT count(*) FROM applications WHERE company_id = :id` in the Server Component |

### Acceptance Criteria (must pass)

From `docs/product-spec/companies.md`:
- List View — all three scenarios
- Create — both scenarios
- Edit — success scenario
- Delete — both scenarios (with and without applications)

### Test Additions Required

- Unit: `createCompanySchema` (valid, missing name, name too long, invalid URL).
- Integration: create/read/update/delete company; RLS — user B cannot read user A's company.
- E2E: create company → view detail → edit → delete (no applications); delete with applications confirmation dialog.

### State Matrix Coverage

`/companies` — see `docs/product-spec/companies.md#state-matrices`. `/companies/new`, `/companies/[id]`, `/companies/[id]/edit` use the Default State Pattern.

### Definition of Done

All companies acceptance criteria pass. Preview deploy shows Companies CRUD working.

---

## Phase 3: Applications

**Prompt file (future):** `docs/prompts/03-applications.md`

**Reading list:** `docs/product-spec/applications.md`, `docs/technical-spec/schema.md#applications`, `docs/technical-spec/schema.md#automation-events`, `docs/technical-spec/api-surface.md`

### Scope

Full CRUD for Applications. Application list with status and company filters. Status change UI. Application detail page with inline status selector. Links to future resume/cover letter (placeholder links, not functional). Postgres trigger for `application_status_changed` and `application_created` events (triggers write to `automation_events`, but the engine is not yet implemented).

### Prerequisites

Phase 2 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `applications` table + RLS policies + `emit_application_status_changed` trigger + `emit_application_created` trigger + `automation_events` table (per `docs/technical-spec/schema.md#applications` and `docs/technical-spec/schema.md#automation-events`) |
| Server actions | `src/actions/applications.ts`: `createApplication`, `updateApplication`, `deleteApplication` |
| Zod schemas | `src/lib/validations/applications.ts` |
| Pages | `/applications`, `/applications/new`, `/applications/[id]`, `/applications/[id]/edit` |
| Status selector | Dropdown or segmented control showing all 9 status enum values; updates status via `updateApplication` action |
| Filters | Status filter (multi-select), company filter (select) — both client-side |
| Company selector | `createApplication` requires selecting an existing company from a dropdown (fetched in the Server Component) |

**Important:** The `automation_events` table must be created in this migration even though automations are not implemented until Phase 6. The trigger functions require the target table to exist.

### Acceptance Criteria (must pass)

From `docs/product-spec/applications.md`:
- List View — both filter scenarios
- Create — both scenarios
- Status Change — trigger scenario
- Delete — all three scenarios

### Test Additions Required

- Unit: `createApplicationSchema`, status enum validation.
- Integration: create application → `automation_events` row written with `trigger_type = 'application_created'`; status change → `automation_events` row with `trigger_type = 'application_status_changed'`.
- E2E: create application → change status → delete; filter by status; filter by company.

### State Matrix Coverage

`/applications` — see `docs/product-spec/applications.md#state-matrices`. `/applications/new`, `/applications/[id]`, `/applications/[id]/edit` use the Default State Pattern.

### Definition of Done

All applications acceptance criteria pass. Triggers write correctly to `automation_events`.

---

## Phase 4: Resumes and Cover Letters

**Prompt file (future):** `docs/prompts/04-resumes-cover-letters.md`

**Reading list:** `docs/product-spec/resumes.md`, `docs/product-spec/cover-letters.md`, `docs/technical-spec/schema.md#resumes`, `docs/technical-spec/schema.md#cover-letters`, `docs/technical-spec/content-model.md`, `docs/technical-spec/storage.md`, `docs/technical-spec/api-surface.md`

### Scope

Full CRUD for Resumes and Cover Letters, including fork creation and lineage display. Structured section editor. Content stored as structured JSON per the `ResumeContentV1` schema in `docs/technical-spec/content-model.md`. Attach resume/cover letter to application. Optional DOCX or PDF file attachment on both.

### Prerequisites

Phase 3 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `resumes` table + `cover_letters` table + RLS policies + FK constraints (per `docs/technical-spec/schema.md#resumes` and `docs/technical-spec/schema.md#cover-letters`) |
| Migration (storage) | Create `avatars`, `resume-attachments`, and `cover-letter-attachments` buckets with storage RLS policies (per `docs/technical-spec/storage.md`) |
| Server actions (resumes) | `createResume`, `updateResume`, `forkResume`, `deleteResume`, `uploadResumeAttachment`, `deleteResumeAttachment` — reads are Server Component queries |
| Server actions (cover letters) | `createCoverLetter`, `updateCoverLetter`, `forkCoverLetter`, `deleteCoverLetter`, `uploadCoverLetterAttachment`, `deleteCoverLetterAttachment` — reads are Server Component queries |
| Zod schemas | `src/lib/validations/resumes.ts`, `src/lib/validations/cover-letters.ts` |
| Content type | `ResumeContentV1` and `CoverLetterContentV1` TypeScript types in `src/types/index.ts` per `docs/technical-spec/content-model.md` |
| Content editor | Section-based form editor components in `src/components/resumes/` and `src/components/cover-letters/` |
| Fork lineage | Resumes list groups forks under their root. Detail page shows parent link and list of direct forks. |
| Attachment upload | Optional DOCX or PDF upload; stored in `resume-attachments` and `cover-letter-attachments` buckets; signed URL for download; stored path in `attachment_url` column |
| Application wiring | Application detail page: resume selector dropdown + cover letter selector dropdown (set `resume_id` / `cover_letter_id` on application) |

### Acceptance Criteria (must pass)

From `docs/product-spec/resumes.md`:
- List View
- Create
- Fork — both scenarios (fork creates deep copy; edit fork does not mutate source)
- Edit — all 4 scenarios (add section; remove non-required section; contact_info cannot be removed; reorder sections)
- Delete — both scenarios (cannot delete with descendants; can delete leaf)

From `docs/product-spec/cover-letters.md`:
- List View, Create, Fork, Delete (same structure as resumes)

### Test Additions Required

- Unit: `forkResume` deep-copy assertion; cycle-prevention logic; section add/remove/reorder logic; `contact_info` cannot-be-removed invariant; `summary` at-most-one invariant.
- Integration: fork resume → edit fork → assert source `content` unchanged; delete resume with fork → expect RESTRICT error → user-friendly error returned; RLS cross-user fork attempt blocked.
- E2E: create resume → edit content → fork → edit fork → verify source unchanged; add section → reorder → remove non-required section; create cover letter → fork → link to application.

### State Matrix Coverage

`/resumes`, `/resumes/[id]` — see `docs/product-spec/resumes.md#state-matrices`. `/resumes/new`, `/resumes/[id]/edit`, `/resumes/[id]/fork` use the Default State Pattern. Same for cover-letters equivalents.

### Definition of Done

All resumes and cover letters acceptance criteria pass, including section editor and fork semantics.

---

## Phase 5: Calendar Items

**Prompt file (future):** `docs/prompts/05-calendar-items.md`

**Reading list:** `docs/product-spec/calendar-items.md`, `docs/technical-spec/schema.md#calendar-items`, `docs/technical-spec/api-surface.md`

### Scope

Full CRUD for Calendar Items across all four kinds. Month and list views. Task completion. Filter by kind. Filter by application. Postgres trigger for `interview_scheduled` events.

### Prerequisites

Phase 3 complete. (Phase 4 is not a prerequisite but should be merged first if running serially; see [Critical Path](#critical-path-and-parallelization).)

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `calendar_items` table + RLS policies + CHECK constraints + `emit_interview_scheduled` trigger (per `docs/technical-spec/schema.md#calendar-items`) |
| Server actions | `createCalendarItem`, `updateCalendarItem`, `completeTask`, `deleteCalendarItem` — reads are Server Component queries |
| Zod schemas | `src/lib/validations/calendar-items.ts` |
| Pages | `/calendar`, `/calendar/new`, `/calendar/[id]`, `/calendar/[id]/edit` |
| Month view | React calendar grid showing items on their `start_at` date (timed kinds) or `due_at` date (tasks). Use `date-fns` for date math. |
| List view | Chronological list as alternative to month view; toggle persisted in URL param `?view=list`. |
| Kind filter | Filter by kind (multi-select); updates URL param `?kind=interview,meeting` |
| Application filter | Dropdown to filter calendar items by linked application; updates URL param `?applicationId=<uuid>` |
| Task complete | Inline "Mark complete" button on task card; calls `completeTask` action. |
| Application link | Interview create/edit form requires selecting an application (dropdown fetched in the Server Component). |

### Acceptance Criteria (must pass)

From `docs/product-spec/calendar-items.md`:
- List and Views — all three scenarios (month view, filter by kind, filter by application)
- Create — all three scenarios (task, interview-with-application, interview-without-application)
- Complete Task

### Test Additions Required

- Unit: `createCalendarItemSchema` — interview without application_id rejected; end_at before or equal to start_at rejected; task without due_at allowed.
- Integration: create interview → `automation_events` row written; interview CHECK constraint enforced; `end_at > start_at` CHECK enforced.
- E2E: create task → mark complete; create interview linked to application → appears on calendar; filter by kind = 'interview'; filter by application.

### State Matrix Coverage

`/calendar` — see `docs/product-spec/calendar-items.md#state-matrices`. `/calendar/new`, `/calendar/[id]`, `/calendar/[id]/edit` have explicit matrices in that file.

### Definition of Done

All calendar items acceptance criteria pass. `interview_scheduled` trigger writes correctly.

---

## Phase 6: Automations

**Prompt file (future):** `docs/prompts/06-automations.md`

**Reading list:** `docs/product-spec/automations.md`, `docs/technical-spec/schema.md#automations`, `docs/technical-spec/schema.md#automation-events`, `docs/technical-spec/schema.md#automation-action-logs`, `docs/technical-spec/automations-engine.md`, `docs/technical-spec/api-surface.md`

### Scope

Full CRUD for Automations. Edge Function consuming `automation_events`. Execution history display. All four trigger types and three action types. Task-due-soon cron. Retry logic. Resend email delivery.

### Prerequisites

Phases 1–5 complete. (All trigger-emitting tables and their triggers must exist before the engine can be tested end-to-end.)

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | `automations` table + `automation_action_logs` table + RLS policies (per `docs/technical-spec/schema.md#automations` and `docs/technical-spec/schema.md#automation-action-logs`). `automation_events` table already created in Phase 3. |
| Server actions | `createAutomation`, `updateAutomation`, `toggleAutomation`, `deleteAutomation` — reads are Server Component queries |
| Zod schemas | `src/lib/validations/automations.ts` — validates `trigger_config` and `action_config` shapes per trigger/action type |
| Pages | `/automations`, `/automations/new`, `/automations/[id]`, `/automations/[id]/edit` |
| Execution history | `/automations/[id]` Server Component reads `automation_action_logs` rows in reverse chronological order |
| Edge Function | `supabase/functions/process-automation-events/index.ts` per `docs/technical-spec/automations-engine.md` |
| Cron (task-due-soon) | Cron handler within `process-automation-events` that polls `calendar_items` every 15 minutes |
| Cron (event processing) | Supabase cron job invoking `process-automation-events` every 30 seconds (in `supabase/config.toml`) |
| Resend integration | `RESEND_API_KEY` wired in Edge Function env; `send_email` action sends to `auth.users.email` |
| Webhook route | `src/app/api/webhooks/resend/route.ts`: receives delivery status events; updates `automation_action_logs` |
| Template substitution | Variables per `docs/technical-spec/automations-engine.md#template-variable-substitution` |
| Retry logic | 3 attempts, backoff 30s/5m/30m, dead-letter after 3 failures |
| Idempotency | Check `automation_action_logs` for existing `succeeded` row before executing |

### Acceptance Criteria (must pass)

From `docs/product-spec/automations.md`:
- List — toggle scenario
- Create — both scenarios
- Execution History
- User journey 3 (setup automation → observe it fire within 60 seconds) from `docs/product-spec/index.md#journey-3`

### Test Additions Required

- Unit: `trigger_config` and `action_config` Zod schema validation for each combination; template variable substitution function.
- Integration: create `application_status_changed` automation → change application status → `automation_events` row written → Edge Function invoked → `automation_action_logs` row written with `status = 'succeeded'`. (Use Resend test mode in integration tests.)
- Integration: idempotency — processing same event twice results in one `succeeded` log, not two.
- Integration: retry — simulate `UPSTREAM_ERROR` on first attempt, succeed on second; assert `attempt = 2` in log.
- E2E: full user journey 3 flow (automation fires, user sees execution history).

### State Matrix Coverage

`/automations` — see `docs/product-spec/automations.md#state-matrices`. `/automations/new`, `/automations/[id]`, `/automations/[id]/edit` have explicit matrices in that file.

### Definition of Done

All automations acceptance criteria pass. User journey 3 passes end-to-end in Playwright (including email delivery to Resend test inbox). Edge Function deploys successfully.

---

## Phase 7: Profile

**Prompt file (future):** `docs/prompts/07-profile.md`

**Reading list:** `docs/product-spec/profile.md`, `docs/technical-spec/schema.md#profiles`, `docs/technical-spec/storage.md`, `docs/technical-spec/api-surface.md`

### Scope

Profile edit page (display name, avatar upload). Change password page. Notification preferences (email enabled toggle). Avatar stored in Supabase Storage.

### Prerequisites

Phase 1 complete. The `avatars` storage bucket is created in Phase 4. If this phase begins before Phase 4 has merged, create the `avatars` bucket migration here and coordinate with the Phase 4 branch to avoid a duplicate migration.

### Deliverables

| Deliverable | Detail |
|---|---|
| Migration | No new tables — `profiles` table created in Phase 1. `avatars` bucket created in Phase 4 (see Prerequisites). |
| Server actions | `updateProfile`, `uploadAvatar`, `changePassword` (per `docs/technical-spec/api-surface.md#action-inventory`) |
| Zod schemas | `src/lib/validations/profile.ts` |
| Pages | `/profile`, `/profile/change-password` |
| Avatar upload | Client-side file input → `uploadAvatar` server action → signed URL → displayed in profile page and nav |
| Notification preference | Toggle for `notification_email_enabled` on profile page; stored in `profiles` table. Automations engine checks this before sending email. |

### Acceptance Criteria (must pass)

From `docs/product-spec/profile.md`:
- Edit — all four scenarios (display name, avatar upload, disable notifications, re-enable notifications)
- Change Password — both scenarios

### Test Additions Required

- Unit: `updateProfileSchema` (name required, name too long); avatar MIME type and size validation.
- Integration: `uploadAvatar` stores file in `avatars` bucket with correct path; cross-user cannot read another user's avatar.
- E2E: update display name; upload avatar; change password with correct current password; change password with wrong current password.

### State Matrix Coverage

`/profile` — see `docs/product-spec/profile.md#state-matrices`. `/profile/change-password` uses the Default State Pattern.

### Definition of Done

All profile acceptance criteria pass. Avatar upload/display works. Notification preference gates automation email sends.

---

## Phase 8: Dashboard

**Prompt file (future):** `docs/prompts/08-dashboard.md`

**Reading list:** `docs/product-spec/dashboard.md`, `docs/product-spec/index.md#journey-1`, `docs/technical-spec/schema.md#applications`, `docs/technical-spec/api-surface.md#read-pattern`

### Scope

Dashboard overview page: recent applications (last 5, by `updated_at`), upcoming calendar items (next 7 days), active automation count, application status funnel chart. Quick-add application button.

### Prerequisites

Phases 1–7 complete.

### Deliverables

| Deliverable | Detail |
|---|---|
| Page | `/dashboard` as the post-login landing page |
| Recent applications widget | Server Component reads 5 most recently updated applications; shows role title, company, status chip |
| Upcoming calendar items widget | Server Component reads calendar items with `start_at` or `due_at` in the next 7 days |
| Automations count widget | Shows count of enabled automations |
| Funnel chart | Bar chart with one bar per application status (all 9 statuses shown); count derived from `SELECT status, count(*) FROM applications WHERE user_id = $1 GROUP BY status` in the Server Component; clicking a bar navigates to `/applications?status=<status>`; hidden when user has zero applications |
| Funnel CTA card | Shown when user has no applications; wide card with distinct background color and rounded corners; links to `/applications/new` |
| Quick-add | "Add application" button linking to `/applications/new` |

### Acceptance Criteria (must pass)

From `docs/product-spec/dashboard.md`:
- Funnel Chart — all 3 scenarios (correct counts per status; click bar navigates to filtered list; CTA card shown when no applications)

### Test Additions Required

- E2E: new user sees CTA card in funnel area and empty messages in other widgets; user with data sees funnel chart with correct per-status counts; clicking a funnel bar navigates to `/applications?status=<status>`.

### Definition of Done

Dashboard renders correctly for new and existing users. Funnel chart shows all 9 statuses; bar click navigates to filtered list. New user sees CTA card.

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
| Phase 6 + Phase 7 | Phase 7 (Profile) depends only on Phase 1. Phase 6 (Automations) depends on Phases 1–5. Profile can be built concurrently while Automations is being developed; coordinate on the `avatars` bucket if Phase 4 has not yet merged. |

**Merging order when parallel branches complete:** Always merge the lower-numbered phase first to avoid migration conflicts. If Phase 5 finishes before Phase 4, hold Phase 5's PR open until Phase 4 merges.

---

## Non-Goals (All Phases)

These items are explicitly out of scope for all phases. Agents must not implement them without a spec change:

- OAuth / social login
- Multi-user sharing or collaboration
- Public job board scraping or auto-import
- AI-assisted writing
- File generation from resume/cover letter JSON (DOCX/PDF is upload-only)
- Recurring calendar events
- External calendar sync (Google, iCal)
- Slack, Teams, or SMS notifications
- Webhook action type in automations
- Admin role or super-user access
- Mobile native app (web-only, responsive)
- Internationalization / localization
- Offline mode with sync
- Billing or subscription management
