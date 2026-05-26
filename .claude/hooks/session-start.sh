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

if git merge origin/main --ff-only 2>/dev/null; then
  echo "Synced branch with origin/main"
else
  echo "Note: branch has diverged from origin/main; cannot fast-forward." \
       "Run 'git merge origin/main' manually if you need the latest commands."
fi

# Install JS dependencies
pnpm install
