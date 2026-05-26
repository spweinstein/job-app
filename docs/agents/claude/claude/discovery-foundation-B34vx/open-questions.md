# Open Questions — claude/discovery-foundation-B34vx

_Add an entry whenever you stop because of a "When to Stop and Ask" or Decision Gate trigger._

## No package.json — project is entirely uninitialized
**Source:** discovery
**Question:** The repository contains only documentation. There is no `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, or any toolchain configuration. No `src/`, `supabase/`, `tests/`, or `.github/` directories exist. Every single Phase 0 deliverable must be created from scratch.
**Blocks:** All Phase 0 deliverables: Next.js app scaffold, TypeScript config, ESLint/Prettier, Tailwind CSS, shadcn/ui, Supabase client files, middleware, error infrastructure, Sentry, Renovate, CI pipeline, E2E smoke test.

## No Supabase remote project provisioned
**Source:** discovery
**Question:** There is no evidence of a linked remote Supabase project (no project ID, no `SUPABASE_DB_URL`, no `supabase/config.toml`). CI requires `SUPABASE_DB_URL` to push migrations to preview and production environments, and the Phase 0 DoD requires a green Vercel preview deploy which itself requires a connected Supabase project for the app to boot.
**Blocks:** The "Vercel preview deploy green" and migration push steps in Phase 0's Definition of Done; also blocks Phase 1 onwards from being testable in CI.

## No Vercel project linked
**Source:** discovery
**Question:** There is no `vercel.json` or `.vercel/` project linkage in the repository. Linking a Vercel project requires manual action (Vercel dashboard or CLI with user credentials and project selection). The Phase 0 DoD explicitly requires the Vercel preview deploy to be green.
**Blocks:** The "Vercel preview deploy green" criterion in Phase 0's Definition of Done.

## Phase 0 reading list missing observability.md and security.md
**Source:** discovery
**Question:** The roadmap's Phase 0 reading list (`docs/roadmap.md#phase-0-foundation`) names only `docs/technical-spec/index.md` and `docs/technical-spec/testing.md`. But Phase 0 deliverables include: (a) Sentry initialization, whose implementation details live in `docs/technical-spec/observability.md`; and (b) a Content Security Policy header in `next.config.ts`, specified in `docs/technical-spec/security.md`. Neither file is in the reading list, so the `/plan` agent will not be directed to read them.
**Blocks:** A spec-compliant Sentry setup and CSP configuration in Phase 0; the `/plan 00-foundation` agent will produce an incomplete plan without these specs.

## CSP nonce approach: next.config.ts headers() vs. middleware response
**Source:** discovery
**Question:** `docs/technical-spec/security.md` specifies the CSP is "Set via `next.config.ts` `headers()`" but also states "Nonce is generated per-request in middleware and injected into `<script>` tags." `next.config.ts` headers are static and cannot embed a per-request nonce; only middleware can set a dynamically-generated nonce in a response header. These two statements are contradictory — the CSP header with a nonce must be set in middleware (as a `Content-Security-Policy` response header on the Next.js response object), not in `next.config.ts`. The `/plan` agent needs to resolve this before writing the implementation.
**Blocks:** Correct Phase 0 CSP + nonce implementation.

## docs/discovery.md absent from documentation maps
**Source:** discovery
**Question:** `docs/discovery.md` (the project-owner orientation guide) exists but is not referenced in `CLAUDE.md`'s Documentation Map, `docs/agent-guide.md`'s Documentation Map, or `docs/roadmap.md`.
**Blocks:** Complete documentation inventory; low implementation impact but creates a blind spot in the doc map for future agents.
