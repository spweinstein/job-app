# Decisions — claude/auth-build-01-6IAxG

<!-- Append entries using the format below. Do not delete prior entries. -->
<!-- Format:
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
-->

## 2026-05-26 — Suspense wrapper pattern for useSearchParams pages

**Branch:** auth-build-01-6IAxG
**Context:** Next.js 15 requires `useSearchParams()` to be inside a `<Suspense>` boundary in production builds. Both `/login` and `/reset-password` used `useSearchParams()` at the page component root, causing `pnpm build` to fail.
**Decision:** Extracted the page body into inner components (`LoginPageContent`, `ResetPasswordPageContent`) that call `useSearchParams()`, and exported the outer page component as a thin `<Suspense>` wrapper. Kept all code in the single `page.tsx` file to avoid creating extra files.
**Consequence:** Production build passes. The inner components render `null` during SSR fallback, which is acceptable for auth pages that depend on query params.

## 2026-05-26 — Client-side blur validation using imported Zod schemas

**Branch:** auth-build-01-6IAxG
**Context:** Product spec requires "client-side validation fires on blur" for all auth forms, and "no request is sent to the server" for weak password on signup.
**Decision:** Imported Zod schemas (no `'use server'` directive, so safe for client components) into each auth page. Added `onBlur` handlers that call `schema.shape[field].safeParse(value)` and store results in `localErrors` state. Added `handleSubmit` intercept in signup to call `e.preventDefault()` on weak password, preventing server action invocation. Error display shows `localErrors[field] || errorField(state, field)`.
**Consequence:** Blur validation fires immediately without a round-trip. Weak password on signup never hits the server. Server errors still display when client validation passes but server rejects.

## 2026-05-26 — Admin-guarded E2E tests for confirmed-user flows

**Branch:** auth-build-01-6IAxG
**Context:** Three Gherkin scenarios (successful login, redirect preservation round-trip, valid reset token) require a confirmed user, which can only be created programmatically via the Supabase admin API (service role key).
**Decision:** Added two `test.describe.serial` blocks in `tests/e2e/auth.spec.ts` with `beforeAll`/`afterAll` hooks that create and delete confirmed test users. Tests call `test.skip(!hasAdminAccess, ...)` when `SUPABASE_SERVICE_ROLE_KEY` is absent so they skip gracefully in environments without admin access. The reset-token test uses `admin.auth.admin.generateLink({ type: 'recovery', email })` to get the `hashed_token` needed by the `/reset-password` page.
**Consequence:** Full E2E coverage for happy paths when run with a service role key (CI / local with env set). Graceful skip otherwise. No test pollution between runs — users are created and deleted per test block.

## 2026-05-26 — Rate limiting with dev-mode bypass

**Branch:** auth-build-01-6IAxG
**Context:** The security spec requires Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) for rate limiting on login, signup, and forgot-password. Neither package was in `package.json`.
**Decision:** Added both packages and implemented rate limiting with a dev-mode bypass: when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are absent (dev without Redis configured), `checkRateLimit` returns `true` unconditionally. In production both env vars must be set.
**Consequence:** Rate limiting is effective in production and on Vercel preview deploys where env vars are set. Local dev without Redis skips rate limiting without errors. `src/lib/rate-limit.ts` encapsulates the bypass logic.
