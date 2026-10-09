#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v npx >/dev/null || { echo 'Node/npm required'; exit 1; }
echo 'Install verified upstream Codex skills into this repository.'
echo 'First: Matt Pocock engineering skills.'
npx skills@latest add mattpocock/skills -a codex -s setup-matt-pocock-skills -s implement -s design-an-interface -s tdd -s diagnosing-bugs -s grill-with-docs -s to-spec -s qa -y
echo 'Next: Ponytail and Caveman. These skills are from DietrichGebert/ponytail.'
npx skills@latest add DietrichGebert/ponytail -a codex -s ponytail -s caveman -y
bash scripts/verify-agent-skills.sh
printf '\nRun /setup-matt-pocock-skills once within Codex.\n'
