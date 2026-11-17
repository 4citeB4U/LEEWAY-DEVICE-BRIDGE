(() => {
  const bridge = globalThis.leewayBrowser;
  if (!bridge) throw new Error('LEEWAY_BROWSER_API_UNAVAILABLE');
  const api = bridge.raw;
  const NATIVE_HOST = 'com.leewayindustries.device_bridge';
  const WS_URL = 'ws://127.0.0.1:4280/mesh';
  const PAGE_MESSAGES = new Set([
    'COURIER_SELECTION',
    'COURIER_PAGE_CONTEXT',
    'COURIER_COMPOSER_OBSERVE_RESULT',
    'COURIER_COMPOSER_INPUT_RESULT',
    'COURIER_COMPOSER_SUBMIT_RESULT',
    'COURIER_RESPONSE_READ_RESULT',
    'COURIER_COMPOSER_RESULT',
    'TABLET_ACTION'
  ]);
  const HOST_COMMANDS = new Set([
    'COURIER_OBSERVE',
    'COURIER_COMPOSER_OBSERVE',
    'COURIER_COMPOSER_INPUT',
    'COURIER_COMPOSER_SUBMIT',
    'COURIER_RESPONSE_READ',
    'TABLET_STATUS',
    'TABLET_MESSAGE'
  ]);
  let nativePort = null, socket = null, session = null, reconnectTimer = null;

  const bounded = value => {
    const text = JSON.stringify(value);
    return text.length <= 65_536 ? value : null;
  };
  const validSession = value => value && typeof value.sessionToken === 'string' && value.sessionToken.length >= 32 &&
    value.wsUrl === WS_URL && Number.isFinite(Date.parse(value.expiresUtc)) && Date.parse(value.expiresUtc) > Date.now();

  function connectSocket() {
    if (!validSession(session) || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;
    socket = new WebSocket(WS_URL);
    socket.onopen = () => socket.send(JSON.stringify({
      type: 'BROWSER_NODE_HELLO', sessionToken: session.sessionToken,
      extensionId: api.runtime.id, userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
    }));
    socket.onmessage = async event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (!message || !HOST_COMMANDS.has(message.type) || typeof message.requestId !== 'string' || !bounded(message)) return;
      const [tab] = await bridge.tabsQuery({ active: true, currentWindow: true });
      if (!Number.isInteger(tab?.id)) return;
      const pageResult = await bridge.tabsSend(tab.id, message).catch(() => null);
      if (pageResult && PAGE_MESSAGES.has(pageResult.type) && pageResult.requestId === message.requestId && bounded(pageResult)) {
        socket.send(JSON.stringify({ ...pageResult, tabId: tab.id, frameId: 0 }));
      }
    };
    socket.onclose = () => { socket = null; if (validSession(session)) reconnectTimer = setTimeout(connectSocket, 3_000); };
    socket.onerror = () => { try { socket.close(); } catch {} };
  }

  function connectNative() {
    try { nativePort = api.runtime.connectNative(NATIVE_HOST); }
    catch { nativePort = null; return; }
    nativePort.onMessage.addListener(message => {
      if (message?.type !== 'LEEWAY_BROWSER_SESSION' || !validSession(message)) return;
      session = Object.freeze({ sessionToken: message.sessionToken, wsUrl: message.wsUrl, expiresUtc: message.expiresUtc });
      connectSocket();
    });
    nativePort.onDisconnect.addListener(() => {
      nativePort = null; session = null; clearTimeout(reconnectTimer); try { socket?.close(); } catch {}
      setTimeout(connectNative, 5_000);
    });
    nativePort.postMessage({ type: 'LEEWAY_BROWSER_SESSION_REQUEST', extensionId: api.runtime.id });
  }

  api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const sameExtension = sender?.id === api.runtime.id;
    if (!sameExtension || !request || !PAGE_MESSAGES.has(request.type) || !bounded(request)) {
      sendResponse({ ok: false, error: 'BROWSER_MESSAGE_REJECTED' }); return false;
    }
    if (socket?.readyState !== WebSocket.OPEN || !validSession(session)) {
      sendResponse({ ok: false, error: 'LOCAL_DAEMON_OFFLINE' }); return false;
    }
    socket.send(JSON.stringify({ ...request, tabId: sender.tab?.id ?? null, frameId: sender.frameId ?? 0 }));
    sendResponse({ ok: true, routed: 'LOCAL_GOVERNED_MESH' });
    return false;
  });

  connectNative();
})();
