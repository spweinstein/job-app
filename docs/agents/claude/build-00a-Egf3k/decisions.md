# Decisions — claude/build-00a-Egf3k

<!-- Append entries using the format below. Do not delete prior entries. -->
<!-- Format:
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
-->

## 2026-05-25 — Prettier ignores pre-existing docs

**Branch:** build-00a-Egf3k
**Context:** The docs were written before Prettier was initialized. Running `prettier --check .` on the entire repo would fail on all pre-existing markdown files.
**Decision:** Added `.prettierignore` covering `docs/`, `CLAUDE.md`, `README.md`, and `.claude/`. Code files under `src/` and config files are still formatted.
**Consequence:** Prettier only enforces formatting on code files, not documentation markdown. Future doc files added in `src/` or outside the ignored paths will be checked.

## 2026-05-25 — Vitest workspace file for multi-project config

**Branch:** build-00a-Egf3k
**Context:** Vitest 2.x does not support `projects` inside `defineConfig`; that option was added in Vitest 3.x. The spec requires separate unit and integration test projects.
**Decision:** Used `vitest.workspace.ts` with `defineWorkspace` for the multi-project configuration, keeping `vitest.config.ts` for coverage settings.
**Consequence:** CI and package.json scripts reference `--project=unit` or `--project=integration` to target specific workspaces.

## 2026-05-25 — Combined 00a+00b+00c in single PR

**Branch:** build-00a-Egf3k
**Context:** `docs/prompts/00a-scaffold.md` explicitly scopes 00a to project init, tooling, and Next.js skeleton, deferring Supabase clients/error infrastructure/Sentry (00b) and CI/tests (00c) to separate builds. The build session implemented all three together.
**Decision:** Implemented all Phase 0 sub-phases in a single PR. CI is green; all deliverables are complete and working.
**Consequence:** `docs/prompts/00b-infrastructure.md` and `docs/prompts/00c-ci.md` describe what was built retrospectively; they do not represent future build work.

## 2026-05-25 — pnpm@10.33.0 instead of spec pnpm@9

**Branch:** build-00a-Egf3k
**Context:** `docs/prompts/00a-scaffold.md` specified `packageManager: "pnpm@9"`. pnpm@9 caused corepack version-mismatch failures in CI when combined with `pnpm/action-setup@v4`.
**Decision:** Used pnpm@10.33.0 throughout (`packageManager` field, `engines`, and CI workflow pinning).
**Consequence:** `docs/prompts/00a-scaffold.md` as-built note updated to reflect this.

## 2026-05-25 — Geist/Geist_Mono fonts instead of Inter

**Branch:** build-00a-Egf3k
**Context:** `docs/prompts/00a-scaffold.md` specified Inter font in `src/app/layout.tsx`. create-next-app 15 scaffolds Geist/Geist_Mono by default.
**Decision:** Kept the create-next-app default (Geist). Inter has no functional difference at the Phase 0 stage.
**Consequence:** Font choice can be updated in Phase 1 when the design system is finalized.

## 2026-05-25 — page.tsx redirects to /login instead of plain HTML

**Branch:** build-00a-Egf3k
**Context:** `docs/prompts/00a-scaffold.md` specified a plain HTML placeholder for `src/app/page.tsx` so the smoke test could assert a non-500 response. The branch uses `redirect('/login')` instead.
**Decision:** The redirect is correct application behavior (Phase 0 already includes the login route stub). A redirect response satisfies "status !== 500" for the smoke test.
**Consequence:** The login route (`src/app/(auth)/login/`) must exist for the redirect not to 404. Noted in open-questions for the /build 00a pass.

## 2026-05-25 — page.tsx reverted to plain HTML; auth directory removed

**Branch:** build-00a-Egf3k
**Context:** During /review 00a, E3 finding required removing `src/app/(auth)/login/page.tsx` (Phase 1+ scope). The existing `page.tsx` redirected to `/login`, which would 404 without the route. D3 had been approved as "update spec to match code" (keep the redirect), but removing the login route made the redirect invalid.
**Decision:** Reverted `page.tsx` to a plain HTML placeholder (`<h1>Job Application Tracker</h1>`) and removed `src/app/(auth)/`. The login route and full redirect behavior will be introduced together in Phase 1.
**Consequence:** `docs/prompts/00a-scaffold.md` as-built note already documents the redirect; this decision supersedes that specific note. The smoke test still passes (HTTP 200 instead of 302, both satisfy "status !== 500").

## 2026-05-25 — error.tsx empty useEffect (errors handled via instrumentation.ts)

**Branch:** build-00a-Egf3k
**Context:** `docs/prompts/00a-scaffold.md` specified `console.error(error)` in the error boundary's `useEffect`, noting it was explicitly permitted. The branch has an empty `useEffect` with a comment instead.
**Decision:** Since `src/instrumentation.ts` wires Sentry's error capture at the framework level, the `useEffect` in the error boundary does not need to manually report errors. Empty is correct.
**Consequence:** `console.error` is not used; no lint exception needed.
