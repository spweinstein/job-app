# Product Spec — Resumes

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#resumes-table`, `docs/technical-spec/content-model.md`, `docs/technical-spec/storage.md`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### List View

```gherkin
Feature: Resumes List

  Scenario: Shows root and fork resumes
    Given I have 1 root resume and 2 forks of it
    When I navigate to /resumes
    Then I see all 3 resumes
    And fork resumes show an indentation or "Fork of <parent name>" label
```

### Create

```gherkin
Feature: Create Resume

  Scenario: Create root resume
    Given I am on /resumes/new
    When I enter name "Base Resume"
    And I click "Save"
    Then a resume row is created with parent_id = NULL and root_id = id
    And I am redirected to /resumes/<new-id>/edit
```

### Fork

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

### Edit

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

### Delete

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

## State Matrices

### `/resumes` (List)

| State | Behavior |
|---|---|
| Loading | Skeleton cards. |
| Empty | "No resumes yet. Create your base resume to get started." with "Create resume" button. |
| Populated | Cards grouped: root resumes at top level, forks indented beneath their parent. |
| Partial failure | Show loaded items + banner. |
| Full failure | Inline error with Retry. |
| Offline | Offline banner. |

### `/resumes/new`, `/resumes/[id]`, `/resumes/[id]/edit`, `/resumes/[id]/fork`

Use the [Default State Pattern](index.md#default-state-pattern).

---

## Validation Rules

### Create/Edit Resume

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Resume name is required." / "Resume name must be 200 characters or fewer." |

### Resume Attachment Upload

| Field | Rule | Error Message |
|---|---|---|
| File | Optional; if uploading: max 10 MB, MIME must be DOCX or PDF | "Attachment must be a Word document (.docx) or PDF under 10 MB." |

### Fork Resume

| Field | Rule | Error Message |
|---|---|---|
| Name | Required, max 200 chars | "Fork name is required." |
