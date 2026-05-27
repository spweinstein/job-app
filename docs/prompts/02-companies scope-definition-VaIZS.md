# Prompt — Phase 02: Companies

Implement the feature defined in `docs/product-spec/companies.md`
against the schema in `docs/technical-spec/schema.md#companies`.
Follow all conventions in `docs/agent-guide.md`.

---

## Reading List

- `docs/product-spec/companies.md`
- `docs/technical-spec/schema.md#companies`
- `docs/technical-spec/api-surface.md`
- `docs/agent-guide.md`

---

## Scope

Full CRUD for Companies: list, create, edit, delete. Company detail page showing application count. Client-side search on list.

---

## Vertical Slice Order

### 1. Migration (`supabase/migrations/20260527000000_companies.sql`)

- `set_updated_at()` trigger function (shared; created once)
- `companies` table per `docs/technical-spec/schema.md#companies`
- `idx_companies_user_id` index
- `BEFORE UPDATE` trigger invoking `set_updated_at()`
- RLS policies: SELECT, INSERT, UPDATE, DELETE — own rows only (`user_id = auth.uid()`)

After migration: `supabase gen types typescript --local > src/types/database.ts`

### 2. Types

Update `src/types/database.ts` with the `companies` table Row / Insert / Update types.

Add `ActionResult<T>` export to `src/lib/errors.ts`.

### 3. App Layout (prerequisite for all app pages)

Create `src/app/(app)/layout.tsx`:
- Server Component
- Calls `supabase.auth.getUser()` and redirects to `/login` if no session
- Sidebar navigation (Companies, Applications, Calendar, Automations, Profile links)

### 4. Zod Schemas (`src/lib/validations/companies.ts`)

- `createCompanySchema`: name (required, max 200), website (optional, valid URL or null), notes (optional, max 2000)
- `updateCompanySchema`: adds `id: z.string().uuid()`
- Exported types: `CreateCompanyInput`, `UpdateCompanyInput`

### 5. Server Actions (`src/actions/companies.ts`)

- `createCompany(rawInput)` → `ActionResult<{ id: string }>` — inserts, revalidates `/companies`
- `updateCompany(rawInput)` → `ActionResult<{ id: string }>` — updates, revalidates `/companies/[id]` and `/companies`
- `deleteCompany(rawInput)` → `ActionResult<{ id: string }>` — deletes, revalidates `/companies`

### 6. Components (`src/components/companies/`)

- `CompanyCard` — server component; renders company name, application count, edit/delete actions
- `CompanyForm` — client component; controlled form for create/edit with validation error display
- `CompanyDeleteDialog` — client component; confirmation dialog with application count warning
- `CompanyList` — client component; receives companies array, manages search filter state

### 7. Pages

- `src/app/(app)/companies/page.tsx` — Server Component; fetches companies list, renders `<CompanyList>`
- `src/app/(app)/companies/new/page.tsx` — renders `<CompanyForm>` in create mode
- `src/app/(app)/companies/[id]/page.tsx` — Server Component; fetches company by id, shows detail + `<CompanyDeleteDialog>`
- `src/app/(app)/companies/[id]/edit/page.tsx` — Server Component; fetches company, renders `<CompanyForm>` in edit mode

### 8. Tests

- `tests/unit/validations/companies.test.ts` — valid input, missing name, name too long, invalid URL
- `tests/integration/companies.test.ts` — create/read/update/delete; RLS: user B cannot read user A's company
- `tests/e2e/companies.spec.ts` — create → view detail → edit → delete (no applications); delete with applications confirmation

---

## Known Deferred Items

- Application count query on list/detail pages — shows 0 in Phase 2; wired up in Phase 3 when `applications` table is created.
- "Delete with applications" E2E scenario — requires Phase 3 data; scenario passes with count=0 in Phase 2.
