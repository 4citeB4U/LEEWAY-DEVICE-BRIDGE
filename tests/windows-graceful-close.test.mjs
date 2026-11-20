/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.WINDOWS.GRACEFUL_CLOSE_TEST
TAG: LEEWAY.WINDOWS.CODEX.GRACEFUL_CLOSE_TEST_V1
5WH:
WHAT = Check that closing Codex is bound to a fresh observed window and never force-terminates a process.
WHY = Protect unsaved user work and reject stale or mismatched process identities.
WHO = LeeWay Device Bridge contributors under Creator authority.
WHERE = tests/windows-graceful-close.test.mjs.
WHEN = 2026-11-20.
HOW = Test the actual Windows UI session source using an injected non-executing PowerShell callback.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { schemas } from '../packages/protocol/index.mjs';
import { WindowsUiSessions } from '../apps/desktop/windows-ui-sessions.mjs';

const pid = 4321;
const observationId = '11111111-1111-4111-8111-111111111111';
function codexObservation() {
  return {
    app:'codex',pid,processName:'Codex',processStartedUtc:'2026-11-20T08:00:00.0000000Z',
    windowHandle:12345,title:'Codex',controls:[],editableTargets:[],actionTargets:[],
    totalControls:0,truncated:false,
  };
}

test('graceful close schema rejects a guessed target or another application', () => {
  const input = {app:'codex',pid,observationId};
  assert.equal(schemas['device.windows.window.close'].safeParse(input).success,true);
  assert.equal(schemas['device.windows.window.close'].safeParse({app:'chatgpt',pid,observationId}).success,false);
  assert.equal(schemas['device.windows.window.close'].safeParse({app:'codex',pid}).success,false);
  assert.equal(schemas['device.windows.window.close'].safeParse({...input,force:true}).success,false);
});

test('observed Codex close uses CloseMainWindow and requires fresh readback, never force kill', async () => {
  let now=1000;
  const scripts=[];
  const sessions=new WindowsUiSessions({
    now:()=>now,
    executeScript:async script=>{
      scripts.push(script);
      if(scripts.length===1)return codexObservation();
      return {app:'codex',pid,closeRequested:true,processExited:false,
        windowStillPresent:true,mode:'GRACEFUL_CLOSE_MAIN_WINDOW',
        postState:'REQUIRES_FRESH_WINDOW_LIST_READBACK'};
    }
  });
  const observed=await sessions.observe({app:'codex',pid,maxControls:10});
  const result=await sessions.close({app:'codex',pid,observationId:observed.observationId});
  assert.equal(result.closeRequested,true);
  assert.equal(result.windowStillPresent,true);
  assert.equal(result.postState,'REQUIRES_FRESH_WINDOW_LIST_READBACK');
  assert.match(scripts[1],/ProcessAllowed/);
  assert.match(scripts[1],/FindWindow/);
  assert.match(scripts[1],/CloseMainWindow\(\)/);
  assert.doesNotMatch(scripts[1],/Stop-Process|taskkill|Kill\(/i);
  assert.equal(scripts.length,2);
  await assert.rejects(sessions.close({app:'codex',pid,observationId:observed.observationId}),
    /WINDOW_OBSERVATION_EXPIRED/);
});

test('close refuses stale or non-Codex observations before invoking any Windows command', async () => {
  let now=1000;
  let calls=0;
  const sessions=new WindowsUiSessions({
    now:()=>now,
    executeScript:async()=>{calls+=1;return codexObservation();}
  });
  const observed=await sessions.observe({app:'codex',pid,maxControls:10});
  assert.equal(calls,1);
  await assert.rejects(sessions.close({app:'chatgpt',pid,observationId:observed.observationId}),
    /WINDOW_CLOSE_APP_NOT_ALLOWED/);
  now+=30001;
  await assert.rejects(sessions.close({app:'codex',pid,observationId:observed.observationId}),
    /WINDOW_OBSERVATION_EXPIRED/);
  assert.equal(calls,1);
});
