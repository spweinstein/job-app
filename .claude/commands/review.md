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

- Attempt to read `docs/prompts/$ARGUMENTS.md` for the expected deliverables list.
  - **If the prompt file exists:** for each expected migration file, server action file, route, and test file: verify it exists. Report each as **PASS** / **MISSING**.
  - **If the prompt file does not exist (undocumented feature):** derive the expected deliverables list from `git diff main...HEAD` — group files by type (migrations, server actions, pages, components, tests) and treat the actual additions as the intended deliverable set. Report Gate 2 as **PARTIAL — no prompt file found; deliverables inferred from branch diff**.

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

- Determine the product-spec file to read: derive the feature name from `$ARGUMENTS` (e.g., `02-companies` → `docs/product-spec/companies.md`).
  - **If the product-spec file exists:** for each Gherkin scenario, search test files for corresponding coverage (scenario title keywords). Report each as **COVERED** / **MISSING**.
  - **If no product-spec file exists (undocumented feature):** report Gate 4 as **SKIP — no product spec found for `$ARGUMENTS`; acceptance criteria coverage unverifiable**.

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
- If **BLOCKED**: Commit `open-questions.md` with message `docs: review findings for $ARGUMENTS`, then output this handoff block (substituting the real branch slug and argument):

---
Issues written to `open-questions.md`. Address them, then re-run `/review $ARGUMENTS`.

**Option A — continue in this session:**
```
/build $ARGUMENTS
```

**Option B — start a new session (Cloud / Claude Code on the web):**
Launch a new session configured for branch `<branch-slug>` and send this as the first message:
```
/build $ARGUMENTS
```

**Option C — start a new session (Local / Claude Code CLI):**
```
git checkout <branch-slug>
claude
```
---
