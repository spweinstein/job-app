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

<!-- Supabase remote project blocker resolved: local Supabase (supabase start) is sufficient for Phase 1. See decisions.md. -->

<!-- Vercel deployment blocker resolved: Vercel is not required for Phase 1 local implementation; it is a post-launch concern. See decisions.md. -->

<!-- Upstash Redis blocker resolved: user approved using Supabase Auth's built-in rate limiting instead. See decisions.md. -->

<!-- Supabase Auth email templates blocker resolved: local Supabase Studio (localhost:54323) provides a dashboard to configure email templates for local dev; not a hard blocker for implementation. See decisions.md. -->

<!-- NEXT_PUBLIC_APP_URL blocker resolved: set to http://localhost:3000 in .env.local for local dev; not a hard blocker for implementation. See decisions.md. -->
