Implement Phase 0a (project scaffold) as defined in `docs/roadmap.md#phase-0-foundation`.
Follow all conventions in `docs/agent-guide.md`.
Stack pinning is in `docs/technical-spec/index.md#stack-pinning`.
Test configuration is in `docs/technical-spec/testing.md`.

This is Phase 0a of a 3-part split of Phase 0:
- **00a (this prompt):** project init, tooling, Next.js skeleton
- **00b:** Supabase clients, middleware, error infrastructure, Sentry
- **00c:** CI pipeline, test configs, smoke test

Do not implement anything in 00b or 00c scope here.

> **As-built note (branch `build-00a-Egf3k`):** All three sub-phases (00a + 00b + 00c) were
> implemented in a single PR rather than separately. See `docs/agents/claude/build-00a-Egf3k/decisions.md`
> for the full rationale. Key divergences from this prompt that were approved during `/review 00a`:
> - `packageManager` is `pnpm@10.33.0` (not `pnpm@9`) — pnpm 10 required to avoid corepack conflicts.
> - `src/app/layout.tsx` uses Geist/Geist_Mono (not Inter) — create-next-app 15 default.
> - `src/app/page.tsx` returns a plain HTML placeholder (an initial redirect to `/login` was reverted when the login route stub was removed; both will be introduced together in Phase 1).
> - `src/app/error.tsx` has an empty `useEffect`; errors reach Sentry via `src/instrumentation.ts`.
> - `src/types/index.ts` and `src/types/database.ts` contain full stubs (00b scope) rather than `export {}`.

---

## Decision Gate Check

Before writing any code, re-read `docs/agents/claude/<branch-slug>/open-questions.md`.
No open questions block Phase 0a.

---

## Prerequisites

The repository contains only documentation. There is no `package.json` or any application code. Every file in this phase is new.

---

## Step 1 — Initialize Next.js

Run the following command in the repository root. Pass all flags to suppress interactive prompts:

```bash
pnpm create next-app@15 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm \
  --no-turbopack \
  --yes
```

This scaffolds `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`,
`src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, and base ESLint config.
All generated files will be overwritten in subsequent steps.

Run `pnpm install` after scaffolding to generate `pnpm-lock.yaml`.

---

## Step 2 — Initialize shadcn/ui

Run:

```bash
pnpm dlx shadcn@latest init --yes --base-color zinc --css-variables
```

This generates `components.json` and updates `src/app/globals.css` with shadcn/ui CSS
variables and base styles. No UI components are added in Phase 0.

---

## Step 3 — Update package.json

After scaffolding, edit `package.json` to exactly match this spec. Do not preserve the
create-next-app defaults where they differ.

### `engines` and `packageManager`

```json
{
  "engines": { "node": ">=22.0.0", "pnpm": ">=9.0.0" },
  "packageManager": "pnpm@9"
}
```

### Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --project=unit",
    "test:integration": "vitest run --project=integration",
    "test:e2e": "playwright test"
  }
}
```

### Runtime dependencies (add any missing, keep create-next-app ones)

- `next@^15`
- `react@^19`
- `react-dom@^19`
- `@supabase/supabase-js@^2`
- `@supabase/ssr` (latest)
- `zod@^3`
- `@sentry/nextjs@^8`
- `lucide-react` (latest)
- `resend@^4`
- `@upstash/ratelimit` (latest)
- `@upstash/redis` (latest)
- `date-fns` (latest)

### Dev dependencies (add any missing)

- `typescript@^5`
- `@types/node` (latest)
- `@types/react` (latest)
- `@types/react-dom` (latest)
- `vitest@^2`
- `@vitest/coverage-v8` (latest)
- `@playwright/test@^1`
- `prettier@^3`
- `@typescript-eslint/eslint-plugin` (latest)
- `@typescript-eslint/parser` (latest)
- `eslint-plugin-import` (latest)

Run `pnpm install` to update `pnpm-lock.yaml`.

---

## Step 4 — TypeScript config

Overwrite `tsconfig.json` with exactly:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Step 5 — ESLint config

Overwrite `eslint.config.mjs` with a flat config:

```js
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

const compat = new FlatCompat();

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsparser },
    plugins: { '@typescript-eslint': tseslint, import: importPlugin },
    rules: {
      ...tseslint.configs.strict.rules,
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
```

All rule violations must be errors (no warnings).

---

## Step 6 — Prettier config

Create `prettier.config.mjs`:

```js
/** @type {import('prettier').Config} */
const config = {
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  printWidth: 100,
};

export default config;
```

---

## Step 7 — .gitignore

Create `.gitignore` covering:

```
# env
.env*
!.env.example

# dependencies
node_modules/

# Next.js
.next/
out/

# Supabase
supabase/.temp/

# Vercel
.vercel/

# test artifacts
coverage/
playwright-report/
test-results/

# misc
*.tsbuildinfo
```

---

## Step 8 — next.config.ts

The Sentry wrapper (`withSentryConfig`) is added in Phase 0b. For Phase 0a, `next.config.ts`
is a minimal valid config:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

This will be updated in Phase 0b to wrap with `withSentryConfig`.

---

## Step 9 — Tailwind config

Verify that `tailwind.config.ts` (generated by `create-next-app` or `shadcn init`) has
`content` paths covering `src/**`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // shadcn/ui theme extensions go here (added by shadcn init)
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

If `shadcn init` already populated the theme extensions, preserve them.

---

## Step 10 — App skeleton

### `src/app/globals.css`

Keep whatever `shadcn init` generated (it includes Tailwind directives and CSS variables).
Add the Tailwind base directives if not already present:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `src/app/layout.tsx`

A minimal root layout. Sentry integration is added in Phase 0b.

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Job Application Tracker',
  description: 'Track your job applications',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### `src/app/page.tsx`

A minimal placeholder returning HTTP 200. This page exists only for Phase 0 so the smoke
test can assert a non-500 response. It will be replaced in Phase 1.

```typescript
export default function HomePage() {
  return (
    <main>
      <h1>Job Application Tracker</h1>
    </main>
  );
}
```

### `src/app/not-found.tsx`

```typescript
export default function NotFound() {
  return (
    <main>
      <h1>404 — Page not found</h1>
    </main>
  );
}
```

### `src/app/error.tsx`

```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <h1>Something went wrong</h1>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
```

Note: `console.error` is acceptable here because it is Next.js's standard error boundary
pattern and the error is not originating from application code. All other `console.*` calls
in application code are forbidden per `docs/agent-guide.md#do-not-do-list`.

---

## Step 11 — Type stubs

### `src/types/database.ts`

```typescript
// Generated by the Supabase CLI after migrations are applied.
// Run: supabase gen types typescript --local > src/types/database.ts
// Do not hand-edit this file.

export type Database = Record<string, never>;
```

### `src/types/index.ts`

```typescript
// Domain types. Populated starting in Phase 1.
// See docs/agent-guide.md#glossary for the full type inventory.
export {};
```

---

## Step 12 — Verify

Run the following and confirm all pass:

```bash
pnpm typecheck
pnpm lint
pnpm exec prettier --check .
```

If `pnpm lint` reports errors from scaffolded files, fix them before committing.

---

## Commit

Commit all files with message:

```
feat: Phase 0a — project scaffold, tooling, Next.js skeleton
```

Then push to `claude/discovery-foundation-B34vx`.

---

## Handoff

Phase 0a is complete when:
- `pnpm build` succeeds
- `pnpm typecheck` exits 0
- `pnpm lint` exits 0 with zero warnings
- `pnpm exec prettier --check .` exits 0

Proceed to `/build 00b-infrastructure`.
