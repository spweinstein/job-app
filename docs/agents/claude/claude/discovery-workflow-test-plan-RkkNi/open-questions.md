# Open Questions — claude/discovery-workflow-test-plan-RkkNi

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## No package.json — project uninitialized
**Source:** discovery
**Question:** The Node.js/pnpm project has never been initialized. No `package.json`, `pnpm-lock.yaml`, or any toolchain configuration files exist.
**Blocks:** Every Phase 0 deliverable: Next.js app, TypeScript config, ESLint, Prettier, Tailwind, Vitest, Playwright, and all CI gates.

## No Supabase remote project provisioned
**Source:** discovery
**Question:** There is no evidence of a linked remote Supabase project (no project ID, no `SUPABASE_DB_URL` configured). CI requires this to push migrations to preview and production environments.
**Blocks:** The "Vercel preview deploy green" and migration push steps in Phase 0's Definition of Done; also blocks Phase 1 onwards from being testable in CI.

## Phase 0 reading list missing observability.md
**Source:** discovery
**Question:** The roadmap's Phase 0 reading list names only `docs/technical-spec/index.md` and `docs/technical-spec/testing.md`, but Phase 0 deliverables include Sentry initialization (`src/instrumentation.ts`, `SENTRY_DSN` in `.env.example`). The correct Sentry configuration is specified in `docs/technical-spec/observability.md`, which is not in the reading list.
**Blocks:** A spec-compliant Sentry setup in Phase 0; the `/plan 00-foundation` agent will not be directed to read the observability spec.

## No Vercel project linked
**Source:** discovery
**Question:** There is no `vercel.json` or `.vercel/` project linkage in the repository. Creating and linking a Vercel project requires manual action (Vercel dashboard or CLI with user credentials).
**Blocks:** The "Vercel preview deploy green" criterion in Phase 0's Definition of Done.

## docs/discovery.md absent from documentation maps
**Source:** discovery
**Question:** `docs/discovery.md` (the project-owner orientation guide) exists but is not referenced in `CLAUDE.md`'s Documentation Map, `docs/agent-guide.md`'s Documentation Map, or `docs/roadmap.md`.
**Blocks:** Complete documentation inventory; low implementation impact but creates a blind spot in the doc map for future agents.
