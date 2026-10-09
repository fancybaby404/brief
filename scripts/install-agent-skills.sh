#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v npx >/dev/null || { echo 'Node/npm required'; exit 1; }
echo 'Install verified upstream Claude Code skills into this repository.'
echo 'First: Matt Pocock engineering skills.'
npx skills@latest add mattpocock/skills -a claude-code --copy -s setup-matt-pocock-skills -s implement -s codebase-design -s tdd -s diagnosing-bugs -s grill-with-docs -s to-spec -y
echo 'Next: Ponytail (DietrichGebert/ponytail).'
npx skills@latest add DietrichGebert/ponytail -a claude-code --copy -s ponytail -y
bash scripts/verify-agent-skills.sh
printf '\nRun /setup-matt-pocock-skills once within Claude Code.\n'
