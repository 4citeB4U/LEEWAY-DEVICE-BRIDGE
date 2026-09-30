#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="$HOME/.leeway/workstation"
BOOT="$HOME/.termux/boot"
mkdir -p "$ROOT" "$BOOT"
chmod 700 "$ROOT"

echo "[LeeWay] Preparing phone workstation runtime..."
pkg install -y nodejs curl >/dev/null
cat > "$ROOT/package.json" <<'JSON'
{"name":"leeway-phone-workstation","private":true,"type":"module","dependencies":{"ws":"8.18.3"}}
JSON
(
  cd "$ROOT"
  npm install --ignore-scripts --no-audit --no-fund >/dev/null
)

curl -fsSL "https://raw.githubusercontent.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/main/clients/phone-workstation/worker.mjs" -o "$ROOT/worker.mjs"

NONCE="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
am start -n industries.leeway.devicebridge/.MainActivity   --es leeway_action TERMUX_BOOTSTRAP   --es leeway_nonce "$NONCE" >/dev/null 2>&1

BOOTSTRAP=""
for _ in $(seq 1 50); do
  BOOTSTRAP="$(curl -fsS --max-time 2 "http://127.0.0.1:5323/owner-bootstrap?nonce=$NONCE" 2>/dev/null || true)"
  [ -n "$BOOTSTRAP" ] && break
  sleep 0.4
done
unset NONCE
[ -n "$BOOTSTRAP" ] || { echo "[LeeWay][FAIL] owner bootstrap unavailable"; exit 20; }

printf '%s' "$BOOTSTRAP" | node - "$ROOT/credentials.json" <<'NODE'
const fs=require("fs");
const target=process.argv[2];
let input="";process.stdin.on("data",d=>input+=d);process.stdin.on("end",()=>{
  const v=JSON.parse(input);
  if(v.ok!==true||!v.deviceId||!v.pairingToken)process.exit(21);
  fs.writeFileSync(target,JSON.stringify({deviceId:v.deviceId,token:v.pairingToken,relay:v.relayUrl},null,2));
  fs.chmodSync(target,0o600);
});
NODE

cat > "$BOOT/00-leeway-workstation.sh" <<'SH'
#!/data/data/com.termux/files/usr/bin/bash
ROOT="$HOME/.leeway/workstation"
termux-wake-lock >/dev/null 2>&1 || true
pkill -f "node .*worker.mjs" >/dev/null 2>&1 || true
nohup node "$ROOT/worker.mjs" >> "$ROOT/worker.log" 2>&1 &
SH
chmod 700 "$BOOT/00-leeway-workstation.sh"

termux-wake-lock >/dev/null 2>&1 || true
pkill -f "node .*worker.mjs" >/dev/null 2>&1 || true
nohup node "$ROOT/worker.mjs" >> "$ROOT/worker.log" 2>&1 &
sleep 2

if pgrep -f "node .*worker.mjs" >/dev/null; then
  echo "[LeeWay][PASS] PHONE_WORKSTATION_WORKER_RUNNING"
  echo "[LeeWay][PASS] BOOT_SCRIPT_INSTALLED"
else
  echo "[LeeWay][FAIL] workstation worker did not stay running"
  exit 22
fi
