# Product Spec — Accessibility

All criteria below apply globally across all screens unless noted otherwise.

---

## Keyboard Reachability

```gherkin
Scenario: SC 2.1.1 — All interactive elements are keyboard-reachable
  Given any authenticated screen
  Then every button, link, input, select, and toggle is reachable via Tab key
  And no interactive element is skipped (no tabindex="-1" on focusable elements)
  And focus order matches the visual reading order

Scenario: SC 2.4.7 / SC 2.4.11 — Focus indicator is visible and meets minimum size
  Given the user is navigating via keyboard
  When any interactive element receives focus
  Then the focus indicator has a minimum area of 2 CSS pixels on the perimeter of the unfocused component
  And the focus indicator has a contrast ratio of at least 3:1 between the focused and unfocused states
```

## Focus Management on Route Change

```gherkin
Scenario: SC 2.4.3 — Focus is managed on route change
  Given I am on /companies
  When I click a company and navigate to /companies/<id>
  Then focus moves to the <main> element or the page's primary heading (h1)
  And a screen reader announces the new page title
```

## Form Label Associations

```gherkin
Scenario: SC 1.3.1 / SC 4.1.2 — All form inputs have associated labels
  Given any form in the application
  Then every <input>, <select>, and <textarea> has an associated <label> with a matching htmlFor/id pair
  Or uses aria-label or aria-labelledby
  And no label is provided via placeholder attribute alone
```

## Color Contrast

```gherkin
Scenario: SC 1.4.3 / SC 1.4.11 — Text meets WCAG 2.2 AA contrast ratio
  Given any text element in the UI
  Then normal text (< 18pt or < 14pt bold) has a contrast ratio ≥ 4.5:1 against its background
  And large text (≥ 18pt or ≥ 14pt bold) has a contrast ratio ≥ 3:1
  And UI components and graphical objects have a contrast ratio ≥ 3:1
```

## Screen Reader Announcements for Async State Changes

```gherkin
Scenario: SC 4.1.3 — Loading states are announced
  Given a data fetch is in progress
  Then an aria-live="polite" region announces "Loading..." when fetch starts
  And announces "Loaded" or the count of results when fetch completes
  And announces the error message if the fetch fails

Scenario: SC 4.1.3 — Form submission outcome is announced
  Given I submit a form
  When the server responds
  Then a success or error message is announced via aria-live="assertive"
```

## Modal and Dialog Focus

```gherkin
Scenario: SC 2.1.2 — Confirmation dialogs trap focus
  Given a confirmation dialog is open (e.g., "Delete company?")
  Then Tab and Shift+Tab cycle only within the dialog
  And pressing Escape closes the dialog and returns focus to the element that opened it
  And screen readers announce the dialog role and its accessible name on open
```
