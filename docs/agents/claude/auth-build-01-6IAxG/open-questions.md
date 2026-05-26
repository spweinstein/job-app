# Open Questions — claude/auth-build-01-6IAxG

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## useSearchParams Suspense boundary missing on /login and /reset-password
**Source:** review / gate 3
**Finding:** FAIL
**Location:** `src/app/(auth)/login/page.tsx` and `src/app/(auth)/reset-password/page.tsx`
**Detail:** Both pages call `useSearchParams()` at the top level of a Client Component without a `<Suspense>` boundary. Next.js 15 requires `useSearchParams()` to be wrapped in `<Suspense>` in production builds. The current `pnpm build` fails with "useSearchParams() should be wrapped in a suspense boundary." Fix: extract the `useSearchParams()` logic into a child component wrapped in `<Suspense fallback={null}>`.

## No client-side blur validation
**Source:** review / gate 3
**Finding:** FAIL
**Location:** `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`
**Detail:** The product spec (`docs/product-spec/auth.md` Validation Rules) states "Client-side validation fires on blur." None of the four auth forms implement `onBlur` handlers — all validation is server-side only.

## Weak password check sends server request
**Source:** review / gate 3
**Finding:** FAIL
**Location:** `src/actions/auth.ts` — `signUp` action; `src/app/(auth)/signup/page.tsx`
**Detail:** The product spec Weak Password scenario states "And no request is sent to the server." Currently the Zod check runs inside the server action, so the browser does send a request. Password strength must be validated client-side (on submit and on blur) and the form submission suppressed if the check fails, with no server round-trip.

## Missing E2E: successful login → redirect to /dashboard
**Source:** review / gate 4
**Finding:** MISSING
**Location:** `tests/e2e/auth.spec.ts`
**Detail:** The Login / Successful login Gherkin scenario requires a confirmed user logs in → redirect to /dashboard + valid session cookie. No such test exists. Requires a pre-seeded confirmed test user (fixture or direct DB insert with `email_confirmed_at` set).

## Missing E2E: redirect preservation full round-trip
**Source:** review / gate 4
**Finding:** MISSING
**Location:** `tests/e2e/auth.spec.ts`
**Detail:** The Login / Redirect preservation scenario covers two steps: (1) unauthenticated visit → /login?redirect=... and (2) successful login → redirected to original destination. Step 1 is covered; step 2 is not. A full round-trip test that logs in and verifies the final URL is the original protected path is required.

## Missing E2E: valid reset token → success redirect
**Source:** review / gate 4
**Finding:** MISSING
**Location:** `tests/e2e/auth.spec.ts`
**Detail:** The Reset Password / Valid token, passwords match Gherkin scenario requires testing the full happy path: navigate to /reset-password with a real valid token, submit matching passwords, verify redirect to /login and success banner "Password reset. Please log in." No such test exists. Requires generating a real OTP token via the Supabase admin API in a test fixture.

## Preview deploy blocked (build fails)
**Source:** review / gate 5
**Finding:** PENDING
**Location:** PR checklist — "Preview deploy green"
**Detail:** The production build (`pnpm build`) currently fails due to the `useSearchParams()` Suspense boundary issue (see above). Preview deploy cannot be green until that fix lands.

## Screenshots not included
**Source:** review / gate 5
**Finding:** PENDING
**Location:** PR checklist — "Screenshots included for all UI changes (desktop + mobile viewport)"
**Detail:** PR checklist requires 1280×800 (desktop) and 390×844 (mobile) screenshots attached to the PR. Not yet captured or attached.

## Playwright E2E tests cannot run in this environment
**Source:** review / gate 1
**Finding:** FAIL
**Location:** `playwright test` command
**Detail:** The remote execution environment's network policy blocks downloads from `cdn.playwright.dev` (403). Playwright browser binaries are not installed. E2E tests cannot run until either (a) browsers are pre-installed in the environment, or (b) tests run via a CI environment that has Playwright installed (e.g., Vercel preview + Playwright GitHub Action).
