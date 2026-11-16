/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.BROWSER_EXTENSION
TAG: LEEWAY.EXTENSION.V2.USER.COURIER
5WH:
WHAT = Prepare explicit user-selected text for the existing Device Bridge.
WHY = Never scrape or exfiltrate a page silently.
WHO = Creator-authorized Device Bridge contributors.
WHERE = apps/extension/content-courier.js.
WHEN = 2026-11-16.
HOW = Isolated content script, user-selection only, bounded to 8192 characters.
LICENSE = Existing repository terms; no new license asserted.
*/
(function (scope) {
  'use strict';
  if (scope.__LEEWAY_COURIER_V2__) return;
  const B = scope.LeewayExtensionV2;
  if (!B) return;
  scope.__LEEWAY_COURIER_V2__ = Object.freeze({
    selectedExcerpt() {
      const selection = String(scope.getSelection?.() || '').trim();
      return B.pageExcerpt({ href: scope.location.href, title: scope.document.title.slice(0, 256), selection });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
