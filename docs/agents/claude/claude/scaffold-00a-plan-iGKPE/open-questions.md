# Open Questions — claude/scaffold-00a-plan-iGKPE

<!-- Append blockers using the format below. Remove an entry only after creating a corresponding decisions.md entry. -->
<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## No Supabase remote project provisioned
**Source:** plan
**Question:** There is no linked remote Supabase project. CI requires a preview Supabase project URL (`SUPABASE_DB_URL`) to push migrations, and Vercel needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This must be provisioned manually by the user.
**Blocks:** The "Vercel preview deploy green" and migration push steps in the Phase 0 Definition of Done; all CI gates that run against preview; Phase 1 onwards.

## No Vercel project linked
**Source:** plan
**Question:** There is no `vercel.json` or `.vercel/` linkage. Connecting the GitHub repo to a Vercel project requires manual action in the Vercel dashboard or CLI with user credentials.
**Blocks:** The "Vercel preview deploy green" criterion in the Phase 0 Definition of Done; Lighthouse CI gate.
