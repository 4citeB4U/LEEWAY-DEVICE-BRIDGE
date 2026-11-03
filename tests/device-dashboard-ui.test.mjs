import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";

const page=readFileSync(new URL("../docs/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../docs/dashboard.css",import.meta.url),"utf8");
const js=readFileSync(new URL("../docs/dashboard-ui.js",import.meta.url),"utf8");
const sw=readFileSync(new URL("../docs/sw.js",import.meta.url),"utf8");

test("device topology is an interactive alternative to redundant sidebar",()=>{
  assert.doesNotMatch(page,/id="dbSidebar"/);
  for(const category of ["desktop","laptop","mobile","iot","server","tablet"]){
    assert.match(page,new RegExp('data-device-kind="'+category+'"'));
    assert.match(page,new RegExp('data-link="'+category+'"'));
  }
  assert.match(js,/groupSelect\(node\.dataset\.deviceKind\)/);
  assert.match(css,/db-link-live/);
});
test("approved operational surfaces expand and restore",()=>{
  for(const id of ["dbMap","dbDevices","dbControls","dbRuntimePanel","dbDiagnostics","dbLogs","dbDownloads","dbActions","dbLegacy"]){
    assert.ok(page.includes('id="'+id+'"'),id);
  }
  for(const id of ["dbMap","dbDevices","dbControls","dbDiagnostics","dbLogs","dbActions"]) assert.ok(page.includes('data-expand="'+id+'"'),id);
  assert.match(js,/function expand\(id\)/);
  assert.match(js,/db-modal-open/);
  assert.match(css,/@media\(max-width:590px\)/);
});
test("preserves working legacy PWA platform and native adapter hooks",()=>{
  for(const id of ["appleLane","androidLane","windowsLane","linuxLane","appleRuntime","appleBrowserAdapter","androidRuntime","discoverBtn","installPwaBtn","runBrowserCompute","packageCard"]) assert.ok(page.includes('id="'+id+'"'),id);
  for(const p of ["dashboard.css","dashboard-ui.js","styles.css","app.js"])assert.ok(sw.includes('"./'+p+'"'),p);
});
test("no invented remote execution, devices or package bundle",()=>{
  assert.ok((page.match(/class="db-control" disabled/g)||[]).length>=12);
  assert.match(page,/bundle not yet verified/);
  assert.match(page,/id="dbInventoryRows"/);
  assert.match(js,/navigator\.hardwareConcurrency/);
  assert.match(js,/navigator\.storage\.estimate/);
  assert.match(js,/\.well-known\/oauth-protected-resource\/mcp/);
  assert.doesNotMatch(js,/device\/execute|device_files_write/);
});
