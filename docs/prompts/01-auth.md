# Implementation Prompt — Phase 1: Auth

Implement the feature defined in `docs/product-spec/auth.md`
against the schema in `docs/technical-spec/schema.md#profiles`.
Follow all conventions in `docs/agent-guide.md`.

## Reading List

- `docs/product-spec/auth.md`
- `docs/technical-spec/schema.md#profiles`
- `docs/technical-spec/auth.md`
- `docs/technical-spec/api-surface.md`
- `docs/technical-spec/security.md#rate-limiting`

## Scope

Email/password authentication: signup, login, logout, forgot-password, reset-password.
Middleware auth redirects. Profile row auto-creation trigger. No profile editing UI (Phase 7).

## Vertical Slice

### 1. Migration

File: `supabase/migrations/20260526000000_profiles.sql`

- `profiles` table with columns: `id`, `full_name`, `avatar_url`, `notification_email_enabled`, `created_at`, `updated_at`
- `set_updated_at()` shared trigger function
- `handle_new_user()` SECURITY DEFINER trigger on `auth.users` AFTER INSERT
- RLS: SELECT and UPDATE own profile; INSERT and DELETE denied

### 2. Types

Run: `supabase gen types typescript --local > src/types/database.ts`

Update `src/lib/errors.ts`:
- Change `details?: unknown` → `details?: Record<string, string[] | undefined>`
- Add `ActionResult<T>` type

### 3. Zod Schemas

File: `src/lib/validations/auth.ts`

- `signUpSchema`: email (valid format), password (min 8 + contains digit)
- `signInSchema`: email (required), password (required)
- `forgotPasswordSchema`: email (valid format)
- `resetPasswordSchema`: token_hash (required), password (min 8 + contains digit)

### 4. Rate Limiting

File: `src/lib/rate-limit.ts`

- Uses `@upstash/ratelimit` + `@upstash/redis`
- Dev bypass: returns `true` when env vars absent
- `checkRateLimit(key, ip)`: login=10/15m, signup=5/1h, forgotPassword=3/1h

### 5. Server Actions

File: `src/actions/auth.ts`

- `signUp(prevState, formData)` — useActionState signature
- `signIn(prevState, formData)` — redirects on success
- `signOut()` — redirects to /login
- `sendPasswordResetEmail(prevState, formData)`
- `resetPassword(prevState, formData)` — verifyOtp + updateUser

### 6. Middleware

File: `src/middleware.ts`

- Refresh session on every request
- PUBLIC_ROUTES constant: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- If not public and no user: redirect to `/login?redirect=<path>`

### 7. Auth Layout and Screens

- `src/app/(auth)/layout.tsx` — centered card, no navigation
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`

### 8. App Layout

- `src/app/(app)/layout.tsx` — session guard + sidebar + sign-out button
- `src/app/(app)/dashboard/page.tsx` — placeholder

### 9. Tests

- `tests/unit/auth-validation.test.ts` — signUpSchema, signInSchema Zod unit tests
- `tests/integration/auth.test.ts` — signup creates profiles row; RLS cross-user
- `tests/e2e/auth.spec.ts` — full signup→login→logout and forgot-password→reset flows

## Acceptance Criteria

All from `docs/product-spec/auth.md`:
- Signup — all three scenarios
- Login — all three scenarios
- Forgot Password — both scenarios
- Reset Password — all three scenarios
