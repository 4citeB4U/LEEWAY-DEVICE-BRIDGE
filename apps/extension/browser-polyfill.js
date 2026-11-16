/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION
TAG: LEEWAY.EXTENSION.V2.BROWSER_ADAPTER
5WH:
WHAT = Expose bounded browser messaging across WebExtensions API namespaces.
WHY = Keep a single courier contract without assuming browser-specific Promise support.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = apps/extension/browser-polyfill.js
WHEN = 2026-11-16.
HOW = Normalize a single sendMessage call without manufacturing grants or credentials.
LICENSE = Not asserted; existing repository terms govern.
*/
(() => {
  'use strict';
  if (globalThis.LeewayBrowser) return;
  const native = globalThis.browser || globalThis.chrome;
  const sendMessage = (value) => new Promise((resolve, reject) => {
    if (!native?.runtime?.sendMessage) return reject(new Error('BROWSER_RUNTIME_UNAVAILABLE'));
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      const err = globalThis.chrome?.runtime?.lastError;
      if (err) reject(new Error('BROWSER_MESSAGE_FAILED'));
      else resolve(result);
    };
    try {
      if (globalThis.browser?.runtime?.sendMessage) {
        Promise.resolve(globalThis.browser.runtime.sendMessage(value)).then(done, () => {
          if (!settled) { settled = true; reject(new Error('BROWSER_MESSAGE_FAILED')); }
        });
        return;
      }
      const maybe = native.runtime.sendMessage(value, done);
      if (maybe && typeof maybe.then === 'function') maybe.then(done, () => {
        if (!settled) { settled = true; reject(new Error('BROWSER_MESSAGE_FAILED')); }
      });
    } catch (_) {
      if (!settled) { settled = true; reject(new Error('BROWSER_MESSAGE_FAILED')); }
    }
  });
  Object.defineProperty(globalThis, 'LeewayBrowser', { value: Object.freeze({ sendMessage }), configurable: false });
})();
