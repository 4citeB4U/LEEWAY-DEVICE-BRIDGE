/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-HP-STANDALONE-AGENT
WHO: Agent Lee / Device Bridge
WHAT: Zero-dependency outbound mesh daemon for HP Laptop (LEO / pc-hp-secondary).
      Uses Node 24 native built-in global WebSocket. No npm dependencies needed.
      Connects to: wss://agent-lee.tailb186e7.ts.net/api/device-relay
*/
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";

const RELAY_URL = process.env.LEEWAY_RELAY_URL || "wss://agent-lee.tailb186e7.ts.net/api/device-relay";
const DEVICE_ID = "pc-hp-secondary";
const TOKEN = process.env.LEEWAY_MESH_TOKEN || null;
const HTTP_PORT = Number(process.env.HP_AGENT_HTTP_PORT || 8009);

console.log("==================================================================");
console.log("  LEEWAY SOVEREIGN MESH AGENT — HP SECONDARY WORKSTATION (LEO)");
console.log("==================================================================");
console.log(`Connecting outbound to: ${RELAY_URL}`);
console.log(`Device ID:              ${DEVICE_ID}`);
console.log(`Node.js Version:        ${process.version}`);
console.log(`Hostname:               ${os.hostname()}`);
console.log("==================================================================\n");

function connect() {
  const ws = new WebSocket(RELAY_URL);

  ws.onopen = () => {
    console.log(`[HP-AGENT] Connected to relay. Authenticating as ${DEVICE_ID}...`);
    ws.send(JSON.stringify({
      type: "hello",
      role: "phone",
      deviceId: DEVICE_ID,
      token: TOKEN
    }));
  };

  ws.onmessage = async (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === "hello-ack") {
      console.log(`>>> [HP-AGENT] SUCCESSFULLY JOINED SOVEREIGN MESH AS: ${DEVICE_ID} <<<`);
      return;
    }

    if (msg.type === "command") {
      const { id, capability, arguments: args = {} } = msg;
      console.log(`[HP-AGENT] Received command: ${capability} [${id}]`);

      let result = { ok: true };

      if (capability === "device.info") {
        result = {
          ok: true,
          platform: "windows",
          deviceId: DEVICE_ID,
          role: "SECONDARY_HP_WORKSTATION",
          hostname: os.hostname(),
          model: "HP Laptop 15-dw0xxx",
          manufacturer: "HP",
          platform_os: os.type(),
          release: os.release(),
          totalMemoryBytes: os.totalmem(),
          freeMemoryBytes: os.freemem(),
          cpus: os.cpus().map(c => c.model).slice(0, 2),
          timestamp: new Date().toISOString()
        };
      } else if (capability === "device.health") {
        result = {
          ok: true,
          platform: "windows",
          deviceId: DEVICE_ID,
          status: "ONLINE",
          uptimeSeconds: os.uptime(),
          timestamp: new Date().toISOString()
        };
      } else if (capability === "device.directories.list") {
        const targetDir = args.path || "C:\\";
        try {
          const entries = await fs.readdir(targetDir);
          result = { ok: true, deviceId: DEVICE_ID, path: targetDir, entries: entries.slice(0, 20), count: entries.length };
        } catch (e) {
          result = { ok: false, error: e.message };
        }
      } else if (capability === "device.files.write") {
        const targetPath = args.path || path.join(os.tmpdir(), path.basename(args.name || "leeway-mesh-hop-test.json"));
        try {
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.writeFile(targetPath, typeof args.content === "string" ? args.content : JSON.stringify(args.content, null, 2), "utf8");
          result = { ok: true, deviceId: DEVICE_ID, path: targetPath, bytes: Buffer.byteLength(typeof args.content === "string" ? args.content : JSON.stringify(args.content)), timestamp: new Date().toISOString() };
        } catch (e) {
          result = { ok: false, error: e.message };
        }
      } else if (capability === "device.files.read") {
        const targetPath = args.path || path.join(os.tmpdir(), path.basename(args.name || "leeway-mesh-hop-test.json"));
        try {
          const content = await fs.readFile(targetPath, "utf8");
          result = { ok: true, deviceId: DEVICE_ID, path: targetPath, content, timestamp: new Date().toISOString() };
        } catch (e) {
          result = { ok: false, error: e.message };
        }
      } else {
        result = { ok: false, error: "UNSUPPORTED_CAPABILITY: " + capability };
      }

      ws.send(JSON.stringify({
        type: "result",
        id,
        capability,
        ok: result.ok !== false,
        result
      }));
    }
  };

  ws.onclose = (e) => {
    console.log(`[HP-AGENT] Disconnected: ${e.code} (${e.reason}). Reconnecting in 4s...`);
    setTimeout(connect, 4000);
  };

  ws.onerror = (err) => {
    console.error(`[HP-AGENT] Error:`, err.message || err);
  };
}

const httpServer = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/dashboard" || req.url === "/dashboard.html") {
    try {
      const dashUrl = RELAY_URL.replace("ws://", "http://").replace("wss://", "https://").replace("/api/device-relay", "/dashboard");
      const resp = await fetch(dashUrl);
      const text = await resp.text();
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "access-control-allow-origin": "*" });
      return res.end(text);
    } catch {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end("<h1>LeeWay HP Secondary Workstation</h1><p>Relay agent active.</p>");
    }
  }
  res.writeHead(404);
  res.end();
});

httpServer.listen(HTTP_PORT, "0.0.0.0", () => {
  console.log(`[HP-AGENT] Local Sovereign Dashboard listening on http://localhost:${HTTP_PORT}`);
});

connect();
