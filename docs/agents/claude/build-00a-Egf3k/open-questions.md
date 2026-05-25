# Open Questions — claude/build-00a-Egf3k

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

<!-- All items below are RESOLVED. See decisions.md for resolution details. -->

## Gate 1 FAIL — Unit test coverage below 80% threshold
**Source:** review / gate 1
**Finding:** FAIL
**Location:** `vitest.config.ts` coverage thresholds
**Detail:** `vitest run --coverage` reports 24.06% line coverage vs the 80% threshold. `src/lib/logger.ts` and `src/lib/utils.ts` have 0% coverage and can be unit-tested. `src/lib/supabase/{client,server,middleware}.ts` have 0% coverage but require a real Next.js request environment — they should be excluded from the coverage include. Fix: (1) update `vitest.config.ts` include to `['src/actions/**', 'src/lib/*.ts']`; (2) add `tests/unit/logger.test.ts`; (3) add `tests/unit/utils.test.ts`.

## Gate 3 E3 — Phase 1+ auth scaffolding in Phase 0 PR
**Source:** review / gate 3
**Finding:** DIVERGENCE
**Location:** `src/app/(auth)/`, `src/app/(app)/`
**Detail:** `src/app/(auth)/login/page.tsx` and the `(app)/` route group exist in this Phase 0 PR. Phase 0 is infrastructure-only; auth UI is Phase 1 scope. These directories should be removed from this PR and reintroduced in the Phase 1 build. Note: `src/app/page.tsx` currently calls `redirect('/login')` — if the auth directory is removed, the redirect target will 404. Either replace the redirect with a plain HTML placeholder, or keep the minimal login page stub.
