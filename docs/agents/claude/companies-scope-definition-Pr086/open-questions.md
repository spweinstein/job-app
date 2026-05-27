# Open Questions — companies-scope-definition-Pr086

## TypeScript error in (app) layout sidebar nav
**Source:** review / gate 1
**Finding:** FAIL
**Location:** src/app/(app)/layout.tsx:30:17
**Detail:** `Type 'string' is not assignable to type 'UrlObject | RouteImpl<string>'`. The sidebar nav array widens `href` to `string`; routes `/applications`, `/calendar`, `/automations`, and `/profile` are not in the generated `StaticRoutes` union in `.next/types/link.d.ts` because those route directories don't exist yet. Fix: import `type { Route } from 'next'` and cast each href to `Route`, or write each `Link` out individually, or create stub route directories for the future routes.

## /companies list page missing state matrix states
**Source:** review / gate 3
**Finding:** FAIL
**Location:** src/app/(app)/companies/page.tsx — docs/product-spec/companies.md state matrix
**Detail:** The `/companies` list state matrix requires Loading (skeleton rows), Partial failure (inline error banner), Full failure (inline error + retry button), and Offline (offline banner) states. Only Empty and Populated states are implemented. Add a `src/app/(app)/companies/loading.tsx` with skeleton cards for the Loading state, and handle Supabase query errors in the list page to show failure/partial-failure states.

## Delete with applications scenario missing test coverage
**Source:** review / gate 4
**Finding:** MISSING
**Location:** tests/e2e/companies.spec.ts — docs/product-spec/companies.md "Delete with applications" scenario
**Detail:** The Gherkin scenario "Delete with applications" (company with 2 applications shows warning "Deleting this company will also delete its 2 application(s). This cannot be undone.") has no test coverage. The `CompanyDeleteDialog` component renders the correct warning when `applicationCount > 0`, but no test exercises this path. The prompt file defers full E2E coverage to Phase 3 (applications table not yet created), but a unit/integration test for the dialog warning text can be added now without Phase 3 data.

## Server action functions not unit-tested (only schemas are)
**Source:** review / gate 5
**Finding:** PENDING
**Location:** tests/unit/ — src/actions/companies.ts
**Detail:** The PR checklist requires "Unit test (mocked DB) + integration test (local Supabase)" for new server actions. Integration tests exist, but unit tests with mocked DB for `createCompany`, `updateCompany`, and `deleteCompany` are missing. The server action logic — auth check, error code mapping (PGRST116 → FORBIDDEN), revalidatePath calls, and ActionResult shape — is not unit-tested. Add tests/unit/actions/companies.test.ts that mock the Supabase client and verify auth failure, validation failure, DB error, and success paths.

## Screenshots not included
**Source:** review / gate 5
**Finding:** PENDING
**Location:** PR description (not yet created)
**Detail:** The PR checklist requires desktop (1280×800) and mobile (390×844) screenshots for all UI changes. No screenshots are included. Requires a running dev server with Supabase env vars configured. Capture and attach before opening the PR.
