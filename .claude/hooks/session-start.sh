#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR}"

# Sync .claude/commands/ (and the rest of main) so commands merged after branch
# creation are available immediately, without waiting for a manual rebase.
git fetch origin main

if git merge --ff-only origin/main 2>/dev/null; then
  echo "Synced with origin/main"
elif git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
  # Branch has no unique commits — safe to reset rather than silently stay stale.
  git reset --hard origin/main
  echo "Reset to origin/main (branch had no unique commits)"
else
  echo "Branch has diverged from origin/main — manual merge needed"
fi

# Install JS dependencies
pnpm install
