# Technical Spec — Auth and Authorization

---

## Auth and Session Handling

**Provider:** Supabase Auth (email + password only in this version).

**Cookie strategy:** `@supabase/ssr` package. Server-side: `createServerClient` with `cookies()` from `next/headers`. Client-side: `createBrowserClient`. Middleware: `createMiddlewareClient`. All three read and write the same `sb-<project-ref>-auth-token` cookie (httpOnly, Secure, SameSite=Lax, path=/).

**Session reads:**
- Server Components and Server Actions: always use `createServerClient` from `src/lib/supabase/server.ts`.
- Client Components: may use `createBrowserClient` only to subscribe to auth state changes (e.g., real-time logout detection). Never call data-fetching methods from the browser client in a Client Component.

**Middleware (`src/middleware.ts`):**
1. Refresh the session cookie on every request (prevents silent expiry).
2. If the request path is not in the public routes list and there is no valid session, redirect to `/login?redirect=<originalPath>`.
3. Public routes list is a hard-coded constant in `middleware.ts`; do not derive it dynamically.

**Public routes** (hard-coded constant): `/login`, `/signup`, `/forgot-password`, `/reset-password`.

**Password reset flow:**
1. User submits `/forgot-password` → server action calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: process.env.NEXT_PUBLIC_APP_URL + '/reset-password' })`.
2. Supabase sends an email using the "Reset Password" template (configured in Supabase dashboard; template variable: `{{ .ConfirmationURL }}`).
3. User clicks the link → navigates to `/reset-password?token_hash=<hash>&type=recovery`.
4. Page reads `token_hash` and `type` from search params. Calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })`.
5. If valid: show the new password form. On submit, call `supabase.auth.updateUser({ password: newPassword })`.
6. On success: sign out, redirect to `/login` with success message.
7. If token is invalid or expired: show error message and link to `/forgot-password`.

---

## Authorization Model

**Primary enforcement: RLS.** All data access goes through the Supabase client, which attaches the user's JWT to every query. RLS policies on each table enforce `auth.uid() = user_id`.

**Secondary enforcement: application layer.** Every server action that operates on a specific resource by ID re-fetches the row with the user's session before performing the operation. If the row does not exist or `user_id` does not match `auth.uid()`, the action returns `FORBIDDEN` — both cases return the same error to prevent resource enumeration.

**Worked example — `updateCompany` server action (behavioral description):**

1. Call `supabase.auth.getUser()`; if no user return `{ error: { code: 'UNAUTHENTICATED' } }`.
2. SELECT the row by `id`; if absent or `user_id ≠ auth.uid()` return `{ error: { code: 'FORBIDDEN', message: 'Not found.' } }`.
3. Run the UPDATE. On DB error, log with `logger.error` and return `{ error: { code: 'INTERNAL_ERROR' } }`.
4. On success, call `revalidatePath('/companies/[id]')` and return `{ data: { id } }`.

**Edge Functions** use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for: writing `automation_action_logs`, updating `automation_events.processed_at`, and updating `automations.last_fired_at`. Service role access is limited to these three tables and only from Edge Functions.
