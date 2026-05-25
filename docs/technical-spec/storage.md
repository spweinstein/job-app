# Technical Spec — File Storage

---

## Buckets

| Bucket Name | Access | Purpose |
|---|---|---|
| `avatars` | Private | User avatar images |
| `resume-attachments` | Private | Optional DOCX or PDF file attached to a resume |
| `cover-letter-attachments` | Private | Optional DOCX or PDF file attached to a cover letter |

**Bucket ownership:** All three buckets are created in Phase 4 (`docs/roadmap.md#phase-4`).

---

## Path Conventions

| Bucket | Path Pattern | Example |
|---|---|---|
| `avatars` | `<user_id>/avatar.<ext>` | `uuid-here/avatar.png` |
| `resume-attachments` | `<user_id>/<resume_id>/<filename>` | `uuid-here/resume-uuid/resume.docx` |
| `cover-letter-attachments` | `<user_id>/<cover_letter_id>/<filename>` | `uuid-here/cl-uuid/cover-letter.docx` |

---

## Signed URL Policy

All files served via signed URLs with a 1-hour TTL. Generated server-side in server actions; never generated in client components.

---

## Limits

| Bucket | Max File Size | Allowed MIME Types |
|---|---|---|
| `avatars` | 2 MB | `image/jpeg`, `image/png` |
| `resume-attachments` | 10 MB | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf` |
| `cover-letter-attachments` | 10 MB | `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/pdf` |

---

## Storage RLS

Supabase Storage RLS is enabled on all three buckets. Policy: `auth.uid()::text = (storage.foldername(name))[1]` — the first path segment must equal the authenticated user's ID.

---

## Virus Scanning

Deferred. Posture: no scanning in this version. Mitigated by: signed URLs (no public access), MIME type allow-list enforced server-side, and files served only to the owning user.
