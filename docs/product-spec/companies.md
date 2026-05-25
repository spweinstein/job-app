# Product Spec — Companies

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#companies-table`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### List View

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

### Create

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

### Edit

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

### Delete

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

## State Matrices

### `/companies` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton rows (3 placeholder cards) shown while fetch is in flight. |
| Empty | "No companies yet. Add your first company to get started." with "Add company" button. |
| Populated | List of company cards, each with name and application count. |
| Partial failure | Show loaded items + inline error banner "Some companies could not be loaded. Refresh to retry." |
| Full failure | Inline error: "Could not load companies. Check your connection and try again." with Retry button. |
| Offline | "You appear to be offline. Companies will load when your connection is restored." |

### `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`

Use the [Default State Pattern](index.md#default-state-pattern).

---

## Validation Rules

### Create/Edit Company

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Company name is required." / "Company name must be 200 characters or fewer." |
| Website | Optional, valid URL if provided | "Please enter a valid URL (e.g., https://example.com)." |
| Notes | Optional, max 2000 chars | "Notes must be 2000 characters or fewer." |
