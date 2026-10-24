/* REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER; TAG: VISIBLE_CHROME_BEHAVIORAL_GATE
 * Explicit provider doubles qualify state/dispatch/verification behavior, not a real PC window.
 * Actual Chrome + HWND + live search qualification remains a separate required gate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {createVisibleBrowserController, normalizeBrowserSearchQuery, buildPublicSearchUrl,
  browserRequestDecision, observeWindowsBrowserProcess} from './visible-browser.mjs';

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'leeway-browser-contract-'));
const executable = path.join(fixtureRoot, process.platform === 'win32' ? 'chrome.exe' : 'chrome');
fs.writeFileSync(executable, 'Explicit inert browser-executable fixture. Never spawned.');
const executableHash = crypto.createHash('sha256').update(fs.readFileSync(executable)).digest('hex');
test.after(() => fs.rmSync(fixtureRoot, {recursive: true, force: true}));

function harness(options = {}) {
  const launches = [], sessions = [], commands = [], navigationOrder = [];
  let counter = 0, inFlight = 0, maximumInFlight = 0;
  const chromium = {async launch(launchOptions) {
    launches.push(launchOptions); counter++;
    const state = {id: counter, pid: 9000 + counter, targetId: 'target-' + counter, windowId: counter,
      url: 'about:blank', title: '', query: null, queryControlVisible: false, rawSources: [],
      visibilityState: 'visible', documentReady: 'complete', consent: false, challenge: false,
      connected: true, closed: false, windowState: 'normal', nativeOverrides: {}, pageOverrides: {}, ...options.initialState};
    sessions.push(state);
    const page = {
      url() { return state.url; }, isClosed() { return state.closed; }, mainFrame() { return page; }, on() {},
      async bringToFront() { commands.push(['bringToFront', state.id]); state.visibilityState = 'visible'; },
      async evaluate() {
        return {url: state.url, title: state.title, query: state.query, queryControlVisible: state.queryControlVisible,
          rawSources: state.rawSources, visibilityState: state.visibilityState, documentReady: state.documentReady,
          consent: state.consent, challenge: state.challenge, ...state.pageOverrides};
      },
      async goto(url) {
        inFlight++; maximumInFlight = Math.max(maximumInFlight, inFlight);
        navigationOrder.push(['start', new URL(url).searchParams.get('q')]);
        try {
          if (options.navigationDelay) await new Promise(r => setTimeout(r, options.navigationDelay));
          if (options.navigationError) throw options.navigationError;
          state.url = url; state.query = new URL(url).searchParams.get('q'); state.queryControlVisible = true;
          state.title = state.query + ' - Google Search';
          state.rawSources = [{title: 'Milwaukee cat cafe', url: 'https://www.cafemke.org/cats', snippet: 'Current search result.'}];
          options.onNavigate?.(state);
          return {status: () => options.httpStatus || 200};
        } finally { navigationOrder.push(['finish', new URL(url).searchParams.get('q')]); inFlight--; }
      },
      async waitForFunction() { if (options.waitError) throw options.waitError; },
      async close() { state.closed = true; },
    };
    const pageCdp = {async send(method) {
      commands.push([method, state.id]);
      if (method === 'Target.getTargetInfo') return {targetInfo: {targetId: state.changedTarget || state.targetId, type: 'page', url: state.url}};
      throw Error('UNEXPECTED_PAGE_CDP_METHOD:' + method);
    }};
    const browserCdp = {async send(method, payload) {
      commands.push([method, state.id, payload]);
      if (method === 'SystemInfo.getProcessInfo') return {processInfo: [{type: 'browser', id: state.pid}]};
      if (method === 'Browser.getWindowForTarget') return {windowId: state.windowId, bounds: {windowState: state.windowState}};
      if (method === 'Browser.getWindowBounds') return {bounds: {left: 10, top: 10, width: 1100, height: 800, windowState: state.windowState}};
      if (method === 'Browser.setWindowBounds') { state.windowState = payload.bounds.windowState; return {}; }
      if (method === 'Browser.getVersion') return {product: 'Chrome/154.0.0.0'};
      throw Error('UNEXPECTED_BROWSER_CDP_METHOD:' + method);
    }};
    const context = {
      setDefaultTimeout(value) { state.defaultTimeout = value; },
      setDefaultNavigationTimeout(value) { state.navigationTimeout = value; },
      async route(pattern, handler) { state.route = handler; },
      async routeWebSocket(pattern, handler) { state.websocket = handler; },
      async newPage() { return page; }, async newCDPSession() { return pageCdp; },
      async close() { state.contextClosed = true; state.closed = true; },
    };
    return {on() {}, isConnected() { return state.connected; },
      async newContext(contextOptions) { state.contextOptions = contextOptions; return context; },
      async newBrowserCDPSession() { return browserCdp; },
      async close() { state.browserClosed = true; state.connected = false; },
    };
  }};
  const nativeReadbacks = [];
  async function inspectNativeWindow(args) {
    nativeReadbacks.push(args);
    const state = sessions.find(s => s.pid === args.processId);
    options.beforeNative?.(state);
    return {at: new Date().toISOString(), processId: state.pid, executable,
      windows: [{hwnd: String(state.pid + 100), processId: state.pid, className: 'Chrome_WidgetWin_1',
        visible: true, minimized: false, monitorAttached: true, title: (state.title || 'New Tab') + ' - Google Chrome',
        bounds: {left: 10, top: 10, width: 1100, height: 800}, ...state.nativeWindowOverrides}],
      ...state.nativeOverrides};
  }
  const controller = createVisibleBrowserController({chromium, browserExecutable: executable,
    browserSha256: executableHash, inspectNativeWindow, ...options.controllerOptions});
  return {controller, launches, sessions, commands, nativeReadbacks, navigationOrder,
    maximumInFlight: () => maximumInFlight};
}
const open = (controller, requestId = 'request-1', outcomeId = 'open-1') => controller.openChrome({requestId, outcomeId});
const search = (controller, query = 'cats dining in Milwaukee, WI', extra = {}) => controller.search({query, requestId: 'request-1', outcomeId: 'search-1', ...extra});

test('unbound engine is described honestly and cannot actuate', async () => {
  const controller = createVisibleBrowserController();
  assert.equal(controller.describe().state, 'BROWSER_ENGINE_UNBOUND');
  await assert.rejects(open(controller), /BROWSER_ENGINE_UNBOUND/);
});
test('native read-back binding is required before browser launch', async () => {
  const h = harness({controllerOptions: {inspectNativeWindow: undefined}});
  await assert.rejects(open(h.controller), /BROWSER_NATIVE_WINDOW_READBACK_UNBOUND/);
  assert.equal(h.launches.length, 0);
});
test('changed executable hash prevents launch', async () => {
  const h = harness({controllerOptions: {browserSha256: '0'.repeat(64)}});
  await assert.rejects(open(h.controller), /BROWSER_EXECUTABLE_CHANGED/);
  assert.equal(h.launches.length, 0);
});
test('open reports observation only after matching actual protocol and native read-backs', async () => {
  const h = harness(), result = await open(h.controller);
  assert.equal(result.status, 'OBSERVED'); assert.equal(result.visible, true);
  assert.equal(result.executionState, 'VISIBLE_BROWSER_OBSERVED'); assert.equal(result.app, 'chrome');
  assert.equal(result.before.sessionId, null); assert.equal(result.after.sessionId, result.sessionId);
  assert.ok(h.commands.some(c => c[0] === 'SystemInfo.getProcessInfo'));
  assert.ok(h.commands.some(c => c[0] === 'Browser.getWindowBounds'));
  assert.equal(h.nativeReadbacks.length, 1);
  assert.equal(h.launches[0].headless, false); assert.equal(h.launches[0].chromiumSandbox, true);
  assert.equal(h.launches[0].userDataDir, undefined); assert.equal(h.launches[0].ignoreHTTPSErrors, undefined);
  assert.deepEqual(h.sessions[0].contextOptions.permissions, []);
  assert.equal(h.sessions[0].contextOptions.acceptDownloads, false);
  assert.equal(h.sessions[0].browserClosed, undefined);
});
test('launch success cannot establish a visible window', async () => {
  const h = harness({initialState: {nativeWindowOverrides: {visible: false}}});
  const result = await open(h.controller);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'BROWSER_VISIBLE_WINDOW_NOT_VERIFIED');
  assert.equal(result.visible, false); assert.equal(result.opened, null);
});
test('open and search share the exact owned Chrome process, target and session', async () => {
  const h = harness(), opened = await open(h.controller), searched = await search(h.controller);
  assert.equal(h.launches.length, 1); assert.equal(searched.sessionId, opened.sessionId);
  assert.equal(searched.targetId, opened.targetId); assert.equal(searched.processId, opened.processId);
  assert.equal(searched.before.targetId, searched.after.targetId); assert.equal(searched.status, 'OBSERVED');
  assert.equal(searched.requestedQuery, searched.query); assert.equal(searched.queryMatched, true);
  assert.equal(searched.sources[0].url, 'https://www.cafemke.org/cats');
  assert.equal(searched.executionState, 'SEARCH_RESULTS_OBSERVED');
  assert.equal(h.sessions[0].browserClosed, undefined);
});
test('standalone search uses an owned visible session', async () => {
  const h = harness(), result = await search(h.controller);
  assert.equal(result.status, 'OBSERVED'); assert.equal(h.launches.length, 1);
  assert.equal(result.userProfileUsed, false);
});
test('independent inspect re-reads changed query instead of replaying execution evidence', async () => {
  const h = harness(), result = await search(h.controller);
  h.sessions[0].query = 'something else';
  const check = await h.controller.inspect({sessionId: result.sessionId, expectedQuery: result.requestedQuery});
  assert.equal(check.status, 'BLOCKED'); assert.equal(check.reason, 'BROWSER_SEARCH_QUERY_MISMATCH');
  assert.equal(check.query, 'something else'); assert.ok(h.nativeReadbacks.length >= 3);
});
test('same-session commands are serialized across overlapping calls', async () => {
  const h = harness({navigationDelay: 15});
  const [one, two] = await Promise.all([search(h.controller, 'first query'), search(h.controller, 'second query', {outcomeId: 'search-2'})]);
  assert.equal(h.launches.length, 1); assert.equal(h.maximumInFlight(), 1);
  assert.deepEqual(h.navigationOrder, [['start', 'first query'], ['finish', 'first query'], ['start', 'second query'], ['finish', 'second query']]);
  assert.equal(one.query, 'first query'); assert.equal(two.query, 'second query');
});
test('another request cannot adopt a session ID', async () => {
  const h = harness(), result = await open(h.controller);
  await assert.rejects(search(h.controller, 'cats', {sessionId: result.sessionId, requestId: 'request-other'}), /BROWSER_REQUEST_SESSION_MISMATCH/);
  assert.equal(h.navigationOrder.length, 0);
});
for (const wall of ['consent', 'challenge']) {
  test(`${wall} is an explicit blocked result without automatic challenge or consent action`, async () => {
    const h = harness({onNavigate(s) { s[wall] = true; s.rawSources = []; }});
    const result = await search(h.controller);
    assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, `BROWSER_${wall.toUpperCase()}_REQUIRED`);
    assert.equal(result.sources.length, 0); assert.equal(h.sessions[0].browserClosed, undefined);
  });
}
test('title, URL and an open window cannot replace actual search-result observation', async () => {
  const h = harness({onNavigate(s) { s.rawSources = []; }}), result = await search(h.controller);
  assert.equal(result.queryMatched, true); assert.equal(result.visible, true);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'BROWSER_SEARCH_RESULTS_NOT_OBSERVED');
});
test('result links are normalized from real anchor values and private/internal destinations excluded', async () => {
  const h = harness({onNavigate(s) { s.rawSources = [
    {title: 'Private', url: 'http://127.0.0.1/secrets'}, {title: 'Local', url: 'http://device.local/'},
    {title: 'Provider', url: 'https://www.google.com/settings'}, {title: 'Malformed', url: 'javascript:alert(1)'},
    {title: 'Real cafe', url: 'https://www.google.com/url?q=https%3A%2F%2Fwww.cafemke.org%2Fmenu', snippet: 'a'.repeat(900)},
    {title: 'Duplicate', url: 'https://www.cafemke.org/menu'},
  ]; }});
  const result = await search(h.controller);
  assert.equal(result.status, 'OBSERVED'); assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].url, 'https://www.cafemke.org/menu'); assert.equal(result.sources[0].snippet.length, 700);
});
test('request cannot choose a URL, profile, selector, executable or script', async () => {
  const h = harness();
  for (const key of ['url', 'userDataDir', 'selector', 'executable', 'script']) {
    await assert.rejects(h.controller.search({requestId: 'r', outcomeId: 'o', query: 'cats', [key]: 'arbitrary'}), /BROWSER_ARGUMENTS_INVALID/);
  }
  assert.equal(h.launches.length, 0);
});
test('invalid or oversized search queries fail before launch and exact punctuation survives encoding', async () => {
  const h = harness();
  for (const query of ['', '  ', 'a'.repeat(513), 'cats\nopen an app', null]) await assert.rejects(search(h.controller, query), /BROWSER_SEARCH_QUERY_INVALID/);
  assert.equal(h.launches.length, 0);
  const query = 'cats dinning in Milwaukee, WI & coffee?';
  assert.equal(new URL(buildPublicSearchUrl('google', query)).searchParams.get('q'), query);
  assert.equal(normalizeBrowserSearchQuery('  ' + query + '  '), query);
});
test('public-search guard rejects arbitrary destinations and non-read methods', () => {
  const decision = (url, patch = {}) => browserRequestDecision({engine: 'google', url, method: 'GET', navigation: true, mainFrame: true, ...patch});
  for (const url of ['http://www.google.com/search?q=cats', 'http://localhost/', 'https://127.0.0.1/search', 'file:///tmp/a', 'https://www.cafemke.org/', 'https://www.google.com/account', 'https://user:pass@www.google.com/search']) assert.equal(decision(url), 'deny', url);
  assert.equal(decision('https://www.google.com/search?q=cats'), 'allow');
  assert.equal(decision('https://consent.google.com/m'), 'allow');
  assert.equal(decision('https://www.google.com/search?q=cats', {method: 'POST'}), 'deny');
  assert.equal(decision('https://www.gstatic.com/a.js', {navigation: false, mainFrame: false}), 'allow');
  assert.equal(decision('https://evilgoogle.com/a.js', {navigation: false, mainFrame: false}), 'deny');
});
test('duplicate open under the same request preserves the existing owned session', async () => {
  const h = harness(), first = await open(h.controller), second = await open(h.controller);
  assert.equal(first.sessionId, second.sessionId); assert.equal(h.launches.length, 1);
  assert.equal(second.newWindow, false); assert.equal(second.before.targetId, first.targetId);
});
test('an explicit new-window request creates a fresh session and real compound before/after inventory', async () => {
  const h = harness(), first = await open(h.controller);
  const second = await h.controller.openChrome({requestId: 'request-1', outcomeId: 'open-2', newWindow: true});
  assert.notEqual(second.sessionId, first.sessionId); assert.notEqual(second.processId, first.processId);
  assert.equal(h.launches.length, 2); assert.equal(second.newWindow, true);
  assert.deepEqual(second.beforeWindowIds, [`${first.processId}:${first.windowId}`]);
  assert.deepEqual(second.afterWindowIds, [`${first.processId}:${first.windowId}`, `${second.processId}:${second.windowId}`]);
  assert.equal(second.windowInventory.scope, 'CONTROLLER_OWNED_CHROME_TARGET_WINDOWS_ONLY');
  assert.equal(h.sessions[0].browserClosed, undefined);
});
test('inspect checks request and outcome ownership and echoes the current outcome', async () => {
  const h = harness(), first = await open(h.controller);
  const calls = h.nativeReadbacks.length;
  await assert.rejects(h.controller.inspect({sessionId: first.sessionId, requestId: 'wrong', outcomeId: 'open-1'}), /BROWSER_REQUEST_SESSION_MISMATCH/);
  await assert.rejects(h.controller.inspect({sessionId: first.sessionId, requestId: 'request-1', outcomeId: 'unknown'}), /BROWSER_OUTCOME_NOT_OWNED/);
  assert.equal(h.nativeReadbacks.length, calls);
  const result = await h.controller.inspect({sessionId: first.sessionId, requestId: 'request-1', outcomeId: 'open-1'});
  assert.equal(result.requestId, 'request-1'); assert.equal(result.outcomeId, 'open-1');
});
test('a closed owned page frees its automation slot without closing other pages in its browser', async () => {
  const h = harness({controllerOptions: {maxSessions: 1}}), first = await open(h.controller);
  h.sessions[0].closed = true;
  assert.equal(h.controller.describe().activeSessions, 0);
  await assert.rejects(h.controller.inspect({sessionId: first.sessionId}), /BROWSER_OWNED_SESSION_CLOSED/);
  const second = await h.controller.openChrome({requestId: 'request-1', outcomeId: 'open-2', newWindow: true});
  assert.notEqual(second.sessionId, first.sessionId); assert.equal(h.sessions[0].browserClosed, undefined);
});
test('session limit cannot close or reuse another completed user window', async () => {
  const h = harness({controllerOptions: {maxSessions: 1}}), first = await open(h.controller);
  await assert.rejects(open(h.controller, 'request-2'), /BROWSER_OWNED_SESSION_LIMIT/);
  assert.equal(h.sessions[0].browserClosed, undefined);
  assert.equal((await h.controller.inspect({sessionId: first.sessionId})).status, 'OBSERVED');
});
test('explicit cleanup closes only the exact owned session', async () => {
  const h = harness(), first = await open(h.controller), second = await open(h.controller, 'request-2');
  await assert.rejects(h.controller.closeOwned({sessionId: 'foreign-session'}), /BROWSER_SESSION_NOT_OWNED/);
  await assert.rejects(h.controller.closeOwned({sessionId: first.sessionId, requestId: 'request-2'}), /BROWSER_SESSION_NOT_OWNED/);
  await h.controller.closeOwned({sessionId: first.sessionId, requestId: 'request-1'});
  assert.equal(h.sessions[0].browserClosed, true); assert.equal(h.sessions[1].browserClosed, undefined);
  assert.equal((await h.controller.inspect({sessionId: second.sessionId})).status, 'OBSERVED');
});
for (const [name, mutate] of [
  ['wrong process', s => { s.nativeOverrides.processId = 1; }],
  ['wrong executable', s => { s.nativeOverrides.executable = '/different/chrome'; }],
  ['stale native evidence', s => { s.nativeOverrides.at = '2000-01-01T00:00:00.000Z'; }],
  ['minimized native window', s => { s.nativeWindowOverrides = {minimized: true}; }],
  ['window off all monitors', s => { s.nativeWindowOverrides = {monitorAttached: false}; }],
  ['ambiguous native windows', s => { s.nativeOverrides.windows = []; }],
]) {
  test(`${name} cannot satisfy visible Chrome`, async () => {
    const h = harness({beforeNative: mutate}), result = await open(h.controller);
    assert.equal(result.visible, false); assert.equal(result.status, 'BLOCKED');
  });
}
test('navigation or target changes during independent read-back cannot be verified', async () => {
  const h = harness(), result = await search(h.controller);
  h.sessions[0].changedTarget = 'foreign-target';
  const check = await h.controller.inspect({sessionId: result.sessionId, expectedQuery: result.query});
  assert.equal(check.reason, 'BROWSER_TARGET_CHANGED_DURING_READBACK');
});
test('closing a browser during native read-back cannot return completion from a cached page URL', async () => {
  const h = harness({beforeNative(s) { s.connected = false; s.closed = true; }});
  const result = await open(h.controller);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'BROWSER_TARGET_CHANGED_DURING_READBACK');
  assert.equal(result.visible, false);
});
test('HTTP failures are not success even when a page contains matching text', async () => {
  const h = harness({httpStatus: 503}), result = await search(h.controller);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'BROWSER_SEARCH_HTTP_FAILURE');
});
test('timed out result wait is not success', async () => {
  const error = new Error('timeout'); error.name = 'TimeoutError';
  const h = harness({waitError: error}), result = await search(h.controller);
  assert.equal(result.status, 'BLOCKED'); assert.equal(result.reason, 'BROWSER_SEARCH_TIMEOUT');
});
test('native helper refuses unsupported platforms and nonnumeric PID before subprocess execution', async () => {
  let calls = 0; const spawnProcess = () => { calls++; };
  await assert.rejects(observeWindowsBrowserProcess({processId: 10}, {platform: 'linux', spawnProcess}), /PLATFORM_UNQUALIFIED/);
  await assert.rejects(observeWindowsBrowserProcess({processId: '10;bad'}, {platform: 'win32', spawnProcess}), /PROCESS_ID_INVALID/);
  assert.equal(calls, 0);
});
test('native helper uses fixed executable/argv without a shell and parses genuine output', async () => {
  let called;
  const spawnProcess = (exe, args, options) => {
    called = {exe, args, options};
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => {};
    queueMicrotask(() => { child.stdout.emit('data', Buffer.from(JSON.stringify({processId: 901, windows: []}))); child.emit('close', 0); });
    return child;
  };
  const result = await observeWindowsBrowserProcess({processId: 901}, {platform: 'win32', spawnProcess});
  assert.equal(result.processId, 901); assert.equal(called.exe, 'powershell.exe'); assert.equal(called.options.shell, false);
  assert.ok(called.args.at(-1).includes('$targetProcessId=901'));
});
