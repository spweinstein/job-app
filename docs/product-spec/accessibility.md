# Product Spec — Accessibility

All criteria below apply globally across all screens unless noted otherwise.

---

## Keyboard Reachability

```gherkin
Scenario: All interactive elements are keyboard-reachable
  Given any authenticated screen
  Then every button, link, input, select, and toggle is reachable via Tab key
  And no interactive element is skipped (no tabindex="-1" on focusable elements)
  And focus order matches the visual reading order
```

## Focus Management on Route Change

```gherkin
Scenario: Focus moves to main content on navigation
  Given I am on /companies
  When I click a company and navigate to /companies/<id>
  Then focus moves to the <main> element or the page's primary heading (h1)
  And a screen reader announces the new page title
```

## Form Label Associations

```gherkin
Scenario: All form inputs have associated labels
  Given any form in the application
  Then every <input>, <select>, and <textarea> has an associated <label> with a matching htmlFor/id pair
  Or uses aria-label or aria-labelledby
  And no label is provided via placeholder attribute alone
```

## Color Contrast

```gherkin
Scenario: Text meets WCAG 2.2 AA contrast ratio
  Given any text element in the UI
  Then normal text (< 18pt or < 14pt bold) has a contrast ratio ≥ 4.5:1 against its background
  And large text (≥ 18pt or ≥ 14pt bold) has a contrast ratio ≥ 3:1
  And UI components and graphical objects have a contrast ratio ≥ 3:1
```

## Screen Reader Announcements for Async State Changes

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

## Modal and Dialog Focus

```gherkin
Scenario: Confirmation dialogs trap focus
  Given a confirmation dialog is open (e.g., "Delete company?")
  Then Tab and Shift+Tab cycle only within the dialog
  And pressing Escape closes the dialog and returns focus to the element that opened it
  And screen readers announce the dialog role and its accessible name on open
```
