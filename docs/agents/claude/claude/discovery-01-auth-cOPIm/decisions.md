# Decisions — claude/discovery-01-auth-cOPIm

<!-- Append entries using the format below. Promote to docs/agents/decisions.md on merge. -->
<!-- Format:
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
-->

## 2026-05-25 — Replace Upstash Redis rate limiting with Supabase Auth built-in limits
**Branch:** claude/discovery-01-auth-cOPIm
**Context:** `docs/technical-spec/security.md` specifies Upstash Redis (`@upstash/ratelimit`) for application-level rate limiting on login, signup, and forgot-password. The user decided not to introduce Upstash Redis as a dependency.
**Decision:** Rely on Supabase Auth's built-in rate limiting, which throttles `/auth/v1/token`, `/auth/v1/signup`, and `/auth/v1/recover` at the infrastructure level. No custom application-layer rate limiting code will be written in Phase 1. The `@upstash/ratelimit` package is not added to `package.json`. The `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars are not required.
**Consequence:** `docs/technical-spec/security.md#rate-limiting` must be updated to reflect this change before or during Phase 1 `/build`. The exact per-minute/per-hour thresholds are now controlled in the Supabase Auth dashboard (Auth → Rate Limits), not in application code. Integration tests for custom rate limiting are removed from Phase 1's test requirements.
