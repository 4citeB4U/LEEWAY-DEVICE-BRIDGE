/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP.WINDOWS_UI.TESTS
TAG: LEEWAY.OUTLOOK_PASSIVE_OBSERVATION_SECURITY_V1
5WH:
WHAT = Qualify passive Outlook window observation and reject any Outlook action.
WHY = Prepare owner-authorized mailbox discovery without silently granting message mutations.
WHO = LeeWay Device Bridge CI under Creator/Standards authority.
WHERE = tests/mcp/windows-ui-composer-contract.test.mjs.
WHEN = 2026-11-20.
HOW = Exercise strict protocol schemas and mocked Windows UIA scripts with positive/negative tests.
LICENSE = MIT.
*/
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

test('protocol keeps browser read chrome-only, nonce-bound, and timeout-bounded', () => {
  const base = { app: 'chrome', pid, observationId: '11111111-1111-4111-8111-111111111111',
    expectedTextSha256: 'a'.repeat(64), responseNonce: 'LWC5-R21-READ-BOUND-01' };
  assert.equal(schemas['device.windows.window.read'].safeParse(base).success, true);
  assert.equal(schemas['device.windows.window.read'].safeParse({ ...base, app: 'chatgpt' }).success, false);
  assert.equal(schemas['device.windows.window.read'].safeParse({ ...base, responseNonce: 'short' }).success, false);
  assert.equal(schemas['device.windows.window.read'].safeParse({ ...base, timeoutMs: 99 }).success, false);
  assert.equal(schemas['device.windows.window.read'].safeParse({ ...base, timeoutMs: 10001 }).success, false);
  assert.equal(schemas['device.windows.window.read'].safeParse({ ...base, unexpected: true }).success, false);
});

test('Chrome observation requires an explicit expected URL before any host probe', async () => {
  let calls = 0;
  const sessions = new WindowsUiSessions({
    executeScript: async () => { calls += 1; return observedSurface({ appName: 'chrome', processName: 'chrome' }); },
  });
  await assert.rejects(() => sessions.observe({ app: 'chrome', pid, maxControls: 100 }), /BROWSER_URL_REQUIRED/);
  assert.equal(calls, 0);
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

test('Chrome response read uses one identity preamble and remains bound to the submitted observation', async () => {
  const surfaceUrl = 'https://chatgpt.com/c/test-conversation';
  const responseNonce = 'LWC5-R11-READ-BOUND-01';
  const text = `Creator-approved ${responseNonce}`;
  const scripts = [];
  const sessions = new WindowsUiSessions({
    executeScript: async script => {
      scripts.push(script);
      if (scripts.length === 1) return {
        ...observedSurface({ appName: 'chrome', processName: 'chrome', editableTargets: [edit()], actionTargets: [button()] }),
        surfaceUrl,
      };
      if (scripts.length === 2) return { targetId, inputLength: text.length, textSha256: hash(text), textReadback: 'EXACT_VALUE_PATTERN_READBACK' };
      if (scripts.length === 3) return { submitted: true, targetId, actionTargetId, textSha256: hash(text), resultState: 'ACTION_INVOKED_NOT_CONVERSATION_PROOF' };
      return { app: 'chrome', pid, windowHandle: 5678, surfaceUrl, responseState: 'ASSISTANT_TEXT_NONCE_OBSERVED', responseNonce, responseText: text, responseTextSha256: hash(text) };
    },
  });
  const observation = await sessions.observe({ app: 'chrome', pid, expectedUrl: surfaceUrl, expectedTitle: 'Known conversation', maxControls: 100 });
  const targetId = observation.editableTargets[0].targetId;
  const actionTargetId = observation.actionTargets[0].targetId;
  await sessions.input({ app: 'chrome', pid, observationId: observation.observationId, targetId, text });
  await sessions.submit({ app: 'chrome', pid, observationId: observation.observationId, targetId, actionTargetId, expectedTextSha256: hash(text) });
  const result = await sessions.read({ app: 'chrome', pid, observationId: observation.observationId, expectedTextSha256: hash(text), responseNonce, timeoutMs: 1000 });
  assert.equal(result.responseState, 'ASSISTANT_TEXT_NONCE_OBSERVED');
  assert.match(scripts[1], /\$editElements = @\(\$window\.FindAll/);
  assert.match(scripts[2], /\$editElements = @\(\$window\.FindAll/);
  assert.match(scripts[3], /\$editElements = @\(\$window\.FindAll/);
  assert.equal((scripts[3].match(/LEEWAY_UI_STARTED/g) || []).length, 1);
  assert.match(scripts[3], /\$userTurnSeen = \$false/);
  assert.match(scripts[3], /\$userTurnSeen = \$true; \$matched = @\(\)/);
  assert.match(scripts[3], /\$assistant -and \$userTurnSeen/);
  assert.equal((scripts[3].match(/BROWSER_ADDRESS_BAR_NOT_UNIQUE/g) || []).length, 2);
  assert.match(scripts[3], /\$boundedResponseText = \$responseText\.Substring/);
  assert.match(scripts[3], /responseTextTruncated/);
});

test('Chrome response read fails closed before a bound submission exists', async () => {
  const surfaceUrl = 'https://chatgpt.com/c/test-conversation';
  const sessions = new WindowsUiSessions({
    executeScript: async () => ({
      ...observedSurface({ appName: 'chrome', processName: 'chrome', editableTargets: [edit()], actionTargets: [button()] }),
      surfaceUrl,
    }),
  });
  const observation = await sessions.observe({ app: 'chrome', pid, expectedUrl: surfaceUrl, expectedTitle: 'Known conversation', maxControls: 100 });
  await assert.rejects(() => sessions.read({ app: 'chrome', pid, observationId: observation.observationId,
    expectedTextSha256: 'a'.repeat(64), responseNonce: 'LWC5-R21-READ-BOUND-02', timeoutMs: 1000 }),
  /BROWSER_READ_NOT_BOUND_TO_SUBMISSION/);
});

test('Chrome response read rejects a response whose nonce does not match the request', async () => {
  const surfaceUrl = 'https://chatgpt.com/c/test-conversation';
  const requestedNonce = 'LWC5-R30-REQUEST-NONCE';
  const returnedNonce = 'LWC5-R30-OTHER-NONCE';
  const text = `Creator-approved ${returnedNonce}`;
  let calls = 0;
  const sessions = new WindowsUiSessions({
    executeScript: async () => {
      calls += 1;
      if (calls === 1) return {
        ...observedSurface({ appName: 'chrome', processName: 'chrome', editableTargets: [edit()], actionTargets: [button()] }),
        surfaceUrl,
      };
      if (calls === 2) return {
        targetId: targetIdValue, inputLength: text.length, textSha256: hash(text), textReadback: 'EXACT_VALUE_PATTERN_READBACK',
      };
      if (calls === 3) return {
        submitted: true, targetId: targetIdValue, actionTargetId, textSha256: hash(text), resultState: 'ACTION_INVOKED_NOT_CONVERSATION_PROOF',
      };
      return { app: 'chrome', pid, windowHandle: 5678, surfaceUrl, responseState: 'ASSISTANT_TEXT_NONCE_OBSERVED', responseNonce: returnedNonce, responseText: text, responseTextSha256: hash(text) };
    },
  });
  const observation = await sessions.observe({ app: 'chrome', pid, expectedUrl: surfaceUrl, expectedTitle: 'Known conversation', maxControls: 100 });
  const targetIdValue = observation.editableTargets[0].targetId;
  const actionTargetId = observation.actionTargets[0].targetId;
  await sessions.input({ app: 'chrome', pid, observationId: observation.observationId, targetId: targetIdValue, text });
  await sessions.submit({ app: 'chrome', pid, observationId: observation.observationId, targetId: targetIdValue, actionTargetId, expectedTextSha256: hash(text) });
  await assert.rejects(() => sessions.read({ app: 'chrome', pid, observationId: observation.observationId,
    expectedTextSha256: hash(text), responseNonce: requestedNonce, timeoutMs: 1000 }), /BROWSER_RESPONSE_READBACK_INVALID/);
});


test('Outlook passive observation is identity-bound and no mutation capability accepts Outlook', async () => {
  const expectedTitle = 'Inbox - Outlook';
  const expectedProcessStartedUtc = '2026-11-20T12:00:00.0000000Z';
  const list = schemas['device.windows.window.list'].safeParse({app:'outlook',limit:10});
  assert.equal(list.success,true);
  const observeArgs = {app:'outlook',pid,expectedTitle,expectedProcessStartedUtc,maxControls:30};
  assert.equal(schemas['device.windows.window.observe'].safeParse(observeArgs).success,true);
  const observationId='11111111-1111-4111-8111-111111111111';
  const targetId='22222222-2222-4222-8222-222222222222';
  const actionTargetId='33333333-3333-4333-8333-333333333333';
  const actions={
    invoke:{app:'outlook',pid,controlName:'Connecting to MCP and Codex'},
    input:{app:'outlook',pid,observationId,targetId,text:'blocked'},
    submit:{app:'outlook',pid,observationId,targetId,actionTargetId,expectedTextSha256:'a'.repeat(64)},
    close:{app:'outlook',pid,observationId},
    read:{app:'outlook',pid,observationId,expectedTextSha256:'a'.repeat(64),responseNonce:'OUTLOOK-DENIED-NONCE'},
  };
  for (const [action,argumentsForAction] of Object.entries(actions)) {
    const schema=schemas['device.windows.window.'+action];
    assert.equal(schema.safeParse(argumentsForAction).success,false,action);
    // The baseline non-Outlook action remains structurally valid:
    const permittedApp=action==='close'?'codex':action==='read'?'chrome':'chatgpt';
    assert.equal(schema.safeParse({...argumentsForAction,app:permittedApp}).success,true,action+' baseline');
  }
  let calls=0;const scripts=[];
  const sessions=new WindowsUiSessions({executeScript:async script=>{
    calls++;scripts.push(script);
    return {...observedSurface({appName:'outlook',processName:'OUTLOOK',editableTargets:[edit()],actionTargets:[button()]}),title:expectedTitle,processStartedUtc:expectedProcessStartedUtc,controls:[{name:'Employer application',controlType:'ControlType.ListItem',offscreen:false}]};
  }});
  await assert.rejects(()=>sessions.observe({app:'outlook',pid,maxControls:30}),/OUTLOOK_WINDOW_IDENTITY_REQUIRED/);
  assert.equal(calls,0);
  const observation=await sessions.observe(observeArgs);
  assert.equal(observation.controls[0].name,'Employer application');
  assert.deepEqual(observation.editableTargets,[]);
  assert.deepEqual(observation.actionTargets,[]);
  assert.match(scripts[0],/OUTLOOK_WINDOW_IDENTITY_MISMATCH/);
  assert.equal(scripts[0].includes('ControlType.ListItem'), true);
  assert.equal(scripts[0].includes('SetValue('), false);
  assert.equal(scripts[0].includes('$invoke.Invoke('), false);
  await assert.rejects(()=>sessions.input({app:'outlook',pid,observationId:observation.observationId,text:'never'}),/OUTLOOK_WINDOW_READ_ONLY/);
  await assert.rejects(()=>sessions.submit({app:'outlook',pid,observationId:observation.observationId}),/OUTLOOK_WINDOW_READ_ONLY/);
  await assert.rejects(()=>sessions.invoke({app:'outlook',pid}),/OUTLOOK_WINDOW_READ_ONLY/);
  assert.equal(calls,1);
});

test('Outlook observation rejects changed process start or mismatched title', async()=>{
  const expectedTitle='Inbox - Outlook',expectedProcessStartedUtc='2026-11-20T12:00:00.0000000Z';
  const session=new WindowsUiSessions({executeScript:async()=>({...observedSurface({appName:'outlook',processName:'OUTLOOK'}),title:'Other Window',processStartedUtc:expectedProcessStartedUtc})});
  await assert.rejects(()=>session.observe({app:'outlook',pid,expectedTitle,expectedProcessStartedUtc,maxControls:20}),/OUTLOOK_WINDOW_IDENTITY_MISMATCH/);
});
