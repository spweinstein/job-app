# Technical Spec — Observability

---

## Structured Logging

Every log line must include:

| Field | Type | Notes |
|---|---|---|
| `level` | `'debug' \| 'info' \| 'warn' \| 'error'` | Required |
| `message` | `string` | Required |
| `timestamp` | `string` | ISO 8601; required |
| `requestId` | `string?` | Propagated from middleware |
| `userId` | `string?` | Omit if not available |
| `action` | `string?` | Server action name |
| `durationMs` | `number?` | For timed operations |
| `error` | `{ message, stack?, code? }?` | Structured error context |

**Logger implementation** (`src/lib/logger.ts`): In development, pretty-prints to `stdout`. In production, outputs JSON to `stdout` (captured by Vercel's log drain).

**What gets logged on every server action:**
1. Action name and user ID (at `info` level on start).
2. Duration in milliseconds (at `info` level on success).
3. Error code, message, and stack (at `error` level on failure, also sent to Sentry).

---

## Error Reporting

**Sentry.** Initialize in `src/app/layout.tsx` (client) and `src/instrumentation.ts` (server). Every `INTERNAL_ERROR` and `UPSTREAM_ERROR` must be sent to Sentry with context (userId, action name, input shape without sensitive fields).

---

## Request Tracing

Next.js propagates a request ID via headers. Capture `x-request-id` (or generate one via `crypto.randomUUID()` if absent) in middleware and attach to all log entries for the request lifecycle.

---

## Vercel Log Drain

Configure in Vercel project settings to forward logs to a log aggregator (e.g., Axiom or Datadog). The specific aggregator is not prescribed here; configure in Vercel dashboard.
