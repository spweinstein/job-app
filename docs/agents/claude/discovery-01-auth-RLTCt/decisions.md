# Decisions — claude/discovery-01-auth-RLTCt

<!-- Append entries using the format below. Do not edit existing entries. -->
<!--
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
-->

## 2026-05-26 — In-memory rate limiting instead of Upstash Redis
**Branch:** discovery-01-auth-RLTCt
**Context:** `docs/technical-spec/security.md#rate-limiting` specifies `@upstash/ratelimit` + `@upstash/redis`. Neither package is in `package.json`. The user explicitly instructed using "a lightweight package in place of redis for rate limiting."
**Decision:** Implement rate limiting as an in-memory sliding-window counter (using a module-level `Map<string, number[]>` keyed by IP + route) inside `src/middleware.ts` (Vercel Edge runtime). No new packages are added. Limits applied: 10 login / 15 min, 5 signup / hr, 3 forgot-password / hr per IP. Each Vercel Edge region enforces limits independently; limits reset on isolate restart.
**Consequence:** Rate limiting is slightly less precise than a centralized Redis store in multi-region deployments. Acceptable for a single-user personal app; Supabase Auth's own brute-force protection and Vercel's global DDoS protection provide additional backstops. `docs/technical-spec/security.md#rate-limiting` is considered satisfied by this implementation per user authorization.

## 2026-05-26 — Rate limiting in middleware, not server actions
**Branch:** discovery-01-auth-RLTCt
**Context:** With in-memory state, rate limiting must run in the Edge middleware (module-level state persists within a V8 isolate across requests). Placing it inside serverless server actions would lose state on every cold start. The spec says "via server action" but this is an architectural constraint, not a functional one.
**Decision:** Rate limiting is enforced in `src/middleware.ts` by inspecting `request.method === 'POST'` and the pathname. Auth server actions themselves do not contain rate-limit logic.
**Consequence:** Rate limit response (429) is returned by middleware before the server action executes. Server action unit tests do not need to mock a rate limiter.

## 2026-05-26 — CSP deferred from Phase 0, added in Phase 1
**Branch:** discovery-01-auth-RLTCt
**Context:** `docs/technical-spec/security.md` specifies CSP via `next.config.ts` `headers()`. It was absent from the Phase 0 codebase. Phase 1 is the earliest opportunity with spec-mandated auth screens in place (script-src nonce needed for Sentry).
**Decision:** Add CSP headers + per-request nonce generation to `src/middleware.ts` (sets `x-nonce` response header and the `Content-Security-Policy` header) and `src/app/layout.tsx` reads the nonce via `headers()` for inline scripts. `next.config.ts` does not handle CSP directly since nonces require middleware to generate them per-request.
**Consequence:** CSP header is emitted on every response. Sentry inline scripts must use the nonce. Phase 0 did not have this; adding it in Phase 1 closes the security spec gap.
