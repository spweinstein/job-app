# Agent Prompt: Project Scaffolding (CLAUDE.md + Commands + Agent Context Store)

## Your Task

Create the following files for this project, then commit and push them to the current branch (`claude/ai-agent-planning-docs-RXkav`). Do not modify any existing files. Do not create a pull request.

---

## Files to Create

### 1. `CLAUDE.md` (project root)

This is the first file any Claude Code agent reads when starting a session. Write it as follows:

```markdown
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
```

---

### 2. `.claude/commands/discovery.md`

```markdown
Read the relevant docs and source files for the area described in $ARGUMENTS (or the full codebase if no area is specified). Produce a findings report in plain prose: what exists, what is missing, what is inconsistent with the spec.

Rules you must follow:
- Do not edit any files.
- Do not commit anything.
- Do not open a PR.
- Read `docs/agent-guide.md` and the relevant sections of `docs/technical-spec.md` and `docs/product-spec.md`.
- End your report with a prioritized list of blockers (if any) and suggested next steps.
```

---

### 3. `.claude/commands/plan.md`

```markdown
Design an implementation plan for $ARGUMENTS. Do not write any code.

Steps:
1. Read `docs/agent-guide.md` (full), the relevant phase in `docs/roadmap.md`, and the relevant sections of `docs/technical-spec.md` and `docs/product-spec.md`.
2. Check `docs/agents/open-questions.md` for any unresolved questions in scope.
3. Produce a step-by-step plan in this order: migration → RLS → server actions → UI → tests.
4. List every file to create or modify with a one-line description of the change.
5. Before finalizing, check for any "When to Stop and Ask" triggers from `docs/agent-guide.md#when-to-stop-and-ask`. Surface them and stop if any are present.

Rules you must follow:
- Do not write any code or edit any source files.
- Do not commit or open a PR.
- Output the plan and wait for approval before proceeding.
```

---

### 4. `.claude/commands/implement.md`

```markdown
Implement $ARGUMENTS following the vertical-slice order: migration → types → server actions → UI → tests.

Before writing any code:
1. Read `docs/agent-guide.md` (full).
2. Read the relevant prompt file at `docs/prompts/<NN>-<slug>.md`.
3. Read the relevant sections of `docs/technical-spec.md`, `docs/product-spec.md`, and `docs/roadmap.md`.
4. Check `docs/agents/open-questions.md` for any blockers.

During implementation:
- After every migration: run `supabase gen types typescript --local > src/types/database.ts`.
- Follow all coding conventions from `docs/agent-guide.md` without exception.
- No `console.log`, no `any`, no `SELECT *`, no disabled lint rules without justification.
- Server actions in `src/actions/` only. No DB calls in components.

Before opening a PR:
- Run `tsc --noEmit` — must exit 0.
- Run `eslint .` — must exit 0 with zero warnings.
- Run `vitest run` — all tests must pass.
- Run `playwright test` — all E2E tests must pass.
- Complete the full PR checklist from `docs/agent-guide.md#pr-conventions`.

After the PR:
- Append any significant decisions to `docs/agents/decisions.md`.
- Log any unresolved questions to `docs/agents/open-questions.md`.
```

---

### 5. `.claude/commands/audit.md`

```markdown
Audit the current branch against the spec for $ARGUMENTS (or the full diff if no area is specified). Produce a compliance report. Do not edit any code.

Steps:
1. Run `git diff main...HEAD` to see all changes.
2. For each changed file, check it against:
   - `docs/agent-guide.md` (conventions, Do-Not-Do list)
   - `docs/technical-spec.md` (schema, RLS, API surface)
   - `docs/product-spec.md` (acceptance criteria, validation rules, state matrices)
3. Check every item in the PR checklist at `docs/agent-guide.md#pr-conventions`.
4. Check `docs/agents/open-questions.md` — flag any unanswered questions that block merge.

Report format — one entry per finding:
- **PASS** — compliant, no action needed
- **FAIL** — violates the spec; include file:line reference and the rule violated
- **NEEDS REVIEW** — ambiguous; include the question to resolve

Rules you must follow:
- Do not edit any files.
- Do not commit anything.
- Do not open a PR.
- Output the report only.
```

---

### 6. `docs/agents/decisions.md`

```markdown
# Architectural Decisions

Append-only log of significant choices made during implementation. Add an entry whenever you make a decision that future agents need to understand — schema changes, library selections, deviations from the spec, or conflict resolutions.

## Entry Format

```
## YYYY-MM-DD — <short title>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
```

---

## 2026-05-25 — Resume/cover letter storage as structured JSON + optional file attachment

**Context:** The spec needed to decide between file-upload-only, structured-JSON-only, or both for resumes and cover letters.

**Decision:** Store content as structured JSON (`ResumeContentV1` / `CoverLetterContentV1`) as the canonical form. Allow an optional DOCX or PDF file attachment as a reference copy stored in Supabase Storage. The structured JSON drives the in-app editor; the file is download-only.

**Consequence:** The `resumes` and `cover_letters` tables have a `content` JSONB column and an `attachment_url` text column. The section editor reads/writes the JSON. File uploads go to the `resume-attachments` / `cover-letter-attachments` buckets.

---

## 2026-05-25 — Hard-delete (no soft-delete)

**Context:** The field name conventions section of the agent-guide considered whether to use `deleted_at` for soft deletes.

**Decision:** All rows are hard-deleted. `deleted_at` column is not used in any table.

**Consequence:** Cascade behavior is defined at the FK level (`ON DELETE CASCADE` or `ON DELETE RESTRICT`). No "show deleted items" UI is in scope.

---

## 2026-05-25 — Company delete requires confirmation when applications exist

**Context:** `companies` has a CASCADE FK to `applications`. Deleting a company with linked applications is destructive.

**Decision:** Show a modal confirmation dialog explicitly listing the count of linked applications before allowing deletion. The delete is hard-cascade.

**Consequence:** The `deleteCompany` server action checks for linked applications first and returns the count in its response so the UI can render the confirmation copy.

---

## 2026-05-25 — Dashboard funnel chart hidden when zero applications; replaced by CTA card

**Context:** A funnel chart with all-zero bars is misleading for new users.

**Decision:** When the user has zero applications, replace the funnel chart area with a wide CTA card (distinct background color, rounded corners) linking to `/applications/new`.

**Consequence:** The dashboard Server Component queries application count before deciding which widget to render in the funnel area.
```

---

### 7. `docs/agents/open-questions.md`

```markdown
# Open Questions

Live list of unresolved questions. Add an entry when stopping due to a "When to Stop and Ask" trigger (`docs/agent-guide.md#when-to-stop-and-ask`). Remove the entry when resolved, noting the resolution inline before deleting.

## Entry Format

```
## OQ-<N> — <short title>
**Phase:** <phase number and name>
**Trigger:** <which "When to Stop and Ask" rule fired>
**Question:** <the specific question>
**Blocking:** <what cannot proceed until this is answered>
```

---

_No open questions. Add entries here as implementation proceeds._
```

---

## Commit Instructions

After creating all seven files:

1. Stage: `git add CLAUDE.md .claude/commands/ docs/agents/`
2. Commit with message:
   ```
   Add CLAUDE.md, operating mode slash commands, and agent context store

   - CLAUDE.md: docs map, four operating modes (/discovery /plan
     /implement /audit), agent context store policy, key conventions
     summary, phase status table
   - .claude/commands/: four slash command prompts enforcing mode rules
   - docs/agents/decisions.md: append-only decisions log seeded with
     four decisions from the planning phase
   - docs/agents/open-questions.md: live questions list (currently empty)
   ```
3. Push to `origin claude/ai-agent-planning-docs-RXkav`.
