import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";
const page=readFileSync(new URL("../docs/index.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../docs/dashboard.css",import.meta.url),"utf8");
const js=readFileSync(new URL("../docs/dashboard-ui.js",import.meta.url),"utf8");
const sw=readFileSync(new URL("../docs/sw.js",import.meta.url),"utf8");
test("dashboard contains approved structural regions and mobile navigation",()=>{
  for(const id of ["dbSidebar","dbDevices","dbControls","dbRuntimePanel","dbDiagnostics","dbLogs","dbDownloads","dbActions","dbMenu","dbLegacy"]) assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(css,/@media\(max-width:590px\)/);
  assert.match(js,/aria-expanded/);
});
test("legacy PWA device controls and source assets remain present",()=>{
  for(const id of ["appleLane","androidLane","windowsLane","linuxLane","appleRuntime","appleBrowserAdapter","androidRuntime","discoverBtn","installPwaBtn","runBrowserCompute","packageCard"]) assert.ok(page.includes('id="'+id+'"'),id);
  for(const p of ["dashboard.css","dashboard-ui.js","styles.css","app.js"])assert.ok(sw.includes('"./'+p+'"'),p);
});
test("unverified remote controls deny interaction instead of pretending execution",()=>{
  for(const label of ["Remote View","Open Shell","File Access","App Control","Restart","Shutdown","Execute Skill","Apply Policy","Automate Task"]) assert.ok(page.includes(label),label);
  assert.match(page,/Devices: unknown/);
  assert.ok((page.match(/class="db-control" disabled/g)||[]).length>=12);
  assert.doesNotMatch(js,/fetch\(.*(device\/execute|command)/);
});
