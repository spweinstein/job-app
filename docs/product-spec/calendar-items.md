# Product Spec — Calendar Items

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#calendar-items-table`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### List and Views

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

### Create

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

### Complete Task

```gherkin
Feature: Complete Task

  Scenario: Mark task complete
    Given a calendar item with kind = 'task' and completed_at = NULL
    When I click "Mark complete"
    Then completed_at is set to the current timestamp
    And the task appears with a strikethrough or "Completed" label
```

---

## State Matrices

### `/calendar` (Calendar View)

| State | Behavior |
|---|---|
| Loading | Skeleton calendar grid. |
| Empty | Calendar grid shown (not hidden). Empty state message below: "No items this month. Add a task or interview." |
| Populated | Items appear on their dates or in list. |
| Partial failure | Show loaded items + banner "Some calendar items could not be loaded." |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. |

### `/calendar/new` (Create Calendar Item Form)

Deviates from the Default State Pattern:

| State | Behavior |
|---|---|
| Loading | N/A — form fields are static. The application dropdown (visible when kind = 'interview' is selected) loads applications on kind selection. |
| Empty | All fields blank; kind selector shown. |
| Populated | Fields filled, no errors. |
| Partial failure | If kind = 'interview' is selected and the applications dropdown fails to load: show "Could not load applications. Refresh to try again." Interview cannot be saved until the dropdown loads. |
| Full failure | If save fails: inline error above submit; form data preserved. |
| Offline | Submit disabled; offline banner. If kind = 'interview', application dropdown shows "Offline — application list unavailable." |

### `/calendar/[id]` (Calendar Item Detail)

Deviates from the Default State Pattern:

| State | Behavior |
|---|---|
| Loading | Skeleton fields. |
| Empty | N/A — navigating to a non-existent ID redirects to global 404. |
| Populated | Full item detail shown: kind chip, title, dates, notes, linked application name (if any). |
| Partial failure | If the linked application data fails to load: show item detail with "[Application data unavailable — refresh to retry]" in the linked application field. Complete/delete actions remain available. |
| Full failure | Inline error: "Could not load this calendar item. Try again." with Retry button. |
| Offline | Offline banner. "Mark complete" and "Delete" buttons disabled with tooltip "You are offline." |

### `/calendar/[id]/edit` (Edit Calendar Item)

Deviates from the Default State Pattern:

| State | Behavior |
|---|---|
| Loading | Skeleton fields while item data loads. |
| Empty | N/A — edit screen always pre-populated. |
| Populated | Fields pre-filled from the calendar item row. |
| Partial failure | If kind = 'interview' and the applications dropdown fails to reload on page load: show "[Could not load application list — current linked application preserved]"; allow save with the existing `application_id` unchanged. |
| Full failure | If save fails: inline error above submit; form data preserved. |
| Offline | Submit disabled; offline banner. |

---

## Validation Rules

### Create/Edit Calendar Item

| Field | Rule | Error Message |
|---|---|---|
| Kind | Required, must be valid enum | "Please select a type." |
| Title | Required, max 200 chars | "Title is required." / "Title must be 200 characters or fewer." |
| Application link | Required when kind = 'interview' | "Interviews must be linked to an application." |
| start_at | Required when kind ∈ {event, meeting, interview} | "Start time is required." |
| end_at | Required when kind ∈ {event, meeting, interview}; must be strictly after start_at (equal not allowed; zero-duration events are invalid) | "End time is required." / "End time must be after start time." |
| due_at | Optional when kind = 'task'; must be a future date if provided on creation; no restriction on edit (allows backdating overdue tasks) | "Due date must be in the future." |
