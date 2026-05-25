# Decisions — claude/discovery-foundation-B34vx

_Append entries here during implementation. Promote to `docs/agents/decisions.md` on merge._

## 2026-05-25 — CSP nonce must be set in middleware, not next.config.ts

**Branch:** claude/discovery-foundation-B34vx
**Context:** `docs/technical-spec/security.md` says CSP is "Set via `next.config.ts` `headers()`" but also says "Nonce is generated per-request in middleware." `next.config.ts` headers are static and cannot embed a per-request nonce value. Only one approach is technically feasible.
**Decision:** The `Content-Security-Policy` header (with the dynamic nonce) is set in `src/middleware.ts` as a response header. The nonce is generated with `crypto.randomUUID()` per request, stored in a request header `x-nonce`, and read by the root layout to populate `nonce` props on `<Script>` tags. `next.config.ts` does not set a static CSP header.
**Consequence:** `src/middleware.ts` is responsible for the full CSP header. `next.config.ts` is used only for the Sentry wrapper (`withSentryConfig`). The security spec's reference to `next.config.ts headers()` is superseded by this decision.

## 2026-05-25 — Root page returns 200 placeholder in Phase 0

**Branch:** claude/discovery-foundation-B34vx
**Context:** The E2E smoke test navigates to `/` and asserts "200 response (or redirect to `/login`)". Phase 0 middleware has no auth redirects. `/login` and `/dashboard` do not yet exist.
**Decision:** `src/app/page.tsx` renders a minimal valid HTML page returning HTTP 200 in Phase 0. It will be replaced by a redirect to `/dashboard` in Phase 1.
**Consequence:** Smoke test passes. No redirect logic in Phase 0 root page.
