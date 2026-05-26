# Architectural Decisions — Global History

Append-only log of significant decisions promoted from per-agent branches on merge. Each entry was originally recorded in `docs/agents/claude/<branch-slug>/decisions.md` during implementation and promoted here when the branch merged.

For in-progress decisions on the current branch, see `docs/agents/claude/<branch-slug>/decisions.md`.

---

## Entry Format

```
## YYYY-MM-DD — <short title>
**Branch:** <branch-slug>
**Context:** <why this came up>
**Decision:** <what was decided>
**Consequence:** <what this affects>
```

---

## 2026-05-25 — Resume/cover letter storage as structured JSON + optional file attachment

**Branch:** claude/ai-agent-planning-docs-RXkav
**Context:** The spec needed to decide between file-upload-only, structured-JSON-only, or both for resumes and cover letters.
**Decision:** Store content as structured JSON (`ResumeContentV1` / `CoverLetterContentV1`) as the canonical form. Allow an optional DOCX or PDF file attachment as a reference copy stored in Supabase Storage. The structured JSON drives the in-app editor; the file is download-only.
**Consequence:** The `resumes` and `cover_letters` tables have a `content` JSONB column and an `attachment_url` text column. See `docs/technical-spec/content-model.md` and `docs/technical-spec/storage.md`.

---

## 2026-05-25 — Hard-delete (no soft-delete)

**Branch:** claude/ai-agent-planning-docs-RXkav
**Context:** The field name conventions section considered whether to use `deleted_at` for soft deletes.
**Decision:** All rows are hard-deleted. `deleted_at` column is not used in any table.
**Consequence:** Cascade behavior is defined at the FK level (`ON DELETE CASCADE` or `ON DELETE RESTRICT`). No "show deleted items" UI is in scope.

---

## 2026-05-25 — Company delete requires confirmation when applications exist

**Branch:** claude/ai-agent-planning-docs-RXkav
**Context:** `companies` has a CASCADE FK to `applications`. Deleting a company with linked applications is destructive.
**Decision:** Show a modal confirmation dialog explicitly listing the count of linked applications before allowing deletion.
**Consequence:** The `deleteCompany` server action checks for linked applications first and returns the count in its response so the UI can render the confirmation copy.

---

## 2026-05-25 — Dashboard funnel chart hidden when zero applications; replaced by CTA card

**Branch:** claude/ai-agent-planning-docs-RXkav
**Context:** A funnel chart with all-zero bars is misleading for new users.
**Decision:** When the user has zero applications, replace the funnel chart area with a wide CTA card linking to `/applications/new`.
**Consequence:** The dashboard Server Component queries application count before deciding which widget to render. See `docs/product-spec/dashboard.md`.

---

## 2026-05-26 — Suspense wrapper pattern for useSearchParams pages

**Branch:** auth-build-01-6IAxG
**Context:** Next.js 15 requires `useSearchParams()` to be inside a `<Suspense>` boundary in production builds. Both `/login` and `/reset-password` used `useSearchParams()` at the page component root, causing `pnpm build` to fail.
**Decision:** Extracted the page body into inner components (`LoginPageContent`, `ResetPasswordPageContent`) that call `useSearchParams()`, and exported the outer page component as a thin `<Suspense>` wrapper. Kept all code in the single `page.tsx` file to avoid creating extra files.
**Consequence:** Production build passes. The inner components render `null` during SSR fallback, which is acceptable for auth pages that depend on query params.

---

## 2026-05-26 — Client-side blur validation using imported Zod schemas

**Branch:** auth-build-01-6IAxG
**Context:** Product spec requires "client-side validation fires on blur" for all auth forms, and "no request is sent to the server" for weak password on signup.
**Decision:** Imported Zod schemas (no `'use server'` directive, so safe for client components) into each auth page. Added `onBlur` handlers that call `schema.shape[field].safeParse(value)` and store results in `localErrors` state. Added `handleSubmit` intercept in signup to call `e.preventDefault()` on weak password, preventing server action invocation. Error display shows `localErrors[field] || errorField(state, field)`.
**Consequence:** Blur validation fires immediately without a round-trip. Weak password on signup never hits the server. Server errors still display when client validation passes but server rejects.

---

## 2026-05-26 — Admin-guarded E2E tests for confirmed-user flows

**Branch:** auth-build-01-6IAxG
**Context:** Three Gherkin scenarios (successful login, redirect preservation round-trip, valid reset token) require a confirmed user, which can only be created programmatically via the Supabase admin API (service role key).
**Decision:** Added two `test.describe.serial` blocks in `tests/e2e/auth.spec.ts` with `beforeAll`/`afterAll` hooks that create and delete confirmed test users. Tests call `test.skip(!hasAdminAccess, ...)` when `SUPABASE_SERVICE_ROLE_KEY` is absent so they skip gracefully in environments without admin access. The reset-token test uses `admin.auth.admin.generateLink({ type: 'recovery', email })` to get the `hashed_token` needed by the `/reset-password` page.
**Consequence:** Full E2E coverage for happy paths when run with a service role key (CI / local with env set). Graceful skip otherwise. No test pollution between runs — users are created and deleted per test block.

---

## 2026-05-26 — Split Gate 5 checklist into Pre-PR and Post-PR items

**Branch:** auth-build-01-6IAxG
**Context:** The `/review` skill was marking verdicts BLOCKED because "Preview deploy green" and "Screenshots included" appeared in the same Required Checklist as code-quality items. Those two items can only be satisfied after a PR is opened, so they caused false BLOCKED verdicts at pre-merge review time.
**Decision:** Split the Required Checklist in `docs/agent-guide.md` into **Pre-PR** (10 items, verifiable before opening a PR) and **Post-PR** (2 items: preview deploy + screenshots). Updated Gate 5 in `.claude/commands/review.md` to FAIL on pre-PR items and PENDING on post-PR items, with explicit note that PENDING does not contribute to BLOCKED.
**Consequence:** `/review` now produces correct MERGEABLE verdicts when code is complete but a PR hasn't been opened yet. Post-PR items remain in the checklist so they appear in the PR description and are checked manually after the PR is open.

---

## 2026-05-26 — Split auth actions file and extract getClientIp helper

**Branch:** auth-build-01-6IAxG
**Context:** `src/actions/auth.ts` reached 189 lines, exceeding the 150-line server action file limit in `docs/agent-guide.md`. Triggered by adding 5 auth actions plus a shared IP-extraction helper.
**Decision:** Extracted `getClientIp` to `src/lib/request.ts` (shared utility). Split password-management actions (`sendPasswordResetEmail`, `resetPassword`) into `src/actions/auth-password.ts`. Identity actions (`signUp`, `signIn`, `signOut`) remain in `src/actions/auth.ts`. Both action files are now under 100 lines. Updated `forgot-password/page.tsx` and `reset-password/page.tsx` to import from `@/actions/auth-password`. Action names, signatures, and behavior are unchanged.
**Consequence:** The file split is a pure reorganization — no user-visible behavior change. Future callers of password-management actions must import from `@/actions/auth-password`.

---

## 2026-05-26 — Rate limiting with dev-mode bypass

**Branch:** auth-build-01-6IAxG
**Context:** The security spec requires Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) for rate limiting on login, signup, and forgot-password. Neither package was in `package.json`.
**Decision:** Added both packages and implemented rate limiting with a dev-mode bypass: when `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are absent (dev without Redis configured), `checkRateLimit` returns `true` unconditionally. In production both env vars must be set.
**Consequence:** Rate limiting is effective in production and on Vercel preview deploys where env vars are set. Local dev without Redis skips rate limiting without errors. `src/lib/rate-limit.ts` encapsulates the bypass logic.
