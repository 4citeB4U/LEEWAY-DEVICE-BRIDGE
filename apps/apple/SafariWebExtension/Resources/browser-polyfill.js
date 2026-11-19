(function (scope) {
  'use strict';
  const api = scope.browser || scope.chrome || null;
  const HOST = 'com.leewayindustries.device_bridge';
  function call(path, ...args) {
    const [area, method] = path.split('.');
    if (!api?.[area]?.[method]) return Promise.reject(new Error('BROWSER_METHOD_UNAVAILABLE'));
    const fn = api[area][method].bind(api[area]);
    if (scope.browser) return Promise.resolve().then(() => fn(...args));
    return new Promise((resolve, reject) => fn(...args, result => api.runtime?.lastError ? reject(new Error(api.runtime.lastError.message)) : resolve(result)));
  }
  function excerpt(value) {
    const { href, title, selection } = value || {};
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol) || !selection?.trim() || href.length > 2048 || title.length > 256 || selection.length > 8192) throw new Error('PAGE_PAYLOAD_INVALID');
    return { href, title, selection: selection.trim() };
  }
  scope.LeeWaySafari = Object.freeze({ api, HOST, call, excerpt });
})(globalThis);
