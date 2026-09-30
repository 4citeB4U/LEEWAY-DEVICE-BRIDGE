#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$HOME/.leeway/workstation"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="$ROOT/cleanup-$STAMP.txt"
mkdir -p "$ROOT"

exec > >(tee -a "$RECEIPT") 2>&1

echo "LEEWAY PHONE WORKSTATION CLEANUP"
echo "started=$STAMP"
echo "home=$HOME"
echo

echo "[1/8] Stop duplicate control-plane and failed audio experiment processes"
pkill -f 'start-desktop-commander-remote.sh' 2>/dev/null || true
pkill -f 'ensure-desktop-commander.sh' 2>/dev/null || true
pkill -f 'ensure-desktop-commander-once.sh' 2>/dev/null || true
pkill -f 'desktop-commander remote' 2>/dev/null || true
pkill -f 'termux-tts-speak' 2>/dev/null || true
pkill -f 'termux-tts-engines' 2>/dev/null || true
pkill -f 'libexec/termux-api.*TextToSpeech' 2>/dev/null || true
pkill -f 'libexec/termux-api.*MediaPlayer' 2>/dev/null || true
pkill -f 'libexec/termux-api.*Volume' 2>/dev/null || true
pkill -f 'pulseaudio' 2>/dev/null || true
sleep 2

echo "[2/8] Remove stale npx Desktop Commander copies, keep global package"
if [ -d "$HOME/.npm/_npx" ]; then
  for d in "$HOME/.npm/_npx"/*; do
    [ -d "$d" ] || continue
    if [ -f "$d/node_modules/@wonderwhy-er/desktop-commander/package.json" ]; then
      echo "remove_npx_copy=$d"
      rm -rf "$d"
    fi
  done
fi

echo "[3/8] Remove abandoned local audio synthesis experiment"
if dpkg -s espeak >/dev/null 2>&1; then
  pkg uninstall -y espeak || apt remove -y espeak || true
  apt autoremove -y || true
fi
rm -f "$HOME/.leeway/read-aloud/speak.sh" 2>/dev/null || true
rm -f "$HOME/.leeway/read-aloud/last-response.txt" 2>/dev/null || true
rm -f "$HOME/.leeway/read-aloud/audio/test.wav" 2>/dev/null || true
rmdir "$HOME/.leeway/read-aloud/audio" 2>/dev/null || true
rmdir "$HOME/.leeway/read-aloud" 2>/dev/null || true

echo "[4/8] Remove known stale LeeWay installer downloaded during failed update path"
STALE_APK="/storage/emulated/0/Download/leeway-device-bridge-0.8.5.apk"
if [ -f "$STALE_APK" ]; then
  rm -f "$STALE_APK"
  echo "removed_stale_apk=$STALE_APK"
fi

echo "[5/8] Remove obsolete supervisor variants and stale locks"
rm -f "$ROOT/start-desktop-commander-remote.sh"
rm -f "$ROOT/ensure-desktop-commander.sh"
rm -f "$ROOT/desktop-commander-supervisor.lock"
rm -f "$ROOT/desktop-commander-keeper.lock"
rm -rf "$ROOT/.ensure-lock" 2>/dev/null || true

echo "[6/8] Preserve evidence and models"
echo "models_are_not_modified=true"
echo "device_bridge_app_data_is_not_modified=true"
echo "receipts_are_not_modified=true"

echo "[7/8] Rebuild one canonical Desktop Commander workstation path"
BOOTSTRAP="$ROOT/bootstrap-desktop-commander.sh"
curl -fsSL "https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/clients/phone-workstation/bootstrap-desktop-commander.sh" -o "$BOOTSTRAP"
chmod 700 "$BOOTSTRAP"
bash "$BOOTSTRAP"

echo "[8/8] Final inventory"
echo "global_desktop_commander=$(node -p "require('$PREFIX/lib/node_modules/@wonderwhy-er/desktop-commander/package.json').version" 2>/dev/null || echo missing)"
echo "npx_desktop_commander_copies=$(find "$HOME/.npm/_npx" -path '*/@wonderwhy-er/desktop-commander/package.json' -type f 2>/dev/null | wc -l)"
echo "espeak_installed=$(dpkg -s espeak >/dev/null 2>&1 && echo yes || echo no)"
echo "stale_apk_present=$([ -f "$STALE_APK" ] && echo yes || echo no)"
echo "boot_script=$HOME/.termux/boot/01-desktop-commander-remote"
echo
echo "[LeeWay][PASS] CLEANUP_COMPLETE"
echo "receipt=$RECEIPT"
