# Product Specification — Index

All terminology in this directory defers to `docs/agent-guide.md#glossary`.

## Table of Contents

- [Personas and Roles](#personas-and-roles)
- [User Journeys](#user-journeys)
- [Screen Inventory](#screen-inventory)
- [Default State Pattern](#default-state-pattern)
- [Open Questions](#open-questions)

Feature files (Gherkin + state matrices + validation rules):

| File | Feature |
|---|---|
| `auth.md` | Signup, Login, Forgot Password, Reset Password |
| `dashboard.md` | Dashboard overview and funnel chart |
| `companies.md` | Companies CRUD |
| `applications.md` | Applications CRUD and status changes |
| `resumes.md` | Resumes CRUD, fork, section editor |
| `cover-letters.md` | Cover Letters CRUD and fork |
| `calendar-items.md` | Calendar Items CRUD and task completion |
| `automations.md` | Automations CRUD and execution history |
| `profile.md` | Profile edit and password change |
| `accessibility.md` | Global accessibility criteria (all screens) |

---

## Personas and Roles

### Authenticated User

The only role in this application. Every authenticated user owns all data they create; no sharing, collaboration, or admin role exists in this version.

**Can do:**
- Create, read, update, and delete their own Companies, Applications, Resumes, Cover Letters, Calendar Items, and Automations.
- Fork any of their own Resumes or Cover Letters.
- Configure Automations that act on their behalf (send email to their address, create tasks, update application statuses).
- Update their Profile (display name, avatar, notification preferences).
- Reset their password.

**Cannot do:**
- See or modify another user's data (enforced by RLS).
- Assign data to another user.
- Create additional user accounts.

### Unauthenticated Visitor

**Can access:**
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password` (only via valid token link)

**Cannot access:**
- Any other route. Middleware redirects all other requests to `/login`.
- Any server action or API endpoint that operates on data. Returns `UNAUTHENTICATED` error.

---

## User Journeys

### Journey 1: First-Time Signup → First Application Logged

1. Visitor navigates to `/signup`.
2. Enters email and password. Clicks "Create account."
3. Receives confirmation email. Clicks confirmation link.
4. Redirected to `/dashboard` (empty state, no data).
5. Clicks "Add company" on the Companies empty state (or via nav).
6. Fills in company name. Saves. Redirected to the Company detail page.
7. Clicks "Add application" on the Company detail page.
8. Selects role title, sets status to `applied`, optionally attaches a Resume. Saves.
9. Redirected to the Application detail page. Application appears in the Companies list and the Dashboard.

**Success condition:** Application row exists in DB with correct `user_id`, `company_id`, `status = 'applied'`.

### Journey 2: Forking a Resume to Tailor for a Role

1. User navigates to `/resumes`.
2. Selects an existing resume from the list.
3. Clicks "Fork for this role."
4. Prompted to optionally link the fork to an existing Application or name it directly.
5. A new Resume row is created: `parent_id = <source id>`, `root_id = <source root_id>`, content is a deep copy.
6. User is redirected to the fork's edit page (`/resumes/<new-id>/edit`).
7. User edits the fork. Changes are saved to the fork row only. The source resume is unmodified.

**Success condition:** Source resume `content` is byte-for-byte identical before and after the fork and edit.

### Journey 3: Setting Up an Automation and Observing It Fire

1. User navigates to `/automations`.
2. Clicks "New automation."
3. Selects trigger: `application_status_changed`.
4. Configures condition: `status becomes 'offer'`.
5. Selects action: `send_email`.
6. Configures action: subject = "Offer received for {{application.role_title}} at {{company.name}}", body template (plain text).
7. Saves. Automation row created with `enabled = true`.
8. User updates an Application's status to `offer`.
9. An `automation_events` row is written by the Postgres trigger.
10. The Edge Function processes the event, executes the action, writes an `automation_action_logs` row with `status = 'succeeded'`.
11. User receives the email within 60 seconds.
12. User can view the automation's execution history on the Automation detail page.

**Success condition:** `automation_action_logs` row with `status = 'succeeded'` and email delivered to user's address.

### Journey 4: Recovering from a Forgotten Password

1. User navigates to `/login`. Clicks "Forgot password?"
2. Redirected to `/forgot-password`. Enters email. Clicks "Send reset link."
3. Receives email containing a reset link to `/reset-password?token=<token>`.
4. Clicks link. Redirected to `/reset-password` (token auto-populated from URL).
5. Enters new password (and confirmation). Clicks "Reset password."
6. Password updated. User redirected to `/login` with success toast: "Password reset. Please log in."
7. User logs in with new password.

**Success condition:** Previous password no longer works. New password authenticates successfully.

---

## Screen Inventory

Each route lists: purpose, primary actions, navigation targets, and notes.

| Route | Purpose | Primary Actions | Links To |
|---|---|---|---|
| `/login` | Authenticate existing user | Submit credentials, navigate to signup/forgot-password | `/signup`, `/forgot-password`, `/dashboard` (on success) |
| `/signup` | Create new account | Submit email + password | `/login`, (email confirmation flow) |
| `/forgot-password` | Request password reset email | Submit email | `/login` |
| `/reset-password` | Set new password via token | Submit new password + confirmation | `/login` (on success) |
| `/dashboard` | Overview: recent applications, upcoming calendar items, active automations count, application status funnel chart | Quick-add application, click funnel bar to filter applications, navigate to all major sections | `/applications`, `/applications?status=<status>`, `/calendar`, `/companies`, `/resumes`, `/automations` |
| `/companies` | List all companies | Create company, search/filter | `/companies/[id]`, `/companies/new` |
| `/companies/new` | Create a company | Submit form | `/companies/[id]` (on success), `/companies` (cancel) |
| `/companies/[id]` | Company detail + list of its applications | Add application, edit company, delete company | `/companies/[id]/edit`, `/applications/new?companyId=[id]`, `/applications/[id]` |
| `/companies/[id]/edit` | Edit company fields | Submit form, delete company | `/companies/[id]` (on success/cancel) |
| `/applications` | List all applications across all companies | Filter by status/company, create application | `/applications/[id]`, `/applications/new` |
| `/applications/new` | Create an application | Submit form (requires company selection) | `/applications/[id]` (on success), `/applications` (cancel) |
| `/applications/[id]` | Application detail: status, linked resume, cover letter, calendar items, automation logs | Edit, change status, fork resume, fork cover letter, add calendar item | `/applications/[id]/edit`, `/resumes/[id]`, `/cover-letters/[id]`, `/calendar/new?applicationId=[id]` |
| `/applications/[id]/edit` | Edit application fields | Submit form, delete application | `/applications/[id]` (on success/cancel) |
| `/resumes` | List all resumes (roots and forks) | Create resume, fork, search | `/resumes/[id]`, `/resumes/new` |
| `/resumes/new` | Create a root resume | Submit form | `/resumes/[id]/edit` (on success) |
| `/resumes/[id]` | Resume detail: content preview, fork lineage, linked applications | Fork, edit, delete (if no descendants), navigate lineage | `/resumes/[id]/edit`, `/resumes/[id]/fork`, `/applications/[id]` |
| `/resumes/[id]/edit` | Structured section editor: add/remove/reorder sections | Save, cancel, add section, remove section, reorder sections | `/resumes/[id]` |
| `/resumes/[id]/fork` | Fork resume: name the fork, optionally link to application | Submit | `/resumes/[new-id]/edit` (on success) |
| `/cover-letters` | List all cover letters | Create, fork, search | `/cover-letters/[id]`, `/cover-letters/new` |
| `/cover-letters/new` | Create a root cover letter | Submit form | `/cover-letters/[id]/edit` (on success) |
| `/cover-letters/[id]` | Cover letter detail: content preview, fork lineage, linked application | Fork, edit, delete (if no descendants), navigate lineage | `/cover-letters/[id]/edit`, `/cover-letters/[id]/fork`, `/applications/[id]` |
| `/cover-letters/[id]/edit` | Edit cover letter content | Save, cancel | `/cover-letters/[id]` |
| `/cover-letters/[id]/fork` | Fork cover letter | Submit | `/cover-letters/[new-id]/edit` (on success) |
| `/calendar` | Month/list view of all calendar items | Create item, filter by kind, filter by application | `/calendar/new`, `/calendar/[id]`, `/applications/[id]` |
| `/calendar/new` | Create a calendar item | Submit form (select kind, optionally link application) | `/calendar/[id]` (on success), `/calendar` (cancel) |
| `/calendar/[id]` | Calendar item detail | Edit, delete, mark task complete | `/calendar/[id]/edit`, `/applications/[id]` (if linked) |
| `/calendar/[id]/edit` | Edit calendar item | Submit form | `/calendar/[id]` (on success/cancel) |
| `/automations` | List automations with enabled/disabled toggle | Create, enable/disable, view logs | `/automations/new`, `/automations/[id]` |
| `/automations/new` | Create an automation | Submit form (trigger + action config) | `/automations/[id]` (on success) |
| `/automations/[id]` | Automation detail: config, execution history log | Edit, enable/disable, delete | `/automations/[id]/edit` |
| `/automations/[id]/edit` | Edit automation config | Submit form | `/automations/[id]` (on success/cancel) |
| `/profile` | View and edit profile: display name, avatar, notification preferences | Submit form, change password | `/profile/change-password` |
| `/profile/change-password` | Change password (requires current password) | Submit form | `/profile` (on success/cancel) |

### Error and Auth Screens

| Route | Purpose |
|---|---|
| `/login` | Shown on UNAUTHENTICATED redirect with query `?redirect=/original-path` preserved |
| `/_error` (Next.js default) | Unhandled server error. Shows generic message; logs full error to Sentry. |
| Custom 404 (Next.js `not-found.tsx`) | Resource not found or FORBIDDEN (same page, no information leakage). |

---

## Default State Pattern

All protected screens redirect to `/login?redirect=<path>` on unauthorized access (middleware-enforced before render). The Unauthorized row is therefore omitted from all state matrices.

The following standard pattern applies to CRUD form and detail screens unless a feature file explicitly documents deviations:

| State | Behavior |
|---|---|
| Loading | Skeleton fields or cards while server data loads. |
| Empty | N/A for form screens (never empty — always blank or pre-filled). For detail screens: resource not found or FORBIDDEN redirects to the global 404 page. |
| Populated | Fields pre-filled from server data; content rendered. |
| Partial failure | Inline field-level error; unaffected fields remain usable. |
| Full failure | Inline error above the submit button with the error message; form data preserved. |
| Offline | Submit/action buttons disabled; offline banner shown. |

Any screen that deviates from this pattern documents it explicitly in its feature file.

---

## Open Questions

1. **Account deletion**: The `/profile` screen previously listed "delete account" as a primary action. This is deferred — no server action, acceptance criteria, or data-deletion cascade is specified for account deletion. It is not in scope for any current phase. Define behavior (immediate hard-delete vs. grace period) before implementing.
