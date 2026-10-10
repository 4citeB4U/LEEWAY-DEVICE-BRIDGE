import fs from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
const html=fs.readFileSync(new URL("../docs/vision/index.html",import.meta.url),"utf8");
const doc=fs.readFileSync(new URL("../docs/vision/SOURCE-REUSE.md",import.meta.url),"utf8");

test("isolated HTML preserves approved optical control pad and video sinks",()=>{
  for(const id of ["widget","camera","optPad","padPrimaryStart","padStopCamera","padOrganicMode","padCrystalMode"]){
    assert.ok(html.includes('id="'+id+'"'),"Missing "+id);
  }
  assert.match(html,/<!doctype html>/i);
});
test("browser device discovery, permission gating and cleanup are present",()=>{
  for(const method of ["enumerateDevices","getUserMedia","getVideoTracks","deviceId","pointerdown","pointermove"]){
    assert.ok(html.includes(method),"Missing "+method);
  }
  assert.match(html,/videoWidth/);
  assert.match(html,/stop\(\)/);
});
test("the interface does not fake four cameras with cloned tracks",()=>{
  assert.ok(!html.includes("getVideoTracks()[0].clone()"));
  assert.ok(!html.includes("new MediaStream([track.clone()])"));
  assert.ok(!html.includes("generativelanguage.googleapis.com"));
  assert.ok(!html.includes("api.openai.com"));
});
test("source record rejects historical mock detectors as physical truth",()=>{
  assert.match(doc,/Historical container EVIDENCE/);
  assert.match(doc,/NOT recovered/);
  assert.match(doc,/MISSING GLUE/);
  assert.match(doc,/NOT YET VERIFIED/);
  assert.match(doc,/NOT imported as real detection/);
});
test("non-LLM pixel monitor reads actual frames, not inferred objects",()=>{
  assert.match(html,/P\.pixelMetrics/);
  assert.match(html,/fctx\.drawImage\(video/);
  assert.match(html,/Math\.abs\(r-previous\[i\]\)/);
  assert.match(html,/FACE MODEL OFF/);
});