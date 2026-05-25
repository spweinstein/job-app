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
