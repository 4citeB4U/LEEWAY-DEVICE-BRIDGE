/*
LEEWAY_HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: NATIVE_COMMANDER_VISIBLE_CHROME
5WH: WHAT=Owned visible Chrome/search operations inside the existing native Commander;
WHY=A spawned process or an offline HTML test does not prove the user's browser task;
WHO=Creator-authorized local controller; WHERE=providers/desktop-commander/native-host;
WHEN=After trusted runtime binding; HOW=Existing browser engine -> exact owned target ->
fresh DOM, Chrome protocol and native window read-back. No listener or language model.
AUTHORIZED_ROLES: Existing native Commander. Request content never chooses an executable,
profile, module, arbitrary URL, script, selector, shell command or browser debugging endpoint.
LICENSE: MIT
*/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

const HASH = /^[a-f0-9]{64}$/i;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };
const ENGINE_RULES = Object.freeze({
  google: {origin: 'https://www.google.com', path: '/search', hosts: ['www.google.com', 'google.com', 'consent.google.com'], assets: ['google.com', 'gstatic.com', 'googleusercontent.com']},
  bing: {origin: 'https://www.bing.com', path: '/search', hosts: ['www.bing.com', 'bing.com'], assets: ['bing.com', 'bing.net']},
});

function identifier(value, code) { if (typeof value !== 'string' || !ID.test(value)) fail(code); return value; }
function exactObject(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('BROWSER_ARGUMENTS_INVALID');
}
function publicUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port || !host.includes('.') ||
      /^[\d.]+$/.test(host) || host.includes(':') || /(^|\.)(localhost|local|internal|invalid|test|example|home|lan)$/.test(host)) return null;
    return u;
  } catch { return null; }
}
function suffixHost(host, suffix) { return host === suffix || host.endsWith('.' + suffix); }

export function normalizeBrowserSearchQuery(value) {
  if (typeof value !== 'string' || /[\x00-\x1f\x7f]/.test(value)) fail('BROWSER_SEARCH_QUERY_INVALID');
  const query = value.trim();
  if (!query || query.length > 512) fail('BROWSER_SEARCH_QUERY_INVALID');
  return query;
}

export function buildPublicSearchUrl(engine, value) {
  const rule = ENGINE_RULES[engine]; if (!rule) fail('BROWSER_SEARCH_ENGINE_NOT_ALLOWLISTED');
  const url = new URL(rule.path, rule.origin); url.searchParams.set('q', normalizeBrowserSearchQuery(value));
  return url.href;
}

export function browserRequestDecision({engine, url, method, navigation, mainFrame}) {
  const rule = ENGINE_RULES[engine]; if (!rule) return 'deny';
  const u = publicUrl(url); if (!u || u.protocol !== 'https:' || !['GET', 'HEAD'].includes(method)) return 'deny';
  if (navigation && mainFrame) {
    if (!rule.hosts.includes(u.hostname)) return 'deny';
    if (u.hostname === 'consent.google.com') return 'allow'; // Observe the wall; never submit consent.
    return u.pathname === rule.path || u.pathname.startsWith('/sorry/') ? 'allow' : 'deny';
  }
  return rule.assets.some(suffix => suffixHost(u.hostname, suffix)) ? 'allow' : 'deny';
}

function externalResultUrl(value, engine) {
  try {
    let u = new URL(value);
    if (engine === 'google' && suffixHost(u.hostname, 'google.com') && u.pathname === '/url') {
      u = new URL(u.searchParams.get('q') || u.searchParams.get('url') || '');
    } else if (engine === 'bing' && suffixHost(u.hostname, 'bing.com') && u.pathname === '/ck/a') {
      const encoded = u.searchParams.get('u') || '';
      if (!encoded.startsWith('a1') || encoded.length > 12000) return null;
      u = new URL(Buffer.from(encoded.slice(2), 'base64url').toString('utf8'));
    }
    const result = publicUrl(u.href);
    if (!result || ENGINE_RULES[engine].assets.some(suffix => suffixHost(result.hostname, suffix))) return null;
    return result.href;
  } catch { return null; }
}

function boundedSources(items, engine) {
  const seen = new Set(), sources = [];
  for (const item of Array.isArray(items) ? items.slice(0, 40) : []) {
    const url = externalResultUrl(String(item?.url || ''), engine);
    const title = String(item?.title || '').trim().slice(0, 300);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url); sources.push({title, url, snippet: String(item?.snippet || '').trim().slice(0, 700)});
    if (sources.length === 5) break;
  }
  return sources;
}

// This function is serialized into the owned page. It only reads rendered document data.
function readSearchDocument(engine) {
  const visible = element => {
    if (!element) return false;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const input = [...document.querySelectorAll('textarea[name="q"], input[name="q"]')].find(visible);
  const rawSources = [];
  const links = engine === 'bing'
    ? [...document.querySelectorAll('#b_results .b_algo h2 a')]
    : [...document.querySelectorAll('#search a h3, #rso a h3')].map(h => h.closest('a'));
  for (const link of links.slice(0, 40)) {
    if (!link || !visible(link)) continue;
    const heading = link.querySelector('h3') || link;
    const block = engine === 'bing' ? link.closest('.b_algo') : link.closest('.MjjYud, [data-hveid]');
    const snippet = engine === 'bing' ? block?.querySelector('.b_caption p')?.innerText : block?.innerText;
    rawSources.push({title: heading.innerText, url: link.href, snippet: (snippet || '').slice(0, 900)});
  }
  const bodyText = (document.body?.innerText || '').slice(0, 80000);
  const challengeElement = [...document.querySelectorAll('iframe[src*="recaptcha"], iframe[src*="captcha"], #captcha, input[name="captcha"]')].some(visible);
  const consent = location.hostname === 'consent.google.com' || /before you continue to (google|bing)/i.test(bodyText);
  const challenge = challengeElement || /\/sorry(?:\/|$)/.test(location.pathname) ||
    (!rawSources.length && /unusual traffic|automated queries|verify (?:that )?you(?: are|'re) (?:a human|not a robot)|complete the captcha|checking your browser/i.test(bodyText));
  return {url: location.href, title: document.title, query: input?.value ?? null,
    queryControlVisible: !!input, visibilityState: document.visibilityState,
    rawSources, consent, challenge, documentReady: document.readyState};
}

function samePath(a, b, platform) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = path.normalize(a), right = path.normalize(b);
  return platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}
function positiveRect(bounds) {
  return !!bounds && Number.isFinite(bounds.width) && Number.isFinite(bounds.height) && bounds.width > 0 && bounds.height > 0;
}
function identitySummary(observation) {
  return {sessionId: observation.sessionId, targetId: observation.targetId, processId: observation.processId,
    windowId: observation.windowId, url: observation.url, title: observation.title, at: observation.at};
}

/**
 * There is deliberately no default dependency lookup. The trusted owner supplies the
 * existing engine and verified executable from its local binding, never from a request.
 * inspectNativeWindow is required for completion and must return a fresh native HWND /
 * process read-back. The exported Windows helper below is one existing-owner hook.
 */
export function createVisibleBrowserController({chromium, browserExecutable, browserSha256,
  inspectNativeWindow, searchEngine = 'google', timeoutMs = 25000, maxSessions = 4,
  platform = process.platform, now = () => new Date().toISOString(), uuid = () => crypto.randomUUID()} = {}) {
  if (!ENGINE_RULES[searchEngine]) fail('BROWSER_SEARCH_ENGINE_NOT_ALLOWLISTED');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000 || !Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > 8) fail('BROWSER_LIMIT_BINDING_INVALID');
  const sessions = new Map(), byRequest = new Map();
  let launchTail = Promise.resolve();

  function bindingState() {
    if (!chromium || typeof chromium.launch !== 'function') return 'BROWSER_ENGINE_UNBOUND';
    if (typeof inspectNativeWindow !== 'function') return 'BROWSER_NATIVE_WINDOW_READBACK_UNBOUND';
    if (typeof browserExecutable !== 'string' || !path.isAbsolute(browserExecutable) || !HASH.test(browserSha256 || '')) return 'BROWSER_EXECUTABLE_UNBOUND';
    try {
      const stat = fs.lstatSync(browserExecutable);
      if (!stat.isFile() || stat.isSymbolicLink()) return 'BROWSER_EXECUTABLE_INVALID';
      if (!/^(chrome(?:\.exe)?|google-chrome(?:-stable)?|Google Chrome)$/i.test(path.basename(browserExecutable))) return 'BROWSER_CHROME_EXECUTABLE_REQUIRED';
      if (sha(fs.readFileSync(browserExecutable)) !== browserSha256.toLowerCase()) return 'BROWSER_EXECUTABLE_CHANGED';
    } catch { return 'BROWSER_EXECUTABLE_UNAVAILABLE'; }
    return 'BOUND_NOT_EXECUTED';
  }
  function assertBound() { const state = bindingState(); if (state !== 'BOUND_NOT_EXECUTED') fail(state); }
  function activeCount() { return [...sessions.values()].filter(s => !s.closed && (!s.page || (!s.page.isClosed() && s.browser?.isConnected()))).length; }
  function serial(session, action) {
    const operation = session.tail.then(() => {
      if (session.closed || !session.browser?.isConnected() || session.page?.isClosed()) fail('BROWSER_OWNED_SESSION_CLOSED');
      return action();
    });
    session.tail = operation.catch(() => {}); return operation;
  }
  async function dispose(session) {
    session.closed = true;
    try { if (session.context) await session.context.close(); }
    finally { if (session.browser) await session.browser.close(); }
  }
  async function ownedWindowInventory() {
    const observations = [];
    for (const session of sessions.values()) {
      if (session.closed || !session.browser?.isConnected() || !session.page || session.page.isClosed()) continue;
      const target = await session.pageCdp.send('Target.getTargetInfo');
      const window = await session.browserCdp.send('Browser.getWindowForTarget', {targetId: session.targetId});
      const processInfo = await session.browserCdp.send('SystemInfo.getProcessInfo');
      if (target?.targetInfo?.targetId !== session.targetId || !Number.isInteger(window?.windowId) ||
        !(processInfo?.processInfo || []).some(p => p.type === 'browser' && p.id === session.processId)) fail('BROWSER_OWNED_WINDOW_INVENTORY_CHANGED');
      observations.push({id: `${session.processId}:${window.windowId}`, sessionId: session.id,
        processId: session.processId, targetId: session.targetId, windowId: window.windowId, at: now()});
    }
    return {ids: observations.map(o => o.id), observations, at: now(), scope: 'CONTROLLER_OWNED_CHROME_TARGET_WINDOWS_ONLY'};
  }
  async function createSession(requestId) {
    assertBound();
    if (activeCount() >= maxSessions) fail('BROWSER_OWNED_SESSION_LIMIT');
    const creationBeforeWindows = await ownedWindowInventory();
    const session = {id: uuid(), requestId, closed: false, tail: Promise.resolve(), currentQuery: null,
      targetId: null, processId: null, browser: null, context: null, page: null,
      blockedRequestCount: 0, blockedNavigation: null, dialogObserved: false, createdAt: now(),
      creationBeforeWindows, outcomeIds: new Set()};
    sessions.set(session.id, session);
    try {
      session.browser = await chromium.launch({executablePath: browserExecutable, headless: false,
        chromiumSandbox: true, timeout: timeoutMs, args: ['--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--new-window']});
      session.browser.on?.('disconnected', () => { session.closed = true; });
      session.context = await session.browser.newContext({viewport: null, acceptDownloads: false,
        permissions: [], serviceWorkers: 'block'});
      session.context.setDefaultTimeout(timeoutMs);
      session.context.setDefaultNavigationTimeout(timeoutMs);
      await session.context.route('**/*', async route => {
        const request = route.request();
        let mainFrame = false;
        try { mainFrame = !!session.page && request.frame() === session.page.mainFrame(); } catch {}
        const decision = browserRequestDecision({engine: searchEngine, url: request.url(), method: request.method(),
          navigation: request.isNavigationRequest(), mainFrame});
        if (decision === 'allow') return route.continue();
        session.blockedRequestCount++;
        if (mainFrame && request.isNavigationRequest()) session.blockedNavigation = {url: request.url().slice(0, 2000), at: now()};
        return route.abort('blockedbyclient');
      });
      if (typeof session.context.routeWebSocket !== 'function') fail('BROWSER_WEBSOCKET_GUARD_UNAVAILABLE');
      await session.context.routeWebSocket('**/*', ws => ws.close({code: 1008, reason: 'Public search operation has no WebSocket authority'}));
      session.page = await session.context.newPage();
      session.page.on?.('dialog', dialog => { session.dialogObserved = true; void dialog.dismiss().catch(() => {}); });
      session.page.on?.('popup', page => { void page.close().catch(() => {}); });
      session.page.on?.('download', download => { void download.cancel().catch(() => {}); });
      session.pageCdp = await session.context.newCDPSession(session.page);
      session.browserCdp = await session.browser.newBrowserCDPSession();
      const target = await session.pageCdp.send('Target.getTargetInfo');
      session.targetId = target?.targetInfo?.targetId;
      const processes = await session.browserCdp.send('SystemInfo.getProcessInfo');
      const owners = (processes?.processInfo || []).filter(p => p.type === 'browser');
      if (typeof session.targetId !== 'string' || !session.targetId || owners.length !== 1 || !Number.isInteger(owners[0].id) || owners[0].id < 1) fail('BROWSER_NATIVE_PROCESS_TARGET_UNRESOLVED');
      session.processId = owners[0].id;
      return session;
    } catch (error) {
      await dispose(session).catch(() => {});
      throw error;
    }
  }
  async function ownedFor(requestId, sessionId, forceNew = false) {
    identifier(requestId, 'BROWSER_REQUEST_ID_REQUIRED');
    if (sessionId !== undefined) {
      identifier(sessionId, 'BROWSER_SESSION_ID_INVALID');
      const session = sessions.get(sessionId);
      if (!session || session.requestId !== requestId) fail('BROWSER_REQUEST_SESSION_MISMATCH');
      return session;
    }
    if (forceNew || !byRequest.has(requestId)) {
      const pending = launchTail.then(() => createSession(requestId));
      launchTail = pending.catch(() => {});
      byRequest.set(requestId, pending);
      pending.catch(() => { if (byRequest.get(requestId) === pending) byRequest.delete(requestId); });
    }
    return byRequest.get(requestId);
  }
  async function restoreTarget(session) {
    const window = await session.browserCdp.send('Browser.getWindowForTarget', {targetId: session.targetId});
    if (window?.bounds?.windowState === 'minimized') await session.browserCdp.send('Browser.setWindowBounds', {windowId: window.windowId, bounds: {windowState: 'normal'}});
    await session.page.bringToFront();
  }
  async function observe(session, expectedQuery) {
    const began = now();
    const firstUrl = session.page.url();
    const document = await session.page.evaluate(readSearchDocument, searchEngine);
    const target = await session.pageCdp.send('Target.getTargetInfo');
    const window = await session.browserCdp.send('Browser.getWindowForTarget', {targetId: session.targetId});
    const bounds = await session.browserCdp.send('Browser.getWindowBounds', {windowId: window.windowId});
    const processInfo = await session.browserCdp.send('SystemInfo.getProcessInfo');
    const version = await session.browserCdp.send('Browser.getVersion');
    const native = await inspectNativeWindow({processId: session.processId, executable: browserExecutable,
      targetId: session.targetId, windowId: window.windowId, pageTitle: document.title});
    const finalUrl = session.page.url();
    const browserAlive = session.browser.isConnected() && !session.page.isClosed();
    const sources = boundedSources(document.rawSources, searchEngine);
    const processMatches = (processInfo?.processInfo || []).filter(p => p.type === 'browser' && p.id === session.processId).length === 1;
    const nativeAt = Date.parse(native?.at || ''), observedTime = Date.parse(now());
    const nativeFresh = Number.isFinite(nativeAt) && nativeAt >= Date.parse(began) - 1000 && nativeAt <= observedTime + 1000;
    const nativeProcess = native?.processId === session.processId && samePath(native?.executable, browserExecutable, platform);
    const chromeProduct = /^Chrome\/\d+\./.test(version?.product || '');
    const candidateWindows = (Array.isArray(native?.windows) ? native.windows : []).filter(w =>
      w.processId === session.processId && (typeof w.hwnd === 'string' || Number.isInteger(w.hwnd)) && String(w.hwnd) !== '0' &&
      w.className === 'Chrome_WidgetWin_1' && w.visible === true && w.minimized === false && w.monitorAttached === true && positiveRect(w.bounds));
    const matchingWindows = document.title
      ? candidateWindows.filter(w => typeof w.title === 'string' && w.title.includes(document.title))
      : candidateWindows;
    const cdpVisible = Number.isInteger(window?.windowId) && positiveRect(bounds?.bounds) &&
      ['normal', 'maximized', 'fullscreen'].includes(bounds?.bounds?.windowState);
    const targetMatches = target?.targetInfo?.targetId === session.targetId && target?.targetInfo?.type === 'page';
    const documentStable = firstUrl === document.url && document.url === finalUrl && target?.targetInfo?.url === finalUrl;
    const visible = browserAlive && chromeProduct && cdpVisible && targetMatches && processMatches && nativeFresh && nativeProcess &&
      matchingWindows.length === 1 && document.visibilityState === 'visible';
    const parsed = (() => { try { return new URL(finalUrl); } catch { return null; } })();
    const queryExpected = expectedQuery === undefined ? session.currentQuery : expectedQuery;
    const queryFromUrl = parsed?.searchParams.get('q') ?? null;
    const queryMatched = queryExpected === null || queryExpected === undefined ? null :
      queryFromUrl === queryExpected && document.query === queryExpected && document.queryControlVisible === true;
    const providerPage = !!parsed && parsed.protocol === 'https:' && ENGINE_RULES[searchEngine].hosts.includes(parsed.hostname) && parsed.pathname === ENGINE_RULES[searchEngine].path;
    let reason = null;
    if (document.consent) reason = 'BROWSER_CONSENT_REQUIRED';
    else if (document.challenge) reason = 'BROWSER_CHALLENGE_REQUIRED';
    else if (!browserAlive || !documentStable || !targetMatches || !processMatches) reason = 'BROWSER_TARGET_CHANGED_DURING_READBACK';
    else if (!visible) reason = 'BROWSER_VISIBLE_WINDOW_NOT_VERIFIED';
    else if (session.dialogObserved) reason = 'BROWSER_DIALOG_INTERRUPTED';
    else if (queryExpected !== null && queryExpected !== undefined && !providerPage) reason = 'BROWSER_SEARCH_URL_MISMATCH';
    else if (queryExpected !== null && queryExpected !== undefined && !queryMatched) reason = 'BROWSER_SEARCH_QUERY_MISMATCH';
    else if (queryExpected !== null && queryExpected !== undefined && !document.title?.trim()) reason = 'BROWSER_SEARCH_TITLE_MISSING';
    else if (queryExpected !== null && queryExpected !== undefined && !sources.length) reason = 'BROWSER_SEARCH_RESULTS_NOT_OBSERVED';
    const result = {status: reason ? 'BLOCKED' : 'OBSERVED', reason, app: 'chrome', visible,
      sessionId: session.id, requestId: session.requestId, targetId: session.targetId,
      windowId: window.windowId, processId: session.processId, url: finalUrl,
      title: String(document.title || '').slice(0, 1000), query: document.query, queryFromUrl, queryMatched,
      searchEngine, sources, at: now(), ownedSession: true, userProfileUsed: false,
      evidence: {method: 'FRESH_DOM_CDP_AND_NATIVE_WINDOW_READBACK', beganAt: began, documentStable,
        nativeFresh, nativeProcessMatches: nativeProcess, targetMatches, processMatches, browserAlive, chromeProduct,
        cdp: {targetId: target?.targetInfo?.targetId, windowId: window.windowId, bounds: bounds?.bounds,
          product: version?.product, processId: session.processId}, native,
        windowCorrelation: 'OWNED_BROWSER_PROCESS_AND_UNIQUE_VISIBLE_PAGE_TITLE', matchingNativeWindowCount: matchingWindows.length,
        document: {visibilityState: document.visibilityState, readyState: document.documentReady,
          queryControlVisible: document.queryControlVisible, consent: document.consent, challenge: document.challenge},
        blockedRequestCount: session.blockedRequestCount, blockedNavigation: session.blockedNavigation}};
    result.evidence.documentSha256 = sha(JSON.stringify({url: result.url, title: result.title, query: result.query, sources}));
    return result;
  }

  return Object.freeze({
    describe() { return {provider: 'LEEWAY_NATIVE_HOST_COMMANDER', component: 'OWNED_VISIBLE_CHROME',
      state: bindingState(), app: 'chrome', searchEngine, activeSessions: activeCount(), maxSessions,
      scope: 'EXPLICIT_CHROME_OPEN_AND_PUBLIC_SEARCH_ONLY', persistentListener: false,
      signedInProfileAccess: false, verification: 'DOM_CDP_NATIVE_WINDOW_REQUIRED'}; },
    async openChrome(args) {
      exactObject(args, ['requestId', 'outcomeId', 'newWindow']);
      identifier(args.outcomeId, 'BROWSER_OUTCOME_ID_REQUIRED');
      if (args.newWindow !== undefined && typeof args.newWindow !== 'boolean') fail('BROWSER_NEW_WINDOW_INVALID');
      const existed = byRequest.has(args.requestId) && args.newWindow !== true;
      const session = await ownedFor(args.requestId, undefined, args.newWindow === true);
      return serial(session, async () => {
        session.outcomeIds.add(args.outcomeId);
        const beforeWindows = existed ? await ownedWindowInventory() : session.creationBeforeWindows;
        const before = existed ? identitySummary(await observe(session)) : {sessionId: null, targetId: null, processId: null, windowId: null};
        await restoreTarget(session);
        const result = await observe(session);
        const afterWindows = await ownedWindowInventory();
        return {...result, kind: 'APP_OPEN', opened: result.visible ? 'chrome' : null, outcomeId: args.outcomeId,
          newWindow: !existed, before, after: identitySummary(result),
          beforeWindowIds: beforeWindows.ids, afterWindowIds: afterWindows.ids,
          windowInventory: {scope: beforeWindows.scope, before: beforeWindows, after: afterWindows},
          executionState: result.status === 'OBSERVED' ? 'VISIBLE_BROWSER_OBSERVED' : 'BROWSER_OPEN_UNVERIFIED'};
      });
    },
    async search(args) {
      exactObject(args, ['query', 'sessionId', 'requestId', 'outcomeId']);
      const query = normalizeBrowserSearchQuery(args.query);
      identifier(args.outcomeId, 'BROWSER_OUTCOME_ID_REQUIRED');
      const session = await ownedFor(args.requestId, args.sessionId);
      return serial(session, async () => {
        session.outcomeIds.add(args.outcomeId);
        const before = identitySummary(await observe(session));
        session.blockedNavigation = null; session.dialogObserved = false;
        await restoreTarget(session);
        let navigationError = null, responseStatus = null;
        try {
          const response = await session.page.goto(buildPublicSearchUrl(searchEngine, query), {waitUntil: 'domcontentloaded', timeout: timeoutMs});
          responseStatus = response?.status() ?? null;
          await session.page.waitForFunction(engine => {
            const body = document.body?.innerText || '';
            return (engine === 'bing' ? !!document.querySelector('#b_results .b_algo h2 a') : !!document.querySelector('#search a h3, #rso a h3')) ||
              location.hostname === 'consent.google.com' || /\/sorry(?:\/|$)/.test(location.pathname) ||
              /before you continue to (google|bing)|unusual traffic|automated queries|verify (?:that )?you(?: are|'re) (?:a human|not a robot)|complete the captcha|checking your browser/i.test(body);
          }, searchEngine, {timeout: timeoutMs});
        } catch (error) { navigationError = error?.name === 'TimeoutError' ? 'BROWSER_SEARCH_TIMEOUT' : 'BROWSER_SEARCH_NAVIGATION_FAILED'; }
        session.currentQuery = query;
        const result = await observe(session, query);
        if (result.status === 'OBSERVED' && (navigationError || (responseStatus !== null && responseStatus >= 400))) {
          result.status = 'BLOCKED'; result.reason = navigationError || 'BROWSER_SEARCH_HTTP_FAILURE';
        }
        return {...result, kind: 'WEB_SEARCH', outcomeId: args.outcomeId, requestedQuery: query,
          before, after: identitySummary(result), responseStatus, navigationError,
          executionState: result.status === 'OBSERVED' ? 'SEARCH_RESULTS_OBSERVED' : 'SEARCH_NOT_VERIFIED'};
      });
    },
    async inspect(args) {
      exactObject(args, ['sessionId', 'expectedQuery', 'requestId', 'outcomeId']);
      identifier(args.sessionId, 'BROWSER_SESSION_ID_INVALID');
      const expectedQuery = args.expectedQuery === undefined ? undefined : normalizeBrowserSearchQuery(args.expectedQuery);
      const session = sessions.get(args.sessionId); if (!session) fail('BROWSER_SESSION_NOT_OWNED');
      if (args.requestId !== undefined && identifier(args.requestId, 'BROWSER_REQUEST_ID_REQUIRED') !== session.requestId) fail('BROWSER_REQUEST_SESSION_MISMATCH');
      if (args.outcomeId !== undefined && !session.outcomeIds.has(identifier(args.outcomeId, 'BROWSER_OUTCOME_ID_REQUIRED'))) fail('BROWSER_OUTCOME_NOT_OWNED');
      return serial(session, async () => ({...await observe(session, expectedQuery), kind: 'BROWSER_INSPECTION',
        ...(args.outcomeId === undefined ? {} : {outcomeId: args.outcomeId})}));
    },
    async closeOwned(args) {
      exactObject(args, ['sessionId', 'requestId']); identifier(args.sessionId, 'BROWSER_SESSION_ID_INVALID');
      const session = sessions.get(args.sessionId);
      if (!session || (args.requestId !== undefined && session.requestId !== args.requestId)) fail('BROWSER_SESSION_NOT_OWNED');
      await session.tail; if (!session.closed) await dispose(session);
      return {sessionId: session.id, requestId: session.requestId, closed: true, at: now(), scope: 'EXACT_OWNED_SESSION_ONLY'};
    },
  });
}

/** Fixed native Windows inspection; request text is never interpolated into PowerShell. */
export async function observeWindowsBrowserProcess({processId}, {timeoutMs = 6000, spawnProcess = spawn, platform = process.platform} = {}) {
  if (platform !== 'win32') fail('BROWSER_NATIVE_WINDOW_PLATFORM_UNQUALIFIED');
  if (!Number.isInteger(processId) || processId < 1 || processId > 0x7fffffff) fail('BROWSER_NATIVE_PROCESS_ID_INVALID');
  const script = String.raw`$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class LeeWayBrowserWindowReadback {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder t, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder t, int n);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
}
'@
$targetProcessId=__PROCESS_ID__
$owner=Get-Process -Id $targetProcessId -ErrorAction Stop
$windows=New-Object 'System.Collections.Generic.List[object]'
$callback=[LeeWayBrowserWindowReadback+EnumProc]{param($handle,$parameter)
  [uint32]$windowProcessId=0
  [void][LeeWayBrowserWindowReadback]::GetWindowThreadProcessId($handle,[ref]$windowProcessId)
  if($windowProcessId -eq $targetProcessId){
    $title=New-Object Text.StringBuilder 2048
    $class=New-Object Text.StringBuilder 256
    [void][LeeWayBrowserWindowReadback]::GetWindowText($handle,$title,$title.Capacity)
    [void][LeeWayBrowserWindowReadback]::GetClassName($handle,$class,$class.Capacity)
    $rect=New-Object LeeWayBrowserWindowReadback+RECT
    [void][LeeWayBrowserWindowReadback]::GetWindowRect($handle,[ref]$rect)
    $windows.Add([pscustomobject]@{hwnd=$handle.ToInt64().ToString();processId=[int]$windowProcessId;title=$title.ToString();className=$class.ToString();visible=[LeeWayBrowserWindowReadback]::IsWindowVisible($handle);minimized=[LeeWayBrowserWindowReadback]::IsIconic($handle);monitorAttached=([LeeWayBrowserWindowReadback]::MonitorFromWindow($handle,0) -ne [IntPtr]::Zero);bounds=[pscustomobject]@{left=$rect.Left;top=$rect.Top;width=($rect.Right-$rect.Left);height=($rect.Bottom-$rect.Top)}})
  }
  return $true
}
[void][LeeWayBrowserWindowReadback]::EnumWindows($callback,[IntPtr]::Zero)
[pscustomobject]@{processId=$owner.Id;executable=$owner.Path;processStartedAt=$owner.StartTime.ToUniversalTime().ToString('o');sessionId=$owner.SessionId;at=[DateTime]::UtcNow.ToString('o');windows=@($windows.ToArray());method='WIN32_ENUMWINDOWS_AND_PROCESS_READBACK'} | ConvertTo-Json -Compress -Depth 6
`.replace('__PROCESS_ID__', String(processId));
  return new Promise((resolve, reject) => {
    const child = spawnProcess('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
      {windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe']});
    let output = '', stderr = '', bytes = 0, settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => { child.kill(); finish(new Error('BROWSER_NATIVE_WINDOW_READBACK_TIMEOUT')); }, timeoutMs);
    const collect = (data, error) => {
      bytes += data.length; if (bytes > 128 * 1024) { child.kill(); finish(new Error('BROWSER_NATIVE_WINDOW_OUTPUT_LIMIT')); return; }
      if (error) stderr += data.toString('utf8'); else output += data.toString('utf8');
    };
    child.stdout.on('data', data => collect(data, false)); child.stderr.on('data', data => collect(data, true));
    child.on('error', () => finish(new Error('BROWSER_NATIVE_WINDOW_READBACK_FAILED')));
    child.on('close', code => {
      if (code !== 0) return finish(new Error('BROWSER_NATIVE_WINDOW_READBACK_FAILED'));
      try { const result = JSON.parse(output.trim()); finish(null, result); }
      catch { finish(new Error('BROWSER_NATIVE_WINDOW_READBACK_INVALID')); }
    });
  });
}
