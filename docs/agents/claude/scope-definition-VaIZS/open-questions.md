# Open Questions — scope-definition-VaIZS

_Append blockers and unresolved questions here. Remove an entry only after creating a corresponding decisions.md entry._

<!-- Format:
## <short title>
**Source:** discovery | plan | build | review
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
-->

## Application count in Phase 2 before applications table exists
**Source:** discovery
**Question:** The roadmap Phase 2 deliverable specifies showing application count on the company detail page via `SELECT count(*) FROM applications WHERE company_id = :id`, and the delete dialog must show "Deleting this company will also delete its N application(s)." Both require the `applications` table, which is not created until Phase 3. Running these queries in a Phase 2 preview deploy will throw a Postgres error. Should Phase 2 stub the count as 0 (with a TODO comment for Phase 3), omit the count display entirely until Phase 3, or take another approach?
**Blocks:** Implementation of the company detail page and delete confirmation dialog in Phase 2.
