# Technical Spec — Resume and Cover Letter Content Model

---

## Overview

Both resumes and cover letters store their content as versioned JSON in a `content` JSONB column. The version is tracked in `content_version`. When `content_version` increments, write a migration function in `src/lib/content-migrations.ts` that accepts any version and returns the latest. `updateResume` and `updateCoverLetter` must migrate content before saving if the stored version is stale.

Types live in `src/types/index.ts`. Valid `SectionType` values are defined in `docs/agent-guide.md#resume-section-types`.

---

## ResumeContentV1 (`content_version = 1`)

Each resume has a `sections` array. Every section shares base fields:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Client-generated; stable React key |
| `type` | `SectionType` | See `docs/agent-guide.md#resume-section-types` |
| `title` | `string` | User-editable heading |
| `order` | `integer` | Sort ascending; re-indexed to 0, 1, 2… on save |

Each section type adds its own data fields:

| Section type | Additional fields |
|---|---|
| `contact_info` | `data`: fullName, email, phone\|null, location\|null, linkedinUrl\|null, websiteUrl\|null |
| `summary` | `entries`: array of exactly one `{id, text}` |
| `work_experience` | `entries`: array of `{id, company, title, startDate (YYYY-MM), endDate (YYYY-MM\|null), bullets (string[])}` |
| `education` | `entries`: array of `{id, institution, degree, field?, startDate, endDate?, gpa?}` |
| `skills` | `entries`: array of `{id, category, items (string[])}` |
| `certifications` | `entries`: array of `{id, name, issuer, date?}` |
| `custom` | `entries`: array of `{id, heading?, body (plain text)}` |

### Section invariants (enforced by `updateResume`, not DB CHECK)

- Exactly one `contact_info` must be present; it cannot be removed.
- At most one `summary` may exist; it may be removed.
- All other section types may appear zero or more times.
- On save: `order` values are re-indexed to `0, 1, 2, …` in visual order.

### Default initial content (populated by `createResume`)

4 sections in order: `contact_info` (all fields empty/null), `summary` (one empty entry), `work_experience` (empty entries array), `education` (empty entries array).

---

## CoverLetterContentV1 (`content_version = 1`)

Flat structure:

| Field | Type |
|---|---|
| `schemaVersion` | `1` |
| `recipientName` | `string \| null` |
| `recipientTitle` | `string \| null` |
| `companyName` | `string \| null` |
| `date` | `string \| null` (YYYY-MM-DD) |
| `salutation` | `string` (e.g., "Dear Hiring Manager,") |
| `body` | `string[]` (array of plain-text paragraphs) |
| `closing` | `string` (e.g., "Sincerely,") |
| `senderName` | `string` |

---

## Fork Semantics

`forkResume` deep-copies `source.content` with `structuredClone`, sets `parent_id = source.id`, carries `root_id` from the source (not `source.id`). Edits to the fork never touch the source. Cycle prevention enforced at the application layer — see `docs/technical-spec/schema.md#resumes`.
