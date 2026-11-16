/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.BROWSER_EXTENSION
TAG: LEEWAY.EXTENSION.V2.SESSION.COURIER
5WH:
WHAT = Bridge user-initiated page excerpts to an authenticated native Device Bridge host.
WHY = Keep browser content outside owner credentials, Runtime/Formula authority, and device execution.
WHO = Creator-authorized Device Bridge contributors.
WHERE = apps/extension/background.js.
WHEN = 2026-11-16.
HOW = MV3 event-driven worker; verify native hello-ack and correlate bounded acknowledgements.
LICENSE = Existing repository terms; no new license asserted.
*/
(function (scope) {
  'use strict';
  if (!scope.LeewayExtensionV2 && typeof importScripts === 'function') importScripts('browser-polyfill.js');
  const B = scope.LeewayExtensionV2;
  if (!B?.api) return;
  const api = B.api;
  let port = null;
  let session = null;
  let connectPending = null;
  const awaiting = new Map();
  const timeoutMs = 8000;
  function reset(reason) {
    const was = port;
    port = null; session = null; connectPending = null;
    for (const [, pending] of awaiting) { clearTimeout(pending.timer); pending.reject(new Error(reason)); }
    awaiting.clear();
    try { was?.disconnect(); } catch { /* already closed */ }
  }
  function status() { return { connected: Boolean(port && session), host: B.HOST, authority: 'NATIVE_HOST_ONLY', verified: Boolean(session) }; }
  function connect() {
    if (port && session) return Promise.resolve(status());
    if (connectPending) return connectPending;
    connectPending = new Promise((resolve, reject) => {
      let current;
      try { current = api.runtime.connectNative(B.HOST); }
      catch (error) { connectPending = null; reject(new Error('NATIVE_HOST_UNAVAILABLE: ' + String(error.message || error))); return; }
      port = current;
      const timer = setTimeout(() => {
        if (port === current && !session) { reset('NATIVE_HANDSHAKE_TIMEOUT'); reject(new Error('NATIVE_HANDSHAKE_TIMEOUT')); }
      }, timeoutMs);
      current.onMessage.addListener(message => {
        if (message?.type === 'leeway.extension.hello-ack') {
          clearTimeout(timer);
          try { session = B.validateHelloAck(message); connectPending = null; resolve(status()); }
          catch (error) { reset('NATIVE_AUTHENTICATION_NOT_QUALIFIED'); reject(error); }
          return;
        }
        if (message?.type !== 'leeway.extension.receipt' || !message.requestId) return;
        const item = awaiting.get(message.requestId);
        if (!item || message.sessionId !== session?.sessionId) return;
        awaiting.delete(message.requestId); clearTimeout(item.timer);
        if (message.accepted !== true) item.reject(new Error('NATIVE_REQUEST_REJECTED'));
        else item.resolve({ accepted: true, requestId: message.requestId, authority: 'NATIVE_HOST_ACK_NOT_VERITAS' });
      });
      current.onDisconnect.addListener(() => {
        const reason = api.runtime.lastError?.message || 'NATIVE_HOST_DISCONNECTED';
        clearTimeout(timer);
        if (!session) reject(new Error(reason));
        reset('NATIVE_HOST_DISCONNECTED');
      });
      try { current.postMessage({ type: 'leeway.extension.hello', version: B.VERSION, requestedCapabilities: ['page.excerpt.submit'] }); }
      catch (error) { clearTimeout(timer); reset('NATIVE_HELLO_SEND_FAILED'); reject(error); }
    });
    return connectPending;
  }
  function submit(payload) {
    if (!port || !session) return Promise.reject(new Error('NATIVE_HOST_NOT_AUTHENTICATED'));
    let excerpt;
    try { excerpt = B.pageExcerpt(payload); } catch (error) { return Promise.reject(error); }
    if (awaiting.size >= 16) return Promise.reject(new Error('TOO_MANY_PENDING_REQUESTS'));
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { awaiting.delete(requestId); reject(new Error('NATIVE_RECEIPT_TIMEOUT')); }, timeoutMs);
      awaiting.set(requestId, { resolve, reject, timer });
      try { port.postMessage({ type: 'leeway.extension.page-excerpt', version: B.VERSION, requestId,
        sessionId: session.sessionId, excerpt }); }
      catch (error) { clearTimeout(timer); awaiting.delete(requestId); reject(error); }
    });
  }
  function authorizedSender(sender, payload) {
    if (sender?.id !== api.runtime.id || !sender?.tab?.url) return false;
    if (!B.allowedPage(sender.tab.url)) return false;
    if (payload?.href) {
      try { return new URL(payload.href).origin === new URL(sender.tab.url).origin; }
      catch { return false; }
    }
    return true;
  }
  api.runtime.onMessage.addListener((request, sender, respond) => {
    if (!request || typeof request !== 'object' || !authorizedSender(sender, request.payload)) return false;
    const op = request.type;
    if (!['LEEWAY_V2_STATUS', 'LEEWAY_V2_CONNECT', 'LEEWAY_V2_DISCONNECT', 'LEEWAY_V2_SHARE_SELECTION'].includes(op)) return false;
    const task = op === 'LEEWAY_V2_STATUS' ? Promise.resolve(status())
      : op === 'LEEWAY_V2_CONNECT' ? connect()
      : op === 'LEEWAY_V2_DISCONNECT' ? Promise.resolve().then(() => { reset('USER_DISCONNECTED'); return status(); })
      : submit(request.payload);
    task.then(result => respond({ ok: true, result }), error => respond({ ok: false, error: String(error?.message || error).slice(0, 256) }));
    return true;
  });
  api.action.onClicked.addListener(async tab => {
    if (!tab?.id || !B.allowedPage(tab.url)) return;
    try { await B.call('scripting.executeScript', { target: { tabId: tab.id }, files: ['browser-polyfill.js', 'content-courier.js', 'floating-tablet.js'] }); }
    catch (error) { console.warn('LeeWay extension injection denied:', String(error.message || error)); }
  });
  scope.LeewayExtensionBackground = { status, authorizedSender }; // inspection/logic tests, no runtime credential export
})(typeof globalThis !== 'undefined' ? globalThis : this);
