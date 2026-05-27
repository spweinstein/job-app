# Open Questions — claude/discovery-03-NdM2O

_Add an entry whenever a blocker or ambiguity is identified. Remove only after creating a corresponding decisions.md entry._

<!-- Format:
## <short title>
**Source:** <discovery | plan | build | review>
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## Phase 1 and Phase 2 not yet implemented

**Source:** discovery
**Question:** The roadmap requires Phase 1 (Auth) and Phase 2 (Companies) to be complete before Phase 3 (Applications) can be built. As of the current HEAD, neither phase has been implemented. There are no auth screens (only a placeholder `/login` page), no server actions, no validations directory, no migrations directory, no `(app)` route group, and no companies feature.
**Blocks:** All Phase 3 implementation. Phase 3's `createApplication` form requires an existing companies list, the `(app)` layout wrapping the applications pages, and the authenticated session guard. Phase 3's migration must run after Phase 2's `companies` table migration.

## FK constraints on resume_id and cover_letter_id cannot be added in Phase 3

**Source:** discovery
**Question:** The `applications` schema specifies `resume_id → resumes(id) ON DELETE SET NULL` and `cover_letter_id → cover_letters(id) ON DELETE SET NULL`. But `resumes` and `cover_letters` tables are not created until Phase 4. Phase 3's migration cannot create FK constraints referencing non-existent tables. Two options: (A) add `resume_id` and `cover_letter_id` columns without FK constraints in Phase 3's migration, and add the FK constraints via ALTER TABLE in Phase 4's migration; (B) omit the columns entirely in Phase 3 and add them in Phase 4. Option A matches the spec column list and avoids touching `applications` in Phase 4's migration.
**Blocks:** Writing the Phase 3 migration correctly. Must be resolved before `/plan 03`.

## Delete scenario requires calendar_items table (Phase 5 prerequisite)

**Source:** discovery
**Question:** The Phase 3 acceptance criteria include: "Delete application with linked calendar items" and "Confirmation message reflects correct counts and kinds." These Gherkin scenarios require querying `calendar_items`, which is a Phase 5 deliverable. The delete server action and confirmation dialog must be coded to query `calendar_items`, but this table does not exist until Phase 5. Options: (A) write the query code in Phase 3, but the table is guaranteed empty until Phase 5 is merged — integration and E2E tests for this specific scenario would need a Phase 5 seed or be deferred; (B) defer these two acceptance criteria to Phase 5's test suite. The roadmap lists "Delete — all three scenarios" under Phase 3's "Acceptance Criteria (must pass)."
**Blocks:** Test coverage strategy for Phase 3 delete. Must be resolved during planning.

## AppError.details type mismatch between code and spec

**Source:** discovery
**Question:** `src/lib/errors.ts` types `details` as `unknown`, but `docs/technical-spec/api-surface.md` specifies `details?: Record<string, string[]>`. Phase 3 validation errors must surface field-level messages (e.g., "Company is required.", "Role title is required."), so this field needs to be the correct type. Tightening the type to `Record<string, string[]>` is a Phase 0 artifact fix. If this is not corrected, the validation error display components in Phase 3 (and earlier phases) will need unsafe casts.
**Blocks:** Clean TypeScript implementation of validation error display. Should be fixed in Phase 1 or at the start of Phase 3 at the latest.
