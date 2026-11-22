#!/usr/bin/env bash
set -uo pipefail

# Disposable attempt to compose feature PR heads without pushing changes.
reports="$TUFLOW_ACCEPT_ARTIFACTS"
if [[ -z "$reports" ]]; then reports="acceptance-integration-reports"; fi
mkdir -p "$reports"
report="$reports/integration-merge-audit.md"
git config user.name "Issue 9 Acceptance CI"
git config user.email "ci-acceptance@users.noreply.github.com"
git fetch origin master \
  agent-f/issue-6-command-editor-services \
  agent-d/issue-4-tcf-tgc-catalogue-audit \
  feat/issue-7-grammar-highlighting \
  agent-h/issue-8-official-docs-snippets

git switch --detach origin/master
git switch -c issue9-disposable-integration
{
  echo '# Disposable integration-merge audit — issue #9'
  echo
  echo '- Base: master ('"$(git rev-parse --short HEAD)"')'
  echo '- Running environment: '"$(uname -s)"
  echo '- No remote branches are modified; no merge or release is authorised.'
  echo
  echo '| Feature stack | Head SHA | Integration result | Conflicting files |'
  echo '|---|---|---|---|'
} > "$report"

for feature in \
  agent-f/issue-6-command-editor-services \
  agent-d/issue-4-tcf-tgc-catalogue-audit \
  feat/issue-7-grammar-highlighting \
  agent-h/issue-8-official-docs-snippets; do
  sha="$(git rev-parse "origin/$feature")"
  if git merge --no-edit --no-ff "origin/$feature" >/dev/null 2>&1; then
    echo "| $feature | $sha | merged in disposable worktree | — |" >> "$report"
  else
    conflicts="$(git diff --name-only --diff-filter=U | tr '\n' ',')"
    if [[ -z "$conflicts" ]]; then conflicts="unknown"; fi
    echo "| $feature | $sha | **BLOCKED** | $conflicts |" >> "$report"
    git merge --abort || true
  fi
done

{
  echo
  echo '## Resulting disposable checkout'
  echo
  git log -1 --format='- Commit: %H'
  echo
  echo 'This is an **integration composition test only**. A blocked feature'
  echo 'merge means full-stack behaviour has not been tested.'
} >> "$report"
cat "$report"
