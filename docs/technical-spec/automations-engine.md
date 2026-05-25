# Technical Spec — Automations Engine and Email Delivery

---

## Trigger Detection

Triggers are detected via Postgres trigger functions that write rows to `automation_events`. This ensures triggers fire atomically with the data change (same transaction), no polling is required, and events survive application restarts.

| Trigger Type | Detection Mechanism |
|---|---|
| `application_status_changed` | AFTER UPDATE trigger on `applications` (function: `emit_application_status_changed`) |
| `application_created` | AFTER INSERT trigger on `applications` (function: `emit_application_created`) |
| `interview_scheduled` | AFTER INSERT trigger on `calendar_items` WHERE `kind = 'interview'` (function: `emit_interview_scheduled`) |
| `task_due_soon` | Cron Edge Function runs every 15 minutes, queries `calendar_items` for tasks with `due_at` within `automation.trigger_config.hours_before` hours (default 24 if absent) and `completed_at IS NULL`; inserts events if not already emitted |

### Event payload shapes

| Trigger Type | Payload Shape |
|---|---|
| `application_status_changed` | `{ "application_id": "<uuid>", "old_status": "<status>", "new_status": "<status>" }` |
| `application_created` | `{ "application_id": "<uuid>" }` |
| `interview_scheduled` | `{ "calendar_item_id": "<uuid>", "application_id": "<uuid>", "start_at": "<timestamptz>" }` |
| `task_due_soon` | `{ "calendar_item_id": "<uuid>", "due_at": "<timestamptz>" }` |

---

## Action Execution

**Location:** Supabase Edge Function at `supabase/functions/process-automation-events/index.ts`.

**Invocation:** Supabase cron job every 30 seconds (configured in `supabase/config.toml`). Processes unprocessed events in batches of 50.

**Processing loop:**

1. SELECT unprocessed events: `WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 50`.
2. For each event, mark `processed_at = now()` immediately (claim the event; prevents double-processing).
3. Fetch all enabled automations for the event's `user_id` and `trigger_type`.
4. For each matching automation, evaluate `trigger_config` conditions against the event `payload`.
5. If conditions match:
   - **Idempotency check:** if an `automation_action_logs` row already exists for this `automation_event_id` + `automation_id` with `status = 'succeeded'`, write `status = 'skipped'` log row and continue.
   - **For `send_email` actions:** verify `profiles.notification_email_enabled = true`. If false, write `status = 'skipped'` log row and continue.
   - **For `update_application_status` actions:** fetch the application's current `status`. If it already equals `action_config.to_status`, write `status = 'skipped'` log row and continue (prevents automation loops).
   - Otherwise, execute the action.
6. Write `automation_action_logs` row with the outcome (`succeeded`, `failed`, or `retrying`).
7. Update `automations.last_fired_at` (service role).

---

## Retry Policy

- Max attempts: 3.
- Backoff: 30 seconds, 5 minutes, 30 minutes.
- After 3 failures: write log row with `status = 'failed'` and `error_message`. Dead-lettered in `automation_action_logs`.
- Retry is implemented by the cron function re-querying failed events within the retry window.

---

## Idempotency

Each `automation_events` row has an `idempotency_key` UUID. Before executing an action, the Edge Function checks `automation_action_logs` for an existing row with the same `automation_event_id` + `automation_id` + `status = 'succeeded'`. If found, skip.

---

## Template Variable Substitution

Supported variables in `send_email` action's `subject` and `body`:

| Variable | Resolved To |
|---|---|
| `{{application.role_title}}` | `applications.role_title` |
| `{{application.status}}` | `applications.status` |
| `{{company.name}}` | `companies.name` |
| `{{user.full_name}}` | `profiles.full_name` |
| `{{calendar_item.title}}` | `calendar_items.title` (when triggered by interview_scheduled) |

Unknown variables are replaced with `[unknown]` — never error on template substitution failure.

---

## Abuse Prevention

The `send_email` action sends only to the authenticated user's own email address (fetched from `auth.users` at send time, not from user-configurable input). Users cannot direct automated emails to arbitrary addresses.

---

## Edge Function Configuration

```toml
[functions.process-automation-events]
verify_jwt = false  # invoked by cron, not by user JWT
```

The function authenticates itself using `SUPABASE_SERVICE_ROLE_KEY` (set in Supabase dashboard, not committed).

---

## Email Delivery

**Provider:** Resend (rejected alternative: SendGrid — worse Next.js/Vercel integration).

| Template | Trigger | Notes |
|---|---|---|
| Email confirmation | Supabase Auth signup | Managed by Supabase Auth; configured in dashboard |
| Password reset | Supabase Auth forgot-password | Template variable: `{{ .ConfirmationURL }}` |
| Automation `send_email` | User-defined automation | Subject and body are user-configured; see template substitution above |

**Local testing:** Supabase's Inbucket captures auth emails at `http://localhost:54324`. Automation emails use a Resend test API key (captured to Resend dashboard, not delivered to real inboxes).

**Configuration:**
- `RESEND_API_KEY` environment variable.
- From address: `RESEND_FROM_ADDRESS` env var (`noreply@<configured-domain>`).
- Domain verification required before production sends.
