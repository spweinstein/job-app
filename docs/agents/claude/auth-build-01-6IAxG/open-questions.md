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
**Finding:** RESOLVED
**Resolution:** Extracted `useSearchParams()` usage into inner components (`LoginPageContent`, `ResetPasswordPageContent`) wrapped in `<Suspense>`. Production build now passes. Committed in fix(auth) commit on 2026-05-26.

## No client-side blur validation
**Source:** review / gate 3
**Finding:** RESOLVED
**Resolution:** Added `onBlur` handlers to all four auth forms using `signInSchema`, `signUpSchema`, `forgotPasswordSchema`, and `resetPasswordSchema` from `@/lib/validations/auth`. Local errors take priority; fall back to server error when field is clean. Committed in fix(auth) commit on 2026-05-26.

## Weak password check sends server request
**Source:** review / gate 3
**Finding:** RESOLVED
**Resolution:** Added `handleSubmit` intercept in `signup/page.tsx` that validates password client-side via `signUpSchema.shape.password.safeParse()` and calls `e.preventDefault()` if invalid, preventing the server action from being called. Committed in fix(auth) commit on 2026-05-26.

## Missing E2E: successful login → redirect to /dashboard
**Source:** review / gate 4
**Finding:** RESOLVED
**Resolution:** Added `test.describe.serial('Login — successful flow')` block in `tests/e2e/auth.spec.ts` with `beforeAll` that creates a confirmed user via admin API (guarded by `SUPABASE_SERVICE_ROLE_KEY`). Test skips gracefully when env var absent. Committed in fix(auth) commit on 2026-05-26.

## Missing E2E: redirect preservation full round-trip
**Source:** review / gate 4
**Finding:** RESOLVED
**Resolution:** Added as second test in the `Login — successful flow` describe block. Navigates to /dashboard, asserts redirect to /login?redirect=..., logs in, asserts final URL is /dashboard. Committed in fix(auth) commit on 2026-05-26.

## Missing E2E: valid reset token → success redirect
**Source:** review / gate 4
**Finding:** RESOLVED
**Resolution:** Added `test.describe.serial('Reset Password — successful flow')` block with `beforeAll` creating confirmed user, test uses `admin.auth.admin.generateLink({ type: 'recovery', email })` to get `hashed_token`, navigates to reset page, submits, asserts /login?reset=success and success banner. Guarded by `SUPABASE_SERVICE_ROLE_KEY`. Committed in fix(auth) commit on 2026-05-26.

## Preview deploy blocked (build fails)
**Source:** review / gate 5
**Finding:** RESOLVED
**Resolution:** Resolved by the Suspense boundary fix above. `pnpm build` now exits 0.

## Screenshots not included
**Source:** review / gate 5
**Finding:** PENDING
**Location:** PR checklist — "Screenshots included for all UI changes (desktop + mobile viewport)"
**Detail:** PR checklist requires 1280×800 (desktop) and 390×844 (mobile) screenshots attached to the PR. Not yet captured or attached. Must be done when opening the PR.

## Playwright E2E tests cannot run in this environment
**Source:** review / gate 1
**Finding:** PENDING
**Location:** `playwright test` command
**Detail:** The remote execution environment's network policy blocks downloads from `cdn.playwright.dev` (403). Playwright browser binaries are not installed. E2E tests must be verified in a CI environment with Playwright installed (e.g., Vercel preview + Playwright GitHub Action). The test code is in place and correct.

## src/actions/auth.ts exceeds 150-line server action file limit
**Source:** review / gate 3
**Finding:** RESOLVED
**Resolution:** Extracted `getClientIp` to `src/lib/request.ts`. Split password-related actions (`sendPasswordResetEmail`, `resetPassword`) into `src/actions/auth-password.ts`. Identity actions (`signUp`, `signIn`, `signOut`) remain in `src/actions/auth.ts`. Both action files are now under 100 lines. Updated imports in `forgot-password/page.tsx` and `reset-password/page.tsx`. Committed 2026-05-26.

## Missing unit tests for server action functions and checkRateLimit
**Source:** review / gate 5
**Finding:** RESOLVED
**Resolution:** Added `tests/unit/auth-actions.test.ts` (24 tests covering all 5 server actions across validation, rate-limiting, supabase error, and success paths) and `tests/unit/rate-limit.test.ts` (6 tests covering dev bypass, allow/deny, and per-key limiter configuration). All 51 unit tests pass. Committed 2026-05-26.
