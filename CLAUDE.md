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

## Conversation-Splitting Philosophy

Each slash command is designed to run in its own Claude Code session. This is intentional: splitting tasks across conversations preserves context budget and keeps each agent focused on a single responsibility. The file system is the handoff mechanism — every command commits its outputs before it ends, so the next conversation picks up from a clean, known state.

### Standard conversation sequence for a phase

1. `/discovery <NN>-<slug>` — Explore and record unknowns. Commits blockers to `open-questions.md`. → **Start a new conversation.**
2. `/plan <NN>-<slug>` — Design and record decisions. Commits the prompt file to `docs/prompts/<NN>-<slug>.md`. → **Start a new conversation.**
3. `/build <NN>-<slug>` — Implement. Commits code and context files. → **Start a new conversation.**
4. `/review <NN>-<slug>` — Six-gate pre-merge check. If BLOCKED, commits FAILs to `open-questions.md`. → **Start a new conversation for the repair pass** (back to step 3).

### When to recommend starting a new conversation

Recommend a new conversation (and commit all context files first) when:
- You have just completed one of the four modes above.
- The conversation is approaching context limits (prior messages are being summarized aggressively or keeping multiple spec files in view simultaneously becomes difficult).
- You are switching from one mode to another mid-session (e.g., a plan question arises during a build).

### Context snapshot before handing off

Before ending any conversation that produces output, ensure:
1. All context files (`decisions.md`, `open-questions.md`, prompt file if applicable) are committed and pushed to the feature branch.
2. The branch is up to date with any remote changes.
3. You have told the user exactly which command to run next in the new conversation.

The next agent starts fresh but has full fidelity because everything it needs lives in committed files — not in conversation history.

---

## Operating Modes

Invoke these as slash commands. Each mode has distinct constraints.

### `/discovery`
**Purpose:** Explore the codebase and docs; produce a findings report. Bootstraps per-branch context files on first run.

Rules:
- Read the relevant docs and source files.
- Report findings in plain prose: what exists, what is missing, what is inconsistent.
- Appends blockers to `docs/agents/claude/<branch-slug>/open-questions.md`.
- Do not open a PR. Do not edit source or spec files.
- End with a prioritized list of blockers (if any) and suggested next steps, then commit context files and recommend the next conversation.

### `/plan`
**Purpose:** Design an implementation strategy for a feature or fix. Writes planning decisions and blockers to context files as they arise; writes the prompt file on approval.

Rules:
- Read `docs/agent-guide.md`, the relevant roadmap phase, and the relevant spec sections listed in the phase's Reading List.
- Produce a step-by-step plan: migration → RLS → server actions → UI → tests.
- Identify every file to create or modify.
- Stop and surface any "When to Stop and Ask" trigger (`docs/agent-guide.md#when-to-stop-and-ask`) before proceeding.
- Do not write code. Output the plan; wait for approval; **on approval, write the plan to `docs/prompts/<NN>-<slug>.md`**, commit all context files, and recommend the next conversation.

### `/build`
**Purpose:** Execute the current phase prompt end-to-end.

Rules:
- Start from `docs/prompts/<NN>-<slug>.md` for the current phase.
- Read the spec files listed in the phase's Reading List in `docs/roadmap.md`.
- Check `docs/agents/claude/<branch-slug>/open-questions.md` for any unresolved questions that block this phase before writing code.
- Follow all conventions in `docs/agent-guide.md` without exception.
- Work in the vertical-slice order: migration → types → server actions → UI → tests.
- After every migration: `supabase gen types typescript --local > src/types/database.ts`.
- When implementation is complete, commit all code and context files, then recommend running `/review <NN>-<slug>` in a new conversation.

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

### `/review`
**Purpose:** Six-gate pre-merge review (automated checks → deliverables → spec compliance → acceptance criteria → PR checklist → open questions). Ends with a MERGEABLE / BLOCKED verdict. Persists all FAIL entries to `open-questions.md`.

Rules:
- Diff the branch against `main`.
- Run all six gates in order and report findings per gate.
- Do not edit source or spec files. Permitted writes: `docs/agents/claude/<branch-slug>/open-questions.md` only.
- If BLOCKED: commit findings and recommend a new `/build` conversation for repairs, then re-run `/review`.

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
