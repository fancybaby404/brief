#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Git Bash ships GNU tar, which misreads C:\ paths; llama.rn's postinstall needs Windows' own tar.exe.
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) export PATH="/c/Windows/System32:$PATH" ;; esac
echo "Installing pinned dependencies (Expo SDK 57, llama.rn native libraries)..."
npm install
npx expo install --check
npx expo-doctor
printf '\nDependencies installed. Native modules require: npm run android OR npm run ios (Mac).\n'
printf 'Use a development build. Expo Go cannot run llama.rn or expo-ocr-kit.\n'
