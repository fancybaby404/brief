#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Installing Expo SDK 57 core..."
npm install
echo "Installing Expo-version-compatible React Native modules..."
npx expo install expo-dev-client expo-build-properties expo-sqlite expo-image-picker expo-document-picker expo-file-system expo-status-bar expo-haptics expo-speech expo-sharing @expo/vector-icons react-native-svg react-native-safe-area-context expo-linking
npm install llama.rn expo-ocr-kit expo-pdf-text-extract
npx expo install --fix
printf '\nDependencies installed. Native modules require: npm run android OR npm run ios (Mac).\n'
printf 'Use a development build. Expo Go cannot run llama.rn or expo-ocr-kit.\n'
