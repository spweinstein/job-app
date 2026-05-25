# Product Spec — Cover Letters

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#cover_letters`, `docs/technical-spec/content-model.md`, `docs/technical-spec/storage.md`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### List View

```gherkin
Feature: Cover Letters List

  Scenario: Shows root and fork cover letters
    Given I have 1 root cover letter and 2 forks of it
    When I navigate to /cover-letters
    Then I see all 3 cover letters
    And fork cover letters show a "Fork of <parent name>" label
```

### Create

```gherkin
Feature: Create Cover Letter

  Scenario: Create root cover letter
    Given I am on /cover-letters/new
    When I enter name "Base Cover Letter"
    And I click "Save"
    Then a cover_letters row is created with parent_id = NULL and root_id = id
    And I am redirected to /cover-letters/<new-id>/edit
```

### Fork

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

### Edit

```gherkin
Feature: Edit Cover Letter

  Scenario: User saves changes to a cover letter
    Given the user is on /cover-letters/[id]/edit for a cover letter they own
    When the user modifies the cover letter content and submits the form
    Then the cover letter content is updated
    And the user is redirected to /cover-letters/[id]
    And a success toast "Cover letter saved." is shown

  Scenario: Unsaved changes prompt on navigation
    Given the user is on /cover-letters/[id]/edit with unsaved changes
    When the user attempts to navigate away
    Then a confirmation dialog appears: "Leave without saving?"
    When the user confirms
    Then navigation proceeds and changes are discarded
```

### Delete

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

## State Matrices

### `/cover-letters` (List)

Same pattern as `/resumes` list, substituting "cover letters" for "resumes":

| State | Behavior |
|---|---|
| Loading | Skeleton cards. |
| Empty | "No cover letters yet. Create your base cover letter to get started." with "Create cover letter" button. |
| Populated | Cards grouped: root cover letters at top level, forks indented beneath their parent. |
| Partial failure | Show loaded items + banner. |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. |

### `/cover-letters/new`, `/cover-letters/[id]`, `/cover-letters/[id]/fork`

Use the [Default State Pattern](index.md#default-state-pattern).

### `/cover-letters/[id]/edit` (Edit Cover Letter)

Follows the Default State Pattern defined in `docs/product-spec/index.md`.

---

## Validation Rules

### Create/Edit Cover Letter

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Cover letter name is required." |

### Cover Letter Attachment Upload

| Field | Rule | Error Message |
|---|---|---|
| File | Optional; if uploading: max 10 MB, MIME must be DOCX or PDF | "Attachment must be a Word document (.docx) or PDF under 10 MB." |

### Fork Cover Letter

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Fork name is required." |
