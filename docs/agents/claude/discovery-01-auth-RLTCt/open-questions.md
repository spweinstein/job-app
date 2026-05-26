# Open Questions — claude/discovery-01-auth-RLTCt

<!-- Append entries using the format below. Remove an entry only after creating a corresponding decisions.md entry (if resolution has spec impact). -->
<!--
## <short title>
**Source:** <discovery | plan | build | review>
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## New packages required for rate limiting
**Source:** discovery
**Question:** `@upstash/ratelimit` and `@upstash/redis` are not in `package.json` but are explicitly specified in `docs/technical-spec/security.md#rate-limiting` for rate-limiting `/login`, `/signup`, and `/forgot-password`. The `/build` Decision Gate requires explicit user approval before adding any package not already in `package.json`. Does the team approve adding `@upstash/ratelimit` and `@upstash/redis` as production dependencies?
**Blocks:** Phase 1 rate limiting implementation. Without approval, the rate-limit wrappers in `src/actions/auth.ts` cannot be added.

## AppError.details type mismatch
**Source:** discovery
**Question:** `src/lib/errors.ts` declares `details?: unknown` but `docs/technical-spec/api-surface.md` specifies `details?: Record<string, string[]>`. The narrower type is required for type-safe field-level error handling in auth forms. Should `details` be changed to `Record<string, string[]> | undefined`?
**Blocks:** Type-safe VALIDATION_ERROR handling in auth server actions and form components.

## ActionResult<T> type not defined
**Source:** discovery
**Question:** `docs/technical-spec/api-surface.md` defines the `ActionResult<T>` return type (`{ data: T } | { error: AppError }`) but it is not exported from `src/lib/errors.ts`. All five auth server actions need this type. Should it be added to `errors.ts`?
**Blocks:** Correct typing of all server action return values in Phase 1.

## CSP headers absent from next.config.ts
**Source:** discovery
**Question:** `docs/technical-spec/security.md` specifies a Content-Security-Policy header to be set via `next.config.ts` `headers()`, but the current `next.config.ts` has no `headers()` function. Was this deferred from Phase 0, and should it be added as part of Phase 1?
**Blocks:** Security spec compliance. May affect Sentry script-src if nonce is required.

## pnpm version inconsistency
**Source:** discovery
**Question:** `docs/technical-spec/index.md` pins pnpm at 9.x, but `package.json` uses `"pnpm": "10.x"` in engines and `"packageManager": "pnpm@10.33.0"`. Was this an intentional Phase 0 upgrade? If so, should `docs/technical-spec/index.md` be updated to reflect 10.x?
**Blocks:** Spec accuracy. Does not block Phase 1 implementation.
