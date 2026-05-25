# Open Questions — claude/review-00a-SR5Zd

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Finding:** FAIL | MISSING | BLOCKING
**Location:** <file:line or gate name>
**Detail:** <rule violated or what is missing>
-->

## Gate 1 — tsc --noEmit fails (no tsconfig.json)
**Source:** review / gate 1
**Finding:** FAIL
**Location:** gate 1 — tsc --noEmit (exit 1)
**Detail:** No `tsconfig.json` exists. tsc printed its help text and exited 1. Blocked until Phase 0 (Foundation) creates the TypeScript configuration.

## Gate 1 — eslint fails (no eslint config)
**Source:** review / gate 1
**Finding:** FAIL
**Location:** gate 1 — eslint . (exit 2)
**Detail:** No `eslint.config.mjs` exists. ESLint reported "couldn't find an eslint.config.(js|mjs|cjs) file" and exited 2. Blocked until Phase 0 creates the ESLint configuration.

## Gate 1 — vitest reports no test files
**Source:** review / gate 1
**Finding:** FAIL
**Location:** gate 1 — vitest run
**Detail:** No test files exist. Vitest reported "No test files found, exiting with code 1". Blocked until Phase 0 creates `tests/e2e/smoke.spec.ts` and the Vitest configuration.

## Gate 1 — playwright reports no tests
**Source:** review / gate 1
**Finding:** FAIL
**Location:** gate 1 — playwright test
**Detail:** No Playwright config or test files exist. Blocked until Phase 0 creates the E2E smoke test and Playwright configuration.

## Gate 2 — docs/prompts/00a.md missing
**Source:** review / gate 2
**Finding:** MISSING
**Location:** docs/prompts/00a.md
**Detail:** No prompt file exists for phase 00a. The review gate requires it to enumerate deliverables. Note: `docs/roadmap.md` explicitly says "Do not create those files now," so this is a structural gap in the workflow convention rather than an omission by an agent. Resolution: clarify whether a prompt file is required before or during `/build`, or accept that Gate 2 cannot be fully evaluated for planning-only branches.

## Gate 2 — All Phase 0 code deliverables missing
**Source:** review / gate 2
**Finding:** MISSING
**Location:** gate 2 — Phase 0 deliverables per docs/roadmap.md
**Detail:** package.json, tsconfig.json, eslint.config.mjs, prettier.config.mjs, tailwind.config.ts, src/app/layout.tsx, src/app/not-found.tsx, src/app/error.tsx, src/lib/supabase/{server,client,middleware}.ts, src/middleware.ts, src/lib/errors.ts, src/lib/logger.ts, src/instrumentation.ts, supabase/config.toml, .env.example, renovate.json, .github/workflows/ci.yml, lighthouserc.json, tests/e2e/smoke.spec.ts are all absent. These are Phase 0 (Foundation) deliverables; they must be created in the `/build 00-foundation` phase.

## Gate 3 — docs/discovery.md absent from documentation maps
**Source:** review / gate 3
**Finding:** FAIL
**Location:** CLAUDE.md, docs/agent-guide.md, docs/roadmap.md
**Detail:** `docs/discovery.md` (the project-owner orientation guide) exists on the branch but is not referenced in any documentation map: not in CLAUDE.md's Documentation Map table, not in docs/agent-guide.md's Documentation Map table, and not in docs/roadmap.md. Future agents will not know it exists. Add an entry to each table pointing to docs/discovery.md with a description like "Project-owner orientation guide: key technologies in the context of this project."

## Gate 3 — No branch context files for claude/review-00a-SR5Zd
**Source:** review / gate 3
**Finding:** FAIL
**Location:** docs/agents/claude/claude/review-00a-SR5Zd/
**Detail:** CLAUDE.md requires that `docs/agents/claude/<branch-slug>/decisions.md` and `docs/agents/claude/<branch-slug>/open-questions.md` be created before any work begins on a branch. Neither file existed at the start of this review session. This open-questions.md is being created now; decisions.md also needs to be created.

## Gate 5 — tsc and eslint cannot pass (toolchain not installed)
**Source:** review / gate 5
**Finding:** PENDING
**Location:** gate 5 — PR checklist items: tsc --noEmit, eslint .
**Detail:** Both checklist items are PENDING because Phase 0 has not been built. They will remain PENDING until the toolchain is initialized in the Foundation phase.

## Gate 5 — Preview deploy not green (no Vercel project linked)
**Source:** review / gate 5
**Finding:** PENDING
**Location:** gate 5 — PR checklist: preview deploy green
**Detail:** No Vercel project is linked to this repository. Creating and linking a Vercel project requires manual action (Vercel dashboard or CLI with user credentials). This blocks the "preview deploy green" DoD criterion for Phase 0. Inherited from discovery branch open question "No Vercel project linked."

## Gate 5 — Decision log not promoted on merge
**Source:** review / gate 5
**Finding:** PENDING
**Location:** gate 5 — PR conventions: On Merge: Promote Decision Log
**Detail:** No `docs/agents/claude/claude/review-00a-SR5Zd/decisions.md` existed at review time, so there are no entries to promote. Before merging, ensure the decisions.md file is created (even if empty), and that any decisions made during this phase are recorded.

## Gate 6 — No Supabase remote project provisioned (inherited)
**Source:** review / gate 6
**Finding:** BLOCKING
**Location:** gate 6 — inherited from claude/discovery-workflow-test-plan-RkkNi
**Detail:** There is no linked remote Supabase project. CI requires this to push migrations and run integration tests. Blocks Phase 0 CI and every subsequent phase.

## Gate 6 — Phase 0 reading list missing observability.md (inherited)
**Source:** review / gate 6
**Finding:** BLOCKING
**Location:** gate 6 — inherited from claude/discovery-workflow-test-plan-RkkNi / docs/roadmap.md Phase 0 reading list
**Detail:** The roadmap Phase 0 reading list names only `docs/technical-spec/index.md` and `docs/technical-spec/testing.md`, but Phase 0 deliverables include Sentry initialization (`src/instrumentation.ts`) which is specified in `docs/technical-spec/observability.md`. A `/build 00-foundation` agent will miss the observability spec. Fix: add `docs/technical-spec/observability.md` to the Phase 0 reading list in `docs/roadmap.md`.

## Gate 6 — No Vercel project linked (inherited)
**Source:** review / gate 6
**Finding:** BLOCKING
**Location:** gate 6 — inherited from claude/discovery-workflow-test-plan-RkkNi
**Detail:** No `vercel.json` or `.vercel/` project linkage exists. Creating and linking requires manual user action. Blocks the "Vercel preview deploy green" criterion in Phase 0's Definition of Done.
