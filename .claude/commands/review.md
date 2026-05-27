Run the six-gate pre-merge review for $ARGUMENTS (or infer from the branch name if omitted). Do not edit source files. Spec files in `docs/product-spec/` and `docs/technical-spec/` may be modified only via the Reconciliation step (after Gate 6) with explicit per-change user approval via `AskUserQuestion`.

**Permitted writes:** `docs/agents/claude/<branch-slug>/open-questions.md`; `docs/agents/claude/<branch-slug>/decisions.md` (to record approved spec changes); spec files in `docs/product-spec/` and `docs/technical-spec/` (reconciliation only, with user approval per change).

Run all six gates in order. Record BLOCKED for any hard failure and continue through remaining gates to collect all issues. Collect Gate 3 divergences but do not resolve them until the Reconciliation step.

---

### Gate 1 — Automated checks

Run before reading any code:
- `tsc --noEmit` — must exit 0
- `eslint .` — must exit 0 with zero warnings
- `pnpm format:check` — must exit 0 (Prettier)
- `vitest run --coverage` — all tests must pass; coverage must meet 80% threshold on `src/actions/` and `src/lib/`
- `playwright test` — all E2E tests must pass

Report each as **PASS** / **FAIL** (include exit code or coverage percentage on failure).

---

### Gate 2 — Deliverable completeness

- Read `docs/prompts/$ARGUMENTS.md` for the expected deliverables list.
- If the file does not exist, mark this gate **N/A** — expected when reviewing a `fix`-mode build that has no formal prompt file.
- For each expected migration file, server action file, route, and test file: verify it exists.
- Report each as **PASS** / **MISSING**.

---

### Gate 3 — Spec diff

1. Read the `**Scope:**` block from `docs/prompts/$ARGUMENTS.md` to identify the cited spec files and anchors.
2. Read those spec sections in full.
3. Run `git diff main...HEAD` and compare changed files against the spec.
4. Categorize each divergence:
   - **Exceeds spec** — something built that isn't in any cited spec section
   - **Falls short** — something specified that wasn't built (cross-check with Gate 2)
   - **Diverges** — built differently than specified (different shape, behavior, or naming)
5. Also check these rules as automatic FAILs regardless of spec:
   - New tables missing RLS policies
   - Server actions not returning `{ data } | { error }`
   - `console.log`, `any`, or `SELECT *` in committed code
   - DB calls in React components
6. Collect all divergences. Do not resolve them here — they are addressed in the Reconciliation step after Gate 6.

Report Gate 3 as **PASS** (no divergences, no automatic FAILs) or **DIVERGENCES FOUND — N items** (list each briefly).

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
- Flag any entries with `**Status:** BLOCKING`.
- Report each as **RESOLVED** / **DEFERRED** / **BLOCKING**.

---

### Reconciliation

If Gate 3 found divergences, address each one now.

**Step 1 — Compaction recovery:** Before asking anything, scan `docs/agents/claude/<branch-slug>/decisions.md` for entries that already record resolutions for any collected divergences (written by a prior session that was compacted mid-reconciliation). For each divergence with an existing decision entry, skip `AskUserQuestion` and apply the recorded resolution directly.

**Step 2 — Dependency scan:** Before presenting each divergence individually, review the full list for functional coupling. Two divergences are coupled if accepting one forces a change to the other (e.g., approving "keep redirect in page.tsx" is incompatible with "remove login route"). Present coupled divergences together in a single `AskUserQuestion` that names the dependency and offers only resolution options that are internally consistent.

**Step 3 — Resolve remaining divergences** using the following table:

| Divergence type | Default recommendation |
|---|---|
| UI copy, label text, error message wording | Either direction — user's call |
| New UI state not in spec | Update spec if intentional; fix code if accidental |
| New field, component, or helper not in spec | Update spec if intentional; fix code if accidental |
| Changed API shape (action input/output) | Code must change — spec is a shared contract |
| Schema column added, renamed, or removed | Code must change — migration coordination required |
| Behavior passing Gherkin acceptance criteria but differing in implementation detail | Update spec |

For each divergence (or coupled group), call `AskUserQuestion`:
- question: "[Brief divergence description]. How should this be resolved?"
- options (offer only the applicable ones per the table above):
  - "Fix code to match spec"
  - "Update spec to match code"
  - "Defer — record as open question"

Immediately after each `AskUserQuestion` returns — before modifying any file or moving to the next divergence — append a `decisions.md` entry recording the divergence ID, the chosen resolution, and the rationale. This ensures the answer survives context compaction.

**After all divergences are resolved:**
- **"Fix code" items** → added to the BLOCKED verdict with a specific change list for `/build`. **Never fix code within the review session.** The review is read-only for source files. Do not enter plan mode, do not run build commands, do not delete or create source files. "Fix code" items are a to-do list for the next `/build` pass — nothing more.
- **"Update spec" items** → modify the cited spec file in place; append a `decisions.md` entry recording the change; commit with message `docs: update spec to reflect $ARGUMENTS implementation`.
- **"Defer" items** → appended to `open-questions.md` (same format as other findings).

---

### Verdict

Gate 3 is PASS only when all divergences are fully resolved (no outstanding "fix code" items remain).

End with a single verdict line:
```
VERDICT: MERGEABLE   (all 6 gates pass, all divergences resolved)
VERDICT: BLOCKED — N issues across gates [list gate numbers with FAIL/MISSING/BLOCKING/unresolved-divergence counts]
```

---

### Persistence

Append every FAIL, MISSING, BLOCKING, and unresolved divergence finding (not PASSes) to `docs/agents/claude/<branch-slug>/open-questions.md`:
```
## <short title>
**Source:** review / gate <N>
**Finding:** FAIL | MISSING | BLOCKING | DIVERGENCE
**Status:** BLOCKING | RESOLVED | DEFERRED
**Location:** <exact file path(s) or gate name; for items requiring deletion, list every path explicitly>
**Detail:** <rule violated, what is missing, or divergence description>
```

If spec files were modified during Reconciliation, commit them together with `open-questions.md` and `decisions.md`.

---

### Closing

- If **MERGEABLE**: Output `VERDICT: MERGEABLE.` then use `AskUserQuestion`:
  - question: "All gates pass. Proceed to /ship $ARGUMENTS?"
  - options:
    - label: "Continue in this session" / description: "Run /ship $ARGUMENTS right now"
    - label: "Start a new session" / description: "Show me how to ship in a fresh session"

  If "Continue in this session": invoke the ship skill using the Skill tool (`skill: ship`, `args: $ARGUMENTS`). Do not output any other text — just invoke the skill.
  If "Start a new session": output:

---
VERDICT: MERGEABLE. Ready to ship.

**Option A — continue in this session:**
```
/ship $ARGUMENTS
```

**Option B — start a new session (Cloud / Claude Code on the web):**
Launch a new session configured for branch `<branch-slug>` and send this as the first message:
```
/ship $ARGUMENTS <branch-slug>
```

**Option C — start a new session (Local / Claude Code CLI):**
```
git checkout <branch-slug>
claude
```
---
- If **BLOCKED**: Commit findings with message `docs: review findings for $ARGUMENTS`, then use AskUserQuestion:
  - question: "Review BLOCKED — issues written to open-questions.md. Return to /build $ARGUMENTS?"
  - options:
    - label: "Continue in this session" / description: "Run /build $ARGUMENTS now to fix the issues"
    - label: "Start a new session" / description: "Show me how to fix issues in a fresh session"

  If "Continue in this session": invoke the build skill using the Skill tool (`skill: build`, `args: $ARGUMENTS`). Do not output any other text — just invoke the skill.
  If "Start a new session": output:

**Option A — continue in this session:**
```
/build $ARGUMENTS
```

**Option B — start a new session (Cloud / Claude Code on the web):**
Launch a new session configured for branch `<branch-slug>` and send this as the first message:
```
/build $ARGUMENTS <branch-slug>
```

**Option C — start a new session (Local / Claude Code CLI):**
```
git checkout <branch-slug>
claude
```
---
