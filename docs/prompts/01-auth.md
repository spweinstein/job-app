# Implementation Prompt — Phase 1: Auth

Implement the feature defined in `docs/product-spec/auth.md`
against the schema in `docs/technical-spec/schema.md#profiles`.
Follow all conventions in `docs/agent-guide.md`.
Auth and session handling per `docs/technical-spec/auth.md`.
Server action patterns per `docs/technical-spec/api-surface.md`.
Rate limiting per `docs/technical-spec/security.md#rate-limiting` — implemented as in-memory sliding window in middleware (see `docs/agents/claude/discovery-01-auth-RLTCt/decisions.md`).

---

## Scope

Email/password authentication: signup, login, logout, forgot-password, reset-password. Middleware auth redirects and in-memory rate limiting. CSP nonce. Profile row auto-creation trigger. No profile editing UI.

## Vertical Slice Order

Work strictly in this order. Do not skip ahead.

### 1. Migration

**Create `supabase/migrations/20260526000000_profiles.sql`**

In order:

1. `set_updated_at()` trigger function — `RETURNS trigger`, sets `NEW.updated_at = now()`, used BEFORE UPDATE on any table with `updated_at`.
2. `profiles` table:
   - `id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
   - `full_name text NOT NULL DEFAULT ''`
   - `avatar_url text NULL`
   - `notification_email_enabled boolean NOT NULL DEFAULT true`
   - `created_at timestamptz NOT NULL DEFAULT now()`
   - `updated_at timestamptz NOT NULL DEFAULT now()`
3. Apply `set_updated_at` BEFORE UPDATE trigger to `profiles`.
4. `handle_new_user()` SECURITY DEFINER function — language plpgsql, AFTER INSERT on `auth.users`: inserts into `public.profiles(id, full_name)` with `NEW.id` and `COALESCE(NEW.raw_user_meta_data->>'full_name', '')`.
5. Create the trigger: `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`.
6. `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`.
7. RLS policies:
   - SELECT: `CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid())`
   - INSERT: `CREATE POLICY "profiles_insert_deny" ON profiles FOR INSERT WITH CHECK (false)`
   - UPDATE: `CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid())`
   - DELETE: `CREATE POLICY "profiles_delete_deny" ON profiles FOR DELETE USING (false)`

After writing the migration, run:
```
supabase gen types typescript --local > src/types/database.ts
```

### 2. Foundation type fixes

**Modify `src/lib/errors.ts`**

- Change `AppError.details` from `details?: unknown` to `details?: Record<string, string[]>`.
- Add export: `export type ActionResult<T> = { data: T } | { error: AppError }`.

### 3. Zod validation schemas

**Create `src/lib/validations/auth.ts`**

All error messages are the exact strings from `docs/product-spec/auth.md#validation-rules`.

- `signUpSchema`: `email` (required, `z.string().email('Please enter a valid email address.')`); `password` (required, min 8 chars, must match `/\d/` — error: `'Password must be at least 8 characters and include a number.'`).
- `signInSchema`: `email` (required — error: `'Please enter your email address.'`); `password` (required — error: `'Please enter your password.'`).
- `forgotPasswordSchema`: `email` (required, `z.string().email('Please enter a valid email address.')`).
- `resetPasswordSchema`: `password` (same rules as signup); `confirmPassword` (required); `.refine(data => data.password === data.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] })`.

Export all four schemas and their inferred types (`SignUpInput`, `SignInInput`, etc.).

### 4. Server actions

**Create `src/actions/auth.ts`** — top-level `'use server'`

All actions use `createClient()` from `src/lib/supabase/server.ts`. All return `ActionResult<T>` — never throw. Log errors via `logger.error` from `src/lib/logger.ts`.

| Action | Signature | Logic |
|---|---|---|
| `signUp` | `(rawInput: unknown): Promise<ActionResult<{}>>` | `signUpSchema.safeParse` → on fail return VALIDATION_ERROR. `supabase.auth.signUp({ email, password })`. If Supabase error code is `user_already_exists` or message contains "already registered", return `{ error: { code: 'CONFLICT', message: 'An account with this email already exists.' } }`. On success return `{ data: {} }`. |
| `signIn` | `(rawInput: unknown): Promise<ActionResult<{}>>` | `signInSchema.safeParse` → on fail return VALIDATION_ERROR. `supabase.auth.signInWithPassword({ email, password })`. On auth error return `{ error: { code: 'UNAUTHENTICATED', message: 'Invalid email or password.' } }`. On success call `redirect('/dashboard')`. |
| `signOut` | `(): Promise<void>` | `supabase.auth.signOut()`. Then `redirect('/login')`. |
| `sendPasswordResetEmail` | `(rawInput: unknown): Promise<ActionResult<{}>>` | `forgotPasswordSchema.safeParse` → on fail return VALIDATION_ERROR. `supabase.auth.resetPasswordForEmail(email, { redirectTo: process.env.NEXT_PUBLIC_APP_URL + '/reset-password' })`. On Supabase error, `logger.error` but still return `{ data: {} }` (anti-enumeration — identical response whether email exists or not). |
| `resetPassword` | `(rawInput: unknown): Promise<ActionResult<{}>>` | `resetPasswordSchema.safeParse` → on fail return VALIDATION_ERROR. `supabase.auth.updateUser({ password })`. On error return `{ error: { code: 'INTERNAL_ERROR', message: 'This reset link has expired. Request a new one.' } }`. On success: `supabase.auth.signOut()`, then `redirect('/login?reset=1')`. |

### 5. Middleware

**Modify `src/middleware.ts`**

Replace the current implementation with one that does three things in order:

**A. In-memory rate limiter** (runs before session refresh, only on POST requests):

```ts
// Module-level — persists within a V8 isolate across requests
const rateLimitStore = new Map<string, number[]>();

const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/login':           { max: 10, windowMs: 15 * 60 * 1000 },
  '/signup':          { max: 5,  windowMs: 60 * 60 * 1000 },
  '/forgot-password': { max: 3,  windowMs: 60 * 60 * 1000 },
};
```

Logic: on POST to a rate-limited path, read first IP from `x-forwarded-for` header (split on `,`, trim, fall back to `'unknown'`). Build key `${ip}:${pathname}`. Filter stored timestamps to those within window. If count >= max, return `NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } }, { status: 429 })`. Otherwise push `Date.now()` to timestamps and continue.

**B. Session refresh:** call `updateSession(request)` from `src/lib/supabase/middleware.ts` to get `{ supabaseResponse, user }`.

**C. Auth redirects:**

- Public routes constant (hard-coded, not derived dynamically): `['/login', '/signup', '/forgot-password', '/reset-password']`
- If pathname is NOT in public routes and `user` is null → `return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url))`
- If pathname IS a public route and `user` is not null → `return NextResponse.redirect(new URL('/dashboard', request.url))`
- Otherwise return `supabaseResponse`.

**D. CSP nonce** (on every request):

After getting `supabaseResponse`, generate nonce: `const nonce = Buffer.from(crypto.randomUUID()).toString('base64')`.

Extract the Supabase project hostname from `process.env.NEXT_PUBLIC_SUPABASE_URL` for the `img-src` and `connect-src` directives.

Set headers on the response:
```
x-nonce: <nonce>
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<nonce>' https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: <supabase-host>; connect-src 'self' <supabase-host> https://o*.ingest.sentry.io https://api.resend.com; frame-ancestors 'none';
```

**Modify `src/app/layout.tsx`** — import `headers` from `next/headers`, read `x-nonce` header, pass as `nonce` prop to any `<Script>` components used for Sentry.

### 6. Auth layout and pages

**Create `src/app/(auth)/layout.tsx`**

Centered card layout: full-height flex container, white card in the center (use shadcn `Card` or a plain div with Tailwind). No navigation, no sidebar.

**Modify `src/app/(auth)/login/page.tsx`**

Replace the stub. Implement:
- Form with email + password fields.
- Client-side validation on blur: show inline field errors using exact strings from spec.
- On submit: call `signIn` server action. Show server error inline below the submit button (no redirect on error — `redirect` inside server action handles the success case).
- Loading state: submit button disabled + spinner while request is in-flight (use `useFormStatus` or `useTransition`).
- "Forgot password?" link → `/forgot-password`. "Create account" link → `/signup`.
- Offline state: if `!navigator.onLine`, disable submit and show "You appear to be offline."

**Create `src/app/(auth)/signup/page.tsx`**

- Form with email + password fields.
- Same client-side validation, loading state, offline state pattern as login.
- Calls `signUp` action. On `{ data: {} }` success: replace form with the message "Check your email to confirm your account." (no redirect).
- On CONFLICT error: show "An account with this email already exists." inline.
- "Sign in" link → `/login`.

**Create `src/app/(auth)/forgot-password/page.tsx`**

- Single email field.
- Calls `sendPasswordResetEmail`. On submit (regardless of server outcome): replace form with "If that email is registered, you will receive a reset link."
- "Back to sign in" link → `/login`.

**Create `src/app/(auth)/reset-password/page.tsx`**

Two-phase Server Component:

Phase 1 — OTP verification (runs when `token_hash` and `type` are in searchParams):
- Call `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` server-side.
- If error → render error state: "This reset link has expired. Request a new one." with link to `/forgot-password`.
- If success → fall through to Phase 2 (session is now in cookie).

Phase 2 — Password form (renders when session exists or OTP just verified):
- Client Component form with `password` + `confirmPassword` fields.
- Client-side validation on blur.
- Calls `resetPassword` server action.
- On VALIDATION_ERROR (passwords don't match): show inline error.
- On INTERNAL_ERROR: show "This reset link has expired. Request a new one."
- On success: server action calls `redirect('/login?reset=1')` internally.

**Modify `src/app/(auth)/login/page.tsx`** — also read `reset` search param. If `?reset=1`, show a success toast or banner: "Password reset. Please log in."

### 7. App route group

**Create `src/app/(app)/layout.tsx`**

- Server Component. Call `createClient().auth.getUser()`. If no user, `redirect('/login')` (defensive guard; middleware handles this first).
- Render sidebar with nav links to: `/dashboard`, `/companies`, `/applications`, `/resumes`, `/cover-letters`, `/calendar`, `/automations`, `/profile`.
- Sign-out button (Client Component or form action) that calls `signOut`.
- Renders `{children}` in the main content area.

**Create `src/app/(app)/dashboard/page.tsx`**

Minimal placeholder — two lines. Renders a heading "Dashboard" and a paragraph "Coming soon." Phase 8 replaces this entirely. This page exists solely so the post-login redirect to `/dashboard` returns 200 rather than 404.

### 8. Tests

**Create `tests/unit/auth-schemas.test.ts`**

Use Vitest. Test `signUpSchema`, `signInSchema`, `forgotPasswordSchema`, `resetPasswordSchema`.

For each schema, test:
- At least one valid input (`.success === true`)
- Each invalid case (`.success === false`, check `.error.issues[0].message` matches exact spec string)

Required cases:
- `signUpSchema`: valid; invalid email; password < 8 chars; password with no digit
- `signInSchema`: valid; missing email; missing password
- `forgotPasswordSchema`: valid; invalid email format
- `resetPasswordSchema`: matching valid passwords; non-matching passwords; weak password

**Create `tests/integration/auth.test.ts`**

Use Vitest with local Supabase. Import `createClient` from `@supabase/supabase-js` pointed at `process.env.NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Tests:
1. **Signup creates profiles row** — use Supabase admin client (`SUPABASE_SERVICE_ROLE_KEY`) to create a test user, then SELECT from `profiles` by that user's `id`; assert row exists with `full_name = ''`.
2. **RLS cross-user** — create two test users; with user B's session, attempt SELECT on `profiles` where `id = userA.id`; assert zero rows returned.
3. **Cleanup** — delete test users via admin client in `afterEach`.

**Create `tests/e2e/auth.spec.ts`**

Use Playwright. Local Supabase Inbucket SMTP UI is at `http://localhost:54324`.

Tests:
1. **Signup → email confirm → login → logout**
   - Navigate to `/signup`, fill valid email/password, click "Create account"
   - Assert confirmation message appears
   - Fetch confirmation email from Inbucket API (`GET http://localhost:54324/api/v1/mailbox/<email>`)
   - Navigate to the confirmation link
   - Navigate to `/login`, fill credentials, submit
   - Assert URL is `/dashboard`
   - Click sign-out
   - Assert URL is `/login`

2. **Forgot password → reset → login**
   - Create a confirmed user in beforeEach via admin API
   - Navigate to `/forgot-password`, submit email
   - Assert "If that email is registered" message appears
   - Fetch reset email from Inbucket, extract link
   - Navigate to reset link
   - Assert new-password form is shown
   - Fill new password, submit
   - Assert redirect to `/login` with "Password reset. Please log in." message
   - Log in with new password; assert redirect to `/dashboard`

3. **Redirect preservation**
   - Navigate to `/applications` while unauthenticated
   - Assert URL contains `/login?redirect=%2Fapplications`
   - Log in
   - Assert URL is `/applications`

4. **Client-side validation — weak password**
   - Navigate to `/signup`
   - Enter valid email, password "abc" (too short)
   - Click submit (or blur password field)
   - Assert error "Password must be at least 8 characters and include a number." is visible
   - Assert no network request was made to the server action

5. **Wrong credentials**
   - Navigate to `/login`, enter correct email + wrong password, submit
   - Assert "Invalid email or password." is visible
   - Assert no session cookie is set

---

## Acceptance Criteria Reference

All criteria from `docs/product-spec/auth.md` must pass:
- Signup: Successful signup, Duplicate email, Weak password
- Login: Successful login, Wrong password, Redirect preservation
- Forgot Password: Valid email, Unknown email
- Reset Password: Valid token + matching passwords, Expired token, Passwords do not match

## Definition of Done

- `supabase gen types typescript --local > src/types/database.ts` run after migration
- `tsc --noEmit` exits 0
- `eslint .` exits 0 with zero warnings
- `vitest run --project=unit` passes
- `vitest run --project=integration` passes (requires local Supabase running)
- `playwright test tests/e2e/auth.spec.ts` passes (requires local Supabase running)
- All acceptance criteria above cited in PR description
