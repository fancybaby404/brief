#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for skill in setup-matt-pocock-skills implement tdd codebase-design ponytail; do
  f=".claude/skills/$skill/SKILL.md"
  if [ -f "$f" ]; then echo "OK $skill"; else echo "MISSING $skill (run bash scripts/install-agent-skills.sh)"; exit 1; fi
done
