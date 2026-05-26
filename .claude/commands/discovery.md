Read the relevant docs and source files for the area described in $ARGUMENTS (or the full codebase if no area is specified). Produce a findings report in plain prose: what exists, what is missing, what is inconsistent with the spec.

**Step 0 — Bootstrap:** Before reading anything, determine the branch slug with `git branch --show-current`. Check whether `docs/agents/claude/<branch-slug>/` exists. If not, create `decisions.md` and `open-questions.md` in that directory using the standard headers from `CLAUDE.md#agent-context-store`.

**Slug Resolution:** Search `docs/roadmap.md` for a section heading or `docs/prompts/` reference that matches `$ARGUMENTS`.
- **If found:** note the phase's Reading List and use those files in Step 1.
- **If not found (undocumented feature):** proceed with a broad scan using the slug as a context hint. In Step 1, read `docs/technical-spec/index.md` and `docs/product-spec/index.md` as starting points, plus any existing files whose names suggest relevance to the slug. Then append the following blocker to `docs/agents/claude/<branch-slug>/open-questions.md` before writing the findings report:
  ```
  ## No roadmap entry for $ARGUMENTS
  **Source:** discovery
  **Question:** `$ARGUMENTS` has no section in `docs/roadmap.md`, no product spec, and no technical spec. A roadmap entry with scope, acceptance criteria, and a reading list must exist before `/plan` can produce a grounded result.
  **Blocks:** /plan $ARGUMENTS
  ```

Steps:
1. Read `docs/agent-guide.md` and the relevant sections of `docs/technical-spec/` and `docs/product-spec/` (start with the index files to find the right sections).
2. Report findings in plain prose: what exists, what is missing, what is inconsistent.
3. End your report with a prioritized list of blockers (if any) and suggested next steps.

**Final step — Persist blockers:** For each item in the prioritized blockers list, append an entry to `docs/agents/claude/<branch-slug>/open-questions.md`:
```
## <short title>
**Source:** discovery
**Question:** <blocker or ambiguity>
**Blocks:** <what it prevents>
```

**Closing:** Commit the context files with message `docs: discovery findings for $ARGUMENTS`, then output this handoff block (substituting the real branch slug and argument):

---
Discovery complete. Findings committed to `docs/agents/claude/<branch-slug>/open-questions.md`.

**Option A — continue in this session:**
```
/plan $ARGUMENTS
```

**Option B — start a new session (Cloud / Claude Code on the web):**
Launch a new session configured for branch `<branch-slug>` and send this as the first message:
```
/plan $ARGUMENTS
```

**Option C — start a new session (Local / Claude Code CLI):**
```
git checkout <branch-slug>
claude
```
---

Rules you must follow:
- Do not edit any source or spec files. Permitted writes: `docs/agents/claude/<branch-slug>/decisions.md` and `docs/agents/claude/<branch-slug>/open-questions.md` only.
- Do not open a PR.
