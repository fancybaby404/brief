#!/usr/bin/env bash
set -euo pipefail

AVD_NAME="${1:-Pixel_API_36}"

# 1. Check if ADB already sees an active emulator
RUNNING_ADB=$(adb devices 2>/dev/null | awk '/^emulator-[0-9]+/ {print $1; exit}')

if [ -n "$RUNNING_ADB" ]; then
  echo "==> Emulator is already running on ADB ($RUNNING_ADB). Skipping launch."
  exit 0
fi

# 2. Check if emulator process is running (even if still booting)
if pgrep -f "qemu-system-x86_64.*@${AVD_NAME}" >/dev/null 2>&1 || pgrep -f "emulator.*${AVD_NAME}" >/dev/null 2>&1; then
  echo "==> Emulator process ($AVD_NAME) is already running. Skipping launch."
  exit 0
fi

# 3. Launch emulator only if not running
echo "==> Starting emulator '$AVD_NAME'..."
nohup emulator -avd "$AVD_NAME" >/dev/null 2>&1 &

echo "==> Waiting for emulator to connect to adb..."
adb wait-for-device
echo "==> Emulator is ready."
