# Open Questions — claude/discovery-01-auth-cOPIm

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## Phase 0 not complete — no project initialized
**Source:** discovery
**Question:** The repository contains only documentation. No `package.json`, `src/` directory, Supabase CLI config, or any toolchain configuration exists. Phase 1 (Auth) explicitly requires Phase 0 (Foundation) to be complete.
**Blocks:** All Phase 1 deliverables — auth screens, server actions, middleware, migrations, and tests cannot be written or run until the Next.js/Supabase/Vercel foundation is initialized.

## No Supabase remote project provisioned
**Source:** discovery
**Question:** There is no linked Supabase project (no project ID, no `SUPABASE_DB_URL`). The `profiles` table migration, `handle_new_user` trigger, and RLS policies cannot be tested without a local or remote Supabase instance. Email confirmation and password reset flows also require Supabase Auth to be running.
**Blocks:** Migration testing, integration tests for profile auto-creation and RLS, and the E2E password reset flow (which requires a real Supabase Auth email link).

## No Vercel project linked
**Source:** discovery
**Question:** No `vercel.json` or `.vercel/` linkage exists. Phase 1's Definition of Done requires a green Vercel preview deploy.
**Blocks:** Phase 1 Definition of Done (preview deploy criterion).

<!-- Upstash Redis blocker resolved: user approved using Supabase Auth's built-in rate limiting instead. See decisions.md. -->

## Supabase Auth email templates require manual dashboard configuration
**Source:** discovery
**Question:** The email confirmation template (uses `{{ .ConfirmationURL }}`) and the password reset template (uses `{{ .ConfirmationURL }}`) must be configured in the Supabase dashboard. This is not automatable via migration. Without these, the E2E "signup → confirm → login" and "forgot-password → reset → login" journeys cannot be completed.
**Blocks:** E2E tests for the full signup confirmation flow and the full password reset flow.

## NEXT_PUBLIC_APP_URL env var must be set before resetPasswordForEmail can work
**Source:** discovery
**Question:** The `sendPasswordResetEmail` server action calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: process.env.NEXT_PUBLIC_APP_URL + '/reset-password' })`. This env var must be set in `.env.local` (local dev) and Vercel (preview/prod) before the password reset link points to the correct URL.
**Blocks:** Password reset flow in all environments.
