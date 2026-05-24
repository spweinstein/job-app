# Product Specification

All terminology in this document defers to `docs/agent-guide.md#glossary`.

---

## Table of Contents

1. [Personas and Roles](#personas-and-roles)
2. [User Journeys](#user-journeys)
3. [Screen Inventory](#screen-inventory)
4. [Feature Acceptance Criteria](#feature-acceptance-criteria)
   - [Auth](#auth)
   - [Companies](#companies)
   - [Applications](#applications)
   - [Resumes](#resumes)
   - [Cover Letters](#cover-letters)
   - [Calendar Items](#calendar-items)
   - [Automations](#automations)
   - [Profile](#profile)
5. [State Matrices](#state-matrices)
6. [Validation Rules](#validation-rules)
7. [Accessibility Acceptance Criteria](#accessibility-acceptance-criteria)
8. [Open Questions](#open-questions)

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
| `/resumes/[id]/edit` | Structured section editor: add/remove/reorder sections; each section has a typed form (repeatable field sets per entry) | Save, cancel, add section, remove section, reorder sections | `/resumes/[id]` |
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

## Feature Acceptance Criteria

Each feature block has a stable heading that future prompts in `docs/prompts/` will cite.

---

### Auth

#### Auth — Signup

```gherkin
Feature: User Signup

  Scenario: Successful signup
    Given I am an unauthenticated visitor
    When I navigate to /signup
    And I enter a valid email "user@example.com" and password "Password1!"
    And I click "Create account"
    Then I see a message "Check your email to confirm your account."
    And an unconfirmed user exists in auth.users with email "user@example.com"

  Scenario: Duplicate email
    Given a user with email "existing@example.com" already exists
    When I submit /signup with email "existing@example.com"
    Then I see the error "An account with this email already exists."
    And no new user is created

  Scenario: Weak password
    Given I am on /signup
    When I enter password "abc"
    And I click "Create account"
    Then I see the error "Password must be at least 8 characters and include a number."
    And no request is sent to the server
```

#### Auth — Login

```gherkin
Feature: User Login

  Scenario: Successful login
    Given a confirmed user with email "user@example.com" and password "Password1!"
    When I navigate to /login and submit those credentials
    Then I am redirected to /dashboard
    And a valid session cookie is set

  Scenario: Wrong password
    When I submit /login with correct email and wrong password
    Then I see "Invalid email or password."
    And no session cookie is set

  Scenario: Redirect preservation
    Given I am unauthenticated
    When I navigate to /applications
    Then I am redirected to /login?redirect=/applications
    When I log in successfully
    Then I am redirected to /applications
```

#### Auth — Forgot Password

```gherkin
Feature: Forgot Password

  Scenario: Valid email submitted
    Given a user exists with email "user@example.com"
    When I submit /forgot-password with that email
    Then I see "If that email is registered, you will receive a reset link."
    And a password reset email is sent to "user@example.com"

  Scenario: Unknown email submitted
    When I submit /forgot-password with "unknown@example.com"
    Then I see "If that email is registered, you will receive a reset link."
    And no email is sent
    (Note: identical response prevents email enumeration)
```

#### Auth — Reset Password

```gherkin
Feature: Reset Password

  Scenario: Valid token, passwords match
    Given I have a valid reset token
    When I navigate to /reset-password?token=<token>
    And I enter matching new passwords "NewPass1!"
    And I click "Reset password"
    Then I see a success toast "Password reset. Please log in."
    And I am redirected to /login
    And the old password no longer works

  Scenario: Expired token
    Given I navigate to /reset-password with an expired token
    Then I see "This reset link has expired. Request a new one."
    And a link to /forgot-password is shown

  Scenario: Passwords do not match
    Given I am on /reset-password with a valid token
    When I enter mismatched passwords
    Then I see "Passwords do not match."
    And the form is not submitted
```

---

### Dashboard

#### Dashboard — Funnel Chart

```gherkin
Feature: Dashboard Funnel Chart

  Scenario: Funnel chart shows application count per status
    Given I have applications with statuses "applied"×3, "screening"×1, "offer"×1
    When I navigate to /dashboard
    Then I see a chart with one bar per status
    And the "applied" bar shows count 3
    And statuses with zero applications are still shown with count 0

  Scenario: Clicking a funnel bar navigates to filtered applications list
    Given the dashboard funnel chart is visible
    When I click the "offer" bar
    Then I am navigated to /applications?status=offer

  Scenario: Funnel chart replaced by CTA card when user has no applications
    Given I have no applications
    When I navigate to /dashboard
    Then I do not see the funnel chart
    And I see a wide card with a distinct background color and rounded corners
    And the card contains a prompt to log my first application
    And clicking the card navigates to /applications/new
```

---

### Companies

#### Companies — List View

```gherkin
Feature: Companies List

  Scenario: Empty state
    Given I am authenticated with no companies
    When I navigate to /companies
    Then I see the heading "Companies"
    And I see "No companies yet. Add your first company to get started."
    And I see an "Add company" button

  Scenario: Populated list
    Given I have 3 companies
    When I navigate to /companies
    Then I see all 3 companies listed
    And each row shows the company name and the count of applications

  Scenario: Search
    Given I have companies "Acme Corp" and "Beta LLC"
    When I type "acme" in the search field
    Then only "Acme Corp" is shown
    And "Beta LLC" is not shown
```

#### Companies — Create

```gherkin
Feature: Create Company

  Scenario: Successful creation
    Given I am on /companies/new
    When I enter name "Acme Corp"
    And I click "Save"
    Then a company row is created with my user_id
    And I am redirected to /companies/<new-id>
    And the Company detail page shows "Acme Corp"

  Scenario: Missing name
    Given I am on /companies/new
    When I click "Save" without entering a name
    Then I see "Company name is required."
    And no row is created
```

#### Companies — Edit

```gherkin
Feature: Edit Company

  Scenario: Successful edit
    Given a company "Acme Corp" owned by me
    When I navigate to /companies/<id>/edit
    And I change the name to "Acme Corporation"
    And I click "Save"
    Then the company row is updated
    And I am redirected to /companies/<id>
    And the page shows "Acme Corporation"
```

#### Companies — Delete

```gherkin
Feature: Delete Company

  Scenario: Delete with no applications
    Given a company with no applications
    When I click "Delete company" and confirm the dialog
    Then the company row is deleted
    And I am redirected to /companies
    And the company no longer appears in the list

  Scenario: Delete with applications
    Given a company with 2 applications
    When I click "Delete company"
    Then I see "Deleting this company will also delete its 2 application(s). This cannot be undone."
    When I confirm
    Then the company and its applications are deleted
```

---

### Applications

#### Applications — List View

```gherkin
Feature: Applications List

  Scenario: Filter by status
    Given I have applications with statuses "applied", "offer", "rejected"
    When I select "Offer" from the status filter
    Then only applications with status "offer" are shown

  Scenario: Filter by company
    Given I have applications at "Acme" and "Beta"
    When I select "Acme" from the company filter
    Then only Acme applications are shown
```

**Note:** The status filter dropdown must list all nine statuses defined in `docs/agent-guide.md#application-statuses` (`draft`, `applied`, `screening`, `interviewing`, `offer`, `negotiating`, `accepted`, `rejected`, `withdrawn`). The scenarios above use a subset for illustration only.

#### Applications — Create

```gherkin
Feature: Create Application

  Scenario: Successful creation
    Given I am on /applications/new
    When I select company "Acme Corp"
    And I enter role title "Software Engineer"
    And I set status to "applied"
    And I click "Save"
    Then an application row is created
    And I am redirected to /applications/<new-id>

  Scenario: Missing required fields
    Given I am on /applications/new
    When I click "Save" without selecting a company or entering a role title
    Then I see "Company is required." and "Role title is required."
```

#### Applications — Status Change

```gherkin
Feature: Application Status Change

  Scenario: Status change triggers automation event
    Given an application with status "applied"
    And an automation with trigger "application_status_changed" and condition "status becomes offer"
    When I change the application status to "offer"
    Then the application row is updated
    And an automation_events row is written with trigger_type "application_status_changed"
```

#### Applications — Delete

```gherkin
Feature: Delete Application

  Scenario: Successful deletion with no linked calendar items
    Given an application owned by me with no linked calendar items
    When I click "Delete application" and confirm
    Then the application row is deleted
    And I am redirected to /applications

  Scenario: Delete application with linked calendar items
    Given an application with 1 interview and 2 tasks linked to it
    When I click "Delete application"
    Then I see "Deleting this application will also delete 1 interview and 2 tasks. This cannot be undone."
    When I confirm
    Then the application and all its linked calendar items are deleted
    And I am redirected to /applications

  Scenario: Confirmation message reflects correct counts and kinds
    Given an application with 2 meetings and 1 interview linked
    When I click "Delete application"
    Then I see "Deleting this application will also delete 1 interview and 2 meetings. This cannot be undone."
```

---

### Resumes

#### Resumes — List View

```gherkin
Feature: Resumes List

  Scenario: Shows root and fork resumes
    Given I have 1 root resume and 2 forks of it
    When I navigate to /resumes
    Then I see all 3 resumes
    And fork resumes show an indentation or "Fork of <parent name>" label
```

#### Resumes — Create

```gherkin
Feature: Create Resume

  Scenario: Create root resume
    Given I am on /resumes/new
    When I enter name "Base Resume"
    And I click "Save"
    Then a resume row is created with parent_id = NULL and root_id = id
    And I am redirected to /resumes/<new-id>/edit
```

#### Resumes — Fork

```gherkin
Feature: Fork Resume

  Scenario: Fork creates a deep copy
    Given a resume with id <source-id> and content {"sections": [...]}
    When I click "Fork" on /resumes/<source-id>
    And I name the fork "Resume for Acme"
    And I click "Create fork"
    Then a new resume row is created with parent_id = <source-id>
    And root_id = <source root_id>
    And content is a deep copy of the source content
    And I am redirected to /resumes/<new-id>/edit

  Scenario: Editing a fork does not mutate the source
    Given a forked resume with parent_id = <source-id>
    When I edit the fork's content and save
    Then the source resume's content is unchanged
```

#### Resumes — Edit

```gherkin
Feature: Edit Resume Sections

  Scenario: Add a new section
    Given I am editing a resume with no "certifications" section
    When I click "Add section" and select "Certifications"
    Then a new CertificationsSection is appended with order = max(existing orders) + 1
    And the section appears at the bottom of the editor

  Scenario: Remove a non-required section
    Given I am editing a resume with a "skills" section
    When I click "Remove section" on the Skills section
    Then the section is removed from content.sections
    And the remaining sections retain their relative order

  Scenario: Cannot remove contact_info section
    Given I am editing a resume
    Then the "Contact" section has no "Remove section" button

  Scenario: Reorder sections
    Given I have "Work Experience" at order 2 and "Education" at order 3
    When I drag "Education" above "Work Experience"
    Then "Education" has a lower order value than "Work Experience"
    And the editor renders them in the new order
```

#### Resumes — Delete

```gherkin
Feature: Delete Resume

  Scenario: Cannot delete a resume with descendants
    Given a resume that has 1 fork
    When I click "Delete"
    Then I see "This resume has forks and cannot be deleted. Delete all forks first."

  Scenario: Delete a leaf resume (no descendants)
    Given a fork resume with no further forks
    When I click "Delete" and confirm
    Then the resume row is deleted
```

---

### Cover Letters

#### Cover Letters — List View

```gherkin
Feature: Cover Letters List

  Scenario: Shows root and fork cover letters
    Given I have 1 root cover letter and 2 forks of it
    When I navigate to /cover-letters
    Then I see all 3 cover letters
    And fork cover letters show a "Fork of <parent name>" label
```

#### Cover Letters — Create

```gherkin
Feature: Create Cover Letter

  Scenario: Create root cover letter
    Given I am on /cover-letters/new
    When I enter name "Base Cover Letter"
    And I click "Save"
    Then a cover_letters row is created with parent_id = NULL and root_id = id
    And I am redirected to /cover-letters/<new-id>/edit
```

#### Cover Letters — Fork

```gherkin
Feature: Fork Cover Letter

  Scenario: Fork creates a deep copy
    Given a cover letter with id <source-id> and content {"body": [...]}
    When I click "Fork" on /cover-letters/<source-id>
    And I name the fork "Cover Letter for Acme"
    And I click "Create fork"
    Then a new cover_letters row is created with parent_id = <source-id>
    And root_id = <source root_id>
    And content is a deep copy of the source content
    And I am redirected to /cover-letters/<new-id>/edit

  Scenario: Editing a fork does not mutate the source
    Given a forked cover letter with parent_id = <source-id>
    When I edit the fork's content and save
    Then the source cover letter's content is unchanged
```

#### Cover Letters — Delete

```gherkin
Feature: Delete Cover Letter

  Scenario: Cannot delete a cover letter with descendants
    Given a cover letter that has 1 fork
    When I click "Delete"
    Then I see "This cover letter has forks and cannot be deleted. Delete all forks first."

  Scenario: Delete a leaf cover letter (no descendants)
    Given a fork cover letter with no further forks
    When I click "Delete" and confirm
    Then the cover_letters row is deleted
```

---

### Calendar Items

#### Calendar Items — List and Views

```gherkin
Feature: Calendar Views

  Scenario: Month view shows items on correct dates
    Given a calendar item of kind "interview" on 2026-06-15
    When I navigate to /calendar and select June 2026 in month view
    Then I see the interview on June 15

  Scenario: Filter by kind
    Given items of kinds "task", "meeting", "interview"
    When I select "Interviews" filter
    Then only "interview" kind items are shown

  Scenario: Filter by application
    Given calendar items linked to application "Software Engineer at Acme" and unlinked items
    When I select "Software Engineer at Acme" from the application filter
    Then only calendar items linked to that application are shown
    And unlinked items are not shown
```

#### Calendar Items — Create

```gherkin
Feature: Create Calendar Item

  Scenario: Create a task
    Given I am on /calendar/new
    When I select kind "task"
    And I enter title "Send follow-up email"
    And I set due date to 2026-06-20
    And I click "Save"
    Then a calendar_items row is created with kind = 'task' and due_at = '2026-06-20'
    And it appears on the calendar

  Scenario: Create an interview linked to an application
    Given I am on /calendar/new
    When I select kind "interview"
    And I enter title "Technical Interview"
    And I set start_at and end_at
    And I link to application "Software Engineer at Acme"
    And I click "Save"
    Then a calendar_items row is created with kind = 'interview' and application_id set

  Scenario: Interview requires application link
    Given I am on /calendar/new with kind "interview" selected
    When I click "Save" without linking an application
    Then I see "Interviews must be linked to an application."
```

#### Calendar Items — Complete Task

```gherkin
Feature: Complete Task

  Scenario: Mark task complete
    Given a calendar item with kind = 'task' and completed_at = NULL
    When I click "Mark complete"
    Then completed_at is set to the current timestamp
    And the task appears with a strikethrough or "Completed" label
```

---

### Automations

#### Automations — List

```gherkin
Feature: Automations List

  Scenario: Toggle enabled state
    Given an automation with enabled = true
    When I click the toggle next to it on /automations
    Then the automation's enabled field becomes false
    And the toggle visually reflects the new state
```

#### Automations — Create

```gherkin
Feature: Create Automation

  Scenario: Create application_status_changed → send_email automation
    Given I am on /automations/new
    When I select trigger "Application status changed"
    And I set condition "status becomes offer"
    And I select action "Send email"
    And I enter subject "You got an offer!" and body "Congrats on your offer at {{company.name}}."
    And I click "Save"
    Then an automations row is created with enabled = true
    And trigger_type = 'application_status_changed'
    And action_type = 'send_email'

  Scenario: Missing subject for send_email action
    When I configure send_email action without a subject
    Then I see "Email subject is required."
```

#### Automations — Execution History

```gherkin
Feature: Automation Execution History

  Scenario: View execution log
    Given an automation that has fired 3 times
    When I navigate to /automations/<id>
    Then I see 3 entries in the execution history
    And each entry shows timestamp, trigger event, and status (succeeded/failed)
```

---

### Profile

#### Profile — Edit

```gherkin
Feature: Edit Profile

  Scenario: Update display name
    Given I am on /profile
    When I change "Display name" to "Jane Doe"
    And I click "Save"
    Then the profiles row is updated with full_name = 'Jane Doe'
    And the page shows "Jane Doe"

  Scenario: Upload avatar
    Given I am on /profile
    When I upload a PNG file under 2 MB
    Then the file is stored in the "avatars" bucket
    And avatar_url is updated in profiles
    And the avatar image is displayed

  Scenario: Disable email notifications
    Given I am on /profile with notification_email_enabled = true
    When I toggle "Email notifications" off
    And I click "Save"
    Then profiles.notification_email_enabled is set to false
    And subsequent automation send_email actions for my account are skipped

  Scenario: Re-enable email notifications
    Given I am on /profile with notification_email_enabled = false
    When I toggle "Email notifications" on
    And I click "Save"
    Then profiles.notification_email_enabled is set to true
    And subsequent automation send_email actions resume delivery
```

#### Profile — Change Password

```gherkin
Feature: Change Password

  Scenario: Successful change
    Given I am on /profile/change-password
    When I enter my current password correctly
    And I enter a new password and confirmation that match
    And I click "Update password"
    Then I see "Password updated successfully."
    And the new password authenticates me on next login

  Scenario: Wrong current password
    When I enter the wrong current password
    Then I see "Current password is incorrect."
```

---

## State Matrices

For each screen, all seven states are addressed. "N/A — [reason]" is used only where a state genuinely cannot occur.

### `/dashboard`

| State | Behavior |
|---|---|
| Loading | Skeleton placeholders for all four widget areas. |
| No applications | Funnel chart area replaced by a wide CTA card (distinct background color, rounded corners) prompting the user to log their first application, linking to `/applications/new`. Recent-applications and upcoming-items areas each show their own empty messages. |
| Populated | All widgets render real data; funnel chart shows bars for all 9 statuses (statuses with zero applications shown at count 0). |
| Widget partial failure | The failed widget shows an inline error with a Retry button; all other widgets render normally. |
| Full failure | All widgets show an inline error with a Retry button. |
| Offline | Offline banner shown across the top; all widget interactions disabled. |
| Unauthorized | Middleware redirects to `/login` before page renders. |

### `/companies` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton rows (3 placeholder cards) shown while fetch is in flight. |
| Empty | "No companies yet. Add your first company to get started." with "Add company" button. |
| Populated | List of company cards, each with name and application count. |
| Partial failure | If some companies fail to load (e.g., network blip mid-pagination): show loaded items + inline error banner "Some companies could not be loaded. Refresh to retry." |
| Full failure | Inline error: "Could not load companies. Check your connection and try again." with Retry button. |
| Offline | Browser detects offline: "You appear to be offline. Companies will load when your connection is restored." |
| Unauthorized | N/A — middleware redirects to `/login` before page renders. |

### `/applications` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton table rows. |
| Empty | "No applications yet." with "Add application" button and link to add a company first if none exist. |
| Populated | Table with columns: Role, Company, Status, Last updated. |
| Partial failure | Show loaded rows + banner "Some applications could not be loaded." |
| Full failure | Inline error with Retry button. |
| Offline | Offline banner. |
| Unauthorized | Middleware redirect to `/login`. |

### `/resumes` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton cards. |
| Empty | "No resumes yet. Create your base resume to get started." with "Create resume" button. |
| Populated | Cards grouped: root resumes at top level, forks indented beneath their parent. |
| Partial failure | Show loaded items + banner. |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. |
| Unauthorized | Middleware redirect. |

### `/cover-letters` (List)

Identical to `/resumes` list state matrix, substituting "cover letters" for "resumes."

### `/calendar` (Calendar View)

| State | Behavior |
|---|---|
| Loading | Skeleton calendar grid. |
| Empty | Calendar grid shown (not hidden). Empty state message below: "No items this month. Add a task or interview." |
| Populated | Items appear on their dates or in list. |
| Partial failure | Show loaded items + banner "Some calendar items could not be loaded." |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. |
| Unauthorized | Middleware redirect. |

### `/automations` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton rows. |
| Empty | "No automations yet. Create one to get notified when things change." with "New automation" button. |
| Populated | List with name, trigger summary, action summary, enabled toggle, last-fired timestamp. |
| Partial failure | Show loaded items + banner. |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. Toggle interactions disabled with tooltip "You are offline." |
| Unauthorized | Middleware redirect. |

### `/automations/new` (Create Form)

| State | Behavior |
|---|---|
| Loading | N/A — form is static; any dynamic selects (e.g., status list) are hard-coded enums. |
| Empty | All fields blank, no errors shown. |
| Populated | Fields filled, no errors. |
| Partial failure | If save fails with `UPSTREAM_ERROR`: "Automation saved but test email failed. You can retry from the automation detail page." |
| Full failure | If save fails: inline error above submit button with the error message. Form data preserved. |
| Offline | Submit button disabled. Tooltip: "You are offline." |
| Unauthorized | Middleware redirect. |

### `/profile` (Profile Edit)

| State | Behavior |
|---|---|
| Loading | Skeleton fields. |
| Empty | N/A — profile always exists for authenticated users (created on signup). |
| Populated | Fields pre-filled with current profile data. |
| Partial failure | If avatar upload fails but text fields save: "Profile saved. Avatar upload failed — try again." |
| Full failure | Inline error: "Could not save profile. Try again." Form data preserved. |
| Offline | Submit disabled. Offline banner. |
| Unauthorized | Middleware redirect. |

### Auth Screens (`/login`, `/signup`, `/forgot-password`, `/reset-password`)

| State | Behavior |
|---|---|
| Loading | Submit button shows spinner, disabled during in-flight request. |
| Empty | All fields blank, no errors. |
| Populated | Fields filled, no errors shown. |
| Partial failure | N/A — auth operations are atomic. |
| Full failure | Inline error message below the form (exact copy defined in [Validation Rules](#validation-rules)). |
| Offline | Submit button disabled. "You appear to be offline." |
| Unauthorized | N/A — these screens are accessible without authentication. |

### Default State Pattern (Standard CRUD Screens)

Applies to: `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`, `/applications/new`, `/applications/[id]`, `/applications/[id]/edit`, `/resumes/new`, `/resumes/[id]`, `/resumes/[id]/edit`, `/resumes/[id]/fork`, `/cover-letters/new`, `/cover-letters/[id]`, `/cover-letters/[id]/edit`, `/cover-letters/[id]/fork`, `/profile/change-password`.

| State | Behavior |
|---|---|
| Loading | Skeleton fields or cards while server data loads. |
| Empty | N/A for form screens (never empty — always blank or pre-filled). For detail screens: resource not found or FORBIDDEN redirects to the global 404 page. |
| Populated | Fields pre-filled from server data; content rendered. |
| Partial failure | Inline field-level error; unaffected fields remain usable. |
| Full failure | Inline error above the submit button with the error message; form data preserved. |
| Offline | Submit/action buttons disabled; offline banner shown. |
| Unauthorized | Middleware redirects to `/login?redirect=<current-path>` before page renders. |

Deviations from this pattern must be documented explicitly in the relevant section below.

### `/calendar/new` (Create Calendar Item Form)

| State | Behavior |
|---|---|
| Loading | N/A — form fields are static. The application dropdown (visible when kind = 'interview' is selected) loads applications on kind selection. |
| Empty | All fields blank; kind selector shown. |
| Populated | Fields filled, no errors. |
| Partial failure | If kind = 'interview' is selected and the applications dropdown fails to load: show "Could not load applications. Refresh to try again." Interview cannot be saved until the dropdown loads. |
| Full failure | If save fails: inline error above submit; form data preserved. |
| Offline | Submit disabled; offline banner. If kind = 'interview', application dropdown shows "Offline — application list unavailable." |
| Unauthorized | Middleware redirect. |

### `/calendar/[id]` (Calendar Item Detail)

| State | Behavior |
|---|---|
| Loading | Skeleton fields. |
| Empty | N/A — navigating to a non-existent ID redirects to global 404. |
| Populated | Full item detail shown: kind chip, title, dates, notes, linked application name (if any). |
| Partial failure | If the linked application data fails to load: show item detail with "[Application data unavailable — refresh to retry]" in the linked application field. Complete/delete actions remain available. |
| Full failure | Inline error: "Could not load this calendar item. Try again." with Retry button. |
| Offline | Offline banner. "Mark complete" and "Delete" buttons disabled with tooltip "You are offline." |
| Unauthorized | Middleware redirect (or 404 if the item belongs to another user). |

### `/calendar/[id]/edit` (Edit Calendar Item)

| State | Behavior |
|---|---|
| Loading | Skeleton fields while item data loads. |
| Empty | N/A — edit screen always pre-populated. |
| Populated | Fields pre-filled from the calendar item row. |
| Partial failure | If kind = 'interview' and the applications dropdown fails to reload on page load: show "[Could not load application list — current linked application preserved]"; allow save with the existing `application_id` unchanged. |
| Full failure | If save fails: inline error above submit; form data preserved. |
| Offline | Submit disabled; offline banner. |
| Unauthorized | Middleware redirect. |

### `/automations/[id]` (Automation Detail + Execution History)

This screen has two independent data panels: the automation config (top) and the execution history log (bottom). Each can fail independently.

| State | Behavior |
|---|---|
| Loading | Skeleton for config panel + skeleton rows for history panel. |
| Empty | Config panel shows automation details. History panel shows "This automation has not fired yet." |
| Populated | Config shown; history entries in reverse chronological order with timestamp, trigger event summary, and status badge. |
| Partial failure | If config loads but history fails: show config + "Could not load execution history. Refresh to retry." inline in the history panel. If history loads but config fails: show history + "Could not load automation details." in the config panel. Enable/disable toggle disabled until config loads. |
| Full failure | Both panels show inline errors with Retry. |
| Offline | Offline banner. Enable/disable toggle disabled with tooltip "You are offline." |
| Unauthorized | Middleware redirect. |

### `/automations/[id]/edit` (Edit Automation)

| State | Behavior |
|---|---|
| Loading | Skeleton fields while automation row loads. |
| Empty | N/A — edit screen always pre-populated. |
| Populated | Trigger and action fields pre-filled from the automation row. |
| Partial failure | N/A — all fields derive from a single automation row; no multi-source loading. |
| Full failure | If save fails: inline error above submit; form data preserved. |
| Offline | Submit disabled; offline banner. |
| Unauthorized | Middleware redirect. |

---

## Validation Rules

All error messages are exact strings. Client-side validation fires on blur; server-side validation is always authoritative.

### Signup (`/signup`)

| Field | Rule | Error Message |
|---|---|---|
| Email | Required, valid email format | "Please enter a valid email address." |
| Password | Required, min 8 chars, at least 1 number | "Password must be at least 8 characters and include a number." |
| (Server) | Email already registered | "An account with this email already exists." |

### Login (`/login`)

| Field | Rule | Error Message |
|---|---|---|
| Email | Required | "Please enter your email address." |
| Password | Required | "Please enter your password." |
| (Server) | Wrong credentials | "Invalid email or password." |

### Forgot Password (`/forgot-password`)

| Field | Rule | Error Message |
|---|---|---|
| Email | Required, valid format | "Please enter a valid email address." |
| (Server) | Always success-like | "If that email is registered, you will receive a reset link." |

### Reset Password (`/reset-password`)

| Field | Rule | Error Message |
|---|---|---|
| New password | Required, min 8 chars, at least 1 number | "Password must be at least 8 characters and include a number." |
| Confirm password | Must match new password | "Passwords do not match." |
| (Server) | Expired or invalid token | "This reset link has expired. Request a new one." |

### Create/Edit Company

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Company name is required." / "Company name must be 200 characters or fewer." |
| Website | Optional, valid URL if provided | "Please enter a valid URL (e.g., https://example.com)." |
| Notes | Optional, max 2000 chars | "Notes must be 2000 characters or fewer." |

### Create/Edit Application

| Field | Rule | Error Message |
|---|---|---|
| Company | Required (must select existing) | "Company is required." |
| Role title | Required, max 200 chars | "Role title is required." / "Role title must be 200 characters or fewer." |
| Status | Required, must be a valid status enum value | "Please select a status." |
| Job posting URL | Optional, valid URL if provided | "Please enter a valid URL." |
| Notes | Optional, max 5000 chars | "Notes must be 5000 characters or fewer." |

### Create/Edit Resume

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Resume name is required." / "Resume name must be 200 characters or fewer." |

### Resume Attachment Upload

| Field | Rule | Error Message |
|---|---|---|
| File | Optional; if uploading: max 10 MB, MIME must be DOCX or PDF | "Attachment must be a Word document (.docx) or PDF under 10 MB." |

### Fork Resume / Fork Cover Letter

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Fork name is required." |

### Create/Edit Cover Letter

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Cover letter name is required." |

### Cover Letter Attachment Upload

| Field | Rule | Error Message |
|---|---|---|
| File | Optional; if uploading: max 10 MB, MIME must be DOCX or PDF | "Attachment must be a Word document (.docx) or PDF under 10 MB." |

### Create/Edit Calendar Item

| Field | Rule | Error Message |
|---|---|---|
| Kind | Required, must be valid enum | "Please select a type." |
| Title | Required, max 200 chars | "Title is required." / "Title must be 200 characters or fewer." |
| Application link | Required when kind = 'interview' | "Interviews must be linked to an application." |
| start_at | Required when kind ∈ {event, meeting, interview} | "Start time is required." |
| end_at | Required when kind ∈ {event, meeting, interview}; must be strictly after start_at (equal not allowed; zero-duration events are invalid) | "End time is required." / "End time must be after start time." |
| due_at | Optional when kind = 'task'; must be a future date if provided on creation; no restriction on edit (allows backdating overdue tasks) | "Due date must be in the future." |

### Create/Edit Automation

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Automation name is required." |
| Trigger type | Required, valid enum | "Please select a trigger." |
| Trigger condition | Required (varies by trigger type) | "Please complete the trigger condition." |
| Action type | Required, valid enum | "Please select an action." |
| send_email: subject | Required, max 200 chars | "Email subject is required." / "Email subject must be 200 characters or fewer." |
| send_email: body | Required, max 5000 chars | "Email body is required." / "Email body must be 5000 characters or fewer." |
| create_task: title | Required, max 200 chars | "Task title is required." |
| update_application_status: target status | Required, valid enum | "Please select a target status." |

### Profile

| Field | Rule | Error Message |
|---|---|---|
| Display name | Required, max 100 chars | "Display name is required." / "Display name must be 100 characters or fewer." |
| Avatar | Optional; if uploading: max 2 MB, MIME must be image/jpeg or image/png | "Avatar must be a JPEG or PNG image under 2 MB." |

### Change Password

| Field | Rule | Error Message |
|---|---|---|
| Current password | Required | "Please enter your current password." |
| New password | Required, min 8 chars, at least 1 number | "Password must be at least 8 characters and include a number." |
| Confirm new password | Must match new password | "Passwords do not match." |
| (Server) | Current password wrong | "Current password is incorrect." |

---

## Accessibility Acceptance Criteria

These criteria apply globally across all screens unless noted otherwise.

### Keyboard Reachability

```gherkin
Scenario: All interactive elements are keyboard-reachable
  Given any authenticated screen
  Then every button, link, input, select, and toggle is reachable via Tab key
  And no interactive element is skipped (no tabindex="-1" on focusable elements)
  And focus order matches the visual reading order
```

### Focus Management on Route Change

```gherkin
Scenario: Focus moves to main content on navigation
  Given I am on /companies
  When I click a company and navigate to /companies/<id>
  Then focus moves to the <main> element or the page's primary heading (h1)
  And a screen reader announces the new page title
```

### Form Label Associations

```gherkin
Scenario: All form inputs have associated labels
  Given any form in the application
  Then every <input>, <select>, and <textarea> has an associated <label> with a matching htmlFor/id pair
  Or uses aria-label or aria-labelledby
  And no label is provided via placeholder attribute alone
```

### Color Contrast

```gherkin
Scenario: Text meets WCAG 2.2 AA contrast ratio
  Given any text element in the UI
  Then normal text (< 18pt or < 14pt bold) has a contrast ratio ≥ 4.5:1 against its background
  And large text (≥ 18pt or ≥ 14pt bold) has a contrast ratio ≥ 3:1
  And UI components and graphical objects have a contrast ratio ≥ 3:1
```

### Screen Reader Announcements for Async State Changes

```gherkin
Scenario: Loading states are announced
  Given a data fetch is in progress
  Then an aria-live="polite" region announces "Loading..." when fetch starts
  And announces "Loaded" or the count of results when fetch completes
  And announces the error message if the fetch fails

Scenario: Form submission outcome is announced
  Given I submit a form
  When the server responds
  Then a success or error message is announced via aria-live="assertive"
```

### Modal and Dialog Focus

```gherkin
Scenario: Confirmation dialogs trap focus
  Given a confirmation dialog is open (e.g., "Delete company?")
  Then Tab and Shift+Tab cycle only within the dialog
  And pressing Escape closes the dialog and returns focus to the element that opened it
  And screen readers announce the dialog role and its accessible name on open
```

---

## Open Questions

1. **Account deletion**: The `/profile` screen previously listed "delete account" as a primary action. This is deferred — no server action, acceptance criteria, or data-deletion cascade is specified for account deletion. It is not in scope for any current phase. Define behavior (immediate hard-delete vs. grace period) before implementing.
