import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { schemas } from '../../packages/protocol/index.mjs';
import { WindowsUiSessions } from '../../apps/desktop/windows-ui-sessions.mjs';

const app = 'chatgpt';
const pid = 1234;
const hash = text => createHash('sha256').update(text, 'utf8').digest('hex');

function observedSurface({ appName = app, processName = 'ChatGPT', editableTargets = [], actionTargets = [] } = {}) {
  return {
    app: appName,
    pid,
    processName,
    processStartedUtc: '2026-11-07T12:00:00.0000000Z',
    windowHandle: 5678,
    title: 'Known conversation',
    controls: [],
    editableTargets,
    actionTargets,
    totalControls: editableTargets.length + actionTargets.length,
    truncated: false,
  };
}

function edit(name = 'Message', automationId = 'composer') {
  return { name, automationId, controlType: 'ControlType.Edit', enabled: true, offscreen: false,
    valuePatternAvailable: true, valuePatternReadOnly: false, keyboardFocusable: true };
}

function button(name = 'Send message', automationId = 'send') {
  return { name, automationId, controlType: 'ControlType.Button', enabled: true, offscreen: false,
    invokePatternAvailable: true, keyboardFocusable: true };
}

test('protocol requires fresh observation and exact target IDs for input and submit', () => {
  const observationId = '11111111-1111-4111-8111-111111111111';
  const targetId = '22222222-2222-4222-8222-222222222222';
  const actionTargetId = '33333333-3333-4333-8333-333333333333';
  assert.equal(schemas['device.windows.window.input'].safeParse({ app, pid, observationId, targetId, text: 'hello' }).success, true);
  assert.equal(schemas['device.windows.window.input'].safeParse({ app, pid, text: 'hello' }).success, false);
  assert.equal(schemas['device.windows.window.submit'].safeParse({ app, pid, observationId, targetId,
    actionTargetId, expectedTextSha256: 'a'.repeat(64) }).success, true);
  assert.equal(schemas['device.windows.window.submit'].safeParse({ app, pid, observationId, targetId,
    actionTargetId, expectedTextSha256: 'bad' }).success, false);
});

test('observation returns opaque short-lived IDs only for writable visible Edit controls', async () => {
  let now = 1000;
  const seenScripts = [];
  const sessions = new WindowsUiSessions({
    now: () => now,
    executeScript: async script => { seenScripts.push(script); return observedSurface({ editableTargets: [edit()] }); },
  });
  const result = await sessions.observe({ app, pid, maxControls: 100 });
  assert.match(result.observationId, /^[0-9a-f-]{36}$/i);
  assert.equal(result.editableTargets.length, 1);
  assert.match(result.editableTargets[0].targetId, /^[0-9a-f-]{36}$/i);
  assert.equal(result.expiresInMs, 30000);
  assert.match(seenScripts[0], /ValuePattern/);
  assert.match(seenScripts[0], /IsReadOnly/);
  assert.match(seenScripts[0], /IsOffscreen/);
  now += 30001;
  await assert.rejects(() => sessions.input({ app, pid, observationId: result.observationId,
    targetId: result.editableTargets[0].targetId, text: 'no stale target' }), /WINDOW_OBSERVATION_EXPIRED/);
  assert.equal(seenScripts.length, 1);
});

test('input denies an unobserved target and performs exact readback before accepting', async () => {
  const text = 'Creator-approved exact text';
  const scripts = [];
  const sessions = new WindowsUiSessions({
    executeScript: async script => {
      scripts.push(script);
      if (scripts.length === 1) return observedSurface({ editableTargets: [edit()] });
      return { targetId: lastTargetId, inputLength: text.length, textSha256: hash(text), textReadback: 'EXACT_VALUE_PATTERN_READBACK' };
    },
  });
  const observation = await sessions.observe({ app, pid, maxControls: 100 });
  await assert.rejects(() => sessions.input({ app, pid, observationId: observation.observationId,
    targetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', text }), /WINDOW_TARGET_NOT_OBSERVED/);
  const lastTargetId = observation.editableTargets[0].targetId;
  const result = await sessions.input({ app, pid, observationId: observation.observationId, targetId: lastTargetId, text });
  assert.equal(result.textSha256, hash(text));
  assert.match(scripts[1], /WINDOW_IDENTITY_MISMATCH/);
  assert.match(scripts[1], /MainWindowHandle/);
  assert.match(scripts[1], /WINDOW_TARGET_NOT_UNIQUE/);
  assert.match(scripts[1], /WINDOW_INPUT_READBACK_MISMATCH/);
  assert.match(scripts[1], /SetValue\(\$text\)/);
  await assert.rejects(() => sessions.input({ app, pid, observationId: observation.observationId,
    targetId: lastTargetId, text }), /WINDOW_OBSERVATION_ALREADY_USED/);
});

test('submit requires a button from the same observation and the exact previously read-back text hash', async () => {
  const text = 'One exact message';
  const scripts = [];
  const sessions = new WindowsUiSessions({
    executeScript: async script => {
      scripts.push(script);
      if (scripts.length === 1) return observedSurface({ editableTargets: [edit()], actionTargets: [button()] });
      if (scripts.length === 2) return { targetId: targetIdValue, inputLength: text.length, textSha256: hash(text), textReadback: 'EXACT_VALUE_PATTERN_READBACK' };
      return { submitted: true, targetId: targetIdValue, actionTargetId: actionIdValue, textSha256: hash(text), resultState: 'ACTION_INVOKED_NOT_CONVERSATION_PROOF' };
    },
  });
  const observation = await sessions.observe({ app, pid, maxControls: 100 });
  const targetIdValue = observation.editableTargets[0].targetId;
  const actionIdValue = observation.actionTargets[0].targetId;
  await sessions.input({ app, pid, observationId: observation.observationId, targetId: targetIdValue, text });
  await assert.rejects(() => sessions.submit({ app, pid, observationId: observation.observationId,
    targetId: targetIdValue, actionTargetId: actionIdValue, expectedTextSha256: 'b'.repeat(64) }), /WINDOW_SUBMISSION_NOT_BOUND_TO_VERIFIED_INPUT/);
  const result = await sessions.submit({ app, pid, observationId: observation.observationId,
    targetId: targetIdValue, actionTargetId: actionIdValue, expectedTextSha256: hash(text) });
  assert.equal(result.resultState, 'ACTION_INVOKED_NOT_CONVERSATION_PROOF');
  assert.match(scripts[2], /WINDOW_SUBMISSION_TEXT_CHANGED/);
  assert.match(scripts[2], /WINDOW_ACTION_TARGET_NOT_UNIQUE/);
  assert.match(scripts[2], /\$invoke\.Invoke\(\)/);
  await assert.rejects(() => sessions.submit({ app, pid, observationId: observation.observationId,
    targetId: targetIdValue, actionTargetId: actionIdValue, expectedTextSha256: hash(text) }), /WINDOW_OBSERVATION_EXPIRED/);
});

test('Antigravity surface with no writable controls cannot produce an input target', async () => {
  const sessions = new WindowsUiSessions({ executeScript: async () => observedSurface({
    appName: 'antigravity', processName: 'Antigravity', editableTargets: [], actionTargets: [],
  }) });
  const observation = await sessions.observe({ app: 'antigravity', pid, maxControls: 100 });
  assert.deepEqual(observation.editableTargets, []);
  await assert.rejects(() => sessions.input({ app: 'antigravity', pid, observationId: observation.observationId,
    targetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', text: 'must not be sent' }), /WINDOW_TARGET_NOT_OBSERVED/);
});
