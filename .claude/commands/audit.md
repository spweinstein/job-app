Audit the current branch against the spec for $ARGUMENTS (or the full diff if no area is specified). Produce a compliance report. Do not edit any code.

Steps:
1. Run `git diff main...HEAD` to see all changes.
2. For each changed file, check it against:
   - `docs/agent-guide.md` (conventions, Do-Not-Do list)
   - The relevant `docs/technical-spec/<section>.md` (schema, RLS, API surface)
   - The relevant `docs/product-spec/<feature>.md` (acceptance criteria, validation rules, state matrices)
3. Check every item in the PR checklist at `docs/agent-guide.md#pr-conventions`.
4. Check `docs/agents/claude/<branch-slug>/open-questions.md` — flag any unanswered questions that block merge.

Report format — one entry per finding:
- **PASS** — compliant, no action needed
- **FAIL** — violates the spec; include file:line reference and the rule violated
- **NEEDS REVIEW** — ambiguous; include the question to resolve

Rules you must follow:
- Do not edit any files.
- Do not commit anything.
- Do not open a PR.
- Output the report only.
