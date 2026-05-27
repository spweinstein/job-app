Invoke as:
- `/build fix <description> [--review]` — surgical patch; no prompt file required
- `/build implement <NN>-<slug> [--review]` — feature build from a `/plan` prompt file

Parse `$ARGUMENTS`: first word is the mode (`fix` or `implement`); strip `--review` flag if present; remaining text is the description or slug.

---

### fix mode — pre-implementation reading

1. Read `docs/agent-guide.md` (full).
2. Read `docs/agents/claude/<branch-slug>/open-questions.md` for blockers.
3. Use `<description>` as the full specification. **Do not read roadmap or product-spec files.**

### implement mode — pre-implementation reading

1. Read `docs/agent-guide.md` (full).
2. Read `docs/prompts/<NN>-<slug>.md`. **If the file does not exist, stop and surface an error — this mode requires a prompt file produced by `/plan`.**
3. Read the spec files listed in the phase's **Reading List** in `docs/roadmap.md`.
4. Check `docs/agents/claude/<branch-slug>/open-questions.md` for blockers.
5. Read `docs/agents/claude/<branch-slug>/decisions.md` for decisions recorded in prior phases.

---

### Both modes — implementation

`implement` follows the full vertical-slice order: migration → types → server actions → UI → tests.
`fix` implements the minimal change described by the specification.

**Decision Gate:** stop and surface to the user before proceeding if the implementation requires any of:
- A package not already in `package.json`
- Adding, removing, or renaming a database column or table
- Adding, removing, or renaming a server action, or changing its input/output shape
- Changing observable user behavior (new UI state, changed error message text, different navigation flow)

This is in addition to the "When to Stop and Ask" triggers in `docs/agent-guide.md#when-to-stop-and-ask`.

After the user approves a decision:
1. Update the relevant spec file(s) (`docs/technical-spec/<section>.md` and/or `docs/product-spec/<feature>.md`) in the same commit as the code change.
2. Append an entry to `docs/agents/claude/<branch-slug>/decisions.md`.

**Coding rules (no exceptions):**
- After every migration: run `supabase gen types typescript --local > src/types/database.ts`.
- Before every `git commit`: run `pnpm format` to auto-format all authored files.
- No `console.log`, no `any`, no `SELECT *`, no disabled lint rules without justification.
- Server actions in `src/actions/` only. No DB calls in components. No `get*` functions in server actions — reads belong in Server Components.

**On merge:**
- Copy all entries from `docs/agents/claude/<branch-slug>/decisions.md` into `docs/agents/decisions.md` (global history) as part of the merge commit.

**Closing:** After all code is committed, use AskUserQuestion:
- question: "Implementation complete. How would you like to proceed to /review $ARGUMENTS?"
- options:
  - label: "Continue in this session" / description: "Run /review $ARGUMENTS right now"
  - label: "Start a new session" / description: "Show me how to continue in a fresh session"

If "Continue in this session": invoke the review skill using the Skill tool (`skill: review`, `args: $ARGUMENTS`). Do not output any other text — just invoke the skill.
If "Start a new session": output:

---
Implementation complete. All code committed to branch `<branch-slug>`.

**Option A — continue in this session:**
```
/review <slug-or-description>
```

**Option B — start a new session (Cloud / Claude Code on the web):**
Launch a new session configured for branch `<branch-slug>` and send this as the first message:
```
/review $ARGUMENTS <branch-slug>
```

**Option C — start a new session (Local / Claude Code CLI):**
```
git checkout <branch-slug>
claude
```
---
