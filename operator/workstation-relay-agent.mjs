/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.TWO_PC
TAG: LEEWAY.WORKSTATION_RELAY_AGENT_V2
WHO: LeeWay Industries; WHAT: enrolled workstation relay capability endpoint.
WHEN: 2026-11-15; WHERE: operator/workstation-relay-agent.mjs.
WHY: Expose distinct PC diagnostics and Continuum-only stage-one transfer.
HOW: owner-injected relay/sub-link bindings; no public endpoint or credential defaults.
AUTHORITY: Adapter endpoint only; command admission remains with the Bridge.
LICENSE: MIT
*/
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DesktopAdapter } from '../apps/desktop/adapter.mjs';
import { DigitalBrainEngine } from '../apps/desktop/digital-brain.mjs';

const TWO_PC_CAPABILITIES = Object.freeze([
  'device.health', 'device.info', 'pc.diagnostics.read', 'digital-brain.read',
  'continuum.transfer.stage', 'continuum.transfer.read', 'continuum.transfer.materialize',
]);

function validRelayUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label}_URL_INVALID`); }
  const loopback = url.protocol === 'ws:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (url.protocol !== 'wss:' && !loopback) throw new Error(`${label}_TLS_REQUIRED`);
  if (url.username || url.password || url.hash) throw new Error(`${label}_URL_CREDENTIALS_FORBIDDEN`);
  return url.toString();
}

export class WorkstationRelayAgent {
  constructor({
    nodeId = process.env.LEEWAY_DEVICE_ID,
    relayUrl = process.env.LEEWAY_RELAY_URL,
    token = process.env.LEEWAY_MESH_TOKEN,
    subLinkUrl = process.env.LEEWAY_USER_SUBLINK_URL || null,
    workspace = process.env.LEEWAY_WORKSPACE || process.env.LEEWAY_WORKSPACE_ROOT || path.join(os.homedir(), 'LeeWay', 'SovereignNode', 'Workspace'),
    continuumRoot = process.env.LEEWAY_CONTINUUM_ROOT || path.join(os.homedir(), 'LeeWay', 'SovereignNode', 'Continuum'),
    subLinkClient = null,
  } = {}) {
    if (!['pc-primary', 'pc-hp-secondary'].includes(nodeId)) throw new Error('TWO_PC_NODE_ID_REQUIRED');
    if (typeof token !== 'string' || token.length < 16) throw new Error('LEEWAY_MESH_TOKEN_REQUIRED');
    this.nodeId = nodeId;
    this.relayUrl = validRelayUrl(relayUrl, 'LEEWAY_RELAY');
    this.subLinkUrl = subLinkUrl ? validRelayUrl(subLinkUrl, 'LEEWAY_USER_SUBLINK') : null;
    if (!workspace || !continuumRoot) throw new Error('TWO_PC_STORAGE_ROOT_REQUIRED');
    this.token = token;
    this.desktopAdapter = new DesktopAdapter(path.resolve(workspace));
    this.digitalBrain = new DigitalBrainEngine({
      nodeId, continuumRoot: path.resolve(continuumRoot), workspaceRoot: path.resolve(workspace),
      diagnostics: () => ({ hostname: os.hostname(), platform: process.platform, arch: process.arch }),
    });
    this.subLinkClient = subLinkClient;
  }

  async executeCapability(capability, args = {}) {
    if (capability === 'device.capabilities') return { ok: true, nodeId: this.nodeId, remoteQualified: [...new Set([...TWO_PC_CAPABILITIES, ...(await this.desktopAdapter.discover())])], authority: 'LOCAL_ADAPTER_MEASUREMENT' };
    if (capability === 'device.health') return { ok: true, nodeId: this.nodeId, continuum: await this.digitalBrain.diagnosticsReadback() };
    if (capability === 'device.info') return { nodeId: this.nodeId, platform: process.platform, architecture: os.arch(), continuumRootBound: true, cloudConsciousnessAuthority: 'NOT_REQUIRED_FOR_SUB_LINK' };
    if (capability === 'pc.diagnostics.read') return this.digitalBrain.diagnosticsReadback();
    if (capability === 'digital-brain.read') return this.digitalBrain.readback();
    if (capability === 'continuum.transfer.stage') return this.digitalBrain.stage(args);
    if (capability === 'continuum.transfer.read') return this.digitalBrain.read(args);
    if (capability === 'continuum.transfer.materialize') return this.digitalBrain.materialize(args);
    if ((await this.desktopAdapter.discover()).includes(capability)) return this.desktopAdapter.execute(capability, args);
    throw new Error('CAPABILITY_UNAVAILABLE');
  }

  // The sub-link is explicitly owner-configured and is used only when cloud
  // consciousness is unavailable. A caller supplies the peer transport; this
  // module never invents a peer endpoint or sends a token in a URL.
  async stageToPeer(stageArguments, { cloudConsciousnessConnected = true } = {}) {
    if (cloudConsciousnessConnected !== false) throw new Error('SUBLINK_FALLBACK_NOT_ACTIVE');
    if (!this.subLinkUrl || !this.subLinkClient || typeof this.subLinkClient.request !== 'function') throw new Error('USER_SUBLINK_UNAVAILABLE');
    if (stageArguments?.sourceNodeId !== this.nodeId) throw new Error('CONTINUUM_SOURCE_NODE_MISMATCH');
    const response = await this.subLinkClient.request({
      id: randomUUID(), type: 'continuum.transfer.stage', endpoint: this.subLinkUrl, arguments: { ...stageArguments, transport: 'sub-link' },
    });
    if (!response || response.ok !== true || response.result?.materializedToWindowsOs !== false) throw new Error('USER_SUBLINK_STAGE_FAILED');
    return response.result;
  }

  async connect() {
    // Keep the pure capability endpoint independently testable. The relay
    // client is resolved only when an enrolled daemon actually connects.
    const { default: WebSocket } = await import('ws');
    const socket = new WebSocket(this.relayUrl, { maxPayload: 8 * 1024 * 1024, followRedirects: false });
    // The relay's execution endpoint is named "phone" for protocol
    // compatibility. It is a role, not a hardware classification.
    socket.on('open', () => socket.send(JSON.stringify({ type: 'hello', role: 'phone', deviceId: this.nodeId, token: this.token })));
    socket.on('message', async raw => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (message.type === 'hello-ack') {
        console.log(`[WORKSTATION-RELAY:SOVEREIGN] Joined room as target: ${this.nodeId}`);
        return;
      }
      if (message.type !== 'command' || typeof message.id !== 'string' || typeof message.capability !== 'string') return;
      try {
        const result = await this.executeCapability(message.capability, message.arguments || {});
        socket.send(JSON.stringify({ type: 'result', id: message.id, capability: message.capability, ok: true, result }));
      } catch (error) {
        const code = /^[A-Z][A-Z0-9_]{0,127}$/.test(error?.message) ? error.message : 'ADAPTER_OR_VALIDATION_FAILURE';
        socket.send(JSON.stringify({ type: 'result', id: message.id, capability: message.capability, ok: false, result: { ok: false, error: code } }));
      }
    });
    return socket;
  }
}

// The daemon can be launched directly on an owner-enrolled workstation. The
// relay URL, token, and node identity stay in environment variables, not CLI
// source or a command line.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const agent = new WorkstationRelayAgent();
  console.log(`[WORKSTATION-RELAY] Starting relay endpoint for ${agent.nodeId}`);
  const socket = await agent.connect();
  socket.on('close', code => console.log(`[WORKSTATION-RELAY:SOVEREIGN] Connection closed: ${code}`));
  socket.on('error', error => console.error(`[WORKSTATION-RELAY:SOVEREIGN] Error: ${error.message}`));
}

