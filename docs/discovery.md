# Discovery Guide

For the project owner who will direct and review AI coding agents but does not plan to write code themselves. Each section orients you to a technology in the context of _this specific project_ so you can understand agent output, review pull requests, and make informed decisions when agents ask you questions.

---

## TypeScript — reading types, not writing them

TypeScript is JavaScript with type annotations the compiler enforces. You don't need to write TypeScript, but you will see it in agent output and in this project's specs.

**What you'll encounter:**

- `status: ApplicationStatus` — the field must be one of the 9 enum strings defined in `docs/agent-guide.md`. If an agent writes a status value that isn't in that list, it's a bug.
- `string | null` — the field is optional but explicitly nullable. Different from just being absent; the database column is nullable and the UI must handle both cases.
- `{ data: T } | { error: AppError }` — every server action in this project returns either success data or a typed error. Agents must never `throw` from a server action; they must return the error shape instead.
- `strict: true` and `noUncheckedIndexedAccess: true` — compiler settings that catch common bugs at build time. A green `tsc` run is a meaningful quality signal, not just a formality.

**Where types live in this project:**
- `src/types/database.ts` — auto-generated from the live database schema by the Supabase CLI. Never hand-edit this file.
- `src/types/index.ts` — hand-written domain types (`SectionType`, `ApplicationStatus`, `AppError`, etc.).

---

## Next.js App Router — the paradigm shift from React + REST

You know React with a separate API layer. The App Router changes the model so the server and UI live in the same codebase, often in the same file.

**The three pieces:**

| Piece | Where it runs | What it does |
|---|---|---|
| **Server Component** (default) | Server, at request time | Fetches data directly from the database; sends rendered HTML to the browser. No API call needed. |
| **Client Component** (`'use client'` at top of file) | Browser | Handles click events, local state, animations. Never fetches data directly from the DB. |
| **Server Action** (`'use server'` at top of file) | Server, called from the browser | Replaces POST endpoints. A mutation function the client calls like a normal function, but it runs on the server. All creates, updates, and deletes in this project go through server actions in `src/actions/`. |

**Two other things to know:**

- **Middleware** (`src/middleware.ts`): runs before every request. This project uses it to redirect unauthenticated users to `/login`. If someone isn't logged in and tries to visit `/applications`, middleware catches it before the page even loads.
- **`revalidatePath`**: called inside a server action after a successful mutation. It tells Next.js "re-fetch the data for this page." This is how the UI updates after a form save without a full page reload.

**The mental model:** Server Components handle "load the page." Server Actions handle "submit the form." Client Components handle "the button interaction in between." If you see database code inside a React component file, that's a bug — it belongs in `src/actions/`.

---

## Supabase — the backend

Supabase is five things in this project:

### 1. Auth
Handles signup, login, email confirmation, and password reset. Sessions are JWTs stored in an httpOnly cookie. You won't interact with JWT details directly — Supabase manages this. What matters: every database operation knows who the user is via `auth.uid()`, which reads the session automatically.

### 2. Postgres with Row Level Security (RLS)
The database is Postgres. Row Level Security means the database itself enforces that users can only see and modify their own data — not just application code. Even a bug in a server action cannot accidentally expose another user's records, because the database will reject the query. Every table in this project has RLS enabled. When reviewing a migration, check that RLS policies are defined for each new table.

### 3. Storage
File upload service for avatars and resume/cover-letter attachments. Files live in "buckets" (`avatars`, `resume-attachments`, `cover-letter-attachments`). Download access uses time-limited signed URLs (the download link expires; this prevents public hotlinking). Storage also uses RLS: each user's files are stored under their `user_id` as a path prefix, and the policy enforces that only the owner can access files under their prefix.

### 4. Edge Functions
Small server-side functions that run on Supabase's infrastructure, independently from Next.js. This project has one: `process-automation-events`. It runs on a cron schedule, checks for pending automation triggers in the database, and executes configured actions (send email, create task, update status). Edge Functions use the service-role key so they can bypass RLS where needed.

### 5. Local development with the CLI
`supabase start` runs a full local copy of Auth, Postgres, Storage, and Edge Functions in Docker. All development happens locally first; migrations are applied to the hosted project only after CI passes. Key CLI commands:
- `supabase start` / `supabase stop`
- `supabase migration new <name>` — creates a new migration file
- `supabase db push` — applies pending migrations to the remote project
- `supabase gen types typescript --local > src/types/database.ts` — regenerates TypeScript types after a schema change

---

## How to review agent output

When an agent opens a pull request, you don't need to understand every line. Use this checklist:

**Schema changes (if any)**
- Does the migration file in `supabase/migrations/` match the table described in `docs/technical-spec/index.md`? Check column names and types.
- Does the migration define RLS policies for every new table?
- Did the agent regenerate `src/types/database.ts` after the migration?

**Code structure**
- Are server actions in `src/actions/`, not inside component files?
- Do Client Components (`'use client'`) only handle interactivity? If you see a Supabase database call inside a `'use client'` file (other than in a React Query hook), that's a violation.
- Are there any `console.log` statements? (The spec forbids these; use the structured logger instead.)

**Tests**
- Do the Playwright E2E tests pass? These cover the Gherkin acceptance criteria in `docs/product-spec/index.md`.
- Do the Vitest unit tests pass?
- Does `tsc --noEmit` pass? Does `eslint .` pass with zero warnings?

**The easy smell test:** if the PR description includes the required checklist from `docs/agent-guide.md#pr-conventions` and all items are checked, the agent did its job. If any are unchecked, ask the agent why before merging.

---

## Where things live

```
src/app/           Next.js pages — each folder is a URL route
src/actions/       All mutations (server actions), one file per resource
src/components/    React components — ui/ is generated, don't hand-edit
src/lib/           Shared utilities, Supabase client factory, logger, error types
src/types/         TypeScript types (database.ts = generated, index.ts = hand-written)
supabase/
  migrations/      Database changes in chronological order (.sql files)
  functions/       Edge Functions (the automation processor lives here)
tests/
  unit/            Fast unit tests (Vitest, no database needed)
  integration/     Tests that require a running local Supabase
  e2e/             End-to-end browser tests (Playwright)
docs/              All planning documents (you are here)
.env.local         Local secrets — gitignored, never committed
.env.example       Documents all required env var names — safe to commit
```
