Design an implementation plan for $ARGUMENTS. Do not write any code.

**Step 0 — Bootstrap:** Determine the branch slug with `git branch --show-current`. Check whether `docs/agents/claude/<branch-slug>/` exists. If not, create `decisions.md` and `open-questions.md` using the standard headers from `CLAUDE.md#agent-context-store`. Read `docs/agents/claude/<branch-slug>/decisions.md` if it exists, for context from prior phases.

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
/build $ARGUMENTS

**Option B — start a new session on branch `<branch-slug>`:**
- **Cloud (Claude Code on the web):** Launch a new session configured for branch `<branch-slug>` and send this as the first message:
  ```
  /build $ARGUMENTS
  ```
- **Local (Claude Code CLI):** Run in your terminal, then start `claude`:
  ```
  git checkout <branch-slug>
  ```
---

Rules you must follow:
- Do not write any code. Permitted file edits: `docs/agents/claude/<branch-slug>/open-questions.md`, `docs/agents/claude/<branch-slug>/decisions.md`, and `docs/prompts/$ARGUMENTS.md` only.
- Do not open a PR.
- Output the plan and wait for approval before writing the prompt file.
