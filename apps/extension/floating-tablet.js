/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION
TAG: LEEWAY.EXTENSION.V2.FLOATING_TABLET
5WH:
WHAT = Display an opt-in browser courier panel without controlling the host page.
WHY = Make observation scope and live permission status visible to the user.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = apps/extension/floating-tablet.js
WHEN = 2026-11-16.
HOW = Shadow DOM isolation, explicit click, bounded capture and fail-closed status.
LICENSE = Not asserted; existing repository terms govern.
*/
(() => {
  'use strict';
  if (document.getElementById('leeway-extension-v2-host')) return;
  const host = document.createElement('div');
  host.id = 'leeway-extension-v2-host';
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647';
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `:host{all:initial}.panel{font:13px/1.45 system-ui,sans-serif;width:260px;border:1px solid #5b718c;border-radius:12px;background:#101e30;color:#edf5ff;box-shadow:0 7px 20px #0005;padding:12px}header{display:flex;justify-content:space-between;align-items:center;font-weight:700;margin-bottom:7px}button{background:#2e72bf;color:white;border:0;border-radius:7px;padding:7px 10px;cursor:pointer}button:focus-visible{outline:2px solid white}p{margin:7px 0;font-size:12px}#state{overflow-wrap:anywhere}`;
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'LeeWay Browser Courier');
  const header = document.createElement('header');
  const title = document.createElement('span');
  title.textContent = 'LeeWay Browser Courier';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.setAttribute('aria-label', 'Close LeeWay panel');
  close.addEventListener('click', () => host.remove());
  header.append(title, close);
  const description = document.createElement('p');
  description.textContent = 'Select text on this page, then explicitly send it to your installed LeeWay Node. No automatic page collection.';
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = 'Send selected text';
  const state = document.createElement('p');
  state.id = 'state';
  state.setAttribute('role', 'status');
  state.textContent = 'No device permission or live connection established.';
  submit.addEventListener('click', async () => {
    try {
      submit.disabled = true;
      const snapshot = globalThis.__leewayCourierV2.captureSelection();
      const result = await globalThis.LeewayBrowser.sendMessage({type:'leeway.observation.submit', snapshot});
      state.textContent = result?.ok === true ? 'Delivered to local LeeWay Node for governed processing.' : `Not delivered: ${result?.error || 'BRIDGE_NOT_ADMITTED'}`;
    } catch (err) {
      state.textContent = `Not delivered: ${/^[A-Z_]+$/.test(err?.message || '') ? err.message : 'COURIER_FAILURE'}`;
    } finally { submit.disabled = false; }
  });
  panel.append(header, description, submit, state);
  root.append(style, panel);
  (document.body || document.documentElement).append(host);
})();
