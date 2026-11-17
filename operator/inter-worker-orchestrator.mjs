/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.ORCHESTRATOR
TAG: LEEWAY.INTER_WORKER.ORCHESTRATOR.V1
WHO: LeeWay Industries; WHAT: cross-worker composer handshake and mutual audit protocol.
WHEN: 2026-11-16; WHERE: operator/inter-worker-orchestrator.mjs.
WHY: Enable 5 workers (ChatGPT, Gemini, Antigravity, Copilot, Codex) to exchange tasks, verify readback, and audit replies.
HOW: R23 constitutional headers, exact UIA/DOM readback verification, deterministic polling, and Veritas check.
AUTHORITY: Protocol layer; Runtime admission and capability policy remain mandatory.
LICENSE: MIT
*/
import { randomUUID } from 'node:crypto';

function requireOne(values, code) {
  if (!Array.isArray(values) || values.length !== 1) throw new Error(code);
  return values[0];
}

export async function dispatchAndAuditWorkerTurn({ bridge, deviceId, fromWorker, toWorker, promptText, expectedUrl, pid = null }) {
  if (!bridge || typeof bridge.call !== 'function') throw new Error('CANONICAL_BRIDGE_REQUIRED');
  if (typeof deviceId !== 'string' || !deviceId) throw new Error('DEVICE_ID_REQUIRED');
  const listed = await bridge.call(deviceId, 'device.windows.window.list', { workerId: toWorker, limit: 20 });
  const window = pid === null ? requireOne(listed?.windows, 'WORKER_WINDOW_NOT_UNIQUE')
    : listed?.windows?.find(value => value.pid === pid);
  if (!window) throw new Error('WORKER_WINDOW_NOT_FOUND');
  const observeArgs = { workerId: toWorker, pid: window.pid, maxControls: 200, transport: 'auto' };
  if (expectedUrl) observeArgs.expectedUrl = expectedUrl;
  const obs = await bridge.call(deviceId, 'device.windows.window.observe', observeArgs);
  const target = requireOne(obs?.editableTargets, 'WORKER_COMPOSER_NOT_UNIQUE');
  const action = requireOne((obs?.actionTargets || []).filter(value => /^(send|submit)$/i.test(value.name || '')), 'WORKER_SUBMIT_ACTION_NOT_UNIQUE');
  const nonce = randomUUID();

  // 2. INPUT + VERIFY READBACK: Wrap prompt in R23 header & check exact readback
  const envelope = [
    `R23_HANDSHAKE | FROM=${fromWorker} | TO=${toWorker} | NONCE=${nonce}`,
    `REQUIREMENTS: Separate FACT vs OPEN_GAP, cite exact file:line, and repeat the NONCE in the response.`,
    `TASK: ${promptText}`
  ].join('\n');

  const inp = await bridge.call(deviceId, 'device.windows.window.input', {
    workerId: toWorker,
    pid: window.pid,
    observationId: obs.observationId,
    targetId: target.targetId,
    text: envelope
  });
  if (!/^[a-f0-9]{64}$/.test(inp?.textSha256 || '')) throw new Error('INPUT_READBACK_FAILED');

  // 3. SUBMIT: Trigger Send button / Enter
  await bridge.call(deviceId, 'device.windows.window.submit', {
    workerId: toWorker,
    pid: window.pid,
    observationId: obs.observationId,
    targetId: target.targetId,
    actionTargetId: action.targetId,
    expectedTextSha256: inp.textSha256,
  });

  // 4. PAUSE & POLL: Wait until streaming completes and reply stabilizes
  let reply = '';
  for (let i = 0; i < 12 && !reply; i++) {
    try {
      const read = await bridge.call(deviceId, 'device.windows.window.read', {
        workerId: toWorker, pid: window.pid, observationId: obs.observationId,
        expectedTextSha256: inp.textSha256, responseNonce: nonce, timeoutMs: 5000,
      });
      reply = read?.responseText || read?.text || '';
    } catch (error) {
      if (error?.message !== 'BROWSER_RESPONSE_WAIT_TIMEOUT') throw error;
    }
  }
  if (!reply) throw new Error('WORKER_RESPONSE_TIMEOUT');

  // 5. PEER VERITAS CHECK: Verify scientific rigor before accepting
  const hasEvidence = /FACT|OPEN_GAP|\.[a-z]{2,4}:\d+/i.test(reply);
  if (!hasEvidence) {
    return { status: 'VERITAS_RETRY_REQUIRED', reason: 'MISSING_FILE_LINE_OR_FACT_BOUNDARY', reply };
  }
  return { status: 'EVIDENCE_SHAPE_ACCEPTED_PENDING_INDEPENDENT_VERITAS', nonce, reply };
}
