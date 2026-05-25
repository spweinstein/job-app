# Product Spec — Profile

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#profiles-table`, `docs/technical-spec/storage.md`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### Edit

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

### Change Password

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

### `/profile` (Profile Edit)

| State | Behavior |
|---|---|
| Loading | Skeleton fields. |
| Empty | N/A — profile always exists for authenticated users (created on signup). |
| Populated | Fields pre-filled with current profile data. |
| Partial failure | If avatar upload fails but text fields save: "Profile saved. Avatar upload failed — try again." |
| Full failure | Inline error: "Could not save profile. Try again." Form data preserved. |
| Offline | Submit disabled. Offline banner. |

### `/profile/change-password`

Use the [Default State Pattern](index.md#default-state-pattern).

---

## Validation Rules

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
