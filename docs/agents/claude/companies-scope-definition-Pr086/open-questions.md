# Open Questions — companies-scope-definition-Pr086

## Integration tests require service role key
**Source:** review / gate 5 (updated 2026-05-27)
**Finding:** PENDING
**Location:** tests/integration/companies.test.ts
**Detail:** `SUPABASE_TEST_SERVICE_ROLE_KEY` is not set. The integration tests use `adminClient.auth.admin.createUser()` / `deleteUser()` which require a service_role JWT. The key is not derivable from the MCP or SQL; it must be set manually.

**To unblock:** Supabase Dashboard → Project Settings → API → copy the `service_role` (secret) key → add to `.env.local`:
```
SUPABASE_TEST_SERVICE_ROLE_KEY=<paste here>
SUPABASE_SERVICE_ROLE_KEY=<paste here>
```
Then run `pnpm test:integration`.

## E2E tests and screenshots blocked by Phase 1 auth stub
**Source:** review / gate 1 & gate 5 (updated 2026-05-27)
**Finding:** BLOCKING
**Location:** src/app/(auth)/login/page.tsx — tests/e2e/companies.spec.ts
**Detail:** The login page is a Phase 1 stub with no form inputs. Playwright's `page.fill('input[type="email"]', ...)` call will fail because no such element exists. All 6 E2E scenarios begin with a `login()` call, so none can pass.

Screenshots for the PR checklist also require a logged-in session against a working auth flow.

**To unblock:** Phase 1 (auth screens) must be implemented. Once Phase 1 lands and `/login` has working email+password form inputs, the E2E tests and screenshots can be run against the remote Supabase project (credentials are in `.env.local`).

---

## What IS done (as of 2026-05-27)

- `.env.local` written with remote Supabase URL + anon key (retrieved via MCP)
- `companies` migration applied to remote Supabase project `fjedpuewbisfuklocfmv` (Job Search)
- Unit tests: **34/34 passing** (`pnpm test`)
- TypeScript: **PASS** (`npx tsc --noEmit`)
- ESLint: **PASS** (`npx eslint .`)

---

*Previously resolved findings:*

- TypeScript error in (app) layout sidebar nav — **RESOLVED**
- /companies list page missing state matrix states — **RESOLVED**
- Delete with applications scenario missing test coverage — **RESOLVED**
- Server action functions not unit-tested — **RESOLVED**
