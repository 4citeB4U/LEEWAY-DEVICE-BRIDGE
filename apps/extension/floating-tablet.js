/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.BROWSER_EXTENSION
TAG: LEEWAY.EXTENSION.V2.FLOATING.TABLET
5WH:
WHAT = Show a bounded user control surface for an enrolled Device Bridge native host.
WHY = Require visible human interaction before any content leaves the tab.
WHO = Creator-authorized Device Bridge contributors.
WHERE = apps/extension/floating-tablet.js.
WHEN = 2026-11-16.
HOW = One closed-shadow, accessible panel with connect, share-selection, disconnect and close.
LICENSE = Existing repository terms; no new license asserted.
*/
(function (scope) {
  'use strict';
  if (scope.__LEEWAY_TABLET_V2__) { scope.__LEEWAY_TABLET_V2__.remove(); scope.__LEEWAY_TABLET_V2__ = null; return; }
  if (!scope.LeewayExtensionV2 || !scope.__LEEWAY_COURIER_V2__) return;
  const document = scope.document;
  const host = document.createElement('div');
  host.setAttribute('data-leeway-extension-v2', '');
  Object.assign(host.style, { position:'fixed', right:'16px', bottom:'16px', zIndex:'2147483647' });
  const root = host.attachShadow({ mode:'closed' });
  const styles = document.createElement('style');
  styles.textContent = `:host{all:initial}section{width:300px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:16px;background:#101827;color:#f4f6fa;font:14px/1.45 system-ui,sans-serif;border:1px solid #5d6c85;border-radius:14px;box-shadow:0 10px 35px #0008}h2{font:600 16px system-ui;margin:0 0 8px}p{margin:6px 0 12px}button{border:1px solid #92aac7;background:#253551;color:#fff;border-radius:7px;padding:7px 10px;cursor:pointer;margin:3px}button:hover,button:focus-visible{background:#3d5376}button:focus-visible{outline:3px solid #fff}small{display:block;color:#c8d4e7}#status{min-height:36px;overflow-wrap:anywhere}#close{float:right}`;
  const panel = document.createElement('section'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'LeeWay Agent Tablet connection');
  const close = document.createElement('button'); close.textContent = 'Close'; close.id = 'close'; close.setAttribute('aria-label','Close LeeWay panel');
  const title = document.createElement('h2'); title.textContent = 'LeeWay Agent Tablet';
  const context = document.createElement('small'); context.textContent = 'Device Bridge / authenticated native host';
  const status = document.createElement('p'); status.id = 'status'; status.setAttribute('role','status'); status.textContent = 'Not connected';
  const connect = document.createElement('button'); connect.textContent = 'Connect';
  const share = document.createElement('button'); share.textContent = 'Share selected text';
  const disconnect = document.createElement('button'); disconnect.textContent = 'Disconnect';
  const hint = document.createElement('small'); hint.textContent = 'Only text you select and explicitly share is sent. No page monitoring.';
  panel.append(close,title,context,status,connect,share,disconnect,hint); root.append(styles,panel);
  document.documentElement.appendChild(host);
  scope.__LEEWAY_TABLET_V2__ = host;
  function send(type,payload) {
    return scope.LeewayExtensionV2.call('runtime.sendMessage',{type,payload});
  }
  function show(text) { status.textContent = text; }
  function outcome(response,success) {
    if (response?.ok) show(success);
    else show(response?.error || 'Request denied');
  }
  close.addEventListener('click',()=>{host.remove();scope.__LEEWAY_TABLET_V2__=null;});
  connect.addEventListener('click',async()=>{show('Connecting to enrolled native host…');try{outcome(await send('LEEWAY_V2_CONNECT'),'Host session authenticated');}catch(e){show(String(e.message||e));}});
  disconnect.addEventListener('click',async()=>{try{outcome(await send('LEEWAY_V2_DISCONNECT'),'Disconnected');}catch(e){show(String(e.message||e));}});
  share.addEventListener('click',async()=>{
    let payload;
    try{payload=scope.__LEEWAY_COURIER_V2__.selectedExcerpt();}
    catch(e){show('Select text on this page before sharing.');return;}
    show('Submitting selected text…');
    try{outcome(await send('LEEWAY_V2_SHARE_SELECTION',payload),'Native host acknowledged receipt (not a Veritas verdict)');}
    catch(e){show(String(e.message||e));}
  });
  send('LEEWAY_V2_STATUS').then(r=>{if(r?.ok)show(r.result.connected?'Connected to native host':'Not connected');},()=>{});
})(typeof window !== 'undefined' ? window : globalThis);
