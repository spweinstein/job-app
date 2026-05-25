Run the six-gate pre-merge review for $ARGUMENTS (or infer from the branch name if omitted). Do not edit any source or spec files.

**Permitted writes:** `docs/agents/claude/<branch-slug>/open-questions.md` only.

Run all six gates in order. Record BLOCKED for any hard failure and continue through remaining gates to collect all issues.

---

### Gate 1 — Automated checks

Run before reading any code:
- `tsc --noEmit` — must exit 0
- `eslint .` — must exit 0 with zero warnings
- `vitest run` — all tests must pass
- `playwright test` — all E2E tests must pass

Report each as **PASS** / **FAIL** (include exit code on failure).

---

### Gate 2 — Deliverable completeness

- Read `docs/prompts/$ARGUMENTS.md` for the expected deliverables list.
- For each expected migration file, server action file, route, and test file: verify it exists.
- Report each as **PASS** / **MISSING**.

---

### Gate 3 — Spec compliance

Diff the branch with `git diff main...HEAD`. For each changed file, check:

- *Schema / migrations:* new tables have RLS policies; columns match `docs/technical-spec/schema.md`; no schema changes outside `supabase/migrations/`.
- *Server actions:* return `{ data } | { error }`; no `get*` functions; no `console.log`, `any`, or `SELECT *`.
- *UI:* no DB calls in components; no client-side Supabase mutations.
- *Tests:* new server actions have unit + integration tests; new UI flows have E2E tests.

Report each finding as **PASS** / **FAIL** [file:line — rule violated].

---

### Gate 4 — Acceptance criteria coverage

- Read the relevant `docs/product-spec/<feature>.md`.
- For each Gherkin scenario: search test files for corresponding coverage (scenario title keywords).
- Report each scenario as **COVERED** / **MISSING**.

---

### Gate 5 — PR checklist

- Read the checklist from `docs/agent-guide.md#pr-conventions`.
- Verify each item is satisfied.
- Report each as **DONE** / **PENDING**.

---

### Gate 6 — Open questions

- Read `docs/agents/claude/<branch-slug>/open-questions.md`.
- Flag any entries not marked resolved.
- Report each as **RESOLVED** / **BLOCKING**.

---

### Verdict

End with a single verdict line:
```
VERDICT: MERGEABLE   (all 6 gates pass)
VERDICT: BLOCKED — N issues across gates [list gate numbers with FAIL/MISSING/BLOCKING counts]
```

### Persistence

After the verdict, append every FAIL, MISSING, and BLOCKING finding (not PASSes) to `docs/agents/claude/<branch-slug>/open-questions.md`:
```
## <short title>
**Source:** review / gate <N>
**Finding:** FAIL | MISSING | BLOCKING
**Location:** <file:line or gate name>
**Detail:** <rule violated or what is missing>
```

### Closing

- If **MERGEABLE**: "VERDICT: MERGEABLE. Open the PR."
- If **BLOCKED**: Commit `open-questions.md` with message `docs: review findings for $ARGUMENTS`, then use AskUserQuestion:
  - question: "Review BLOCKED — issues written to open-questions.md. Return to /build $ARGUMENTS?"
  - options:
    - label: "Continue in this session" / description: "Run /build $ARGUMENTS now to fix the issues"
    - label: "Start a new session" / description: "Show me how to fix issues in a fresh session"

  If "Continue in this session": output only `/build $ARGUMENTS`.
  If "Start a new session": output:

  ---
  **Start a new session on branch `<branch-slug>`:**
  - **Cloud:** Launch a new session on branch `<branch-slug>`, first message: `/build $ARGUMENTS`
  - **Local:** `git checkout <branch-slug>` then start `claude`
  ---
