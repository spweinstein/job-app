Conduct a short conversation to understand what the user wants to work on, then route them to the correct workflow command with the right arguments.

**Step 0 — Orient yourself silently (do not report findings yet):**

Read the following before asking the user anything:
1. `docs/roadmap.md` — understand all phases: their phase numbers, slugs (e.g. `02-companies`), and feature scope
2. `docs/product-spec/index.md` — screen inventory and observable feature list
3. `docs/technical-spec/index.md` — technical areas and which spec files cover them
4. Run `git branch --show-current` to get the current branch slug
5. List files in `docs/prompts/` — any file here means that phase has an approved plan
6. If `docs/agents/claude/<branch-slug>/open-questions.md` exists, read it — entries here indicate prior discovery or plan work on this branch

**Step 1 — Ask the user one focused question:**

Ask: *"What do you want to work on or accomplish?"*

Listen to the response. If their answer is ambiguous and could map to more than one phase or spec area, present a short numbered list of the candidates and ask which fits best. Do not ask more than two questions total before proceeding to Step 2.

**Step 2 — Map intent to a spec area:**

Analyse the user's answer against what you read in Step 0. Identify which case applies:

**Case A — Matches an existing phase:**
Name the phase (e.g. "Phase 3: Applications, slug `03-applications`") and the specific product-spec and technical-spec files that cover it.

**Case B — Matches part of a phase (sub-feature or specific behaviour):**
Name the parent phase slug and the relevant section within its spec files (e.g. "the fork-creation flow in `docs/product-spec/resumes.md#forking`").

**Case C — New idea not covered by any existing phase or spec section:**
Say explicitly: "This isn't covered in any current spec." Then describe what would need to be created before any implementation work can begin:
- A new `docs/product-spec/<feature>.md` file with Gherkin scenarios and a state matrix
- Any new schema section in `docs/technical-spec/schema.md` (if the idea requires new tables or columns)
- A new phase entry in `docs/roadmap.md`

Ask the user whether they want to draft those spec sections now (as a free-form discussion) or whether they want to refine the idea further first. Do not recommend `/discovery`, `/plan`, or `/build` until the spec gap is addressed.

**Step 3 — Determine the workflow stage (Cases A and B only):**

Use the following decision table, evaluated in order:

| Condition | Stage | Recommended command |
|---|---|---|
| `docs/prompts/<NN>-<slug>.md` **does not exist** AND `open-questions.md` has no entries sourced from `discovery` or `plan` | No work started | `/discovery <NN>-<slug>` |
| `docs/prompts/<NN>-<slug>.md` **does not exist** AND `open-questions.md` has entries sourced from `discovery` | Discovery done, plan not yet written | `/plan <NN>-<slug>` |
| `docs/prompts/<NN>-<slug>.md` **exists** AND no implementation source files detected (check `src/actions/<feature>.ts` and relevant migration files in `supabase/migrations/`) | Plan approved, implementation not started | `/build <NN>-<slug>` |
| `docs/prompts/<NN>-<slug>.md` **exists** AND implementation source files are present | Implementation in progress or complete | `/review <NN>-<slug>` |

**Step 4 — Output the recommendation:**

Write a brief summary with four parts:

1. **Understood goal** — one sentence restating what the user wants to do, in your own words, so they can confirm you got it right
2. **Relevant spec sections** — list the file paths that define this feature (product-spec, technical-spec, roadmap section)
3. **Current workflow stage** — name the stage and explain briefly why (e.g. "No prompt file exists yet, so discovery has not been run")
4. **Next command** — the exact slash command to run, formatted as a code block:
   ```
   /discovery 03-applications
   ```
   or for Case C:
   ```
   No workflow command yet — spec authoring required first.
   ```

Rules you must follow:
- Do not edit any files.
- Do not open a PR.
- Do not run any build, lint, or test commands.
- Do not start implementing or planning — only orient and route.
