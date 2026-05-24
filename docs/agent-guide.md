# Agent Guide

This document is the operating manual for AI coding agents implementing this application. It is the authoritative source of truth for all terminology, conventions, and execution rules. Every other document in `docs/` defers to definitions here.

---

## Table of Contents

1. [Glossary](#glossary)
2. [Documentation Map](#documentation-map)
3. [Coding Conventions](#coding-conventions)
4. [Do Not Do List](#do-not-do-list)
5. [PR Conventions](#pr-conventions)
6. [When to Stop and Ask](#when-to-stop-and-ask)
7. [Definition of Done](#definition-of-done)

---

## Glossary

All resource names, field names, role names, and domain concepts used across `docs/` are defined here. When another document uses any of these terms, it means exactly what is defined below.

### Roles

| Term | Definition |
|---|---|
| **Authenticated User** | A user with a valid Supabase session. The only role in this application. All data operations require this role. |
| **Unauthenticated Visitor** | Any request without a valid session. May only access `/login`, `/signup`, `/forgot-password`, and `/reset-password`. All other routes redirect to `/login`. |

### Resources (Database Tables)

| Term | Table Name | Definition |
|---|---|---|
| **Profile** | `profiles` | One-to-one extension of `auth.users`. Stores display name, avatar URL, and notification preferences. Created automatically on user signup via database trigger. |
| **Company** | `companies` | An employer the user is tracking. May have zero or more Applications. |
| **Application** | `applications` | A single job application to a Company. Has a Status and optional links to a Resume and Cover Letter. |
| **Resume** | `resumes` | A forkable document representing the user's resume. Stored as structured JSON. |
| **Cover Letter** | `cover_letters` | A forkable document representing a cover letter. Stored as structured JSON. |
| **Calendar Item** | `calendar_items` | A unified table for all time-based entries. Differentiated by `kind`. |
| **Automation** | `automations` | A user-configured rule: when a Trigger fires, execute an Action. |
| **Automation Event** | `automation_events` | An immutable log entry written when a Trigger condition is detected. Consumed by the actions engine. |
| **Automation Action Log** | `automation_action_logs` | An immutable record of each Action execution attempt, including outcome and retry count. |

### Calendar Item Kinds

The `calendar_items.kind` column is restricted to this closed set:

| Kind | Description |
|---|---|
| `task` | A to-do item with an optional due date. Not time-blocked. |
| `event` | A generic calendar event with a start and end time. |
| `meeting` | A scheduled meeting, optionally linked to an Application. |
| `interview` | An interview, always linked to an Application. |

### Application Statuses

The `applications.status` column is restricted to this closed set, in approximate lifecycle order:

| Status | Description |
|---|---|
| `draft` | Saved but not yet submitted. |
| `applied` | Submitted to the employer. |
| `screening` | Initial phone/recruiter screen scheduled or completed. |
| `interviewing` | One or more interviews in progress. |
| `offer` | Offer received. |
| `negotiating` | Offer under negotiation. |
| `accepted` | Offer accepted. |
| `rejected` | Application rejected by employer. |
| `withdrawn` | User withdrew the application. |

### Automation Trigger Types

The `automations.trigger_type` column is restricted to this closed set:

| Trigger Type | Fires When |
|---|---|
| `application_status_changed` | An Application's `status` changes to any value. |
| `application_created` | A new Application row is inserted. |
| `interview_scheduled` | A Calendar Item with `kind = 'interview'` is inserted. |
| `task_due_soon` | A Calendar Item with `kind = 'task'` has `due_at` within 24 hours and is not completed. |

### Automation Action Types

The `automations.action_type` column is restricted to this closed set:

| Action Type | What It Does |
|---|---|
| `send_email` | Sends a transactional email to the authenticated user's email address. |
| `create_task` | Inserts a new Calendar Item with `kind = 'task'` owned by the user. |
| `update_application_status` | Updates the linked Application's `status` to the value specified in `action_config`. |

### Fork Semantics (Resumes and Cover Letters)

| Term | Definition |
|---|---|
| **Root document** | A Resume or Cover Letter with `parent_id = NULL` and `root_id = id` (self-referencing). |
| **Fork** | A deep copy of a document's `content` JSON, a new row with `parent_id` set to the source document's `id`, and `root_id` carried from the source's `root_id`. |
| **Ancestor** | Any document in the lineage chain reachable by following `parent_id` links toward the root. |
| **Descendant** | Any document reachable by following forks away from a root. |

Edits to a fork **never mutate ancestors**. This is enforced at the application layer and tested by integration tests.

### Field Name Conventions

| Concept | Column Name |
|---|---|
| Primary key | `id` (UUID, `gen_random_uuid()`) |
| Owner reference | `user_id` (UUID, references `auth.users(id)`) |
| Creation timestamp | `created_at` (timestamptz, `now()`) |
| Last-update timestamp | `updated_at` (timestamptz, `now()`, updated by trigger) |
| Soft-delete flag | `deleted_at` (timestamptz, NULL = not deleted) — **not used**; rows are hard-deleted |
| Fork parent | `parent_id` (UUID, nullable, self-referencing FK) |
| Fork root | `root_id` (UUID, not null, self-referencing FK) |

### Error Codes

The canonical error code enum. Agents must not define codes outside this list without a spec change (see `docs/technical-spec.md#error-contract`).

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | No valid session. |
| `FORBIDDEN` | 403 | Session valid but user does not own the resource. |
| `NOT_FOUND` | 404 | Resource does not exist (or user cannot see it). |
| `VALIDATION_ERROR` | 422 | Input failed Zod schema validation. |
| `CONFLICT` | 409 | Unique constraint or business rule violation. |
| `RATE_LIMITED` | 429 | Too many requests. |
| `UPSTREAM_ERROR` | 502 | External service (email, storage) returned an error. |
| `INTERNAL_ERROR` | 500 | Unexpected server-side failure. |

---

## Documentation Map

| File | Purpose |
|---|---|
| `docs/product-spec.md` | Observable user behavior: personas, journeys, screen inventory, acceptance criteria (Gherkin), state matrices, validation rules, accessibility criteria. |
| `docs/technical-spec.md` | Technical decisions: stack, data model, RLS policies, API surface, error contract, automations engine, observability, security, performance, testing, environments, config. |
| `docs/roadmap.md` | Phased implementation plan: phase scope, prerequisites, deliverables, definitions of done tied to acceptance criteria. |
| `docs/agent-guide.md` | This file. Glossary (source of truth), conventions, anti-patterns, PR rules, when to escalate, definition of done. |
| `docs/prompts/` | Per-feature implementation prompts (populated in a subsequent step, **not** in scope for the initial four documents). |

### Prompt File Naming Convention

When `docs/prompts/` is populated, each file must follow this pattern:

```
docs/prompts/<NN>-<feature-slug>.md
```

- `NN` is a zero-padded two-digit number matching the roadmap phase (e.g., `01`, `02`).
- `feature-slug` is the kebab-case name of the feature or vertical slice (e.g., `companies`, `resumes-cover-letters`).

Example: `docs/prompts/02-companies.md`

Each prompt file must open with cross-document citations in repo-relative path format, e.g.:

```
Implement the feature defined in `docs/product-spec.md#companies`
against the schema in `docs/technical-spec.md#companies-table`.
Follow all conventions in `docs/agent-guide.md`.
```

---

## Coding Conventions

### Naming

| Artifact | Convention | Example |
|---|---|---|
| Database tables | `snake_case`, plural | `calendar_items` |
| Database columns | `snake_case` | `user_id`, `created_at` |
| TypeScript types / interfaces | `PascalCase` | `CalendarItem`, `ApplicationStatus` |
| TypeScript enums | `PascalCase` with `PascalCase` members | `enum CalendarItemKind { Task = 'task' }` |
| React components | `PascalCase` | `ApplicationCard` |
| Files (components, pages, libs) | `kebab-case` | `application-card.tsx`, `use-companies.ts` |
| Server actions | `camelCase` verb+noun | `createCompany`, `forkResume` |
| Route handlers | file is `route.ts` inside a route segment | `app/api/webhooks/route.ts` |
| Zod schemas | `camelCase` with `Schema` suffix | `createCompanySchema` |
| CSS custom properties | `--kebab-case` | `--color-brand-primary` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `NEXT_PUBLIC_SUPABASE_URL` |

### Import Ordering

Enforce via ESLint `import/order`. Order:
1. Node built-ins (`node:fs`)
2. External packages (`react`, `next`, `@supabase/supabase-js`)
3. Internal aliases (`@/lib/...`, `@/components/...`)
4. Relative imports (`./foo`, `../bar`)

Blank line between each group.

### Component Extraction Rules

Extract a component when **any** of these is true:
- It is used in more than one file.
- It exceeds 80 lines of JSX.
- It manages its own local state unrelated to the parent's concerns.

Do **not** extract a component solely to reduce file length if the result would be a single-use component with no clear boundary.

### Server Action Extraction Rules

Extract logic into a server action (in `src/actions/`) when:
- It touches the database.
- It sends email.
- It writes to storage.

Never put database queries, email sends, or storage writes directly in React components or route handlers. Route handlers are only for webhooks and OAuth callbacks.

### File Length

- React component files: max 200 lines. Split at component boundaries.
- Server action files: max 150 lines. Group by resource (one file per resource).
- Library/utility files: max 100 lines. Split by concern.

---

## Do Not Do List

Agents must never do any of the following without explicit instruction in a prompt:

| Anti-pattern | Why |
|---|---|
| Use `any` in TypeScript | Defeats type safety. Use `unknown` and narrow, or define a proper type. |
| Disable an ESLint rule without an inline justification comment | Rules exist for reasons. If disabling is truly necessary, add `// eslint-disable-next-line rule-name -- <reason>`. |
| Call Supabase directly from a Client Component | Client components run in the browser. Use server actions or route handlers. Exception: reading public/anonymous data via `createBrowserClient` in a React Query hook is allowed. |
| Put business logic in a React component | Components render UI. Business logic (status transitions, fork validation, automation evaluation) lives in `src/lib/`. |
| Invent a new error code | Update the enum in `docs/agent-guide.md#error-codes` and `docs/technical-spec.md#error-contract` first, then open a question. |
| Change the database schema outside a migration file | No ad-hoc edits in the Supabase dashboard. All schema changes go through `supabase/migrations/`. |
| Commit secrets or `.env` files | Use Vercel environment variables and `.env.local` (gitignored). |
| Use `console.log` in committed code | Use the structured logger at `src/lib/logger.ts`. |
| Skip a failing test to make CI pass | Fix the test or the code. If neither is possible, open a question. |
| Add a resource, screen, or field not in the spec | Scope is fixed per phase. Suggestions go in Open Questions of the relevant roadmap phase. |
| Mutate an ancestor document when editing a fork | Deep copies only. Ancestors are immutable from a fork's perspective. |
| Run automations synchronously in a request handler | Automations run in Edge Functions consuming the `automation_events` queue. |
| Use `SELECT *` in application queries | Always enumerate columns to prevent accidental data leakage as schema evolves. |

---

## PR Conventions

### One Vertical Slice Per PR

Each PR implements one feature end-to-end: migration → RLS → server actions → UI → tests. Never split a feature across multiple PRs unless explicitly directed by the roadmap.

### Required Checklist

Every PR description must include and complete this checklist:

```
- [ ] Migration added (if schema changed)
- [ ] RLS policies added/updated for all affected tables
- [ ] Zod schemas defined for all inputs
- [ ] Server actions return canonical error shape
- [ ] Unit tests added for all server actions and lib functions
- [ ] Integration test added for each server action crossing a DB boundary
- [ ] E2E test added for each new user-facing flow
- [ ] Acceptance criteria from docs/product-spec.md cited and passing
- [ ] TypeScript: `tsc --noEmit` passes
- [ ] Lint: `eslint .` passes with zero warnings
- [ ] Preview deploy green
- [ ] Screenshots included for all UI changes (desktop + mobile viewport)
```

### Test Additions Required

| Change Type | Required Tests |
|---|---|
| New server action | Unit test (mocked DB) + integration test (local Supabase) |
| New UI screen | E2E test covering happy path + empty state + one error state |
| New automation trigger/action | Unit test for trigger detection + integration test for action execution |
| New Zod schema | Unit test for valid input + at least two invalid inputs |
| New RLS policy | Integration test asserting another user cannot access the row |

### Screenshots for UI Changes

Required viewports: 1280×800 (desktop) and 390×844 (mobile). Attach both to the PR. Annotate if the change is subtle.

---

## When to Stop and Ask

An agent must surface a question (do not proceed) when any of the following arises:

1. **Spec ambiguity**: Two reasonable interpretations of a requirement exist and the chosen interpretation would affect the data model or API shape.
2. **Data model change required**: The task cannot be completed without adding, removing, or renaming a column or table not specified in `docs/technical-spec.md`.
3. **New external dependency**: The task seems to require a package not already in `package.json` (other than dev tooling).
4. **Auth or RLS change**: Any modification to Supabase Auth configuration, RLS policies, or the middleware redirect rules.
5. **Automations action surface change**: Adding a new trigger type or action type not in the glossary enum.
6. **Security-relevant decision**: Rate limit values, CSP directives, signed URL TTLs, or anything in the security baseline (`docs/technical-spec.md#security-baseline`).
7. **Acceptance criteria conflict**: The spec's acceptance criteria contradict each other or cannot both be satisfied.
8. **CI is persistently broken for reasons outside the agent's scope**: After two fix attempts, escalate with a diagnosis.

---

## Definition of Done

A task is done when **all** of the following are true:

1. Code written and committed to the feature branch.
2. `tsc --noEmit` exits 0 (strict mode, noUncheckedIndexedAccess).
3. `eslint .` exits 0 with zero warnings.
4. Unit tests added and passing (`vitest run`).
5. Integration test added if the task crosses a database or storage boundary.
6. E2E test added if the task introduces a user-facing flow (`playwright test`).
7. Preview deploy on Vercel is green (build passes, no runtime errors in logs).
8. Acceptance criteria from `docs/product-spec.md` cited in the PR description and passing in the E2E suite.
9. PR checklist complete.
10. No `console.log`, no disabled lint rules without justification, no `any`.
