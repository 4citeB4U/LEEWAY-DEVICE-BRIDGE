// ==UserScript==
// @name LeeWay Sovereign Browser Courier
// @version 2.0.0
// @match http://*/*
// @match https://*/*
// @grant none
// ==/UserScript==
(() => {
  if (globalThis.__LEEWAY_USER_SCRIPT_BRIDGE__) return;
  globalThis.__LEEWAY_USER_SCRIPT_BRIDGE__ = true;
  const token = localStorage.getItem('leeway.browser.session');
  if (!token || token.length < 32) return;
  const socket = new WebSocket('ws://127.0.0.1:4280/mesh');
  socket.onopen = () => socket.send(JSON.stringify({ type:'BROWSER_NODE_HELLO', sessionToken:token,
    extensionId:'userscript-owner-session', userAgent:navigator.userAgent, timestamp:new Date().toISOString() }));
  socket.onmessage = event => {
    let message; try { message=JSON.parse(event.data); } catch { return; }
    if (message?.type !== 'COURIER_OBSERVE' || typeof message.requestId !== 'string') return;
    socket.send(JSON.stringify({ type:'COURIER_PAGE_CONTEXT', requestId:message.requestId,
      url:location.href.slice(0,2048),title:document.title.slice(0,512),selection:String(getSelection()||'').slice(0,16384),observedUtc:new Date().toISOString() }));
  };
})();
