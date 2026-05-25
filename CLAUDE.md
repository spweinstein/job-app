# Job Application Tracker — Agent Reference

## Project Overview

A single-user job application tracker. Stack: Next.js 15 App Router, TypeScript 5 (strict), Supabase (Postgres 15 + Auth + RLS + Storage + Edge Functions), Vercel.

---

## Documentation Map

Read these before writing any code. Each is authoritative for its domain.

| File | Read when |
|---|---|
| `docs/agent-guide.md` | **Always.** Glossary (field names, enums, error codes), coding conventions, Do-Not-Do list, PR checklist, Definition of Done. |
| `docs/technical-spec.md` | Schema, RLS policies, API surface (server actions), error contract, storage, automations engine, testing strategy, configuration. |
| `docs/product-spec.md` | User journeys, Gherkin acceptance criteria, state matrices, validation rules with exact error strings, accessibility criteria. |
| `docs/roadmap.md` | Phase scope, prerequisites, deliverables, acceptance criteria to cite, test additions required. |
| `docs/discovery.md` | Background reading for the project owner (not agents). |
| `docs/prompts/<NN>-<slug>.md` | Per-feature implementation prompt. Start here when implementing a phase. |
| `docs/agents/decisions.md` | Append significant architectural decisions made during implementation. |
| `docs/agents/open-questions.md` | Log unresolved questions before stopping; clear them when resolved. |

---

## Operating Modes

Invoke these as slash commands. Each mode has distinct constraints.

### `/discovery`
**Purpose:** Explore the codebase and docs; produce a findings report. No code changes.

Rules:
- Read the relevant docs and source files.
- Report findings in plain prose: what exists, what is missing, what is inconsistent.
- Do not open a PR. Do not commit. Do not edit files.
- End with a prioritized list of blockers (if any) and suggested next steps.

### `/plan`
**Purpose:** Design an implementation strategy for a feature or fix. No code changes.

Rules:
- Read `docs/agent-guide.md`, the relevant roadmap phase, and the relevant technical-spec sections.
- Produce a step-by-step plan: migration → RLS → server actions → UI → tests.
- Identify every file to create or modify.
- Stop and surface any "When to Stop and Ask" trigger (`docs/agent-guide.md#when-to-stop-and-ask`) before proceeding.
- Do not write code. Output the plan; wait for approval.

### `/implement`
**Purpose:** Execute the current phase prompt end-to-end.

Rules:
- Start from `docs/prompts/<NN>-<slug>.md` for the current phase.
- Follow all conventions in `docs/agent-guide.md` without exception.
- Work in the vertical-slice order: migration → types → server actions → UI → tests.
- After every migration: `supabase gen types typescript --local > src/types/database.ts`.
- Verify DoD before opening a PR: `tsc --noEmit`, `eslint .`, `vitest run`, `playwright test`.
- Complete the PR checklist from `docs/agent-guide.md#pr-conventions` fully.
- Append any significant decisions to `docs/agents/decisions.md`.
- Log any unresolved questions to `docs/agents/open-questions.md`.

### `/audit`
**Purpose:** Review the current branch against the spec; produce a compliance report.

Rules:
- Diff the branch against `main`.
- For each changed file, check it against the relevant section of `docs/agent-guide.md`, `docs/technical-spec.md`, and `docs/product-spec.md`.
- Check every item in the PR checklist (`docs/agent-guide.md#pr-conventions`).
- Report findings as: PASS / FAIL / NEEDS REVIEW, with file:line references.
- Do not edit code. Output the report only.

---

## Agent Context Store (`docs/agents/`)

Agents must maintain two shared files across sessions:

**`docs/agents/decisions.md`** — Append-only log. When you make a significant choice (schema change, library selection, deviation from the spec, conflict resolution), add an entry:
```
## YYYY-MM-DD — <short title>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
```

**`docs/agents/open-questions.md`** — Live list. Add an entry whenever you stop because of a "When to Stop and Ask" trigger. Remove the entry when the question is resolved (note the resolution inline before removing).

---

## Key Conventions (summary — full list in `docs/agent-guide.md`)

- All mutations are **server actions** in `src/actions/`. Never put DB calls in components.
- All reads are **Server Component queries**. Never wrap SELECT-only queries in server actions.
- Server actions return `{ data: T } | { error: AppError }` — never throw.
- No `console.log`. Use `src/lib/logger.ts`.
- No `any`. No disabled lint rules without an inline justification comment.
- No `SELECT *`. Enumerate columns.
- RLS policies required for every new table.
- Migrations only in `supabase/migrations/`. Never edit the schema in the dashboard.
- Never commit `.env` files or secrets.

---

## Phase Status

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation | Not started |
| 1 | Auth | Not started |
| 2 | Companies | Not started |
| 3 | Applications | Not started |
| 4 | Resumes & Cover Letters | Not started |
| 5 | Calendar Items | Not started |
| 6 | Automations | Not started |
| 7 | Profile | Not started |
| 8 | Dashboard | Not started |
