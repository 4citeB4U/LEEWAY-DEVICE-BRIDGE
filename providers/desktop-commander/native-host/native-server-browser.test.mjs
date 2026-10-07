/*
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: NATIVE_SERVER_BROWSER_HTTP_CONTRACT
WHO: Explicit test harness. WHAT: Run the unchanged candidate server through actual HTTP.
HOW: A temporary test-only import wrapper supplies explicit browser/native doubles while
retaining the real controller and server. Production gains no test flag or bypass.
SCOPE: Dispatch, strict request/binding boundaries, fresh read-back and envelope integrity.
This is not real Chrome, native-window or external search qualification.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtures = [];
const fixtureEngine = String.raw`
import fs from 'node:fs';
export const records=[];
if(process.env.BROWSER_FIXTURE_IMPORT_MARKER)fs.writeFileSync(process.env.BROWSER_FIXTURE_IMPORT_MARKER,'imported');
export const chromium={async launch(options){
 const n=records.length+1;
 const s={pid:7100+n,targetId:'owned-'+n,windowId:1,url:'about:blank',title:'',query:null,
  connected:true,pageClosed:false,executable:options.executablePath,rawSources:[],nativeReads:0};
 records.push(s);
 const page={url:()=>s.url,isClosed:()=>s.pageClosed,mainFrame:()=>page,on(){},async bringToFront(){},
  async evaluate(){return{url:s.url,title:s.title,query:s.query,queryControlVisible:s.query!==null,
   rawSources:s.rawSources,visibilityState:'visible',documentReady:'complete',consent:false,challenge:false};},
  async goto(url){s.url=url;s.query=new URL(url).searchParams.get('q');s.title=s.query+' - Google Search';
   s.rawSources=s.query==='empty result fixture'?[]:[{title:'Fixture public result',url:'https://www.cafemke.org/cats',snippet:'Explicit provider double.'}];
   return{status:()=>200};},
  async waitForFunction(){},async close(){s.pageClosed=true;}};
 const pageCdp={async send(method){if(method==='Target.getTargetInfo')return{targetInfo:{targetId:s.targetId,type:'page',url:s.url}};throw Error('UNEXPECTED_PAGE_CDP');}};
 const browserCdp={async send(method){
  if(method==='SystemInfo.getProcessInfo')return{processInfo:[{type:'browser',id:s.pid}]};
  if(method==='Browser.getWindowForTarget')return{windowId:s.windowId,bounds:{windowState:'normal'}};
  if(method==='Browser.getWindowBounds')return{bounds:{left:0,top:0,width:1100,height:800,windowState:'normal'}};
  if(method==='Browser.getVersion')return{product:'Chrome/154.0.0.0'};
  throw Error('UNEXPECTED_BROWSER_CDP');}};
 const context={setDefaultTimeout(){},setDefaultNavigationTimeout(){},async route(){},async routeWebSocket(){},
  async newPage(){return page;},async newCDPSession(){return pageCdp;},async close(){s.pageClosed=true;}};
 return{on(){},isConnected:()=>s.connected,async newContext(){return context;},async newBrowserCDPSession(){return browserCdp;},async close(){s.connected=false;}};
}};
export async function fixtureNativeReadback({processId}){
 const s=records.find(record=>record.pid===processId);s.nativeReads++;
 return{processId,executable:s.executable,at:new Date().toISOString(),fixtureNativeReadSequence:s.nativeReads,
  windows:[{hwnd:String(90000+processId),processId,visible:true,minimized:false,monitorAttached:true,
   className:'Chrome_WidgetWin_1',title:(s.title||'New Tab')+' - Google Chrome',bounds:{left:0,top:0,width:1100,height:800}}]};
}
`;

function fixture({browser = true, mutateBinding, apps = {}, extraEnv = {}} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'leeway-native-browser-http-'));
  fixtures.push(root);
  fs.copyFileSync(path.join(here, 'server.mjs'), path.join(root, 'server.mjs'));
  fs.copyFileSync(path.join(here, 'command-policy.mjs'), path.join(root, 'command-policy.mjs'));
  const engine = path.join(root, 'fixture-playwright.mjs');
  fs.writeFileSync(engine, fixtureEngine);
  // The dependency boundary is explicit and confined to this temporary test harness.
  fs.writeFileSync(path.join(root, 'visible-browser.mjs'),
    `export {createVisibleBrowserController} from ${JSON.stringify(pathToFileURL(path.join(here, 'visible-browser.mjs')).href)};\n` +
    `export async function observeWindowsBrowserProcess(args) { const fixture = await import('./fixture-playwright.mjs'); return fixture.fixtureNativeReadback(args); }\n`);
  const executable = path.join(root, process.platform === 'win32' ? 'chrome.exe' : 'chrome');
  fs.writeFileSync(executable, 'Explicit inert executable fixture; never spawned.');
  const binding = {browserExecutable: executable, browserSha256: sha(fs.readFileSync(executable)),
    playwrightModulePath: engine, dependencyFiles: [{path: engine, sha256: sha(fs.readFileSync(engine))}]};
  mutateBinding?.(binding, root);
  const env = {...process.env, LEEWAY_HOST_COMMANDER_PORT: '0', LEEWAY_HOST_COMMANDER_ROOT: root,
    LEEWAY_BODY_ID: 'explicit-http-fixture', LEEWAY_HOST_COMMANDER_APPS_JSON: JSON.stringify(apps), ...extraEnv};
  delete env.NODE_TEST_CONTEXT; delete env.LEEWAY_ROOT; delete env.LEEWAY_HOST_COMMANDER_BROWSER_JSON;
  if (browser) env.LEEWAY_HOST_COMMANDER_BROWSER_JSON = JSON.stringify(binding);
  const child = spawn(process.execPath, [path.join(root, 'server.mjs')], {cwd: root, env, stdio: ['ignore', 'pipe', 'pipe']});
  let stdout = '', stderr = '', exited = false;
  child.stdout.on('data', chunk => { stdout += chunk.toString(); });
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const done = new Promise(resolve => child.once('exit', (code, signal) => { exited = true; resolve({code, signal}); }));
  async function ready() {
    const began = Date.now();
    while (Date.now() - began < 6000) {
      for (const line of stdout.split(/\r?\n/)) {
        try { const event = JSON.parse(line); if (event.event === 'LEEWAY_NATIVE_HOST_COMMANDER_READY') return `http://127.0.0.1:${event.port}`; } catch {}
      }
      if (exited) throw new Error('SERVER_DID_NOT_START:' + stderr);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('SERVER_READY_TIMEOUT:' + stderr);
  }
  async function stop() { if (!exited) child.kill(); await done; }
  return {root, child, ready, stop, done, stderr: () => stderr, stdout: () => stdout, binding};
}

async function server(t, options) {
  const f = fixture(options); t.after(() => f.stop()); const base = await f.ready();
  return {...f, base, async execute(capability, args, headers = {}) {
    const response = await fetch(base + '/execute', {method: 'POST', headers: {'content-type': 'application/json', ...headers},
      body: JSON.stringify({capability, args}), signal: AbortSignal.timeout(5000)});
    return {httpStatus: response.status, body: await response.json()};
  }, async health() { return (await fetch(base + '/health')).json(); }};
}
function validReceipt(receipt) {
  const {receiptHash, ...body} = receipt;
  assert.equal(receiptHash, sha(JSON.stringify(body)));
  assert.equal(receipt.provider, 'LEEWAY_NATIVE_HOST_COMMANDER');
  assert.equal(receipt.verified, 'ADAPTER_EXECUTED');
  assert.equal(receipt.signatureState, 'UNSIGNED_CONTENT_HASH_ONLY');
}
test.after(() => { for (const root of fixtures) fs.rmSync(root, {recursive: true, force: true}); });

test('unconfigured server retains existing host identity and describes browser as unbound', async t => {
  const s = await server(t, {browser: false}), health = await s.health();
  assert.equal(health.provider, 'LEEWAY_NATIVE_HOST_COMMANDER');
  assert.equal(health.visibleBrowser.state, 'BROWSER_ENGINE_UNBOUND');
  assert.equal(health.capabilities['leeway.browser.search'], 'OPERATE');
  assert.equal(health.capabilities['leeway.browser.inspect'], 'READ');
  const result = await s.execute('leeway.host.info', {});
  assert.equal(result.httpStatus, 200); validReceipt(result.body);
});
test('actual HTTP Chrome open/search/independent inspect preserve ownership and envelope integrity', async t => {
  const s = await server(t), health = await s.health();
  assert.equal(health.visibleBrowser.state, 'BOUND_NOT_EXECUTED');
  const opened = await s.execute('leeway.app.open', {app: 'chrome', requestId: 'request-1', outcomeId: 'open-1'});
  assert.equal(opened.httpStatus, 200); validReceipt(opened.body);
  assert.equal(opened.body.result.status, 'OBSERVED'); assert.equal(opened.body.result.visible, true);
  const sessionId = opened.body.result.sessionId;
  const searched = await s.execute('leeway.browser.search', {query: 'cats dining in Milwaukee, WI', sessionId, requestId: 'request-1', outcomeId: 'search-1'});
  assert.equal(searched.httpStatus, 200); validReceipt(searched.body);
  assert.equal(searched.body.result.sessionId, sessionId);
  assert.equal(searched.body.result.targetId, opened.body.result.targetId);
  assert.equal(searched.body.result.query, 'cats dining in Milwaukee, WI');
  const inspected = await s.execute('leeway.browser.inspect', {sessionId, requestId: 'request-1', outcomeId: 'search-1', expectedQuery: 'cats dining in Milwaukee, WI'});
  assert.equal(inspected.httpStatus, 200); validReceipt(inspected.body);
  assert.equal(inspected.body.result.status, 'OBSERVED');
  assert.equal(inspected.body.result.requestId, 'request-1'); assert.equal(inspected.body.result.outcomeId, 'search-1');
  assert.ok(inspected.body.result.evidence.native.fixtureNativeReadSequence > searched.body.result.evidence.native.fixtureNativeReadSequence);
});
test('HTTP rejects request/session and outcome mismatches before native inspection', async t => {
  const s = await server(t);
  const {body} = await s.execute('leeway.app.open', {app: 'chrome', requestId: 'request-1', outcomeId: 'open-1'});
  const sessionId = body.result.sessionId;
  const wrong = await s.execute('leeway.browser.inspect', {sessionId, requestId: 'request-other', outcomeId: 'open-1'});
  assert.equal(wrong.httpStatus, 400); assert.equal(wrong.body.error, 'BROWSER_REQUEST_SESSION_MISMATCH');
  const wrongOutcome = await s.execute('leeway.browser.inspect', {sessionId, requestId: 'request-1', outcomeId: 'unknown'});
  assert.equal(wrongOutcome.httpStatus, 400); assert.equal(wrongOutcome.body.error, 'BROWSER_OUTCOME_NOT_OWNED');
  const valid = await s.execute('leeway.browser.inspect', {sessionId, requestId: 'request-1', outcomeId: 'open-1'});
  assert.equal(valid.body.result.evidence.native.fixtureNativeReadSequence, 2);
});
test('explicit new-window via HTTP proves new compound window ID without closing the old session', async t => {
  const s = await server(t);
  const one = await s.execute('leeway.app.open', {app: 'chrome', requestId: 'request-1', outcomeId: 'open-1'});
  const two = await s.execute('leeway.app.open', {app: 'chrome', requestId: 'request-1', outcomeId: 'open-2', newWindow: true});
  assert.equal(two.httpStatus, 200);
  assert.notEqual(two.body.result.sessionId, one.body.result.sessionId);
  assert.notEqual(two.body.result.processId, one.body.result.processId);
  assert.equal(two.body.result.windowId, one.body.result.windowId); // CDP IDs can repeat across processes.
  assert.deepEqual(two.body.result.beforeWindowIds, [`${one.body.result.processId}:${one.body.result.windowId}`]);
  assert.ok(two.body.result.afterWindowIds.includes(`${two.body.result.processId}:${two.body.result.windowId}`));
  assert.equal((await s.health()).visibleBrowser.activeSessions, 2);
  const old = await s.execute('leeway.browser.inspect', {sessionId: one.body.result.sessionId, requestId: 'request-1', outcomeId: 'open-1'});
  assert.equal(old.body.result.visible, true);
});
test('strict browser arguments and required request identities fail before creating a session', async t => {
  const s = await server(t);
  for (const args of [
    {query: 'cats'}, {query: 'cats', requestId: 'request-1'},
    {query: 'cats', requestId: 'request-1', outcomeId: 'search-1', url: 'https://unrelated.org/'},
    {query: 'cats\x7f', requestId: 'request-1', outcomeId: 'search-1'},
    {query: 'a'.repeat(513), requestId: 'request-1', outcomeId: 'search-1'},
  ]) assert.equal((await s.execute('leeway.browser.search', args)).httpStatus, 400);
  assert.equal((await s.health()).visibleBrowser.activeSessions, 0);
});
test('HTTP native operation does not promote missing result links to completion', async t => {
  const s = await server(t);
  const result = await s.execute('leeway.browser.search', {query: 'empty result fixture', requestId: 'request-1', outcomeId: 'search-1'});
  assert.equal(result.httpStatus, 200); validReceipt(result.body);
  assert.equal(result.body.result.status, 'BLOCKED'); assert.equal(result.body.result.reason, 'BROWSER_SEARCH_RESULTS_NOT_OBSERVED');
});
test('existing non-Chrome app fallback retains spawn-only evidence', async t => {
  const s = await server(t, {apps: {fixture: {executable: process.execPath, args: ['-e', 'process.exit(0)']}}});
  const result = await s.execute('leeway.app.open', {app: 'fixture'});
  assert.equal(result.httpStatus, 200); validReceipt(result.body);
  assert.equal(result.body.result.executionState, 'SPAWN_ACKNOWLEDGED_NOT_UI_VERIFIED');
  assert.equal(result.body.result.visible, undefined);
  const newWindow = await s.execute('leeway.app.open', {app: 'fixture', newWindow: true});
  assert.equal(newWindow.httpStatus, 400); assert.equal(newWindow.body.error, 'APP_NEW_WINDOW_NOT_SUPPORTED');
});
test('untrusted web origin still cannot invoke browser actions', async t => {
  const s = await server(t);
  const result = await s.execute('leeway.app.open', {app: 'chrome', requestId: 'request-1', outcomeId: 'open-1'}, {origin: 'https://unrelated.org'});
  assert.equal(result.httpStatus, 403); assert.equal(result.body.error, 'LOCAL_NATIVE_CALLER_REQUIRED');
  assert.equal((await s.health()).visibleBrowser.activeSessions, 0);
});
for (const [name, mutateBinding, error] of [
  ['dependency hash mismatch', b => { b.dependencyFiles[0].sha256 = '0'.repeat(64); }, 'COMMANDER_BROWSER_DEPENDENCY_HASH_MISMATCH'],
  ['unlisted entry module', b => { b.dependencyFiles = [{path: b.browserExecutable, sha256: b.browserSha256}]; }, 'COMMANDER_BROWSER_ENTRY_NOT_PINNED'],
  ['duplicate dependency entry', b => { b.dependencyFiles.push({...b.dependencyFiles[0]}); }, 'COMMANDER_BROWSER_DUPLICATE_DEPENDENCY'],
  ['executable hash mismatch', b => { b.browserSha256 = '0'.repeat(64); }, 'COMMANDER_BROWSER_DEPENDENCY_HASH_MISMATCH'],
  ['unknown config property', b => { b.profile = 'existing-user-profile'; }, 'COMMANDER_BROWSER_BINDING_INVALID'],
]) {
  test(`${name} stops startup before the trusted dependency import`, async t => {
    const marker = path.join(os.tmpdir(), 'leeway-import-marker-' + crypto.randomUUID());
    const f = fixture({mutateBinding, extraEnv: {BROWSER_FIXTURE_IMPORT_MARKER: marker}});
    t.after(async () => { await f.stop(); fs.rmSync(marker, {force: true}); });
    const done = await f.done;
    assert.notEqual(done.code, 0); assert.match(f.stderr(), new RegExp(error));
    assert.equal(fs.existsSync(marker), false, 'Invalid binding must not import its executable dependency.');
    assert.ok(!f.stdout().includes('LEEWAY_NATIVE_HOST_COMMANDER_READY'));
  });
}
