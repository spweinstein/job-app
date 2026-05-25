Design an implementation plan for $ARGUMENTS. Do not write any code.

**Step 0 — Bootstrap:** Determine the branch slug with `git branch --show-current`. Check whether `docs/agents/claude/<branch-slug>/` exists. If not, create `decisions.md` and `open-questions.md` using the standard headers from `CLAUDE.md#agent-context-store`. Read `docs/agents/claude/<branch-slug>/decisions.md` if it exists, for context from prior phases.

Also check whether `docs/prompts/$ARGUMENTS.md` already exists. If it does, read it and note **REVISION MODE** — this run updates an existing plan. The existing `**Scope:**` block and implementation steps are context for producing the revised plan.

**Step 1 — Spec citation:** Before reading the roadmap or producing any plan content, identify which spec sections cover this work.
- Search `docs/product-spec/` and `docs/technical-spec/` for sections relevant to `$ARGUMENTS`.
- State the matches as: `**Scope:** \`docs/product-spec/auth.md\` · \`docs/technical-spec/schema.md#profiles\``
- If no clear match exists, call `AskUserQuestion`:
  - question: "No existing spec section clearly covers this work. How would you like to proceed?"
  - options: "Point me to an existing spec section" / "I need to write a spec first — stop here"
- Do not proceed past this step until scope is established.

Steps:
2. Read `docs/agent-guide.md` (full), the relevant phase in `docs/roadmap.md`, and the spec files listed in that phase's Reading List.
3. Read `docs/agents/claude/<branch-slug>/open-questions.md` for any unresolved questions in scope.
4. Produce a step-by-step plan in this order: migration → RLS → server actions → UI → tests.
5. List every file to create or modify with a one-line description of the change.

**Step 5b — Scope check:** Count the total files listed in step 5.
- If the count exceeds 20, OR the deliverables span 3 or more clearly separable concerns (e.g., tooling + infrastructure + CI, or multiple unrelated feature tables), use AskUserQuestion before presenting the full plan:
  - question: "This phase has [N] files across [M] concerns. Split into sub-phases?"
  - options: "Yes — propose a split" / "No — proceed as one phase"
  If "Yes": design the sub-phases (each with a named slug like `$ARGUMENTS-a`, `$ARGUMENTS-b`), present the split using AskUserQuestion to confirm, then — on approval — write one prompt file per sub-phase and **delete `docs/prompts/$ARGUMENTS.md`** in the same commit. The sub-phase files are the canonical record; the parent file is obsolete.
  If "No": continue to the full plan.
- If ≤ 20 files with no clearly separable concerns: skip and continue.

6. Before finalizing, check for any "When to Stop and Ask" triggers from `docs/agent-guide.md#when-to-stop-and-ask`. Surface them and stop if any are present.

**During planning — live writes:**
- Whenever a "When to Stop and Ask" trigger fires, append the question to `docs/agents/claude/<branch-slug>/open-questions.md` before surfacing it to the user:
  ```
  ## <short title>
  **Source:** plan
  **Question:** <what needs resolution>
  **Blocks:** <what it prevents>
  ```
- Whenever you resolve an ambiguity without user input (e.g., choosing between two compliant approaches), append an entry to `docs/agents/claude/<branch-slug>/decisions.md`:
  ```
  ## YYYY-MM-DD — <short title>
  **Branch:** <branch-slug>
  **Context:** <why this came up>
  **Decision:** <what was decided>
  **Consequence:** <what this affects>
  ```

**Step 7 — Request approval via AskUserQuestion.** After presenting the plan, call `AskUserQuestion` with a single question:
- **Question:** "Does this plan look good?"
- **Options:**
  - "Approve — write the prompt file and commit"
  - "Request changes"

Do not write the prompt file until the user selects "Approve".

**Step 8 — On approval:** Write the complete plan to `docs/prompts/$ARGUMENTS.md`. The file must open with the `**Scope:**` block as its very first line, followed by cross-doc citations per `docs/agent-guide.md#prompt-file-naming-convention`. Commit all artifacts (`decisions.md`, `open-questions.md`, and the prompt file) with the appropriate message:
- **New plan:** `docs: approved plan for $ARGUMENTS`
- **Revision:** `docs: revise plan for $ARGUMENTS`

Then use AskUserQuestion:
- question: "Plan committed to `docs/prompts/$ARGUMENTS.md`. How would you like to proceed?"
- options:
  - label: "Continue in this session" / description: "Run /build $ARGUMENTS right now"
  - label: "Start a new session" / description: "Show me how to continue in a fresh session"

If "Continue in this session": output only `/build $ARGUMENTS`.
If "Start a new session": output:

---
Plan committed to `docs/prompts/$ARGUMENTS.md`.

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

Rules you must follow:
- Do not write any code. Permitted file edits: `docs/agents/claude/<branch-slug>/open-questions.md`, `docs/agents/claude/<branch-slug>/decisions.md`, and `docs/prompts/$ARGUMENTS.md` (create or overwrite) only.
- Do not open a PR.
- Always use AskUserQuestion for approval (Step 7) and continuation (Step 8) — never ask these as plain text questions.
