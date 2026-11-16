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

export async function dispatchAndAuditWorkerTurn({ bridge, fromWorker, toWorker, promptText, expectedUrl }) {
  // 1. OBSERVE: Acquire fresh 30s target handle
  const obs = await bridge.call('device.windows.window.observe', {
    workerId: toWorker,
    expectedUrl
  });
  if (!obs.ok) throw new Error(`OBSERVE_FAILED:${obs.error}`);

  // 2. INPUT + VERIFY READBACK: Wrap prompt in R23 header & check exact readback
  const envelope = [
    `R23_HANDSHAKE | FROM=${fromWorker} | TO=${toWorker} | NONCE=${randomUUID()}`,
    `REQUIREMENTS: Separate FACT vs OPEN_GAP, cite exact file:line, return scientific proof + LeeWay Agent voice.`,
    `TASK: ${promptText}`
  ].join('\n');

  const inp = await bridge.call('device.windows.window.input', {
    workerId: toWorker,
    targetId: obs.targetId,
    text: envelope
  });
  if (!inp.ok) throw new Error(`INPUT_READBACK_FAILED:${inp.error}`);

  // 3. SUBMIT: Trigger Send button / Enter
  await bridge.call('device.windows.window.submit', {
    workerId: toWorker,
    targetId: obs.targetId
  });

  // 4. PAUSE & POLL: Wait until streaming completes and reply stabilizes
  let reply = '';
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const read = await bridge.call('device.windows.window.read', { workerId: toWorker });
    if (read.ok && !read.isStreaming && read.text.length > 0 && read.text === reply) {
      break; // Reply stabilized
    }
    reply = read.text || '';
  }

  // 5. PEER VERITAS CHECK: Verify scientific rigor before accepting
  const hasEvidence = /FACT|OPEN_GAP|\.[a-z]{2,4}:\d+/i.test(reply);
  if (!hasEvidence) {
    return { status: 'VERITAS_RETRY_REQUIRED', reason: 'MISSING_FILE_LINE_OR_FACT_BOUNDARY', reply };
  }
  return { status: 'VERITAS_ACCEPTED', reply };
}
