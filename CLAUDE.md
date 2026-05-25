# Job Application Tracker — Agent Reference

## Project Overview

A single-user job application tracker. Stack: Next.js 15 App Router, TypeScript 5 (strict), Supabase (Postgres 15 + Auth + RLS + Storage + Edge Functions), Vercel.

---

## Documentation Map

| File | Read when |
|---|---|
| `docs/agent-guide.md` | **Always.** Glossary (field names, enums, error codes), coding conventions, Do-Not-Do list, PR checklist, Definition of Done. |
| `docs/technical-spec/index.md` | Start here for technical context; links to each thematic section. |
| `docs/technical-spec/<section>.md` | Read the specific section(s) relevant to the current phase (see Reading List in each roadmap phase). |
| `docs/product-spec/index.md` | Start here for product context; personas, user journeys, screen inventory, default state pattern. |
| `docs/product-spec/<feature>.md` | Read the feature file for the phase being implemented (Gherkin + state matrices + validation rules). |
| `docs/roadmap.md` | Phase scope, prerequisites, deliverables, reading list, acceptance criteria to cite, test additions required. |
| `docs/prompts/<NN>-<slug>.md` | Per-feature implementation prompt. Start here when implementing a phase. (not yet created — populated when each phase is started) |
| `docs/agents/decisions.md` | Global history of significant decisions (promoted from per-branch files on merge). Read for context; do not append directly. |
| `docs/agents/claude/<branch-slug>/decisions.md` | Your per-branch working decision log. Append here during implementation. |
| `docs/agents/claude/<branch-slug>/open-questions.md` | Your per-branch live question list. |

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
- Read `docs/agent-guide.md`, the relevant roadmap phase, and the relevant spec sections listed in the phase's Reading List.
- Produce a step-by-step plan: migration → RLS → server actions → UI → tests.
- Identify every file to create or modify.
- Stop and surface any "When to Stop and Ask" trigger (`docs/agent-guide.md#when-to-stop-and-ask`) before proceeding.
- Do not write code. Output the plan; wait for approval.

### `/implement`
**Purpose:** Execute the current phase prompt end-to-end.

Rules:
- Start from `docs/prompts/<NN>-<slug>.md` for the current phase.
- Read the spec files listed in the phase's Reading List in `docs/roadmap.md`.
- Check `docs/agents/claude/<branch-slug>/open-questions.md` for any unresolved questions that block this phase before writing code.
- Follow all conventions in `docs/agent-guide.md` without exception.
- Work in the vertical-slice order: migration → types → server actions → UI → tests.
- After every migration: `supabase gen types typescript --local > src/types/database.ts`.
- Verify DoD before opening a PR: `tsc --noEmit`, `eslint .`, `vitest run`, `playwright test`.
- Complete the PR checklist from `docs/agent-guide.md#pr-conventions` fully.

**Decision Gate — stop and surface to the user before proceeding when the implementation requires:**
- A package not already in `package.json`
- Adding, removing, or renaming a database column or table **not already specified in `docs/technical-spec/schema.md`**
- Adding, removing, or renaming a server action, or changing its input/output shape
- Changing observable user behavior (new UI state, changed error message text, different navigation flow)

This is in addition to the existing "When to Stop and Ask" triggers in `docs/agent-guide.md#when-to-stop-and-ask`.

**After the user approves a decision:**
1. Update the relevant spec file(s) (`docs/technical-spec/<section>.md` and/or `docs/product-spec/<feature>.md`) in the same commit as the code change.
2. Append an entry to `docs/agents/claude/<branch-slug>/decisions.md`.

**On merge:** copy all decision entries from `docs/agents/claude/<branch-slug>/decisions.md` into `docs/agents/decisions.md` (global history) as part of the merge commit.

### `/audit`
**Purpose:** Review the current branch against the spec; produce a compliance report.

Rules:
- Diff the branch against `main`.
- For each changed file, check it against the relevant section of `docs/agent-guide.md`, `docs/technical-spec/`, and `docs/product-spec/`.
- Check every item in the PR checklist (`docs/agent-guide.md#pr-conventions`).
- Report findings as: PASS / FAIL / NEEDS REVIEW, with file:line references.
- Do not edit code. Output the report only.

---

## Agent Context Store (`docs/agents/`)

Each agent session operates on its own branch. All context files are scoped to that branch to avoid concurrent-write conflicts.

**`docs/agents/claude/<branch-slug>/decisions.md`** — Per-branch working log. Append an entry whenever you make a significant decision:
```
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
```

A decision is significant if it: deviates from the spec, requires a new library, changes the schema or API surface, or resolves a "When to Stop and Ask" trigger.

**`docs/agents/claude/<branch-slug>/open-questions.md`** — Per-branch live list. Add an entry whenever you stop because of a "When to Stop and Ask" or Decision Gate trigger. Before removing a resolved entry, create a corresponding `decisions.md` entry if the resolution has spec impact.

**`docs/agents/decisions.md`** — Global history. Read this for context on prior decisions. Do not append directly during implementation; entries are promoted here on merge.

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
