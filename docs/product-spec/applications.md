# Product Spec — Applications

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#applications`, `docs/technical-spec/api-surface.md`, `docs/technical-spec/automations-engine.md`

---

## Acceptance Criteria

### List View

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

### Create

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

### Status Change

```gherkin
Feature: Application Status Change

  Scenario: Status change triggers automation event
    Given an application with status "applied"
    And an automation with trigger "application_status_changed" and condition "status becomes offer"
    When I change the application status to "offer"
    Then the application row is updated
    And an automation_events row is written with trigger_type "application_status_changed"
```

### Delete

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

## State Matrices

### `/applications` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton table rows. |
| Empty | "No applications yet." with "Add application" button and link to add a company first if none exist. |
| Populated | Table with columns: Role, Company, Status, Last updated. |
| Partial failure | Show loaded rows + banner "Some applications could not be loaded." |
| Full failure | Inline error with Retry button. |
| Offline | Offline banner. |

### `/applications/new`, `/applications/[id]`, `/applications/[id]/edit`

Use the [Default State Pattern](index.md#default-state-pattern).

---

## Validation Rules

### Create/Edit Application

| Field | Rule | Error Message |
|---|---|---|
| Company | Required (must select existing) | "Company is required." |
| Role title | Required, max 200 chars | "Role title is required." / "Role title must be 200 characters or fewer." |
| Status | Required, must be a valid status enum value | "Please select a status." |
| Job posting URL | Optional, valid URL if provided | "Please enter a valid URL." |
| Notes | Optional, max 5000 chars | "Notes must be 5000 characters or fewer." |
