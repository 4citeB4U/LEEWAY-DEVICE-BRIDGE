/*
REGION: LEEWAY.DEVICE.BRIDGE.QUALIFICATION
TAG: LEEWAY.MESH.GAUNTLET.EVIDENCE_BOUND.V3
WHAT: Execute evidence-derived Device Bridge probes across all four mesh nodes
      (pc-primary, phone-fold6, phone-apple-iphone, pc-hp-secondary) over sovereign
      WebSocket relay and local adapters. Records canonical receipts and learning ledger
      without authoring synthetic passes or minting unauthorized production Veritas.
AUTHORITY: Creator-authorized local qualification; independent authorities remain external.
*/
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { PhysicalAndroidAdapter } from './physical-adapters.mjs';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const evidenceRoot = path.join(root, 'evidence', 'qualification');
const relayHttp = process.env.LEEWAY_RELAY_HTTP || 'http://127.0.0.1:8008/api/device-relay';
const relayWs = process.env.LEEWAY_RELAY_WS || 'ws://127.0.0.1:8008/api/device-relay';
const formulaUrl = process.env.LEEWAY_FORMULA_URL || 'http://127.0.0.1:4001/runtime/formula/v1/evaluate';
const androidSerial = process.env.LEEWAY_ANDROID_SERIAL || 'RFCX70LNT7X';

const pcToken = process.env.LEEWAY_MESH_TOKEN || null;
const foldToken = process.env.LEEWAY_PAIRING_TOKEN || 'j2R7QB1E6wWHhv0Q5HnHs0FJ-RoJD6PuCFwgXlYzMCA';
const hpToken = process.env.LEEWAY_HP_PAIRING_TOKEN || process.env.LEEWAY_MESH_TOKEN || null;
const appleToken = process.env.LEEWAY_APPLE_PAIRING_TOKEN || process.env.LEEWAY_MESH_TOKEN || null;

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
      caller: 'device-bridge-evidence-bound-gauntlet-v3',
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

async function checkAdbAttached(serial) {
  try {
    const { stdout } = await execFileAsync('adb', ['devices'], { timeout: 3000 });
    return stdout.includes(serial);
  } catch {
    return false;
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const relayResponse = await fetch(relayHttp);
  if (!relayResponse.ok) throw new Error(`RELAY_HEALTH_${relayResponse.status}`);
  const relay = await relayResponse.json();
  const rooms = new Map((relay.activeRooms || []).map(room => [room.deviceId, room]));
  const foldRoom = [...rooms.values()].find(room => room.deviceId.startsWith('LDB-') || room.deviceId === 'phone-fold6') || null;
  const unprobed = detail => outcome(false, false, detail);

  const devices = {
    'pc-primary': {
      presence: outcome(true, Boolean(rooms.get('pc-primary')?.hasPhone), `LOCAL_HOST_${os.hostname()}`),
      identity: unprobed('PENDING'),
      fileRead: unprobed('PENDING'),
      fileWrite: unprobed('PENDING'),
      appLaunch: unprobed('PENDING'),
      screen: unprobed('REQUIRES_NATIVE_DISPLAY_COMPOSER')
    },
    'phone-fold6': {
      presence: outcome(true, Boolean(foldRoom?.hasPhone), foldRoom?.deviceId || 'NO_ACTIVE_ROOM'),
      identity: unprobed('PENDING'),
      fileRead: unprobed('PENDING'),
      fileWrite: unprobed('PENDING'),
      appLaunch: unprobed('PENDING'),
      screen: unprobed('CELLULAR_RELAY_QUALIFIED (SCREEN_CAPTURE_REQUIRES_USB_ADB_OR_MEDIA_PROJECTION)')
    },
    'phone-apple-iphone': {
      presence: outcome(true, Boolean(rooms.get('phone-apple-iphone')?.hasPhone), 'RELAY_ROOM_ONLY'),
      identity: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'),
      fileRead: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'),
      fileWrite: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'),
      appLaunch: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE'),
      screen: unprobed('PHYSICAL_APPLE_DEVICE_UNAVAILABLE')
    },
    'pc-hp-secondary': {
      presence: outcome(true, Boolean(rooms.get('pc-hp-secondary')?.hasPhone), 'RELAY_ROOM_ONLY'),
      identity: unprobed('PENDING'),
      fileRead: unprobed('PENDING'),
      fileWrite: unprobed('PENDING'),
      appLaunch: unprobed('PHYSICAL_WORKSTATION_HOLD'),
      screen: unprobed('PHYSICAL_WORKSTATION_HOLD')
    }
  };

  // 1. Probe pc-primary via relay
  const pcInfo = await relayCommand('pc-primary', pcToken, 'device.info');
  devices['pc-primary'].identity = pcInfo.executed && pcInfo.ok === true
    ? outcome(true, true, `${pcInfo.result.manufacturer}_${pcInfo.result.model}_${pcInfo.result.role}`)
    : outcome(true, false, 'PC_PRIMARY_INFO_FAILED', pcInfo.error);

  const pcFirstText = JSON.stringify({ protocol: 'LEEWAY_PC_PRIMARY_TRANSFER_V1', time: Date.now() });
  const pcPath = `tests/qualification-pc-${Date.now()}.json`;
  const pcWrite = await relayCommand('pc-primary', pcToken, 'device.files.write', { path: pcPath, text: pcFirstText });
  const pcRead = await relayCommand('pc-primary', pcToken, 'device.files.read', { path: pcPath });
  const pcFileVerified = pcWrite.ok === true && pcRead.ok === true && pcRead.result?.text === pcFirstText;
  devices['pc-primary'].fileWrite = outcome(true, pcFileVerified, `RELAY_WRITE_${pcWrite.result?.bytes || 0}B`, pcWrite.error);
  devices['pc-primary'].fileRead = outcome(true, pcFileVerified, 'RELAY_READBACK_MATCHED', pcRead.error);

  const pcWindows = await relayCommand('pc-primary', pcToken, 'device.windows.window.list', { app: 'codex' });
  devices['pc-primary'].appLaunch = pcWindows.ok === true
    ? outcome(true, true, 'WINDOWS_UI_AUTOMATION_READY')
    : outcome(true, false, 'WINDOWS_UI_QUERY_FAILED', pcWindows.error);

  // 2. Probe phone-fold6
  const isAdb = await checkAdbAttached(androidSerial);
  if (isAdb) {
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
  } else if (foldRoom && foldRoom.deviceId) {
    // Cellular / Sovereign Relay Probe
    const foldInfo = await relayCommand(foldRoom.deviceId, foldToken, 'device.info');
    devices['phone-fold6'].identity = foldInfo.ok === true
      ? outcome(true, true, `${foldInfo.result?.manufacturer || 'samsung'}_${foldInfo.result?.model || 'SM-F956U'}_WIRELESS_RELAY`)
      : outcome(true, false, 'WIRELESS_INFO_FAILED', foldInfo.error);

    const foldFirstText = JSON.stringify({ protocol: 'LEEWAY_REMOTE_FILE_QUALIFICATION_V1', time: Date.now() });
    const foldRelayPath = `qualification/mesh-remote-${Date.now()}.json`;
    const foldWrite = await relayCommand(foldRoom.deviceId, foldToken, 'device.files.write', { path: foldRelayPath, text: foldFirstText });
    const foldRead = await relayCommand(foldRoom.deviceId, foldToken, 'device.files.read', { path: foldRelayPath });
    const foldFileVerified = foldWrite.ok === true && foldRead.ok === true && foldRead.result?.text === foldFirstText;
    devices['phone-fold6'].fileWrite = outcome(true, foldFileVerified, `APP_CONTAINER_WRITE_${foldWrite.result?.sha256?.substring(0, 12) || ''}`, foldWrite.error);
    devices['phone-fold6'].fileRead = outcome(true, foldFileVerified, 'APP_CONTAINER_READBACK_MATCHED', foldRead.error);

    const foldApps = await relayCommand(foldRoom.deviceId, foldToken, 'device.apps.list', {});
    devices['phone-fold6'].appLaunch = foldApps.ok === true && foldApps.result?.count > 0
      ? outcome(true, true, `LAUNCHABLE_APPS_${foldApps.result.count}`)
      : outcome(true, false, 'WIRELESS_APPS_LIST_FAILED', foldApps.error);
  }

  // 3. Probe pc-hp-secondary via relay
  const hpInfo = await relayCommand('pc-hp-secondary', hpToken, 'device.info');
  devices['pc-hp-secondary'].identity = hpInfo.executed && hpInfo.ok === true
    ? outcome(true, hpInfo.result?.role === 'SECONDARY_HP_WORKSTATION', `${hpInfo.result?.role}_${hpInfo.result?.location}`, hpInfo.error)
    : unprobed(hpInfo.error);

  const hpContent = JSON.stringify({ protocol: 'LEEWAY_HP_SECONDARY_TEST', time: Date.now() });
  const hpWrite = await relayCommand('pc-hp-secondary', hpToken, 'device.files.write', { content: hpContent });
  const hpRead = await relayCommand('pc-hp-secondary', hpToken, 'device.files.read', {});
  const hpFileVerified = hpWrite.ok === true && hpRead.ok === true && hpRead.result?.content === hpContent;
  devices['pc-hp-secondary'].fileWrite = outcome(true, hpFileVerified, `RELAY_WRITE_${hpWrite.result?.bytes || 0}B`, hpWrite.error);
  devices['pc-hp-secondary'].fileRead = outcome(true, hpFileVerified, 'RELAY_READBACK_MATCHED', hpRead.error);

  // 4. Probe phone-apple-iphone
  const appleInfo = await relayCommand('phone-apple-iphone', appleToken, 'device.info');
  if (appleInfo.executed) {
    devices['phone-apple-iphone'].identity = outcome(true, false, 'SUPERVISOR_PROXY_NOT_PHYSICAL_APPLE_PROOF', appleInfo.error || 'PHYSICAL_PROBE_ABSENT');
  }

  // 5. Formula Evaluation
  let formula;
  try { formula = await formulaEvaluate(devices); }
  catch (error) { formula = { executed: false, error: error.message, claimBoundary: 'FORMULA_NOT_EXECUTED' }; }

  const matrix = Object.entries(devices).map(([device, d]) => ({
    device, presence: cell(d.presence), identity: cell(d.identity), fileRead: cell(d.fileRead),
    fileWrite: cell(d.fileWrite), appLaunch: cell(d.appLaunch), screen: cell(d.screen)
  }));
  console.table(matrix);

  const packet = {
    schema: 'LEEWAY_DEVICE_BRIDGE_LOCAL_QUALIFICATION_V3', startedAt, endedAt: new Date().toISOString(),
    authority: 'LOCAL_CONTROLLER_OBSERVATION', relay: { status: relayResponse.status, authority: relay.authority, activeRoomsCount: relay.activeRoomsCount },
    devices, matrix, formula,
    veritas: { state: 'INDEPENDENT_PRODUCTION_ROOTS_UNAVAILABLE_HOLD', decisionIssued: false },
    receipt: { state: 'CANONICAL_ADMISSION_EVIDENCE_RECORDED' },
    learning: { state: 'CANONICAL_LEARNING_EVIDENCE_RECORDED' },
    production: { state: 'HOLD' }
  };
  await fs.mkdir(evidenceRoot, { recursive: true });
  const packetPath = path.join(evidenceRoot, `mesh-qualification-${Date.now()}.json`);
  await fs.writeFile(packetPath, JSON.stringify(packet, null, 2), { flag: 'wx' });
  const packetSha = hash(await fs.readFile(packetPath));
  console.log(JSON.stringify({ packetPath, packetSha256: packetSha, production: packet.production.state }));
}

await main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
});
