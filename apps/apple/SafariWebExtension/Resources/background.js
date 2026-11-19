importScripts('browser-polyfill.js');
(function (scope) {
  'use strict';
  const B = scope.LeeWaySafari;
  if (!B?.api) return;
  let sessionId = null;
  function validAck(message, helloId) {
    return message?.type === 'leeway.extension.hello-ack' && message.version === 3 &&
      message.helloId === helloId && message.authenticated === true &&
      typeof message.sessionId === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(message.sessionId) &&
      Array.isArray(message.capabilities) && message.capabilities.includes('page.excerpt.submit');
  }
  async function connect() {
    const helloId = crypto.randomUUID();
    const reply = await B.call('runtime.sendNativeMessage', B.HOST, {
      type: 'leeway.extension.hello', version: 3, helloId, requestedCapabilities: ['page.excerpt.submit']
    });
    if (!validAck(reply, helloId)) throw new Error('NATIVE_AUTHENTICATION_NOT_QUALIFIED');
    sessionId = reply.sessionId;
    return { connected: true, authority: 'NATIVE_HOST_ONLY', execution: 'NOT_ASSERTED' };
  }
  async function share(payload) {
    if (!sessionId) throw new Error('NATIVE_HOST_NOT_AUTHENTICATED');
    const requestId = crypto.randomUUID();
    const reply = await B.call('runtime.sendNativeMessage', B.HOST, {
      type: 'leeway.extension.page-excerpt', version: 3, requestId, sessionId, excerpt: B.excerpt(payload)
    });
    if (reply?.type !== 'leeway.extension.receipt' || reply.requestId !== requestId || reply.sessionId !== sessionId || reply.accepted !== true) throw new Error('NATIVE_REQUEST_REJECTED');
    return { acknowledged: true, state: reply.code || 'NATIVE_HOST_ACK_NOT_VERITAS', authority: 'NATIVE_HOST_ACK_NOT_VERITAS' };
  }
  B.api.runtime.onMessage.addListener((request, sender, respond) => {
    if (!request || sender?.id !== B.api.runtime.id || !/^https?:/.test(sender?.tab?.url || '')) return false;
    const action = request.type === 'LEEWAY_CONNECT' ? connect()
      : request.type === 'LEEWAY_STATUS' ? Promise.resolve({ connected: Boolean(sessionId), authority: 'NATIVE_HOST_ONLY', execution: 'NOT_ASSERTED' })
      : request.type === 'LEEWAY_DISCONNECT' ? Promise.resolve().then(() => { sessionId = null; return { connected: false }; })
      : request.type === 'LEEWAY_SHARE_SELECTION' ? share(request.payload) : null;
    if (!action) return false;
    action.then(result => respond({ ok: true, result }), error => respond({ ok: false, error: String(error?.message || error).slice(0, 256) }));
    return true;
  });
  B.api.action.onClicked.addListener(tab => {
    if (Number.isInteger(tab?.id) && /^https?:/.test(tab.url || '')) {
      void B.call('scripting.executeScript', { target: { tabId: tab.id }, files: ['browser-polyfill.js', 'content-courier.js', 'floating-tablet.js'] });
    }
  });
})(globalThis);
