(() => {
  if (globalThis.__LEEWAY_FLOATING_TABLET__ || !document.documentElement) return;
  globalThis.__LEEWAY_FLOATING_TABLET__ = true;
  const host = document.createElement('div');
  host.id = 'leeway-agent-virtual-tablet-host';
  host.style.cssText = 'all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647';
  const root = host.attachShadow({ mode: 'closed' });
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = 'Agent Lee';
  button.setAttribute('aria-label', 'Open LeeWay Agent Virtual Tablet');
  button.style.cssText = 'font:600 14px system-ui;color:#fff;background:#062f45;border:1px solid #65d8ff;border-radius:999px;padding:11px 16px;box-shadow:0 7px 24px #0007;cursor:pointer';
  const status = document.createElement('span');
  status.style.cssText = 'display:block;color:#dff8ff;background:#062f45;font:12px system-ui;padding:5px 9px;border-radius:8px;margin-top:6px;max-width:220px';
  status.textContent = 'Local bridge awaiting session';
  button.addEventListener('click', () => globalThis.leewayBrowser.raw.runtime.sendMessage({
    type: 'TABLET_ACTION', action: 'OPEN', pageOrigin: location.origin, requestedUtc: new Date().toISOString()
  }, response => { status.textContent = response?.ok ? 'Connected to local governed mesh' : 'Local bridge offline'; }));
  window.addEventListener('leeway-tablet-host-message', event => {
    const value = event.detail?.message;
    if (typeof value === 'string' && value.length <= 240) status.textContent = value;
  });
  root.append(button, status); document.documentElement.append(host);
})();
