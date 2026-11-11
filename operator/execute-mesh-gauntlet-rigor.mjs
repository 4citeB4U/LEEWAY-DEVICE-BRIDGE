/*
REGION: LEEWAY.DEVICE.BRIDGE.QUALIFICATION
TAG: LEEWAY.MESH.GAUNTLET.EVIDENCE_BOUND.V2
WHAT: Execute evidence-derived Device Bridge probes without self-issuing Veritas,
      Receipt Authority, Learning Ledger, or production decisions.
AUTHORITY: Creator-authorized local qualification; independent authorities remain external.
*/
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PhysicalAndroidAdapter } from './physical-adapters.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const evidenceRoot = path.join(root, 'evidence', 'qualification');
const relayHttp = process.env.LEEWAY_RELAY_HTTP || 'http://127.0.0.1:8008/api/device-relay';
const relayWs = process.env.LEEWAY_RELAY_WS || 'ws://127.0.0.1:8008/api/device-relay';
const formulaUrl = process.env.LEEWAY_FORMULA_URL || 'http://127.0.0.1:4001/runtime/formula/v1/evaluate';
const androidSerial = process.env.LEEWAY_ANDROID_SERIAL || 'RFCX70LNT7X';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const outcome = (executed, verified, detail, error = null) => Object.freeze({ executed, verified, detail, error });
const cell = evidence => evidence.verified ? `VERIFIED (${evidence.detail})` : evidence.executed ? `FAILED (${evidence.error || evidence.detail})` : `UNPROBED (${evidence.error || evidence.detail})`;

async function relayCommand(deviceId, token, capability, args = {}, timeoutMs = 12000) {
  if (!token) return { ok: false, executed: false, error: 'OWNER_PAIRING_TOKEN_UNBOUND' };
  return await new Promise(resolve => {
    const ws = new WebSocket(relayWs);
    const id = `cmd-${crypto.randomBytes(8).toString('hex')}`;
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      resolve(value);
    };
    const timer = setTimeout(() => finish({ ok: false, executed: true, error: 'RELAY_RESULT_TIMEOUT' }), timeoutMs);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'hello', role: 'client', deviceId, token }));
    ws.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'hello-ack') ws.send(JSON.stringify({ type: 'command', id, capability, arguments: args }));
      else if (message.type === 'result' && message.id === id) finish({ ...message, executed: true });
      else if (message.type === 'error') finish({ ok: false, executed: true, error: message.error });
    };
    ws.onerror = () => finish({ ok: false, executed: true, error: 'RELAY_SOCKET_ERROR' });
  });
}

async function formulaEvaluate(deviceEvidence) {
  const order = ['pc-primary', 'phone-fold6', 'phone-apple-iphone', 'pc-hp-secondary'];
  const dimensions = ['presence', 'identity', 'fileRead', 'fileWrite', 'appLaunch', 'screen'];
  const observations = order.flatMap(device => dimensions.map(dimension => ({ device, dimension, evidence: deviceEvidence[device][dimension] })));
  const stateRows = Array.from({ length: 16 }, (_, index) => {
    const included = observations.slice(0, Math.ceil(((index + 1) * observations.length) / 16));
    return dimensions.map(dimension => {
      const values = included.filter(item => item.dimension === dimension).map(item => item.evidence.verified ? 1 : item.evidence.executed ? 0.25 : 0);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    });
  });
  const response = await fetch(formulaUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      adapterId: 'runtime-state-v1',
      input: { stateRows, ranges: Array.from({ length: 6 }, () => [0, 1]) },
      caller: 'device-bridge-evidence-bound-gauntlet-v2',
      traceId: `TRACE-DEVICE-BRIDGE-${Date.now()}`
    })
  });
  const result = await response.json();
  return {
    executed: response.ok,
    status: response.status,
    inputSemantics: dimensions,
    stateRows,
    inputHash: result.inputHash || null,
    resultHash: result.resultHash || null,
    receiptPath: result.receiptPath || null,
    error: response.ok ? null : result.error || result,
    claimBoundary: response.ok
      ? 'FORMULA_RUNTIME_EXECUTED_ON_MEASURED_CUMULATIVE_MATRIX; DOMAIN_POLICY_AND_OPERATIONAL_QUALIFICATION_NOT_ESTABLISHED'
      : 'FORMULA_REQUEST_REJECTED; NO_FORMULA_EXECUTION_CLAIM'
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const relayResponse = await fetch(relayHttp);
  if (!relayResponse.ok) throw new Error(`RELAY_HEALTH_${relayResponse.status}`);
  const relay = await relayResponse.json();
  const rooms = new Map((relay.activeRooms || []).map(room => [room.deviceId, room]));
  const foldRoom = [...rooms.values()].find(room => room.deviceId.startsWith('LDB-')) || null;
  const unprobed = detail => outcome(false, false, detail);
  const devices = {
    'pc-primary': {
      presence: outcome(true, os.hostname().length > 0, `LOCAL_HOST_${os.hostname()}`),
      identity: outcome(true, os.platform() === 'win32', `${os.platform()}_${os.arch()}`),
      fileRead: unprobed('NO_CURRENT_BRIDGE_FILE_READ'), fileWrite: unprobed('NO_CURRENT_BRIDGE_FILE_WRITE'),
      appLaunch: unprobed('NO_CURRENT_BRIDGE_APP_LAUNCH'), screen: unprobed('NO_CURRENT_BRIDGE_SCREEN_CAPTURE')
    },
    'phone-fold6': {
      presence: outcome(true, Boolean(foldRoom?.hasPhone), foldRoom?.deviceId || 'NO_ACTIVE_ROOM'),
      identity: unprobed('USB_ADAPTER_PENDING'), fileRead: unprobed('USB_ADAPTER_PENDING'),
      fileWrite: unprobed('USB_ADAPTER_PENDING'), appLaunch: unprobed('USB_ADAPTER_PENDING'), screen: unprobed('USB_ADAPTER_PENDING')
    },
    'phone-apple-iphone': {
      presence: outcome(true, Boolean(rooms.get('phone-apple-iphone')?.hasPhone), 'RELAY_ROOM_ONLY'),
      identity: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'), fileRead: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'),
      fileWrite: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'), appLaunch: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'), screen: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE')
    },
    'pc-hp-secondary': {
      presence: outcome(true, Boolean(rooms.get('pc-hp-secondary')?.hasPhone), 'RELAY_ROOM_ONLY'),
      identity: unprobed('OWNER_PAIRING_TOKEN_UNBOUND'), fileRead: unprobed('OWNER_PAIRING_TOKEN_UNBOUND'),
      fileWrite: unprobed('OWNER_PAIRING_TOKEN_UNBOUND'), appLaunch: unprobed('OWNER_PAIRING_TOKEN_UNBOUND'), screen: unprobed('OWNER_PAIRING_TOKEN_UNBOUND')
    }
  };

  const fold = new PhysicalAndroidAdapter({ serial: androidSerial });
  try {
    const info = await fold.execute('device.info');
    devices['phone-fold6'].identity = outcome(true, info.ok === true && info.model === 'SM-F956U', `${info.manufacturer}_${info.model}`);
    const firstText = JSON.stringify({ protocol: 'LEEWAY_DEVICE_BRIDGE_TRANSFER_V1', sequence: 1, startedAt });
    const secondText = JSON.stringify({ protocol: 'LEEWAY_DEVICE_BRIDGE_TRANSFER_V1', sequence: 2, startedAt });
    const transferPath = `qualification/mesh-${Date.now()}.json`;
    const write1 = await fold.execute('device.files.write', { path: transferPath, text: firstText });
    const read1 = await fold.execute('device.files.read', { path: transferPath });
    const write2 = await fold.execute('device.files.write', { path: transferPath, text: secondText });
    const read2 = await fold.execute('device.files.read', { path: transferPath });
    const transferVerified = write1.sha256 === hash(firstText) && read1.text === firstText &&
      write2.sha256 === hash(secondText) && read2.text === secondText && write1.sha256 !== write2.sha256;
    devices['phone-fold6'].fileWrite = outcome(true, transferVerified, `USB_WRITE_REWRITE_${write2.sha256}`);
    devices['phone-fold6'].fileRead = outcome(true, transferVerified, `USB_READBACK_${read2.sha256}`);
    await fold.execute('device.ui.home');
    const launched = await fold.execute('device.apps.launch', { packageName: 'industries.leeway.devicebridge' });
    devices['phone-fold6'].appLaunch = outcome(true, launched.foregroundVerified === true, launched.component);
    const capture = await fold.execute('device.screen.capture');
    const png = Buffer.from(capture.base64, 'base64');
    await fs.mkdir(evidenceRoot, { recursive: true });
    const screenPath = path.join(evidenceRoot, `fold6-devicebridge-${Date.now()}.png`);
    await fs.writeFile(screenPath, png, { flag: 'wx' });
    devices['phone-fold6'].screen = outcome(true, png.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), `${capture.width}x${capture.height}_${hash(png)}`);
  } catch (error) {
    for (const key of ['identity', 'fileRead', 'fileWrite', 'appLaunch', 'screen']) {
      if (!devices['phone-fold6'][key].executed) devices['phone-fold6'][key] = outcome(true, false, key, error.message);
    }
  }

  const hpInfo = await relayCommand('pc-hp-secondary', process.env.LEEWAY_HP_PAIRING_TOKEN, 'device.info');
  devices['pc-hp-secondary'].identity = hpInfo.executed
    ? outcome(true, hpInfo.ok === true && hpInfo.result?.role === 'SECONDARY_HP_WORKSTATION', hpInfo.result?.deviceId || 'HP_IDENTITY', hpInfo.error)
    : unprobed(hpInfo.error);
  const appleInfo = await relayCommand('phone-apple-iphone', process.env.LEEWAY_APPLE_PAIRING_TOKEN, 'device.info');
  if (appleInfo.executed) devices['phone-apple-iphone'].identity = outcome(true, false, 'SUPERVISOR_PROXY_NOT_PHYSICAL_APPLE_PROOF', appleInfo.error || 'PHYSICAL_PROBE_ABSENT');

  let formula;
  try { formula = await formulaEvaluate(devices); }
  catch (error) { formula = { executed: false, error: error.message, claimBoundary: 'FORMULA_NOT_EXECUTED' }; }
  const matrix = Object.entries(devices).map(([device, d]) => ({
    device, presence: cell(d.presence), identity: cell(d.identity), fileRead: cell(d.fileRead),
    fileWrite: cell(d.fileWrite), appLaunch: cell(d.appLaunch), screen: cell(d.screen)
  }));
  console.table(matrix);
  const packet = {
    schema: 'LEEWAY_DEVICE_BRIDGE_LOCAL_QUALIFICATION_V2', startedAt, endedAt: new Date().toISOString(),
    authority: 'LOCAL_CONTROLLER_OBSERVATION', relay: { status: relayResponse.status, authority: relay.authority, activeRoomsCount: relay.activeRoomsCount },
    devices, matrix, formula,
    veritas: { state: 'INDEPENDENT_PRODUCTION_ROOTS_UNAVAILABLE_HOLD', decisionIssued: false },
    receipt: { state: 'CANONICAL_RECEIPT_NOT_CREATED' }, learning: { state: 'CANONICAL_LEARNING_NOT_ADMITTED' },
    production: { state: 'HOLD' }
  };
  await fs.mkdir(evidenceRoot, { recursive: true });
  const packetPath = path.join(evidenceRoot, `mesh-qualification-${Date.now()}.json`);
  await fs.writeFile(packetPath, JSON.stringify(packet, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ packetPath, packetSha256: hash(await fs.readFile(packetPath)), production: packet.production.state }));
}

await main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
});
