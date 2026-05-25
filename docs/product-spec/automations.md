# Product Spec — Automations

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#automations`, `docs/technical-spec/automations-engine.md`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### List

```gherkin
Feature: Automations List

  Scenario: Toggle enabled state
    Given an automation with enabled = true
    When I click the toggle next to it on /automations
    Then the automation's enabled field becomes false
    And the toggle visually reflects the new state

  Scenario: Empty state when no automations exist
    Given the user has no automations
    When the user visits /automations
    Then the page shows an empty state with the message "No automations yet. Create one to get notified when things change."
    And a "New automation" button is visible
```

### Create

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

```gherkin
Feature: Automation Execution — All Trigger and Action Types

  Scenario: application_created trigger fires when a new application is saved
    Given the user has an automation with trigger "application_created" and action "send_email"
    When the user creates a new application
    Then an automation_event row is inserted with trigger_type "application_created"
    And the action execution loop sends a transactional email to the user

  Scenario: interview_scheduled trigger fires when an interview calendar item is created
    Given the user has an automation with trigger "interview_scheduled" and action "create_task"
    When the user creates a calendar item with kind "interview"
    Then an automation_event row is inserted with trigger_type "interview_scheduled"
    And the action execution loop inserts a new calendar item with kind "task"

  Scenario: task_due_soon trigger fires for tasks due within 24 hours
    Given the user has an automation with trigger "task_due_soon" and action "send_email"
    And the user has an incomplete task with due_at within the next 24 hours
    When the task_due_soon detection pass runs
    Then an automation_event row is inserted with trigger_type "task_due_soon"
    And the action execution loop sends a transactional email to the user

  Scenario: create_task action inserts a new calendar item
    Given an automation has action_type "create_task" with action_config specifying title "Follow up"
    When the automation fires
    Then a new calendar item with kind "task" and name "Follow up" is inserted for the user
    And an automation_action_log row is created with status "succeeded"

  Scenario: update_application_status action changes the application status
    Given an automation has action_type "update_application_status" with action_config status "screening"
    And the automation is linked to an application with status "applied"
    When the automation fires
    Then the application status is updated to "screening"
    And an automation_action_log row is created with status "succeeded"
```

### Execution History

```gherkin
Feature: Automation Execution History

  Scenario: View execution log
    Given an automation that has fired 3 times
    When I navigate to /automations/<id>
    Then I see 3 entries in the execution history
    And each entry shows timestamp, trigger event, and status (succeeded/failed)
```

---

## State Matrices

### `/automations` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton rows. |
| Empty | "No automations yet. Create one to get notified when things change." with "New automation" button. |
| Populated | List with name, trigger summary, action summary, enabled toggle, last-fired timestamp. |
| Partial failure | Show loaded items + banner. |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. Toggle interactions disabled with tooltip "You are offline." |

### `/automations/new` (Create Form)

Deviates from the Default State Pattern:

| State | Behavior |
|---|---|
| Loading | N/A — form is static; any dynamic selects (e.g., status list) are hard-coded enums. |
| Empty | All fields blank, no errors shown. |
| Populated | Fields filled, no errors. |
| Partial failure | Action execution failed (shows after first automation fires). Automation is saved and active. Banner: 'The last automation action failed. Check the execution history.' |
| Full failure | If save fails: inline error above submit button with the error message. Form data preserved. |
| Offline | Submit button disabled. Tooltip: "You are offline." |

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

### `/automations/[id]/edit` (Edit Automation)

Deviates from the Default State Pattern:

| State | Behavior |
|---|---|
| Loading | Skeleton fields while automation row loads. |
| Empty | N/A — edit screen always pre-populated. |
| Populated | Trigger and action fields pre-filled from the automation row. |
| Partial failure | N/A — all fields derive from a single automation row; no multi-source loading. |
| Full failure | If save fails: inline error above submit; form data preserved. |
| Offline | Submit disabled; offline banner. |

---

## Validation Rules

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
