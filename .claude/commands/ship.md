Ship $ARGUMENTS: verify review status, detect the target branch, draft a PR description, push the branch, and open the pull request via GitHub. ($ARGUMENTS is the feature slug, e.g. `02-companies`; omit to infer from the branch name.)

**Step 0 — Bootstrap:** Determine the branch slug with `git branch --show-current`. Store it as `<branch-slug>`. If `$ARGUMENTS` is provided, use it as the feature slug; otherwise derive it from `<branch-slug>` by stripping the leading `claude/` prefix and trailing random suffix.

---

### Step 1 — Prerequisite check

Read `docs/agents/claude/<branch-slug>/open-questions.md`. If any entry has `**Status:** BLOCKING`, stop immediately and output:

> BLOCKED: `open-questions.md` contains BLOCKING entries. Resolve them with `/build $ARGUMENTS` or `/review $ARGUMENTS` before shipping.

If the file is absent or contains no BLOCKING entries, continue.

---

### Step 2 — Detect target branch

Run:
```bash
git branch -r | grep -v HEAD
```

For each remote branch candidate, compute its merge-base date with the current branch:
```bash
git log -1 --format="%ci" $(git merge-base HEAD origin/<candidate>)
```

Select the candidate with the most recent merge-base date as the recommended target.

Use `AskUserQuestion`:
- question: "Which branch should this PR target?"
- First option: the detected best candidate (e.g. `main`) — label it "(Recommended)"
- One additional option per other detected remote branch
- Final option: "Other — I'll type the branch name"

If the user selects "Other", ask a follow-up for the branch name before proceeding.

---

### Step 3 — Draft PR description

Gather context (skip gracefully if a file is absent):
1. `docs/prompts/$ARGUMENTS.md` — feature summary and deliverables
2. `git log origin/<target-branch>...HEAD --oneline` — commit list
3. `docs/agents/claude/<branch-slug>/decisions.md` — notable decisions
4. `docs/agent-guide.md` section `## PR Conventions` — required checklist items
5. `docs/product-spec/<feature-slug>.md` (feature slug = $ARGUMENTS with the `NN-` prefix stripped) — Gherkin acceptance criteria

Assemble this PR body:

```
## Summary
<3–5 bullets from the deliverables in docs/prompts/$ARGUMENTS.md>

## Commits
<git log output verbatim>

## Notable decisions
<entries from decisions.md that deviate from spec or represent significant choices; write "None" if empty>

## Acceptance criteria
<Gherkin scenario titles from the product-spec, each as "- [ ] Scenario: <title>">

## Checklist
<12-item list from docs/agent-guide.md#pr-conventions; pre-tick items verified PASS in /review Gates 1–5>

## On merge
Promote all entries from `docs/agents/claude/<branch-slug>/decisions.md` into `docs/agents/decisions.md`.
```

Present the full draft to the user, then use `AskUserQuestion`:
- question: "Does this PR description look good?"
- options:
  - "Looks good — proceed"
  - "Add a breaking-change note"
  - "Trim the decisions section"
  - "I'll add context" (user types text to append as `## Additional context`)

Apply the change and re-present if not "Looks good — proceed".

---

### Step 4 — Push

```bash
git push -u origin <branch-slug>
```

Retry up to 4 times on network failure with exponential backoff (2 s, 4 s, 8 s, 16 s). If all retries fail, stop and surface:

> PUSH FAILED: Run `git push -u origin <branch-slug>` manually, then re-run `/ship $ARGUMENTS`.

Do not proceed to Step 5 if the push fails.

---

### Step 5 — Open PR

Parse owner and repo from:
```bash
git remote get-url origin
```
Extract the last two path segments (handles both `https://github.com/owner/repo.git` and local proxy URLs like `http://local_proxy@127.0.0.1:.../git/owner/repo`).

PR title: `<$ARGUMENTS>: <first sentence from docs/prompts/$ARGUMENTS.md>`, truncated to 72 characters. If the prompt file is absent, use `<branch-slug>` as the title.

Call `mcp__github__create_pull_request` with:
- `owner` / `repo` — parsed above
- `title` — derived above
- `head` — `<branch-slug>`
- `base` — `<target-branch>`
- `body` — finalized PR description from Step 3

Output the returned PR URL as `<pr-url>`.

---

### Step 5b — Close superseded PRs

Call `mcp__github__list_pull_requests` with:
- `owner` / `repo` — same as Step 5
- `head` — `<owner>:<branch-slug>` (GitHub requires the `owner:` prefix)
- `state` — `open`

Filter out the PR just created (match by number). If no others remain, skip this step silently.

If one or more open PRs are found targeting other bases, use `AskUserQuestion`:
- question: "Found <N> open PR(s) from `<branch-slug>` targeting other branches — likely auto-created by GitHub. Close as superseded?"
- If N = 1:
  - label: "Close #<number> (targets `<base>`)" / description: "Close this stale PR"
  - label: "Skip — I'll handle manually" / description: "Leave it open"
- If N ≥ 2:
  - label: "Close all <N>" / description: "Close every open PR from this branch except the new one"
  - label: "Skip — I'll handle manually" / description: "Leave them open"

For each PR the user selects to close: call `mcp__github__update_pull_request` with `state: closed`.

---

### Closing

Use `AskUserQuestion`:
- question: "PR open. Subscribe to PR activity (CI results, review comments, merge events)?"
- options:
  - label: "Yes — watch" / description: "Subscribe to CI and review events for this PR"
  - label: "No — I'll check manually" / description: "I'll monitor the PR in GitHub"

If "Yes — watch": call `mcp__github__subscribe_pr_activity` with the PR number extracted from `<pr-url>`.

Then output this handoff block:

---
PR open: <pr-url>

**On merge:** promote all entries from `docs/agents/claude/<branch-slug>/decisions.md` into `docs/agents/decisions.md` as part of the merge commit.

When ready for the next feature, start a new session on `main` and run:
```
/discovery <next-slug>
```
---

Rules you must follow:
- Do not edit any source or spec files.
- Do not run tests.
- Do not push if any entry has `**Status:** BLOCKING` in `docs/agents/claude/<branch-slug>/open-questions.md`.
- Permitted reads: `docs/agents/claude/<branch-slug>/open-questions.md`, `docs/agents/claude/<branch-slug>/decisions.md`, `docs/prompts/$ARGUMENTS.md`, `docs/product-spec/<feature-slug>.md`, `docs/agent-guide.md`.
- Permitted writes: none.
- Permitted git operations: `git push`, `git log`, `git branch -r`, `git merge-base`, `git remote get-url`.
