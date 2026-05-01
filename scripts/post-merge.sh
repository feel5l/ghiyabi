#!/bin/bash
set -e

pnpm install --no-frozen-lockfile

if [ -n "$GITHUB_TOKEN" ]; then
  REMOTE_URL="https://${GITHUB_TOKEN}@github.com/feel5l/ghiyabi.git"

  if git remote get-url github &>/dev/null; then
    git remote set-url github "$REMOTE_URL"
  else
    git remote add github "$REMOTE_URL"
  fi

  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git push github "$BRANCH" --force
  echo "Pushed branch '$BRANCH' to GitHub (feel5l/ghiyabi)"
else
  echo "GITHUB_TOKEN not set — skipping GitHub push"
fi
