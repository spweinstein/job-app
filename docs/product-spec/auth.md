# Product Spec — Auth

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/auth.md`, `docs/technical-spec/schema.md#profiles-table`

---

## Acceptance Criteria

### Signup

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

### Login

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

### Forgot Password

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

### Reset Password

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

## State Matrices

Auth screens (`/login`, `/signup`, `/forgot-password`, `/reset-password`) are publicly accessible.

| State | Behavior |
|---|---|
| Loading | Submit button shows spinner, disabled during in-flight request. |
| Empty | All fields blank, no errors. |
| Populated | Fields filled, no errors shown. |
| Partial failure | N/A — auth operations are atomic. |
| Full failure | Inline error message below the form (exact copy defined in Validation Rules below). |
| Offline | Submit button disabled. "You appear to be offline." |

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
