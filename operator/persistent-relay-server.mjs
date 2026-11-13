/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-PERSISTENT-RELAY-SERVER
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Persistent WebSocket relay server running on port 8008 wrapped with Phoenix LKG Snapshot & WAL Custody.
      Directly exposed to the public internet via Tailscale Funnel:
      wss://agent-lee.tailb186e7.ts.net/api/device-relay
      Eliminates Vercel serverless cold starts, container recycles, and wiped in-memory rooms.
*/
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDeviceRelayServer } from "./../api/device-relay.mjs";
import { createRelayMcpAccessPolicy } from "./identity/relay-mcp-access-policy.mjs";
import { openSovereignWalStore } from "./sqlite-wal-store.mjs";
import { createLkgSnapshot, createPhoenixWatchdog } from "../scripts/phoenix-recovery-supervisor.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.LEEWAY_RELAY_PORT || 8008);
const HOST = process.env.LEEWAY_RELAY_HOST || "127.0.0.1";

const walStore = openSovereignWalStore();
const lkgDir = path.resolve(__dirname, "../state/lkg-snapshots");
const lkgConfigPath = path.resolve(__dirname, "../state/relay-runtime-lkg.json");

createLkgSnapshot({
  targetId: "persistent-relay-server",
  label: "boot-verified",
  state: {
    host: HOST,
    port: PORT,
    constitution: "LEEWAY-SOVEREIGN-COLONY-CONSTITUTION-V1",
    persistence: walStore.persistence,
    bootedAt: new Date().toISOString()
  },
  snapshotDir: lkgDir,
  restorePath: lkgConfigPath,
  walStore
});

export const phoenixWatchdog = createPhoenixWatchdog({
  targetId: "persistent-relay-server",
  restorePath: lkgConfigPath,
  walStore
});

const mcpAccessPolicy = createRelayMcpAccessPolicy();
const { server } = createDeviceRelayServer({ mcpAccessPolicy });

server.on("error", (err) => {
  console.error("[PERSISTENT-RELAY] Error:", err.message);
  phoenixWatchdog.recordFailure(err.message);
});

server.listen(PORT, HOST, () => {
  phoenixWatchdog.recordHealthyHeartbeat("RELAY_LISTENING");
  console.log(`[PERSISTENT-RELAY] Server listening on http://${HOST}:${PORT} (SQLite WAL + Phoenix LKG active)`);
  console.log(`[PERSISTENT-RELAY] Funnel Public URL: wss://agent-lee.tailb186e7.ts.net/api/device-relay`);
});

process.on("SIGINT", () => {
  server.close();
  walStore.close();
  process.exit(0);
});
