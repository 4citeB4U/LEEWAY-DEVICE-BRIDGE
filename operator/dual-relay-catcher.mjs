/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-DUAL-RELAY-CATCHER
WHO: Agent Lee / Device Bridge
WHAT: Dual-relay active room monitor and automatic hardware qualification catcher.
      Simultaneously monitors both:
      1) Sovereign Persistent Relay (http://127.0.0.1:8008 / wss://agent-lee.tailb186e7.ts.net/api/device-relay)
      2) Public Vercel Relay (https://leeway-device-bridge.vercel.app/api/device-relay)
      Auto-detects any incoming deviceId (LDB-*, phone-fold6, SM-F956U), pairs, and dispatches:
      - device.health
      - device.info
      - device.directories.list
*/
import WebSocket from "ws";
import http from "node:http";
import https from "node:https";

const LOCAL_RELAY_HTTP = "http://127.0.0.1:8008/api/device-relay";
const LOCAL_RELAY_WS = "ws://127.0.0.1:8008/api/device-relay";
const VERCEL_RELAY_HTTP = "https://leeway-device-bridge.vercel.app/api/device-relay";
const VERCEL_RELAY_WS = "wss://leeway-device-bridge.vercel.app/api/device-relay";

function fetchJson(url) {
  return new Promise(resolve => {
    const getter = url.startsWith("https") ? https.get : http.get;
    getter(url, { headers: { "Cache-Control": "no-cache" }, timeout: 4000 }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function executeRemoteCall(wsUrl, deviceId, token, capability, args = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const commandId = "qual-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const timer = setTimeout(() => {
      ws.terminate();
      resolve({ ok: false, error: "TIMEOUT" });
    }, 10000);

    ws.on("open", () => {
      ws.send(JSON.stringify({
        type: "hello",
        role: "client",
        deviceId,
        token
      }));
    });

    ws.on("message", raw => {
      let msg;
      try { msg = JSON.parse(raw.toString("utf8")); } catch { return; }
      if (msg.type === "hello-ack") {
        ws.send(JSON.stringify({
          type: "command",
          id: commandId,
          capability,
          arguments: args
        }));
      } else if (msg.type === "result" && msg.id === commandId) {
        clearTimeout(timer);
        ws.close();
        resolve(msg);
      } else if (msg.type === "error") {
        clearTimeout(timer);
        ws.close();
        resolve(msg);
      }
    });

    ws.on("error", err => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
}

async function runQualification(wsUrl, deviceId, token) {
  console.log(`\n======================================================`);
  console.log(`[DISCOVERY] Caught active hardware room: ${deviceId}`);
  console.log(`[DISCOVERY] Relay Endpoint: ${wsUrl}`);
  console.log(`[DISCOVERY] Token: ${token ? token.substring(0, 6) + '...' : 'none'}`);
  console.log(`======================================================\n`);

  console.log(`---> [STEP 1/3] Executing device.health on ${deviceId}...`);
  const healthRes = await executeRemoteCall(wsUrl, deviceId, token, "device.health", {});
  console.log(`[RAW RECEIPT: device.health]\n${JSON.stringify(healthRes, null, 2)}\n`);

  console.log(`---> [STEP 2/3] Executing device.info on ${deviceId}...`);
  const infoRes = await executeRemoteCall(wsUrl, deviceId, token, "device.info", {});
  console.log(`[RAW RECEIPT: device.info]\n${JSON.stringify(infoRes, null, 2)}\n`);

  console.log(`---> [STEP 3/3] Executing device.directories.list on ${deviceId}...`);
  const dirsRes = await executeRemoteCall(wsUrl, deviceId, token, "device.directories.list", { path: "." });
  console.log(`[RAW RECEIPT: device.directories.list]\n${JSON.stringify(dirsRes, null, 2)}\n`);

  return { healthRes, infoRes, dirsRes };
}

async function main() {
  console.log("=== LEEWAY DUAL-RELAY HARDWARE CATCHER RUNNING CONTINUOUSLY ===");
  console.log(`- Sovereign Persistent Relay: ${LOCAL_RELAY_HTTP}`);
  console.log(`- Public Funnel Endpoint:     https://agent-lee.tailb186e7.ts.net/api/device-relay`);
  console.log(`- Public Vercel Relay:        ${VERCEL_RELAY_HTTP}`);
  console.log("Actively listening for Fold6 or iPhone on either relay...\n");

  let lastSovereignCount = -1;
  let lastVercelCount = -1;
  const qualifiedDevices = new Set();

  while (true) {
    // 1. Check Sovereign Relay
    try {
      const sovereignState = await fetchJson(LOCAL_RELAY_HTTP);
      if (sovereignState && Array.isArray(sovereignState.activeRooms)) {
        if (sovereignState.activeRoomsCount !== lastSovereignCount) {
          lastSovereignCount = sovereignState.activeRoomsCount;
          console.log(`[SOVEREIGN-RELAY-UPDATE] Room Table:`, JSON.stringify(sovereignState.activeRooms, null, 2));
        }
        for (const room of sovereignState.activeRooms) {
          if (room.deviceId !== "pc-primary" && room.hasPhone && !qualifiedDevices.has(room.deviceId)) {
            console.log(`\n[CATCH] Detected incoming mobile node on Sovereign Relay: ${room.deviceId}`);
            qualifiedDevices.add(room.deviceId);
            await runQualification(LOCAL_RELAY_WS, room.deviceId, room.token);
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // 2. Check Vercel Relay
    try {
      const vercelState = await fetchJson(VERCEL_RELAY_HTTP);
      const vCount = vercelState?.activeRooms ?? 0;
      if (vCount !== lastVercelCount) {
        lastVercelCount = vCount;
        console.log(`[VERCEL-RELAY-UPDATE] Full Payload:`, JSON.stringify(vercelState, null, 2));
      }
    } catch (e) {
      // ignore
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

main().catch(console.error);
