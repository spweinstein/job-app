# Decisions — companies-scope-definition-Pr086

## 2026-05-27 — Create (app) layout in Phase 2 (Phase 1 auth stub only)
**Branch:** companies-scope-definition-Pr086
**Context:** Phase 1 deliverables include `src/app/(app)/layout.tsx` with sidebar navigation and session guard. The Phase 1 implementation on main is a stub (login page placeholder only). Phase 2 companies pages require this layout to exist.
**Decision:** Create `src/app/(app)/layout.tsx` with session guard and sidebar navigation as part of Phase 2, since it is required for all `(app)` route group pages.
**Consequence:** Phase 1 branch (when implemented) must not re-create this file; instead it should extend it with full auth screens and middleware redirects.

## 2026-05-27 — Application count shows 0 in Phase 2 (applications table not yet created)
**Branch:** companies-scope-definition-Pr086
**Context:** Product spec requires application count per company on the list and detail pages. The `applications` table is created in Phase 3.
**Decision:** Show `applicationCount: 0` on all company list and detail pages in Phase 2. The count query (`SELECT count(*) FROM applications WHERE company_id = :id`) is added as a comment placeholder; Phase 3 will wire it up.
**Consequence:** The "Delete with applications" acceptance criterion test will show 0 applications in Phase 2. The full E2E scenario is deferred to Phase 3 testing.

## 2026-05-27 — @supabase/ssr vs @supabase/supabase-js type mismatch workaround
**Branch:** companies-scope-definition-Pr086
**Context:** `@supabase/ssr@0.5.2` was written for `SupabaseClient<Database, SchemaName, Schema>` (3 params), but `@supabase/supabase-js@2.106.2` has a 5-param `SupabaseClient` where the third positional arg maps to `SchemaName` (a string), not `Schema` (an object). Calling `createServerClient<Database>()` returns `SupabaseClient<Database, 'public', Database['public']>` which maps `Database['public']` to the `SchemaName` position, causing TypeScript to infer `Schema = never` and all `from()` calls to return untyped queries.
**Decision:** Cast the return value in `src/lib/supabase/server.ts` to `SupabaseClient<Database>` (single type arg form) using `as unknown as`. The single-arg form uses correct defaults: `SchemaName = 'public'`, `Schema = Database['public']`. This is safe — the runtime object is the correct Supabase client. Note this in a comment for the next developer.
**Consequence:** All `from('companies')` calls in server actions and pages are properly typed. If `@supabase/ssr` is upgraded to a version compatible with `@supabase/supabase-js@2.106+`, the cast can be removed.

## 2026-05-27 — ActionResult type added to src/lib/errors.ts
**Branch:** companies-scope-definition-Pr086
**Context:** The API surface spec defines `ActionResult<T>` as `{ data: T } | { error: AppError }`. No central definition existed yet.
**Decision:** Export `ActionResult<T>` from `src/lib/errors.ts` since it is logically part of the error contract.
**Consequence:** All server action files import `ActionResult` from `@/lib/errors`.

## 2026-05-27 — Typed-routes cast for future sidebar nav hrefs
**Branch:** companies-scope-definition-Pr086
**Context:** Next.js `experimental.typedRoutes: true` requires `Link href` to be a known `RouteImpl<T>` type. The sidebar in `(app)/layout.tsx` links to routes (`/applications`, `/calendar`, `/automations`, `/profile`) that don't exist yet and are therefore absent from the generated `.next/types/link.d.ts` `StaticRoutes` union.
**Decision:** Cast the nav items array as `{ href: Route; label: string }[]` using `import type { Route } from 'next'`. This preserves type checking for routes that do exist while allowing placeholder links for future routes without disabling typed routes globally.
**Consequence:** When Phase 3+ routes are added, the cast remains valid (it's a widening, not an unsound narrowing). If `typedRoutes` is ever enforced strictly per-route, the cast should be replaced with individual link components.

## 2026-05-27 — /companies list state matrix: partial failure treated as full failure
**Branch:** companies-scope-definition-Pr086
**Context:** The product spec state matrix for `/companies` lists Loading, Empty, Populated, Partial failure, Full failure, and Offline states. The page fetches all companies with a single Supabase query inside a Server Component.
**Decision:** Loading state is covered by `loading.tsx` (Next.js Suspense). Full failure (Supabase error returns `{ error }`) renders an inline error banner with a retry link. Partial failure (spec: "show loaded items + inline error banner") is architecturally unreachable with a single server-side query — there are no "partially loaded items" in this model. Offline state is covered by a client-side `window.navigator.onLine` listener in `CompanyList`.
**Consequence:** The partial failure UI state is never rendered; the spec scenario cannot occur without splitting the query into multiple calls. If companies are later fetched from multiple sources (e.g., local cache + live count), partial failure handling should be revisited.

## 2026-05-27 — deleteWarningText extracted from CompanyDeleteDialog for testability
**Branch:** companies-scope-definition-Pr086
**Context:** The review found the "Delete with applications" Gherkin scenario had no test coverage. The warning text was inline JSX conditional logic in `CompanyDeleteDialog`.
**Decision:** Extract the conditional warning text to an exported pure function `deleteWarningText(applicationCount: number): string` in `company-delete-dialog.tsx`, tested in `tests/unit/components/company-delete-dialog.test.ts`.
**Consequence:** The function is exported; callers must not change its signature without updating the tests.

## 2026-05-27 — Docker unavailable; supabase gen types run manually
**Branch:** companies-scope-definition-Pr086
**Context:** `supabase gen types typescript --local` requires Docker. Docker is not available in this environment.
**Decision:** Manually write `src/types/database.ts` to match the companies table schema. The generated shape is kept identical to what the Supabase CLI would produce so a future `supabase gen types` run will be a no-op.
**Consequence:** If the migration changes after this branch, `database.ts` must be manually re-synced until Docker is available.
