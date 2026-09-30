#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

VERSION="${LEEWAY_DC_VERSION:-0.2.52}"
ROOT="${HOME}/.leeway/workstation"
BOOT="${HOME}/.termux/boot"
PATCH="${ROOT}/patch-desktop-commander-android.mjs"
ENSURE="${ROOT}/ensure-desktop-commander-once.sh"
BOOT_SCRIPT="${BOOT}/01-desktop-commander-remote"

mkdir -p "${ROOT}" "${BOOT}" "${HOME}/.termux"
chmod 700 "${ROOT}" "${BOOT}"

echo "[LeeWay] Installing Android workstation prerequisites..."
pkg install -y nodejs git ripgrep curl openssh >/dev/null

echo "[LeeWay] Installing Desktop Commander ${VERSION}..."
npm install -g "@wonderwhy-er/desktop-commander@${VERSION}"

echo "[LeeWay] Fetching qualified Android compatibility patch..."
curl -fsSL "https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/clients/phone-workstation/patch-desktop-commander-android.mjs" -o "${PATCH}"
chmod 600 "${PATCH}"
LEEWAY_DC_VERSION="${VERSION}" node "${PATCH}"

touch "${HOME}/.termux/termux.properties"
if grep -q '^allow-external-apps=' "${HOME}/.termux/termux.properties"; then
  sed -i 's/^allow-external-apps=.*/allow-external-apps=true/' "${HOME}/.termux/termux.properties"
else
  printf '\nallow-external-apps=true\n' >> "${HOME}/.termux/termux.properties"
fi
termux-reload-settings >/dev/null 2>&1 || true

cat > "${ENSURE}" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
set -u
export PREFIX=/data/data/com.termux/files/usr
export LD_PRELOAD=/data/data/com.termux/files/usr/lib/libtermux-exec.so
export PATH=/data/data/com.termux/files/usr/bin:/system/bin
ROOT="$HOME/.leeway/workstation"
LOG="$ROOT/desktop-commander-remote.log"
LOCK="$ROOT/.ensure-lock"
mkdir -p "$ROOT"
if ! mkdir "$LOCK" 2>/dev/null; then exit 0; fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
termux-wake-lock >/dev/null 2>&1 || true
if pgrep -f '/data/data/com.termux/files/usr/bin/desktop-commander remote' >/dev/null 2>&1; then
  exit 0
fi
printf '%s ensure_start\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$LOG"
setsid nohup desktop-commander remote >> "$LOG" 2>&1 </dev/null &
SH
chmod 700 "${ENSURE}"

cat > "${BOOT_SCRIPT}" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
export PREFIX=/data/data/com.termux/files/usr
export LD_PRELOAD=/data/data/com.termux/files/usr/lib/libtermux-exec.so
export PATH=/data/data/com.termux/files/usr/bin:/system/bin
termux-wake-lock >/dev/null 2>&1 || true
"$HOME/.leeway/workstation/ensure-desktop-commander-once.sh"
SH
chmod 700 "${BOOT_SCRIPT}"

termux-wake-lock >/dev/null 2>&1 || true
"${ENSURE}"

echo "[LeeWay][PASS] PREREQUISITES_INSTALLED"
echo "[LeeWay][PASS] DESKTOP_COMMANDER_ANDROID_PATCH_APPLIED"
echo "[LeeWay][PASS] TERMUX_EXTERNAL_COMMAND_POLICY_ENABLED"
echo "[LeeWay][PASS] SINGLE_INSTANCE_ENSURE_SCRIPT_INSTALLED"
echo "[LeeWay][PASS] BOOT_ENSURE_INSTALLED"
echo
if [ -f "$HOME/.desktop-commander-device/device.json" ]; then
  echo "[LeeWay][OBSERVED] Persisted Desktop Commander identity exists."
else
  echo "[LeeWay][ACTION_REQUIRED] Run desktop-commander remote once and complete owner authentication."
fi
echo
echo "[LeeWay] For always-on recovery, install/enable LeeWay Device Bridge with"
echo "[LeeWay] com.termux.permission.RUN_COMMAND authorized once by the owner."
