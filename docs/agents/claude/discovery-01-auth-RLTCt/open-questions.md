# Open Questions — claude/discovery-01-auth-RLTCt

<!-- Append entries using the format below. Remove an entry only after creating a corresponding decisions.md entry (if resolution has spec impact). -->
<!--
## <short title>
**Source:** <discovery | plan | build | review>
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## ~~New packages required for rate limiting~~ RESOLVED
**Source:** discovery
**Resolution:** User instructed using a lightweight alternative. Decision: in-memory sliding-window in middleware, no new packages. See decisions.md "In-memory rate limiting instead of Upstash Redis."

## ~~AppError.details type mismatch~~ RESOLVED
**Source:** discovery
**Resolution:** Plan includes narrowing `details` to `Record<string, string[]>` in `src/lib/errors.ts` as part of Phase 1 foundation fixes.

## ~~ActionResult<T> type not defined~~ RESOLVED
**Source:** discovery
**Resolution:** Plan includes adding `ActionResult<T>` export to `src/lib/errors.ts`.

## ~~CSP headers absent from next.config.ts~~ RESOLVED
**Source:** discovery
**Resolution:** Plan includes adding CSP with per-request nonce in middleware. See decisions.md "CSP deferred from Phase 0, added in Phase 1."

## pnpm version inconsistency
**Source:** discovery
**Question:** `docs/technical-spec/index.md` pins pnpm at 9.x, but `package.json` uses `"pnpm": "10.x"` in engines and `"packageManager": "pnpm@10.33.0"`. Was this an intentional Phase 0 upgrade? If so, should `docs/technical-spec/index.md` be updated to reflect 10.x?
**Blocks:** Spec accuracy. Does not block Phase 1 implementation.
