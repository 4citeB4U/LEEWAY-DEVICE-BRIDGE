/* LEEWAY HEADER — DO NOT REMOVE
 REGION: DEVICE.BRIDGE.APPLE.VOICE.SOURCE.TEST
 TAG: EXISTING_APP_NO_OS_TTS_REGRESSION
 WHO: LeeWay Industries. WHAT: enforce native voice entry constraints.
 WHY: avoid Apple voice fallback and preserve existing Metal probe.
 WHERE: tests. WHEN: 2026-10-25. HOW: static source contract.
 AUTHORITY: TEST_ONLY. LICENSE: MIT. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dir=new URL('../apps/apple/Sources/',import.meta.url);
test('existing iPhone Device Bridge includes first-party LeeWay Voice entry',()=>{
 const main=readFileSync(new URL('AppleDeviceBridgeView.swift',dir),'utf8');
 const voice=readFileSync(new URL('AppleLeeWayVoiceView.swift',dir),'utf8');
 assert.match(main,/AppleLeeWayVoiceView\(\)/);
 assert.match(main,/Run Device Bridge Metal Probe/);
 assert.match(voice,/LeeWay-Voice-Fabric\/studio\.html/);
 assert.match(voice,/WKWebView/);
 assert.doesNotMatch(main+voice,/AVSpeechSynthesizer|SFSpeechSynthesizer/);
 assert.match(voice,/navigationDelegate/);
});
