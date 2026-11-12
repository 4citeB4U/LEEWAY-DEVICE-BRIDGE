import WebSocket from "ws";
import https from "node:https";

const url = "wss://leeway-device-bridge.vercel.app/api/device-relay";

function checkHttpRooms() {
  return new Promise(resolve => {
    https.get("https://leeway-device-bridge.vercel.app/api/device-relay", res => {
      let d = "";
      res.on("data", chunk => d += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function probeRoom(deviceId, token) {
  return new Promise(resolve => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => { ws.terminate(); resolve({ ok: false, error: "TIMEOUT" }); }, 2500);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", role: "client", deviceId, token }));
    });
    ws.on("message", raw => {
      clearTimeout(timer);
      const msg = JSON.parse(raw.toString());
      ws.close();
      resolve({ ok: true, msg });
    });
    ws.on("error", err => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });
  });
}

export async function runCatcher(maxSeconds = 45) {
  console.log("=== STARTING REAL FOLD 6 CELLULAR HANDSHAKE CATCHER ===");
  console.log(`Polling ${url} for Samsung Fold6 outbound connection...`);

  const start = Date.now();
  let attempt = 0;
  const candidates = ["phone-fold6", "SM-F956U", "RFCX70LNT7X", "LDB-Fold6"];

  while ((Date.now() - start) < maxSeconds * 1000) {
    attempt++;
    const httpStatus = await checkHttpRooms();
    const roomsCount = httpStatus?.activeRooms ?? 0;

    for (const devId of candidates) {
      const probeRes = await probeRoom(devId, "probe-token");
      if (probeRes.ok) {
        if (probeRes.msg?.error === "PAIRING_TOKEN_REJECTED") {
          console.log(`[DISCOVERY] Room '${devId}' is active and waiting for owner token!`);
          return { active: true, deviceId: devId, state: "WAITING_FOR_TOKEN" };
        } else if (probeRes.msg?.type === "hello-ack") {
          console.log(`[DISCOVERY] Room '${devId}' is ACTIVE and AUTHENTICATED!`);
          return { active: true, deviceId: devId, state: "AUTHENTICATED" };
        }
      }
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[Attempt ${attempt} | ${elapsed}s elapsed] Relay active rooms: ${roomsCount}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("=== CATCHER TIMED OUT: Fold6 did not dial into candidates [phone-fold6, SM-F956U, RFCX70LNT7X] ===");
  return { active: false };
}

if (process.argv[1]) {
  runCatcher(30).then(r => console.log("Result:", r));
}
