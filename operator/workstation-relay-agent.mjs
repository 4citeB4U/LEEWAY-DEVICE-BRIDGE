/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.WORKSTATION
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
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID, createPrivateKey, createPublicKey, sign as signProof } from 'node:crypto';
import { DesktopAdapter } from '../apps/desktop/adapter.mjs';
import { DigitalBrainEngine } from '../apps/desktop/digital-brain.mjs';

const WORKSTATION_CAPABILITIES = Object.freeze([
  'device.health', 'device.info', 'pc.diagnostics.read', 'digital-brain.read',
  'continuum.transfer.proof', 'continuum.transfer.stage', 'continuum.transfer.read', 'continuum.transfer.materialize',
]);

function validRelayUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label}_URL_INVALID`); }
  const loopback = url.protocol === 'ws:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (url.protocol !== 'wss:' && !loopback) throw new Error(`${label}_TLS_REQUIRED`);
  if (url.username || url.password || url.hash) throw new Error(`${label}_URL_CREDENTIALS_FORBIDDEN`);
  return url.toString();
}

function socketOn(socket, event, listener, once = false) {
  if (typeof socket.on === 'function') return once ? socket.once(event, listener) : socket.on(event, listener);
  socket.addEventListener(event, value => listener(event === 'message' ? value.data : value), { once });
}

export class WorkstationRelayAgent {
  constructor({
    nodeId = process.env.LEEWAY_DEVICE_ID,
    relayUrl = process.env.LEEWAY_RELAY_URL,
    token = process.env.LEEWAY_MESH_TOKEN,
    ownerToken = process.env.OIDC_ACCESS_TOKEN_VERIFIED || null,
    devicePrivateKeyPem = process.env.LEEWAY_DEVICE_PRIVATE_KEY_PEM || null,
    devicePrivateKeyPath = process.env.LEEWAY_DEVICE_PRIVATE_KEY_PATH || null,
    subLinkUrl = process.env.LEEWAY_USER_SUBLINK_URL || null,
    workspace = process.env.LEEWAY_WORKSPACE || process.env.LEEWAY_WORKSPACE_ROOT || path.join(os.homedir(), 'LeeWay', 'SovereignNode', 'Workspace'),
    continuumRoot = process.env.LEEWAY_CONTINUUM_ROOT || path.join(os.homedir(), 'LeeWay', 'SovereignNode', 'Continuum'),
    subLinkClient = null,
  } = {}) {
    if (typeof nodeId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(nodeId)) throw new Error('DEVICE_ID_REQUIRED');
    if (typeof token !== 'string' || token.length < 16) throw new Error('LEEWAY_MESH_TOKEN_REQUIRED');
    this.nodeId = nodeId;
    this.relayUrl = validRelayUrl(relayUrl, 'LEEWAY_RELAY');
    this.subLinkUrl = subLinkUrl ? validRelayUrl(subLinkUrl, 'LEEWAY_USER_SUBLINK') : null;
    if (!workspace || !continuumRoot) throw new Error('DEVICE_STORAGE_ROOT_REQUIRED');
    this.token = token;
    this.ownerToken = typeof ownerToken === 'string' && ownerToken.length >= 8 ? ownerToken : null;
    const privateKeyValue = devicePrivateKeyPem ||
      (devicePrivateKeyPath ? fs.readFileSync(path.resolve(devicePrivateKeyPath), 'utf8') : null);
    this.devicePrivateKey = privateKeyValue ? createPrivateKey(privateKeyValue) : null;
    this.devicePublicKey = this.devicePrivateKey
      ? createPublicKey(this.devicePrivateKey).export({ type: 'spki', format: 'pem' }).toString()
      : null;
    this.desktopAdapter = new DesktopAdapter(path.resolve(workspace));
    this.digitalBrain = new DigitalBrainEngine({
      nodeId, continuumRoot: path.resolve(continuumRoot), workspaceRoot: path.resolve(workspace),
      diagnostics: () => ({ hostname: os.hostname(), platform: process.platform, arch: process.arch }),
    });
    this.subLinkClient = subLinkClient;
  }

  async executeCapability(capability, args = {}) {
    if (capability === 'device.capabilities') return { ok: true, nodeId: this.nodeId, remoteQualified: [...new Set([...WORKSTATION_CAPABILITIES, ...(await this.desktopAdapter.discover())])], authority: 'LOCAL_ADAPTER_MEASUREMENT' };
    if (capability === 'device.health') return { ok: true, nodeId: this.nodeId, continuum: await this.digitalBrain.diagnosticsReadback() };
    if (capability === 'device.info') return { nodeId: this.nodeId, platform: process.platform, architecture: os.arch(), continuumRootBound: true, cloudConsciousnessAuthority: 'NOT_REQUIRED_FOR_SUB_LINK' };
    if (capability === 'pc.diagnostics.read') return this.digitalBrain.diagnosticsReadback();
    if (capability === 'digital-brain.read') return this.digitalBrain.readback();
    if (capability === 'continuum.transfer.proof') {
      if (args.sourceNodeId !== this.nodeId || typeof args.targetNodeId !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(args.capsuleSha256 || '') || typeof args.nonce !== 'string' || args.nonce.length < 1 || args.nonce.length > 128) {
        throw new Error('CONTINUUM_PROOF_ARGUMENTS_INVALID');
      }
      const payload = Buffer.from(`leeway-continuum-transfer-v1\n${this.nodeId}\n${args.targetNodeId}\n${args.capsuleSha256}\n${args.nonce}`, 'utf8');
      const algorithm = this.devicePrivateKey.asymmetricKeyType === 'ed25519' ? null : 'sha256';
      return { sourceNodeId: this.nodeId, targetNodeId: args.targetNodeId, capsuleSha256: args.capsuleSha256,
        nonce: args.nonce, signature: signProof(algorithm, payload, this.devicePrivateKey).toString('base64url') };
    }
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
    // Initialize DigitalBrain & Continuum storage partitions on daemon startup
    await this.digitalBrain.initialize();
    // Keep the pure capability endpoint independently testable. The relay
    // client is resolved only when an enrolled daemon actually connects.
    const WebSocket = globalThis.WebSocket || (await import('ws')).default;
    if (!this.devicePrivateKey || !this.devicePublicKey) throw new Error('LEEWAY_DEVICE_PRIVATE_KEY_REQUIRED');
    const socket = new WebSocket(this.relayUrl);
    // The relay's execution endpoint is named "phone" for protocol
    // compatibility. It is a role, not a hardware classification.
    socketOn(socket, 'open', () => socket.send(JSON.stringify({
      type: 'hello', role: 'phone', deviceId: this.nodeId, token: this.token,
      publicKey: this.devicePublicKey,
      ...(this.ownerToken ? { ownerToken: this.ownerToken } : {}),
    })));
    socketOn(socket, 'message', async raw => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (message.type === 'hello-challenge' && message.deviceId === this.nodeId && typeof message.nonce === 'string') {
        const payload = Buffer.from(`leeway-device-relay-proof-v1\n${this.nodeId}\n${message.nonce}`, 'utf8');
        const algorithm = this.devicePrivateKey.asymmetricKeyType === 'ed25519' ? null : 'sha256';
        const signature = signProof(algorithm, payload, this.devicePrivateKey).toString('base64url');
        socket.send(JSON.stringify({ type: 'hello-proof', signature }));
        return;
      }
      if (message.type === 'hello-ack') {
        console.log(`[WORKSTATION-RELAY:SOVEREIGN] Joined room as target: ${this.nodeId}`);
        return;
      }
      if (message.type !== 'command' || typeof message.id !== 'string' || typeof message.capability !== 'string') return;
      try {
        const result = await this.executeCapability(message.capability, message.arguments || {});
        socket.send(JSON.stringify({ type: 'result', id: message.id, capability: message.capability, ok: true, result }));
      } catch (error) {
        const code = /^[A-Z][A-Z0-9_]{0,127}$/.test(error?.message) ? error.message : (error?.code || 'WORKSTATION_EXECUTION_ERROR');
        socket.send(JSON.stringify({
          type: 'result',
          id: message.id,
          capability: message.capability,
          ok: false,
          result: {
            ok: false,
            error: code,
            detail: error?.message || String(error)
          }
        }));
      }
    });
    return socket;
  }

  async runForever({ minimumDelayMs = 1_000, maximumDelayMs = 30_000 } = {}) {
    let delayMs = minimumDelayMs;
    for (;;) {
      let socket;
      try {
        socket = await this.connect();
        await new Promise(resolve => {
          socketOn(socket, 'open', () => { delayMs = minimumDelayMs; }, true);
          socketOn(socket, 'close', resolve, true);
          socketOn(socket, 'error', () => {
            try { socket.close(); } catch {}
          }, true);
        });
      } catch {}
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, maximumDelayMs);
    }
  }
}

// The daemon can be launched directly on an owner-enrolled workstation. The
// relay URL, token, and node identity stay in environment variables, not CLI
// source or a command line.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const agent = new WorkstationRelayAgent();
  console.log(`[WORKSTATION-RELAY] Starting relay endpoint for ${agent.nodeId}`);
  await agent.runForever();
}

