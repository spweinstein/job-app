Implement $ARGUMENTS following the vertical-slice order: migration → types → server actions → UI → tests.

Before writing any code:
1. Read `docs/agent-guide.md` (full).
2. **Prompt file check:** Verify `docs/prompts/$ARGUMENTS.md` exists (substituting the actual slug, e.g. `docs/prompts/02-companies.md`). If it does not exist, stop immediately:
   > Blocked: `docs/prompts/$ARGUMENTS.md` not found. Run `/plan $ARGUMENTS` first to generate the prompt file, then re-run `/build $ARGUMENTS`.
   Do not proceed past this point.
3. Read the prompt file at `docs/prompts/$ARGUMENTS.md`.
4. **Slug Resolution:** Search `docs/roadmap.md` for a section heading or `docs/prompts/` reference matching `$ARGUMENTS` to locate the phase's Reading List. If the slug is not in the roadmap (undocumented feature), use the cross-doc citations at the top of the prompt file as the Reading List instead.
5. Read the spec files from the Reading List.
6. Check `docs/agents/claude/<branch-slug>/open-questions.md` for any blockers.
7. Read `docs/agents/claude/<branch-slug>/decisions.md` for any decisions recorded in prior phases.

During implementation — **Decision Gate:** stop and surface to the user before proceeding if the implementation requires any of:
- A package not already in `package.json`
- Adding, removing, or renaming a database column or table
- Adding, removing, or renaming a server action, or changing its input/output shape
- Changing observable user behavior (new UI state, changed error message text, different navigation flow)

This is in addition to the "When to Stop and Ask" triggers in `docs/agent-guide.md#when-to-stop-and-ask`.

After the user approves a decision:
1. Update the relevant spec file(s) (`docs/technical-spec/<section>.md` and/or `docs/product-spec/<feature>.md`) in the same commit as the code change.
2. Append an entry to `docs/agents/claude/<branch-slug>/decisions.md`.

Coding rules (no exceptions):
- After every migration: run `supabase gen types typescript --local > src/types/database.ts`.
- No `console.log`, no `any`, no `SELECT *`, no disabled lint rules without justification.
- Server actions in `src/actions/` only. No DB calls in components. No `get*` functions in server actions — reads belong in Server Components.

On merge:
- Copy all entries from `docs/agents/claude/<branch-slug>/decisions.md` into `docs/agents/decisions.md` (global history) as part of the merge commit.

**Closing:** After all code is committed, output this handoff block (substituting the real branch slug and argument):

---
Implementation complete. All code committed to branch `<branch-slug>`.

**Option A — continue in this session:**
```
/review $ARGUMENTS
```

**Option B — start a new session (Cloud / Claude Code on the web):**
Launch a new session configured for branch `<branch-slug>` and send this as the first message:
```
/review $ARGUMENTS
```

**Option C — start a new session (Local / Claude Code CLI):**
```
git checkout <branch-slug>
claude
```
---
