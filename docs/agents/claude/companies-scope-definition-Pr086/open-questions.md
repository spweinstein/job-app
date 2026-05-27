# Open Questions — companies-scope-definition-Pr086

## Screenshots not included
**Source:** review / gate 5
**Finding:** PENDING
**Location:** PR description (not yet created)
**Detail:** The PR checklist requires desktop (1280×800) and mobile (390×844) screenshots for all UI changes. No screenshots are included. Requires a running dev server with Supabase env vars configured. Capture and attach before opening the PR.

---

*Previously resolved findings (fixed in build pass 2026-05-27):*

- TypeScript error in (app) layout sidebar nav — **RESOLVED** (cast to `Route` from `'next'`)
- /companies list page missing state matrix states — **RESOLVED** (added `loading.tsx`, full-failure handler, offline detection in CompanyList)
- Delete with applications scenario missing test coverage — **RESOLVED** (extracted `deleteWarningText`, added `tests/unit/components/company-delete-dialog.test.ts`)
- Server action functions not unit-tested — **RESOLVED** (added `tests/unit/actions/companies.test.ts`, 13 tests covering all paths)
