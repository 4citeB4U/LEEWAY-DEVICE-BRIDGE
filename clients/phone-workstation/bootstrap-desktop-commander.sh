#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

VERSION="${LEEWAY_DC_VERSION:-0.2.52}"
ROOT="${HOME}/.leeway/workstation"
BOOT="${HOME}/.termux/boot"
PATCH="${ROOT}/patch-desktop-commander-android.mjs"
BOOT_SCRIPT="${BOOT}/01-desktop-commander-remote"

mkdir -p "${ROOT}" "${BOOT}"
chmod 700 "${ROOT}" "${BOOT}"

echo "[LeeWay] Installing Android workstation prerequisites..."
pkg install -y nodejs git ripgrep curl openssh >/dev/null

echo "[LeeWay] Installing Desktop Commander ${VERSION}..."
npm install -g "@wonderwhy-er/desktop-commander@${VERSION}"

echo "[LeeWay] Fetching qualified Android compatibility patch..."
curl -fsSL "https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/clients/phone-workstation/patch-desktop-commander-android.mjs" -o "${PATCH}"
chmod 600 "${PATCH}"
LEEWAY_DC_VERSION="${VERSION}" node "${PATCH}"

cat > "${BOOT_SCRIPT}" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
export PREFIX=/data/data/com.termux/files/usr
export LD_PRELOAD=/data/data/com.termux/files/usr/lib/libtermux-exec.so
export PATH=/data/data/com.termux/files/usr/bin:/system/bin
ROOT="$HOME/.leeway/workstation"
LOG="$ROOT/desktop-commander-remote.log"
mkdir -p "$ROOT"
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock || true
sleep 8
while true; do
  printf '%s supervisor_start\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
  desktop-commander remote >> "$LOG" 2>&1
  code=$?
  printf '%s supervisor_exit code=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$code" >> "$LOG"
  sleep 5
done
SH
chmod 700 "${BOOT_SCRIPT}"

echo "[LeeWay][PASS] PREREQUISITES_INSTALLED"
echo "[LeeWay][PASS] DESKTOP_COMMANDER_ANDROID_PATCH_APPLIED"
echo "[LeeWay][PASS] BOOT_SUPERVISOR_INSTALLED"
echo
if [ -f "$HOME/.desktop-commander-device/device.json" ]; then
  echo "[LeeWay][OBSERVED] Persisted Desktop Commander identity exists."
  echo "[LeeWay] Start now with: desktop-commander remote"
else
  echo "[LeeWay][ACTION_REQUIRED] Run: desktop-commander remote"
  echo "[LeeWay] Complete the owner-controlled browser authentication once."
  echo "[LeeWay] Do not share passwords, MFA codes, access tokens, or refresh tokens."
fi
echo
echo "[LeeWay] Acceptance is NOT complete until a remote agent proves:"
echo "  direct ping + shell + file read/write + search + Git/GitHub + no-USB + PC-independent + cold-boot reconnect."
