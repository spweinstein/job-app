# Decisions — foundation-plan-4xE1H

> Per-branch working log. Promoted to `docs/agents/decisions.md` on merge.

## 2026-05-25 — Tailwind 4.x without content paths in tailwind.config.ts
**Branch:** foundation-plan-4xE1H
**Context:** The stack spec requires Tailwind CSS 4.x, but the Phase 0 deliverables describe `tailwind.config.ts with src/** content paths`, which is a Tailwind 3.x pattern. Tailwind 4.x auto-detects content files and does not use the `content` array.
**Decision:** Use Tailwind 4.x as specified in the stack table. Create a `tailwind.config.ts` for future theme extensions but omit the `content` array. The primary Tailwind configuration lives in `src/app/globals.css` via `@import "tailwindcss"`.
**Consequence:** `tailwind.config.ts` will exist but will not include the `content: ['./src/**']` array. Any future agent that adds theme tokens appends to this file. The deliverable is fulfilled in spirit; the `src/**` content path note is treated as an artifact of the spec being written against v3.

## 2026-05-25 — Inter font and shadcn/ui New York style
**Branch:** foundation-plan-4xE1H
**Context:** `src/app/layout.tsx` requires a font; shadcn/ui init requires a style and base color choice. The spec does not constrain these.
**Decision:** Use Inter via `next/font/google`; shadcn/ui New York style with Neutral base color.
**Consequence:** Affects visual baseline for all future UI phases. Any phase can override component styling, but the token baseline is set here.

## 2026-05-25 — Minimal root page placeholder for Phase 0
**Branch:** foundation-plan-4xE1H
**Context:** The Phase 0 deliverables do not mention `src/app/page.tsx`, but a root route is needed for the smoke E2E test. Auth (Phase 1) is not yet set up.
**Decision:** Create a minimal placeholder page at `src/app/page.tsx` that renders "Job Application Tracker" and returns HTTP 200. No redirects. The smoke test asserts a 200 response.
**Consequence:** Phase 1 will replace or redirect this page after auth middleware is installed.
