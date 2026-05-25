# Technical Spec — API Surface and Error Contract

---

## Read Pattern

Data reads occur directly in Server Components using `createServerClient` from `src/lib/supabase/server.ts`. **Never wrap a SELECT-only query in a server action.** Only mutating operations (create, update, delete, upload, toggle, fork) are server actions. Signed URL generation (e.g., `supabase.storage.createSignedUrl`) is a storage read operation and follows the Read Pattern — it occurs in Server Components, not in server actions.

The dashboard funnel aggregation is fetched in the Dashboard Server Component with a single `SELECT status, count(*) FROM applications WHERE user_id = $1 GROUP BY status` query; it is not a server action.

---

## Server Actions

All server actions live in `src/actions/<resource>.ts`. Each action:
- Is decorated with `'use server'` at the top of its file.
- Validates input with the Zod schema from `src/lib/validations/<resource>.ts`.
- Returns `{ data: T } | { error: AppError }` — never throws.
- Calls `revalidatePath` or `revalidateTag` on success.
- Logs errors via `src/lib/logger.ts`.

All server actions validate with `schema.safeParse(rawInput)` and return `{ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: fieldErrors } }` on failure.

### Action Inventory

| Action | File | Input Schema | Returns on Success | Revalidates |
|---|---|---|---|---|
| `signUp` | `auth.ts` | `signUpSchema` | `{}` | — |
| `signIn` | `auth.ts` | `signInSchema` | `{}` | — |
| `signOut` | `auth.ts` | `{}` | `{}` | — |
| `sendPasswordResetEmail` | `auth.ts` | `forgotPasswordSchema` | `{}` | — |
| `resetPassword` | `auth.ts` | `resetPasswordSchema` | `{}` | — |
| `createCompany` | `companies.ts` | `createCompanySchema` | `{ id: string }` | `/companies` |
| `updateCompany` | `companies.ts` | `updateCompanySchema` | `{ id: string }` | `/companies/[id]`, `/companies` |
| `deleteCompany` | `companies.ts` | `{ id: string }` | `{ id: string }` | `/companies` |
| `createApplication` | `applications.ts` | `createApplicationSchema` | `{ id: string }` | `/applications`, `/companies/[companyId]` |
| `updateApplication` | `applications.ts` | `updateApplicationSchema` | `{ id: string }` | `/applications/[id]` |
| `deleteApplication` | `applications.ts` | `{ id: string }` | `{ id: string }` | `/applications`, `/companies/[companyId]` |
| `createResume` | `resumes.ts` | `createResumeSchema` | `{ id: string }` | `/resumes` |
| `updateResume` | `resumes.ts` | `updateResumeSchema` | `{ id: string }` | `/resumes/[id]` |
| `forkResume` | `resumes.ts` | `forkResumeSchema` | `{ id: string }` | `/resumes` |
| `deleteResume` | `resumes.ts` | `{ id: string }` | `{ id: string }` | `/resumes` |
| `uploadResumeAttachment` | `resumes.ts` | `FormData` (file) | `{ attachmentUrl: string }` | `/resumes/[id]` |
| `deleteResumeAttachment` | `resumes.ts` | `{ id: string }` | `{}` | `/resumes/[id]` |
| `createCoverLetter` | `cover-letters.ts` | `createCoverLetterSchema` | `{ id: string }` | `/cover-letters` |
| `updateCoverLetter` | `cover-letters.ts` | `updateCoverLetterSchema` | `{ id: string }` | `/cover-letters/[id]` |
| `forkCoverLetter` | `cover-letters.ts` | `forkCoverLetterSchema` | `{ id: string }` | `/cover-letters` |
| `deleteCoverLetter` | `cover-letters.ts` | `{ id: string }` | `{ id: string }` | `/cover-letters` |
| `uploadCoverLetterAttachment` | `cover-letters.ts` | `FormData` (file) | `{ attachmentUrl: string }` | `/cover-letters/[id]` |
| `deleteCoverLetterAttachment` | `cover-letters.ts` | `{ id: string }` | `{}` | `/cover-letters/[id]` |
| `createCalendarItem` | `calendar-items.ts` | `createCalendarItemSchema` | `{ id: string }` | `/calendar` |
| `updateCalendarItem` | `calendar-items.ts` | `updateCalendarItemSchema` | `{ id: string }` | `/calendar/[id]` |
| `completeTask` | `calendar-items.ts` | `{ id: string }` | `{ id: string }` | `/calendar/[id]` |
| `deleteCalendarItem` | `calendar-items.ts` | `{ id: string }` | `{ id: string }` | `/calendar` |
| `createAutomation` | `automations.ts` | `createAutomationSchema` | `{ id: string }` | `/automations` |
| `updateAutomation` | `automations.ts` | `updateAutomationSchema` | `{ id: string }` | `/automations/[id]` |
| `toggleAutomation` | `automations.ts` | `{ id: string, enabled: boolean }` | `{ id: string }` | `/automations` |
| `deleteAutomation` | `automations.ts` | `{ id: string }` | `{ id: string }` | `/automations` |
| `updateProfile` | `profile.ts` | `updateProfileSchema` | `{ id: string }` | `/profile` |
| `uploadAvatar` | `profile.ts` | `FormData` (file) | `{ avatarUrl: string }` | `/profile` |
| `changePassword` | `profile.ts` | `changePasswordSchema` | `{}` | — |

---

## Route Handlers

Route handlers are used only where an external HTTP caller must POST to an endpoint. **Never use route handlers for application data operations** — use server actions.

| Handler | File | Purpose |
|---|---|---|
| POST `/api/webhooks/resend` | `src/app/api/webhooks/resend/route.ts` | Verifies the Resend webhook signature. On `email.delivered`, `email.bounced`, or `email.complained` events, records the outcome via the `process-automation-events` Edge Function's internal mechanism (the Edge Function queries `automation_action_logs` by the Resend message ID stored in the log entry). The webhook route itself does NOT write to `automation_action_logs` directly. |

---

## Error Contract

**Canonical error shape:**

`AppError`: `{ code: ErrorCode, message: string, details?: Record<string, string[]> }` — `message` is user-safe; `details` contains field-level errors for `VALIDATION_ERROR` only.

`ActionResult<T>`: either `{ data: T }` or `{ error: AppError }` — never both.

**`ErrorCode`** is a `const` object in `src/lib/errors.ts`. All eight codes are defined in `docs/agent-guide.md#error-codes`. No new codes without a spec change.

**HTTP status codes for Route Handlers:**

| Code | HTTP Status |
|---|---|
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 422 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `UPSTREAM_ERROR` | 502 |
| `INTERNAL_ERROR` | 500 |

Server Actions do not return HTTP status codes; they return `ActionResult<T>` objects.
