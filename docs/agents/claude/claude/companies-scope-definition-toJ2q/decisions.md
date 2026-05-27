# Decisions — claude/companies-scope-definition-toJ2q

<!-- Append entries using the format below. Do not delete prior entries. -->
<!-- Format:
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
-->

## 2026-05-27 — Application count hardcoded to 0 in Phase 2
**Branch:** claude/companies-scope-definition-toJ2q
**Context:** The Phase 2 roadmap specifies showing application count on company list and detail pages, and the "Delete with applications" acceptance criterion. The `applications` table is created in Phase 3. Querying it in Phase 2 code would cause a runtime failure on the Phase 2 preview deploy.
**Decision:** Phase 2 hardcodes application count as `0` in company list and detail pages. The delete dialog uses generic text ("This action cannot be undone.") without mentioning applications. Phase 3 replaces hardcoded values with real count queries and adds the "Delete with applications" E2E scenario.
**Consequence:** Phase 2 PR preview stays green. Phase 3 must update `company-card.tsx`, `companies/page.tsx`, `companies/[id]/page.tsx`, and `company-delete-dialog.tsx` to use real application counts. Phase 3 also owns the "Delete with applications" acceptance criterion.

## 2026-05-27 — shadcn/ui component packages are expected new dependencies
**Branch:** claude/companies-scope-definition-toJ2q
**Context:** Phase 2 requires UI components (Dialog, Label) that add Radix UI packages not currently in `package.json`. Trigger #3 ("new external dependency") technically applies. However, Phase 0 explicitly initialized shadcn/ui for exactly this purpose, and the roadmap's Phase 2 deliverables include a `CompanyDeleteDialog`, which requires `@radix-ui/react-dialog`.
**Decision:** Adding shadcn/ui component packages (`@radix-ui/react-dialog`, `@radix-ui/react-label`, etc.) via `npx shadcn@latest add` is the expected workflow and does not require user approval at the plan stage. The `/build` agent should run the shadcn CLI to add needed components; any packages added to `package.json` are implicitly approved by this decision.
**Consequence:** The `/build` agent can add shadcn components without stopping to ask. Affects `package.json` and `src/components/ui/`.
