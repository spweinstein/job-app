# Product Spec — Dashboard

All terminology defers to `docs/agent-guide.md#glossary`.

**Reading list:** `docs/technical-spec/schema.md#applications-table`, `docs/technical-spec/api-surface.md`

---

## Acceptance Criteria

### Funnel Chart

```gherkin
Feature: Dashboard Funnel Chart

  Scenario: Funnel chart shows application count per status
    Given I have applications with statuses "applied"×3, "screening"×1, "offer"×1
    When I navigate to /dashboard
    Then I see a chart with one bar per status
    And the "applied" bar shows count 3
    And statuses with zero applications are still shown with count 0

  Scenario: Clicking a funnel bar navigates to filtered applications list
    Given the dashboard funnel chart is visible
    When I click the "offer" bar
    Then I am navigated to /applications?status=offer

  Scenario: Funnel chart replaced by CTA card when user has no applications
    Given I have no applications
    When I navigate to /dashboard
    Then I do not see the funnel chart
    And I see a wide card with a distinct background color and rounded corners
    And the card contains a prompt to log my first application
    And clicking the card navigates to /applications/new
```

---

## State Matrix

### `/dashboard`

| State | Behavior |
|---|---|
| Loading | Skeleton placeholders for all four widget areas. |
| No applications | Funnel chart area replaced by a wide CTA card (distinct background color, rounded corners) prompting the user to log their first application, linking to `/applications/new`. Recent-applications and upcoming-items areas each show their own empty messages. |
| Populated | All widgets render real data; funnel chart shows bars for all 9 statuses (statuses with zero applications shown at count 0). |
| Widget partial failure | The failed widget shows an inline error with a Retry button; all other widgets render normally. |
| Full failure | All widgets show an inline error with a Retry button. |
| Offline | Offline banner shown across the top; all widget interactions disabled. |
