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
- If the file does not exist, mark this gate **N/A** — expected when reviewing a `fix`-mode build that has no formal prompt file.
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
- For **Pre-PR** items: verify each is satisfied. Report as **DONE** / **FAIL**. Any FAIL blocks the verdict.
- For **Post-PR** items (`Preview deploy green`, `Screenshots included`): report as **DONE** or **PENDING**. PENDING is expected before a PR exists and does **not** block the verdict.

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

PENDING items in Gate 5 (post-PR checklist items) are **not** FAIL/MISSING/BLOCKING and do not contribute to the BLOCKED verdict.

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

- If **MERGEABLE**: Present these options to the user and wait for their choice:

  **A — Iterate:** There are more changes to make.
  → Run `/build implement $ARGUMENTS` (or `/build fix <description>` for a targeted patch).

  **B — Hold:** Branch is ready but don't open a PR yet.
  → No further action. Remind the user the branch is pushed and ready when they want to ship.

  **C — Ship:** Open the PR now.
  → Create the PR using `mcp__github__create_pull_request` with:
    - Title: inferred from `$ARGUMENTS` and the phase description
    - Body: the Required Checklist from `docs/agent-guide.md#pr-conventions`, with Pre-PR items pre-checked (✅) based on Gate 5 DONE results, Post-PR items unchecked (☐), and an "Acceptance criteria" section citing each Gherkin scenario marked COVERED in Gate 4.

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
