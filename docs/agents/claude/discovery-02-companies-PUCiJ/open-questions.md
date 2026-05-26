# Open Questions — claude/discovery-02-companies-PUCiJ

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## Phase 1 prerequisite not complete
**Source:** discovery
**Question:** Phase 2's roadmap prerequisite is "Phase 1 complete." Phase 1 is not complete: no auth screens beyond a placeholder `/login` (no `/signup`, `/forgot-password`, `/reset-password`), no `src/actions/auth.ts`, no `src/lib/validations/auth.ts`, no `(app)` route group/layout with sidebar + session guard, no auth redirects in middleware, and no `supabase/migrations/` directory (no DB tables exist at all, including `profiles`).
**Blocks:** Everything in Phase 2. A `/companies` page cannot be rendered without an authenticated session, app layout, or any DB tables. Planning and building Phase 2 requires Phase 1 to ship first.

## Delete company with applications — ordering ambiguity
**Source:** discovery
**Question:** Phase 2's acceptance criteria include "Delete with applications: Given a company with 2 applications, When I click 'Delete company', Then I see 'Deleting this company will also delete its 2 application(s)...'" The global decision log confirms that `deleteCompany` must count linked applications and return the count in its response. However, the `applications` table is not created until Phase 3. In Phase 2 there are no applications to count (and querying a non-existent table would error). Three options: (A) implement `deleteCompany` without the application count check; Phase 3 retrofits it — but then the Phase 2 "delete with applications" E2E test cannot pass until Phase 3 merges; (B) Phase 2 creates a stub/minimal `applications` table just for the FK — spec deviation; (C) "Delete with applications" E2E test is explicitly deferred to Phase 3 and Phase 2 only tests the "no applications" delete path.
**Blocks:** Finalizing `deleteCompany` implementation and the Phase 2 E2E test plan. Must be resolved before `/plan 02-companies`.

## AppError.details type narrowing
**Source:** discovery
**Question:** `src/lib/errors.ts` declares `details?: unknown` on `AppError`. `docs/technical-spec/api-surface.md` specifies `details?: Record<string, string[]>`. The narrower type is more correct and enables field-level error display in UI. Should this be fixed before Phase 2 build begins (during Phase 1 or as part of Phase 2 setup)?
**Blocks:** Type-safe field-level validation error display in company forms. Low priority but should be resolved before Phase 2 build.
