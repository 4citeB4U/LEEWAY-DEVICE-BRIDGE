#!/usr/bin/env sh
set -eu

SOURCE_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
INSTALL_ROOT=${LEEWAY_INSTALL_ROOT:-"$HOME/.local/share/leeway-device-bridge"}
CARGO_BIN=${CARGO:-cargo}

"$CARGO_BIN" build --manifest-path "$SOURCE_ROOT/Cargo.toml" --workspace --release
for partition in Workspace Sandbox Continuum DigitalBrain Diagnostics Ledger Receipts; do
  mkdir -p "$INSTALL_ROOT/SovereignNode/$partition"
done
mkdir -p "$INSTALL_ROOT/bin" "$INSTALL_ROOT/config" "$INSTALL_ROOT/keys" "$INSTALL_ROOT/credentials"
mkdir -p "$INSTALL_ROOT/scripts" "$INSTALL_ROOT/runtime/operator" "$INSTALL_ROOT/runtime/apps/desktop" "$INSTALL_ROOT/runtime/scripts"
cp "$SOURCE_ROOT/target/release/leeway-core" "$INSTALL_ROOT/bin/leeway-core"
cp "$SOURCE_ROOT/scripts/generate-device-key.mjs" "$INSTALL_ROOT/scripts/generate-device-key.mjs"
cp "$SOURCE_ROOT/operator/workstation-relay-agent.mjs" "$INSTALL_ROOT/runtime/operator/workstation-relay-agent.mjs"
cp -R "$SOURCE_ROOT/apps/desktop/." "$INSTALL_ROOT/runtime/apps/desktop/"
cp "$SOURCE_ROOT/scripts/mesh-replication-worker.mjs" "$INSTALL_ROOT/runtime/scripts/mesh-replication-worker.mjs"
chmod 700 "$INSTALL_ROOT/bin/leeway-core"
node "$INSTALL_ROOT/scripts/generate-device-key.mjs" \
  "$INSTALL_ROOT/keys/device-private.pem" \
  "$INSTALL_ROOT/keys/device-public.pem"
if [ -n "${LEEWAY_ENROLLMENT_RECORD:-}" ]; then
  cp "$LEEWAY_ENROLLMENT_RECORD" "$INSTALL_ROOT/config/trusted-device-registry.json"
elif [ ! -f "$INSTALL_ROOT/config/trusted-device-registry.json" ]; then
  printf '%s\n' '{"devices":[]}' > "$INSTALL_ROOT/config/trusted-device-registry.json"
fi

if [ -n "${LEEWAY_MESH_TOKEN:-}" ] && [ -n "${LEEWAY_DEVICE_ID:-}" ] && [ -n "${LEEWAY_RELAY_URL:-}" ]; then
  case "$LEEWAY_RELAY_URL" in wss://*) ;; *) echo 'LEEWAY_RELAY_URL_MUST_USE_WSS' >&2; exit 1;; esac
  umask 077
  printf '%s' "$LEEWAY_MESH_TOKEN" > "$INSTALL_ROOT/credentials/mesh-token"
  printf '%s' "$LEEWAY_DEVICE_ID" > "$INSTALL_ROOT/config/device-id"
  printf '%s' "$LEEWAY_RELAY_URL" > "$INSTALL_ROOT/config/relay-url"
  CREDENTIAL_STATE=HOST_CREDENTIAL_BOUND
else
  CREDENTIAL_STATE=AWAITING_OWNER_LOGIN
fi

cat > "$INSTALL_ROOT/scripts/start-leeway-core.sh" <<'LAUNCHER'
#!/usr/bin/env sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export LEEWAY_MESH_TOKEN=$(cat "$ROOT/credentials/mesh-token")
export LEEWAY_TRUSTED_DEVICE_REGISTRY_PATH="$ROOT/config/trusted-device-registry.json"
export LEEWAY_SOVEREIGN_ROOT="$ROOT/SovereignNode"
export LEEWAY_DEVICE_ID=$(cat "$ROOT/config/device-id")
export LEEWAY_RELAY_URL=$(cat "$ROOT/config/relay-url")
export LEEWAY_DEVICE_PRIVATE_KEY_PATH="$ROOT/keys/device-private.pem"
export LEEWAY_WORKSPACE="$ROOT/SovereignNode/Workspace"
export LEEWAY_CONTINUUM_ROOT="$ROOT/SovereignNode/Continuum"
"$ROOT/bin/leeway-core" daemon & CORE_PID=$!
node "$ROOT/runtime/scripts/mesh-replication-worker.mjs" & REPLICATION_PID=$!
trap 'kill "$REPLICATION_PID" "$CORE_PID" 2>/dev/null || true' EXIT INT TERM
node "$ROOT/runtime/operator/workstation-relay-agent.mjs"
LAUNCHER
chmod 700 "$INSTALL_ROOT/scripts/start-leeway-core.sh"

if [ "$CREDENTIAL_STATE" = HOST_CREDENTIAL_BOUND ]; then
  "$INSTALL_ROOT/bin/leeway-core" registry-verify \
    --registry "$INSTALL_ROOT/config/trusted-device-registry.json" \
    --device "$LEEWAY_DEVICE_ID" | grep -q '"admitted":true' || {
      echo 'LEEWAY_DEVICE_ENROLLMENT_REQUIRED' >&2
      exit 1
    }
  "$INSTALL_ROOT/bin/leeway-core" registry-key-verify \
    --registry "$INSTALL_ROOT/config/trusted-device-registry.json" \
    --device "$LEEWAY_DEVICE_ID" \
    --public "$INSTALL_ROOT/keys/device-public.pem" >/dev/null || {
      echo 'LEEWAY_DEVICE_KEY_NOT_BOUND_TO_ENROLLMENT' >&2
      exit 1
    }
  case "$(uname -s)" in
    Darwin)
      mkdir -p "$HOME/Library/LaunchAgents"
      cat > "$HOME/Library/LaunchAgents/industries.leeway.sovereign-core.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>industries.leeway.sovereign-core</string><key>ProgramArguments</key><array><string>$INSTALL_ROOT/scripts/start-leeway-core.sh</string></array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/></dict></plist>
EOF
      launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/industries.leeway.sovereign-core.plist" 2>/dev/null || true
      ;;
    Linux)
      if [ -n "${PREFIX:-}" ] && printf '%s' "$PREFIX" | grep -q 'com.termux'; then
        mkdir -p "$HOME/.termux/boot"
        cat > "$HOME/.termux/boot/leeway-sovereign-core" <<EOF
#!/usr/bin/env sh
exec "$INSTALL_ROOT/scripts/start-leeway-core.sh"
EOF
        chmod 700 "$HOME/.termux/boot/leeway-sovereign-core"
      elif command -v systemctl >/dev/null 2>&1; then
        mkdir -p "$HOME/.config/systemd/user"
        cat > "$HOME/.config/systemd/user/leeway-sovereign-core.service" <<EOF
[Unit]
Description=LeeWay Sovereign Core
[Service]
ExecStart=$INSTALL_ROOT/scripts/start-leeway-core.sh
Restart=always
RestartSec=3
[Install]
WantedBy=default.target
EOF
        systemctl --user daemon-reload
        systemctl --user enable --now leeway-sovereign-core.service
      fi
      ;;
  esac
fi

cat <<EOF
{"installed":true,"installRoot":"$INSTALL_ROOT","partitions":["Workspace","Sandbox","Continuum","DigitalBrain","Diagnostics","Ledger","Receipts"],"credentialState":"$CREDENTIAL_STATE","deviceKeyState":"HOST_HELD"}
EOF
