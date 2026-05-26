Design an implementation plan for $ARGUMENTS. Do not write any code.

**Step 0 — Bootstrap:** Determine the branch slug with `git branch --show-current`. Check whether `docs/agents/claude/<branch-slug>/` exists. If not, create `decisions.md` and `open-questions.md` using the standard headers from `CLAUDE.md#agent-context-store`. Read `docs/agents/claude/<branch-slug>/decisions.md` if it exists, for context from prior phases.

**Slug Resolution:** Search `docs/roadmap.md` for a section heading or `docs/prompts/` reference that matches `$ARGUMENTS`.
- **If found:** extract the phase number, Reading List, and deliverables table; use them in Steps 1–4.
- **If not found (undocumented feature):** this is a Decision Gate trigger. Append the following to `docs/agents/claude/<branch-slug>/open-questions.md`:
  ```
  ## No roadmap entry for $ARGUMENTS
  **Source:** plan
  **Question:** `$ARGUMENTS` has no section in `docs/roadmap.md`. Scope, acceptance criteria, schema changes, and a reading list are required before a grounded plan can be written.
  **Blocks:** /plan $ARGUMENTS
  ```
  Then stop and ask the user:
  > "`$ARGUMENTS` has no roadmap entry. To produce a grounded plan I need: (1) the feature's scope and acceptance criteria, (2) any schema/API changes required, (3) dependencies on prior phases. Please provide this context, or point me to existing docs that define it."
  Do not write any plan or prompt file until the user supplies the missing context. Once the user provides it, draft the missing doc stubs (roadmap section + product-spec stub + technical-spec stub if needed) for their approval, then proceed to Step 1 using those drafts as the Reading List.

Steps:
1. Read `docs/agent-guide.md` (full), the relevant phase in `docs/roadmap.md`, and the spec files listed in that phase's Reading List.
2. Read `docs/agents/claude/<branch-slug>/open-questions.md` for any unresolved questions in scope.
3. Produce a step-by-step plan in this order: migration → RLS → server actions → UI → tests.
4. List every file to create or modify with a one-line description of the change.
5. Before finalizing, check for any "When to Stop and Ask" triggers from `docs/agent-guide.md#when-to-stop-and-ask`. Surface them and stop if any are present.

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

**Step 6 — On user approval:** Write the complete plan to `docs/prompts/$ARGUMENTS.md` (e.g., `docs/prompts/02-companies.md`). The file must open with cross-doc citations per `docs/agent-guide.md#prompt-file-naming-convention`. Commit all three artifacts (`decisions.md`, `open-questions.md`, and the prompt file) with message `docs: approved plan for $ARGUMENTS`, then output this handoff block (substituting the real branch slug and argument):

---
Plan committed to `docs/prompts/$ARGUMENTS.md`.

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

Rules you must follow:
- Do not write any code. Permitted file edits: `docs/agents/claude/<branch-slug>/open-questions.md`, `docs/agents/claude/<branch-slug>/decisions.md`, and `docs/prompts/$ARGUMENTS.md` only.
- Do not open a PR.
- Output the plan and wait for approval before writing the prompt file.
