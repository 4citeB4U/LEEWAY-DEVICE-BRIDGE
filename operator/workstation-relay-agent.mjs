/*
REGION: 🟢 CORE / OPERATOR
TAG: LEEWAY-WORKSTATION-RELAY-AGENT
WHO: Agent Lee / Runtime Fabric / Device Bridge
WHAT: Outbound persistent relay daemon for an enrolled desktop node.
      Connects outbound to wss://leeway-device-bridge.vercel.app/api/device-relay
      so phones on 5G cellular, public Wi-Fi, or interstate routes can command
      the primary GPU workstation without inbound firewall or LAN dependencies.
WHEN: Always-on background daemon.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: Network-agnostic sovereign mesh for remote orchestration.
LICENSE: MIT
*/
import WebSocket from "ws";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { DesktopAdapter } from "../apps/desktop/adapter.mjs";
import { readWindowsHostIdentity } from "./windows-pc-primary.mjs";
import { DigitalBrainEngine } from "../apps/desktop/digital-brain.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOVEREIGN_RELAY_URL = process.env.LEEWAY_RELAY_URL || "ws://127.0.0.1:8008/api/device-relay";
const VERCEL_RELAY_URL = "wss://leeway-device-bridge.vercel.app/api/device-relay";
const DEVICE_ID = process.env.LEEWAY_DEVICE_ID || null;
const TOKEN = process.env.LEEWAY_MESH_TOKEN || null;
const WORKSPACE_DIR = path.resolve(__dirname, "..");

export class WorkstationRelayAgent {
  constructor({ url = SOVEREIGN_RELAY_URL, deviceId = DEVICE_ID, token = TOKEN, workspace = WORKSPACE_DIR } = {}) {
    if (typeof deviceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(deviceId)) {
      throw new Error('LEEWAY_DEVICE_ID_REQUIRED');
    }
    if (typeof token !== 'string' || token.length < 16) throw new Error('LEEWAY_MESH_TOKEN_REQUIRED');
    this.primaryUrl = url;
    this.fallbackUrl = VERCEL_RELAY_URL;
    this.deviceId = deviceId;
    this.token = token;
    this.workspace = workspace;
    this.desktopAdapter = new DesktopAdapter(workspace);
    this.digitalBrain = new DigitalBrainEngine();
    this.primaryWs = null;
    this.fallbackWs = null;
    this.running = false;
  }

  async executeCapability(capability, args = {}) {
    if (capability === "device.info") {
      try {
        const hostIdentity = await readWindowsHostIdentity();
        return {
          ok: true,
          platform: "windows",
          deviceId: this.deviceId,
          role: "WORKSTATION_NODE",
          model: hostIdentity.model,
          manufacturer: hostIdentity.manufacturer,
          osCaption: hostIdentity.osCaption,
          osVersion: hostIdentity.osVersion,
          biosSerialNumber: hostIdentity.biosSerialNumber,
          computerUuid: hostIdentity.computerUuid,
          uiControl: true,
          remoteMeshActive: true,
          timestamp: new Date().toISOString()
        };
      } catch (e) {
        return {
          ok: true,
          platform: "windows",
          deviceId: this.deviceId,
          role: "WORKSTATION_NODE",
          uiControl: true,
          error: e.message
        };
      }
    }

    if (capability === "device.health") {
      return {
        ok: true,
        platform: "windows",
        deviceId: this.deviceId,
        status: "ONLINE",
        relayConnection: "ACTIVE",
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      };
    }

    if (capability === "device.brain.read") {
      try {
        const brain = await this.digitalBrain.getDeviceBrainSnapshot();
        return { ok: true, result: brain };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    if (capability === "device.diagnostics.read") {
      try {
        const diag = await this.digitalBrain.getDiagnosticsSnapshot();
        return { ok: true, result: diag };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    if (capability === "device.files.universe.scan") {
      try {
        const universe = await this.digitalBrain.scanFileUniverse();
        return { ok: true, result: universe };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }

    // Pass through to DesktopAdapter for file/window/process operations
    try {
      const result = await this.desktopAdapter.execute(capability, args);
      return result;
    } catch (err) {
      return { ok: false, error: err.message || "CAPABILITY_EXECUTION_FAILED" };
    }
  }

  connectEndpoint(url, label) {
    if (!this.running) return;
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error(`[WORKSTATION-RELAY:${label}] Init failed: ${e.message}`);
      setTimeout(() => { if (this.running) this.connectEndpoint(url, label); }, 5000);
      return;
    }

    ws.on("open", () => {
      console.log(`[WORKSTATION-RELAY:${label}] Connected to ${url}. Joining room ${this.deviceId}...`);
      ws.send(JSON.stringify({
        type: "hello",
        role: "phone",
        deviceId: this.deviceId,
        token: this.token
      }));
    });

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString("utf8"));
      } catch {
        return;
      }

      if (msg.type === "hello-ack") {
        console.log(`[WORKSTATION-RELAY:${label}] Joined room as target: ${this.deviceId}`);
        return;
      }

      if (msg.type === "command") {
        const id = msg.id;
        const capability = msg.capability;
        const args = msg.arguments || {};
        console.log(`[WORKSTATION-RELAY:${label}] Received command: ${capability} [${id}]`);

        const result = await this.executeCapability(capability, args);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "result",
            id,
            capability,
            ok: result?.ok !== false,
            result
          }));
        }
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`[WORKSTATION-RELAY:${label}] Connection closed: ${code} ${reason}`);
      setTimeout(() => { if (this.running) this.connectEndpoint(url, label); }, 4000);
    });

    ws.on("error", (err) => {
      console.error(`[WORKSTATION-RELAY:${label}] Connection error: ${err.message}`);
    });
  }

  start() {
    this.running = true;
    console.log(`[WORKSTATION-RELAY] Starting Dual-Relay Mesh Agent for ${this.deviceId}`);
    this.connectEndpoint(this.primaryUrl, "SOVEREIGN");
    this.connectEndpoint(this.fallbackUrl, "VERCEL");
  }

  stop() {
    this.running = false;
  }
}

// Direct runner entrypoint
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const agent = new WorkstationRelayAgent();
  agent.start();
  console.log(`LeeWay Workstation Relay Daemon running for ${agent.deviceId}`);
  process.on("SIGINT", () => { agent.stop(); process.exit(0); });
  process.on("SIGTERM", () => { agent.stop(); process.exit(0); });
}
