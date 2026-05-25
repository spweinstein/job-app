Implement Phase 0c (CI pipeline, test configuration, smoke test) as defined in
`docs/roadmap.md#phase-0-foundation`.
Follow all conventions in `docs/agent-guide.md`.
Testing strategy and CI gates: `docs/technical-spec/testing.md`.

Phase 0b must be complete before starting this phase (`pnpm build` must succeed).

This is Phase 0c of a 3-part split of Phase 0:
- **00a:** project init, tooling, Next.js skeleton ✓
- **00b:** Supabase clients, middleware, error infrastructure, Sentry ✓
- **00c (this prompt):** CI pipeline, test configs, smoke test

---

## Step 1 — Vitest configuration

Create `vitest.config.ts` at the repo root with two Vitest projects: `unit` and
`integration`. Coverage target is ≥ 80% on `src/actions/` and `src/lib/`.

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    workspace: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.{test,spec}.ts'],
          environment: 'node',
          coverage: {
            provider: 'v8',
            include: ['src/actions/**', 'src/lib/**'],
            thresholds: { lines: 80 },
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.{test,spec}.ts'],
          environment: 'node',
          setupFiles: ['tests/integration/setup.ts'],
          testTimeout: 30000,
        },
      },
    ],
  },
});
```

Create `tests/integration/setup.ts`:

```typescript
import { beforeAll } from 'vitest';

beforeAll(() => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'Integration tests require NEXT_PUBLIC_SUPABASE_URL. Run `supabase start` first.',
    );
  }
});
```

---

## Step 2 — Playwright configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

---

## Step 3 — Renovate

Create `renovate.json`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchUpdateTypes": ["minor", "major"],
      "automerge": false
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

---

## Step 4 — Lighthouse CI

Create `lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/"],
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "categories:performance": ["warn", { "minScore": 0.8 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## Step 5 — GitHub Actions CI pipeline

Create `.github/workflows/ci.yml`. The pipeline runs 6 sequential jobs: lint → typecheck →
unit-test → integration-test → e2e → lighthouse.

All jobs use `ubuntu-latest` and `Node.js 22`. Required secrets (must be configured in
GitHub repository settings before CI can pass end-to-end):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`,
`SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `SUPABASE_DB_URL`.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
  SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
  NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
  SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
  SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  UPSTASH_REDIS_REST_URL: ${{ secrets.UPSTASH_REDIS_REST_URL }}
  UPSTASH_REDIS_REST_TOKEN: ${{ secrets.UPSTASH_REDIS_REST_TOKEN }}
  SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}

jobs:
  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm exec prettier --check .

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  unit-test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --coverage

  integration-test:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: [unit-test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase start
      - run: pnpm test:integration
      - run: supabase stop --no-backup

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [integration-test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: [e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm start &
      - run: sleep 5
      - run: npx lhci autorun
```

---

## Step 6 — Test directory scaffolding

Create the following empty placeholder files so Git tracks the directories:

- `tests/unit/.gitkeep`
- `tests/integration/.gitkeep`
- `tests/e2e/fixtures/.gitkeep`

The `tests/integration/setup.ts` file was created in Step 1.

---

## Step 7 — Smoke test

Create `tests/e2e/smoke.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('app loads without a 500 error', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(500);
});
```

---

## Step 8 — Verify

```bash
pnpm typecheck
pnpm lint
pnpm exec prettier --check .
pnpm build
```

All must exit 0. The E2E test and Lighthouse CI will be validated when CI runs on the PR.

---

## Commit

```
feat: Phase 0c — CI pipeline, test configuration, smoke test
```

Push to `claude/discovery-foundation-B34vx`.

---

## Phase 0 Definition of Done

Phase 0 is complete when a no-op PR (e.g., README update) runs the full CI pipeline and all
6 gates pass:

1. `eslint .` → 0 errors, 0 warnings
2. `tsc --noEmit` → 0 errors
3. `prettier --check .` → 0 errors
4. `vitest run --project=unit --coverage` → passes, coverage ≥ 80% (N/A in Phase 0 since
   there are no functions to cover; threshold is met by default)
5. `playwright test` → smoke test passes
6. Vercel preview deploy → build succeeds, no runtime errors

**User action required before CI fully passes:**
- Provision a Supabase project and add all `NEXT_PUBLIC_SUPABASE_*` secrets to GitHub and Vercel
- Link the Vercel project to this GitHub repo
- Add all `.env.example` variables as GitHub Actions secrets

See `docs/agents/claude/<branch-slug>/open-questions.md` for the full details on these
external provisioning steps.
