Implement the feature defined in `docs/product-spec/companies.md`
against the schema in `docs/technical-spec/schema.md#companies`.
Follow all conventions in `docs/agent-guide.md`.
API surface (server actions + return shapes) is specified in `docs/technical-spec/api-surface.md`.

---

# Phase 2: Companies — Build Prompt

## Context and Prerequisites

Phase 1 (Auth) must be complete before this phase begins. Specifically, the following must already exist:
- `src/app/(app)/layout.tsx` — app layout with sidebar navigation and session guard
- `src/actions/auth.ts` — auth server actions
- The profiles migration, including the shared `set_updated_at()` trigger function used by every subsequent table
- `src/middleware.ts` configured to redirect unauthenticated users to `/login`

Check `docs/agents/claude/<branch-slug>/open-questions.md` for unresolved questions before writing code.

One resolved decision affects this phase — **application count is hardcoded to `0`** in Phase 2. See `docs/agents/claude/claude/companies-scope-definition-toJ2q/decisions.md` for the full rationale. Phase 3 owns the real count queries and the "Delete with applications" acceptance criterion.

---

## Step 1 — Migration

**File:** `supabase/migrations/20260527000000_companies.sql`

```sql
CREATE TABLE IF NOT EXISTS companies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  website     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_own"
  ON companies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "companies_insert_own"
  ON companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_update_own"
  ON companies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "companies_delete_own"
  ON companies FOR DELETE
  USING (user_id = auth.uid());
```

After applying the migration:
```
supabase gen types typescript --local > src/types/database.ts
```

---

## Step 2 — Zod Schemas

**File:** `src/lib/validations/companies.ts`

### `createCompanySchema`

| Field | Rule | Error |
|---|---|---|
| `name` | Required, min 1, max 200 | "Company name is required." / "Company name must be 200 characters or fewer." |
| `website` | Optional; if non-empty, must be a valid URL | "Please enter a valid URL (e.g., https://example.com)." |
| `notes` | Optional, max 2000 | "Notes must be 2000 characters or fewer." |

Empty string for `website` must be coerced to `undefined` (not validated as a URL). Use `.optional().or(z.literal(''))` with `.transform(v => v === '' ? undefined : v)`, or `z.preprocess`.

### `updateCompanySchema`

Extends `createCompanySchema` with `id: z.string().uuid()`.

Export `CreateCompanyInput` and `UpdateCompanyInput` as inferred types.

---

## Step 3 — Server Actions

**File:** `src/actions/companies.ts` (max 150 lines; `'use server'` at top of file)

All actions follow the pattern:
1. `schema.safeParse(rawInput)` → return `{ error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: fieldErrors } }` on failure
2. `createServerClient(await cookies())` — import from `@/lib/supabase/server`
3. Supabase query (RLS enforces ownership — no manual `user_id` check needed after the auth guard)
4. On Supabase error: log via `src/lib/logger.ts`, return `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`
5. `revalidatePath(...)` on success
6. Return `{ data: { id } }`

### `createCompany(rawInput: unknown)`
- Insert into `companies` (`name`, `website`, `notes`); `user_id` is set from `auth.uid()` via RLS `WITH CHECK`
- Revalidates `/companies`
- Returns `{ data: { id: string } }`

### `updateCompany(rawInput: unknown)`
- Update `companies` WHERE `id = input.id` (RLS policy enforces ownership)
- Revalidates `/companies` and `/companies/${input.id}`
- Returns `{ data: { id: string } }`

### `deleteCompany(rawInput: unknown)`
- Input schema: `z.object({ id: z.string().uuid() })`
- Delete WHERE `id = input.id` (RLS enforces ownership)
- Revalidates `/companies`
- Returns `{ data: { id: string } }`
- The DB `ON DELETE CASCADE` from `applications.company_id → companies.id` (added in Phase 3) handles cascade automatically; no manual application deletion is needed

---

## Step 4 — shadcn/ui Components

Run:
```
npx shadcn@latest add button input label textarea card dialog
```

This adds components to `src/components/ui/` and may add `@radix-ui/react-dialog`, `@radix-ui/react-label` to `package.json`. This is the approved workflow (see `decisions.md`).

---

## Step 5 — Custom Components

**Directory:** `src/components/companies/` (all files kebab-case)

### `company-card.tsx`

Props:
```ts
interface CompanyCardProps {
  company: { id: string; name: string; applicationCount: number };
}
```

Renders a `Card` linking to `/companies/[id]`. Shows company name and `"${applicationCount} application${applicationCount === 1 ? '' : 's'}"`.

### `company-form.tsx`

Client component (`'use client'`). Props:
```ts
interface CompanyFormProps {
  action: (input: unknown) => Promise<ActionResult<{ id: string }>>;
  defaultValues?: { id?: string; name?: string; website?: string; notes?: string };
  cancelHref: string;
}
```

Uses `useActionState` (React 19) to call the passed action. Renders:
- `Label` + `Input` for name (show field error from `details.name`)
- `Label` + `Input` for website (show field error from `details.website`)
- `Label` + `Textarea` for notes (show field error from `details.notes`)
- Submit button ("Save") and cancel link
- Inline error banner above Submit for top-level errors

On success, redirect using `useRouter().push('/companies/' + data.id)`.

### `company-delete-dialog.tsx`

Client component. Props:
```ts
interface CompanyDeleteDialogProps {
  companyId: string;
}
```

Renders a `Dialog` trigger button ("Delete company"). Confirmation text: **"This action cannot be undone."** (Phase 3 updates this to include application count.)

On confirm: call `deleteCompany({ id: companyId })`; on success, `router.push('/companies')`.

### `company-list.tsx`

Client component. Props:
```ts
interface CompanyListProps {
  companies: { id: string; name: string; applicationCount: number }[];
}
```

`useState` for `searchQuery`. Filters companies by `name.toLowerCase().includes(searchQuery.toLowerCase())`.

Renders:
- Search `Input` (placeholder: "Search companies…")
- If `companies.length === 0` (before filter): "No companies yet. Add your first company to get started." + `Button` linking to `/companies/new`
- If filtered list is empty but companies exist: "No companies match your search."
- List of `CompanyCard` components

---

## Step 6 — Pages

All pages are inside `src/app/(app)/companies/`. Use `createServerClient` from `@/lib/supabase/server` for DB reads directly in the Server Component — do NOT create server actions for reads.

### `src/app/(app)/companies/page.tsx`

Server Component. Fetches:
```sql
SELECT id, name FROM companies WHERE user_id = auth.uid() ORDER BY name
```

Passes to `CompanyList` with `applicationCount: 0` hardcoded per company (Phase 3 replaces with real count).

### `src/app/(app)/companies/new/page.tsx`

Server Component. Renders heading "Add Company" + `CompanyForm` with `action={createCompany}` and `cancelHref="/companies"`.

### `src/app/(app)/companies/[id]/page.tsx`

Server Component. Fetches:
```sql
SELECT id, name, website, notes FROM companies WHERE id = $1
```

If no row returned (missing or wrong user), call `notFound()` from `next/navigation`. Renders:
- Company name as heading
- Website (as link if present)
- Notes
- "0 applications" (hardcoded — Phase 3 replaces with real count)
- Link to `/companies/[id]/edit`
- `CompanyDeleteDialog`

### `src/app/(app)/companies/[id]/edit/page.tsx`

Server Component. Same query as detail page; passes row as `defaultValues` to `CompanyForm` with `action={updateCompany}` and `cancelHref="/companies/[id]"`.

---

## Step 7 — Tests

### Unit — `tests/unit/validations/companies.test.ts`

Test `createCompanySchema`:
- Valid: `{ name: 'Acme Corp' }` → parses without error
- Valid with all fields: `{ name: 'Acme', website: 'https://acme.com', notes: 'A note' }` → parses
- Missing name: `{}` → error on `name`
- Name too long: 201 chars → error on `name`
- Invalid URL: `{ name: 'A', website: 'not-a-url' }` → error on `website`
- Empty string website: `{ name: 'A', website: '' }` → parses, `website` is `undefined`
- Notes too long: 2001 chars → error on `notes`

### Integration — `tests/integration/companies.test.ts`

Requires a running local Supabase instance. Use `createClient` with the service role key for user setup, and `createClient` with a user JWT for RLS-scoped queries.

Tests:
- **Create**: insert company → SELECT back → assert name matches
- **Update**: insert → update name → SELECT → assert updated name
- **Delete**: insert → delete → SELECT → assert no rows
- **RLS — cross-user**: user A creates a company; user B's client attempts SELECT, UPDATE, DELETE → all return no rows / no rows affected (RLS silently filters or returns empty)

### E2E — `tests/e2e/companies.spec.ts`

Acceptance criteria from `docs/product-spec/companies.md`:

**List View — Empty state**
```
Navigate to /companies → assert heading "Companies" → assert empty message → assert "Add company" button
```

**List View — Populated**
```
Seed 3 companies via API → navigate to /companies → assert 3 company rows visible
```

**List View — Search**
```
Seed "Acme Corp" and "Beta LLC" → navigate to /companies → type "acme" → assert "Acme Corp" visible → assert "Beta LLC" not visible
```

**Create — Success**
```
Navigate to /companies/new → enter name "Acme Corp" → click Save → assert redirect to /companies/<id> → assert "Acme Corp" shown
```

**Create — Missing name**
```
Navigate to /companies/new → click Save without entering name → assert "Company name is required." shown → assert no redirect
```

**Edit — Success**
```
Seed company → navigate to /companies/<id>/edit → change name → click Save → assert redirect to /companies/<id> → assert updated name shown
```

**Delete — No applications (Phase 2)**
```
Seed company → navigate to /companies/<id> → click "Delete company" → confirm dialog → assert redirect to /companies → assert company not in list
```

**Delete — With applications (DEFERRED to Phase 3)**
This acceptance criterion requires the `applications` table. Phase 3 adds this scenario.

---

## Acceptance Criteria to Cite in PR

From `docs/product-spec/companies.md`:
- ✅ List View — Empty state
- ✅ List View — Populated
- ✅ List View — Search
- ✅ Create — Success
- ✅ Create — Missing name
- ✅ Edit — Success
- ✅ Delete — No applications
- ⏳ Delete — With applications (Phase 3)

---

## PR Checklist

- [ ] Migration added and applied (`supabase db push`)
- [ ] `supabase gen types typescript --local > src/types/database.ts` run after migration
- [ ] RLS policies added for `companies` table (4 policies)
- [ ] Zod schemas defined for `createCompanySchema` and `updateCompanySchema`
- [ ] Server actions (`createCompany`, `updateCompany`, `deleteCompany`) return canonical error shape
- [ ] Unit tests passing (`vitest run`)
- [ ] Integration test added (CRUD + RLS cross-user)
- [ ] E2E tests added for all Phase 2 acceptance criteria
- [ ] `tsc --noEmit` exits 0
- [ ] `eslint .` exits 0 with zero warnings
- [ ] Preview deploy green
- [ ] Screenshots included (1280×800 desktop + 390×844 mobile)
- [ ] `docs/agents/claude/<branch-slug>/decisions.md` entries promoted to `docs/agents/decisions.md` in merge commit
