/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.BROWSER_EXTENSION
TAG: LEEWAY.EXTENSION.V2.PORTABLE.API
5WH:
WHAT = Normalize supported extension APIs and constrain the native session protocol.
WHY = Prevent device-specific assumptions, unauthenticated courier output, and browser API drift.
WHO = Creator-authorized Device Bridge contributors.
WHERE = apps/extension/browser-polyfill.js.
WHEN = 2026-11-16.
HOW = Pure validation helpers plus browser/Chrome API wrappers; no independent authority.
LICENSE = Existing repository terms; no new license asserted.
*/
(function (scope) {
  'use strict';
  const VERSION = 2;
  const HOST = 'org.leeway.device_bridge'; // Distribution-specific native host registration, not a permission grant.
  const MAX_SELECTION = 8192;
  const MAX_TITLE = 256;
  const MAX_URL = 2048;
  const api = scope.browser || scope.chrome || null;
  const native = Boolean(scope.browser);
  function validString(x, cap) { return typeof x === 'string' && x.length > 0 && x.length <= cap; }
  function allowedPage(href) {
    try { const u = new URL(href); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; }
    catch { return false; }
  }
  function pageExcerpt(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PAGE_PAYLOAD_INVALID');
    const { href, title, selection } = value;
    if (!validString(href, MAX_URL) || !allowedPage(href)) throw new Error('PAGE_URL_REJECTED');
    if (typeof title !== 'string' || title.length > MAX_TITLE) throw new Error('PAGE_TITLE_REJECTED');
    if (!validString(selection, MAX_SELECTION)) throw new Error('SELECTION_REQUIRED_OR_TOO_LONG');
    return { href, title, selection };
  }
  function validateHelloAck(message) {
    if (!message || message.type !== 'leeway.extension.hello-ack' || message.version !== VERSION ||
        message.authenticated !== true || !validString(message.sessionId, 128) ||
        !Array.isArray(message.capabilities) || !message.capabilities.includes('page.excerpt.submit')) {
      throw new Error('NATIVE_AUTHENTICATION_NOT_QUALIFIED');
    }
    return { sessionId: message.sessionId, capabilities: message.capabilities.filter(x => validString(x, 128)) };
  }
  function call(path, ...args) {
    if (!api) return Promise.reject(new Error('BROWSER_API_UNAVAILABLE'));
    const [area, method] = path.split('.');
    if (typeof api[area]?.[method] !== 'function') return Promise.reject(new Error('BROWSER_METHOD_UNAVAILABLE'));
    const fn = api[area][method].bind(api[area]);
    if (native) return Promise.resolve().then(() => fn(...args));
    return new Promise((resolve, reject) => {
      try {
        fn(...args, result => {
          const error = api.runtime?.lastError;
          if (error) reject(new Error(error.message || 'BROWSER_API_ERROR'));
          else resolve(result);
        });
      } catch (error) { reject(error); }
    });
  }
  const contract = Object.freeze({ VERSION, HOST, MAX_SELECTION, api, allowedPage, pageExcerpt, validateHelloAck, call });
  scope.LeewayExtensionV2 = contract;
  if (typeof module !== 'undefined' && module.exports) module.exports = contract;
})(typeof globalThis !== 'undefined' ? globalThis : this);
