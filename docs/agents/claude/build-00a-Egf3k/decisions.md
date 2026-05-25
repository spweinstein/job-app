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
