(function (scope) {
  'use strict';
  if (scope.__LEEWAY_PANEL__) { scope.__LEEWAY_PANEL__.remove(); scope.__LEEWAY_PANEL__ = null; return; }
  if (!scope.LeeWaySafari || !scope.__LEEWAY_COURIER__) return;
  const host = document.createElement('div');
  Object.assign(host.style, { position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647' });
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = '<style>section{width:280px;padding:14px;background:#0b1724;color:#eef8ff;font:14px system-ui;border:1px solid #4c7892;border-radius:14px}button{margin:3px;padding:8px;border-radius:7px;border:1px solid #6790ab;background:#17364c;color:white}small{display:block;color:#bcd4e1}</style><section role="dialog" aria-label="LeeWay"><b>LeeWay</b><p id="s">Not connected</p><button id="c">Connect</button><button id="x">Stage selection</button><button id="d">Disconnect</button><small>Only text you select and explicitly stage is shared with the LeeWay iPhone app.</small></section>';
  document.documentElement.appendChild(host); scope.__LEEWAY_PANEL__ = host;
  const status = root.querySelector('#s'); const send = (type, payload) => scope.LeeWaySafari.call('runtime.sendMessage', { type, payload });
  root.querySelector('#c').onclick = async () => { const r = await send('LEEWAY_CONNECT'); status.textContent = r.ok ? 'Authenticated native host session' : r.error; };
  root.querySelector('#d').onclick = async () => { const r = await send('LEEWAY_DISCONNECT'); status.textContent = r.ok ? 'Disconnected' : r.error; };
  root.querySelector('#x').onclick = async () => { try { const r = await send('LEEWAY_SHARE_SELECTION', scope.__LEEWAY_COURIER__.selected()); status.textContent = r.ok ? 'Staged in LeeWay; not an execution receipt.' : r.error; } catch { status.textContent = 'Select text before staging.'; } };
})(window);
