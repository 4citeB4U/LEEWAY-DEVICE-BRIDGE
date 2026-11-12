/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-PERSISTENT-RELAY-SERVER
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Persistent WebSocket relay server running on port 8008.
      Directly exposed to the public internet via Tailscale Funnel:
      wss://agent-lee.tail4baa5f.ts.net/api/device-relay
      Eliminates Vercel serverless cold starts, container recycles, and wiped in-memory rooms.
*/
import { createDeviceRelayServer } from "./../api/device-relay.mjs";

const PORT = Number(process.env.LEEWAY_RELAY_PORT || 8008);
const HOST = process.env.LEEWAY_RELAY_HOST || "127.0.0.1";

const { server, wss, rooms } = createDeviceRelayServer();

server.listen(PORT, HOST, () => {
  console.log(`[PERSISTENT-RELAY] Server listening on http://${HOST}:${PORT}`);
  console.log(`[PERSISTENT-RELAY] Funnel Public URL: wss://agent-lee.tailb186e7.ts.net/api/device-relay`);
});

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
