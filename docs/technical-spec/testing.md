# Technical Spec — Testing, Environments, and Configuration

---

## Testing Strategy

### Layers

| Layer | Tool | What It Tests | Location |
|---|---|---|---|
| Unit | Vitest | Individual functions: Zod schemas, `src/lib/` utilities, server action business logic with mocked Supabase client, template variable substitution | `tests/unit/` |
| Integration | Vitest | Server actions against real local Supabase (`supabase start`), RLS policy enforcement (two-user tests), automation event emission | `tests/integration/` |
| End-to-End | Playwright | Full user flows in a real browser against seeded local Supabase: all Gherkin scenarios in `docs/product-spec/` | `tests/e2e/` |

### Coverage Target

- Unit + Integration combined: 80% line coverage on `src/actions/` and `src/lib/`.
- E2E: every happy-path scenario and every empty-state scenario in `docs/product-spec/` must have a passing Playwright test.
- Coverage enforced by Vitest's `--coverage` flag in CI; build fails if under 80%.

### Local Supabase Setup

```bash
supabase start
supabase db reset   # applies all migrations + seed.sql
pnpm vitest run --project=integration
```

Integration tests run against `http://localhost:54321` with the local anon key.

### Playwright Configuration

- Tests run against `http://localhost:3000`.
- Fixtures in `tests/e2e/fixtures/` provide: `authenticatedPage` (pre-seeded user logged in), `emptyPage` (user with no data), `seededPage` (user with full data set).
- All E2E tests are independent: each creates and tears down its own data via the Supabase admin client.
- Browser: Chromium only in CI. Chromium + Firefox + Safari in pre-release.

### CI Gates (must all pass before merge)

1. `tsc --noEmit`
2. `eslint .` (zero errors, zero warnings)
3. `prettier --check .`
4. `vitest run --coverage` (unit + integration, coverage ≥ 80%)
5. `playwright test` (E2E against preview deploy or local)
6. Lighthouse CI (LCP ≤ 2500 ms, CLS ≤ 0.1)
7. Vercel preview deploy (build must succeed)

---

## Performance Budgets

| Metric | Target | Measured By |
|---|---|---|
| Largest Contentful Paint (LCP) | ≤ 2.5 s | Vercel Speed Insights / Lighthouse CI |
| Interaction to Next Paint (INP) | ≤ 200 ms | Vercel Speed Insights |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | Vercel Speed Insights / Lighthouse CI |
| Server action p95 latency | ≤ 500 ms | `durationMs` in structured logs |
| Time to First Byte (TTFB) | ≤ 600 ms | Vercel Speed Insights |

**Lighthouse CI gate:** LCP ≤ 2500 ms, CLS ≤ 0.1. PR blocked if budgets exceeded. INP measured but not a hard CI block.

**Bundle size:** No single route chunk may exceed 200 kB gzipped. Checked manually on PRs that add new dependencies.

---

## Environments

| Environment | Purpose | Supabase Project | Vercel |
|---|---|---|---|
| Local | Development | Local Docker (`supabase start`) | `next dev` on port 3000 |
| Preview | PR validation | Shared dev Supabase project | Vercel preview deploy per PR |
| Production | Live users | Production Supabase project | Vercel production deploy from `main` |

**Migration promotion path:**
1. Migrations developed locally and committed to the branch.
2. On PR open: CI runs `supabase db push --db-url <preview-db-url>`.
3. On merge to `main`: CI runs `supabase db push --db-url <production-db-url>`.
4. Never apply migrations directly in the Supabase dashboard on any environment.

**Preview caveats:** Multiple PRs may push conflicting migrations to the shared dev project. Migration timestamps must be unique and must not depend on relative ordering with other in-flight PRs. The preview Supabase project is reset weekly from the production schema (data excluded) via a CI cron job.

---

## Configuration

All environment variables. Every `NEXT_PUBLIC_` entry is exposed to the browser.

| Variable | Required In | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions, CI | Bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | All | Canonical app URL (used in password reset redirectTo) |
| `RESEND_API_KEY` | Edge Functions, webhooks | Resend email sending |
| `RESEND_FROM_ADDRESS` | Edge Functions | From address for automation emails |
| `RESEND_WEBHOOK_SECRET` | Vercel (webhook route) | Signature verification for Resend webhooks |
| `SENTRY_DSN` | All server-side | Sentry error reporting endpoint |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side | Same DSN for client-side Sentry |
| `SENTRY_ORG` | CI | Sentry org slug for source maps upload |
| `SENTRY_PROJECT` | CI | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | CI | Token for Sentry CLI (source map uploads) |
| `UPSTASH_REDIS_REST_URL` | Vercel | Rate limiter Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel | Rate limiter Redis token |
| `SUPABASE_DB_URL` | CI | Postgres connection string for migration push |
