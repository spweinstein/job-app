# Technical Spec — Security Baseline

---

## CSRF

Next.js Server Actions are protected against CSRF by default (they require the `Next-Action` header, which cannot be set cross-origin). Route handlers that accept POST from external callers must verify a request signature (e.g., Resend provides `Resend-Signature` header).

---

## Rate Limiting

| Endpoint | Limit | Implementation |
|---|---|---|
| `POST /login` (via server action) | 10 attempts per 15 minutes per IP | Upstash Redis via `@upstash/ratelimit`. IP from `x-forwarded-for`, validated and truncated to first IP only. |
| `POST /signup` | 5 per hour per IP | Same |
| `POST /forgot-password` | 3 per hour per IP | Same |
| All other server actions | No per-action rate limit | Vercel's global DDoS protection applies |

---

## Secret Management

- All secrets in Vercel environment variables (not committed).
- `.env.local` is gitignored; `.env.example` documents all variable names with fake values.
- Supabase service role key is set only in the Edge Function environment and Vercel (never in `NEXT_PUBLIC_*`).

---

## Content Security Policy

Set via `next.config.ts` `headers()`:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{nonce}' https://js.sentry-cdn.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://<supabase-project-ref>.supabase.co;
  connect-src 'self' https://<supabase-project-ref>.supabase.co https://o*.ingest.sentry.io https://api.resend.com;
  frame-ancestors 'none';
```

Nonce is generated per-request in middleware and injected into `<script>` tags.

---

## Automations Threat Model

| Threat | Mitigation |
|---|---|
| User redirects emails to arbitrary addresses | `send_email` action sends only to `auth.users.email` — fetched server-side, not from `action_config`. |
| Automation loops | `update_application_status` checks that target status differs from current before updating. Idempotency key prevents same event from executing twice. |
| Runaway cron / excessive email | Max 3 retries, then dead-letter. No automation fires more than once per triggering event. |
| Injection via template variables | Template variables resolved from DB values; `body` and `subject` are user-typed but sent only to the user's own email and not executed as code. |
| Edge Function privilege escalation | Service role key is scoped only to: write `automation_action_logs`, update `automation_events` (mark processed), and update `automations.last_fired_at`; all other writes go through RLS-enforced user session. |

---

## Dependency Policy

Renovate is configured via `renovate.json`:
- Auto-merge: patch-level updates with passing CI.
- PR required: minor and major updates.
- Security alerts: auto-created as high-priority PRs regardless of semver level.
