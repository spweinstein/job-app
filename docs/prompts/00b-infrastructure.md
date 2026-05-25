Implement Phase 0b (infrastructure files) as defined in `docs/roadmap.md#phase-0-foundation`.
Follow all conventions in `docs/agent-guide.md`.
Auth and session handling spec: `docs/technical-spec/auth.md`.
Observability spec (Sentry + logger): `docs/technical-spec/observability.md`.
Security spec (CSP): `docs/technical-spec/security.md`.
Environment variables: `docs/technical-spec/testing.md#configuration`.

Phase 0a must be complete before starting this phase (the Next.js app must build and lint clean).

This is Phase 0b of a 3-part split of Phase 0:
- **00a:** project init, tooling, Next.js skeleton ✓
- **00b (this prompt):** Supabase clients, middleware, error infrastructure, Sentry
- **00c:** CI pipeline, test configs, smoke test

---

## Decision Gate Check

Before writing any code, re-read `docs/agents/claude/<branch-slug>/open-questions.md`.

**CSP nonce decision (already resolved):** The `Content-Security-Policy` header is set in
`src/middleware.ts` as a response header with a per-request nonce. `next.config.ts` does
NOT set a static CSP header. See `decisions.md` for the full rationale.

---

## Step 1 — Supabase CLI init

Create `supabase/config.toml` by running:

```bash
supabase init
```

If the command is not available, create the file manually. The `project_id` field must be
set to a placeholder value (`"placeholder-replace-with-real-project-ref"`) until the user
provisions a remote Supabase project.

Create two empty files:
- `supabase/seed.sql` — empty for Phase 0
- `supabase/migrations/.gitkeep` — no migrations in Phase 0

---

## Step 2 — Supabase JS client files

These three files form the Supabase client layer. They must use `@supabase/ssr` (not the
legacy `@supabase/auth-helpers-nextjs`). Environment variables are read from
`process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### `src/lib/supabase/server.ts`

Used in Server Components and Server Actions:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component context: cookie writes are ignored
          }
        },
      },
    },
  );
}
```

### `src/lib/supabase/client.ts`

Used in Client Components (only for auth state subscriptions, never for data fetching):

```typescript
import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

### `src/lib/supabase/middleware.ts`

Used exclusively inside `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import type { Database } from '@/types/database';

export function createClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
```

---

## Step 3 — Middleware (`src/middleware.ts`)

Phase 0 middleware does exactly two things:
1. Refresh the Supabase session cookie on every request.
2. Generate a per-request CSP nonce and set the `Content-Security-Policy` response header.

Auth redirects are NOT added until Phase 1.

```typescript
import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // 1. Refresh Supabase session
  const supabase = createClient(request, response);
  await supabase.auth.getUser();

  // 2. CSP nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : '*.supabase.co';
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://js.sentry-cdn.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https://${supabaseRef}`,
    `connect-src 'self' https://${supabaseRef} https://o*.ingest.sentry.io`,
    `frame-ancestors 'none'`,
  ].join('; ');

  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Step 4 — Error infrastructure

### `src/lib/errors.ts`

All 8 error codes from `docs/agent-guide.md#error-codes`. No additional codes may be added
without a spec change.

```typescript
export const ErrorCode = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type AppError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, string[]>;
};

export type ActionResult<T> = { data: T } | { error: AppError };
```

---

### `src/lib/logger.ts`

Structured logger per `docs/technical-spec/observability.md`. In development, pretty-prints
to stdout. In production, outputs JSON to stdout.

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  action?: string;
  durationMs?: number;
  error?: { message: string; stack?: string; code?: string };
  [key: string]: unknown;
};

function log(level: LogLevel, message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };

  if (process.env.NODE_ENV !== 'production') {
    const color = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' }[level];
    process.stdout.write(`${color}[${entry.level.toUpperCase()}]\x1b[0m ${entry.message}\n`);
    if (fields && Object.keys(fields).length > 0) {
      process.stdout.write(`  ${JSON.stringify(fields, null, 2)}\n`);
    }
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

export const logger = {
  debug: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) =>
    log('debug', message, fields),
  info: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) =>
    log('info', message, fields),
  warn: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) =>
    log('warn', message, fields),
  error: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) =>
    log('error', message, fields),
};
```

---

## Step 5 — Sentry

### `src/instrumentation.ts`

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: false,
    });
  }
}
```

### Update `src/app/layout.tsx`

Add nonce reading from the `x-nonce` header (set by middleware) and pass it to the Sentry
client script. Update the layout to:

```typescript
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Job Application Tracker',
  description: 'Track your job applications',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <body className={inter.className} data-nonce={nonce}>
        {children}
      </body>
    </html>
  );
}
```

The `data-nonce` attribute makes the nonce accessible to the Sentry client script loader.
Full Sentry client-side integration (wrapping the layout with `<Sentry.ErrorBoundary>`) is
not needed in Phase 0 since no user-facing features exist. The `instrumentation.ts` server
init is sufficient.

### Update `next.config.ts`

Wrap the config with `withSentryConfig`:

```typescript
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

---

## Step 6 — `.env.example`

Create `.env.example` documenting all 15 environment variables from
`docs/technical-spec/testing.md#configuration`. Use placeholder values only — no real
secrets.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (email)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_ADDRESS=noreply@example.com
RESEND_WEBHOOK_SECRET=your-resend-webhook-secret

# Sentry
SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
SENTRY_ORG=your-sentry-org-slug
SENTRY_PROJECT=your-sentry-project-slug
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Upstash Redis (rate limiting, Phase 1+)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# CI / migrations
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres
```

---

## Step 7 — Verify

```bash
pnpm typecheck
pnpm lint
pnpm exec prettier --check .
pnpm build
```

All must exit 0 with no warnings.

---

## Commit

```
feat: Phase 0b — Supabase clients, middleware, error infrastructure, Sentry
```

Push to `claude/discovery-foundation-B34vx`.

---

## Handoff

Phase 0b is complete when `pnpm build` succeeds with all of the above files in place.

Proceed to `/build 00c-ci`.
