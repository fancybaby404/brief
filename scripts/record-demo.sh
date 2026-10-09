#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-video/public/demo.mp4}"
DEVICE_PATH="/sdcard/brief_demo.mp4"

mkdir -p "$(dirname "$TARGET")"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$DIR/start-emulator.sh"

echo "==> Recording started on emulator..."
echo "==> Perform your actions in the emulator now."
echo "==> Press [ENTER] when finished to stop recording."

adb shell "screenrecord $DEVICE_PATH" &
RECORD_PID=$!

# Wait for Enter key
read -r _ || true

# Signal screenrecord to stop cleanly and finalize MP4 header
adb shell "pkill -2 -f screenrecord" 2>/dev/null || true
kill -INT "$RECORD_PID" 2>/dev/null || true
sleep 1

echo "==> Pulling recording to $TARGET..."
adb pull "$DEVICE_PATH" "$TARGET"
adb shell "rm -f $DEVICE_PATH"

echo "==> Done! Video ready at $TARGET"
