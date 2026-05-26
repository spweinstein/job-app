# Decisions — claude/auth-build-01-6IAxG

<!-- Append entries using the format below. Do not delete prior entries. -->
<!-- Format:
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
-->

## 2026-05-26 — Rate limiting with dev-mode bypass

**Branch:** auth-build-01-6IAxG
**Context:** The security spec requires Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) for rate limiting on login, signup, and forgot-password. Neither package was in `package.json`.
**Decision:** Added both packages and implemented rate limiting with a dev-mode bypass: when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are absent (dev without Redis configured), `checkRateLimit` returns `true` unconditionally. In production both env vars must be set.
**Consequence:** Rate limiting is effective in production and on Vercel preview deploys where env vars are set. Local dev without Redis skips rate limiting without errors. `src/lib/rate-limit.ts` encapsulates the bypass logic.
