/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION
TAG: LEEWAY.EXTENSION.V2.CONTENT_COURIER
5WH:
WHAT = Collect only user-selected browser text after an explicit local UI action.
WHY = Prevent ambient collection of chats, passwords, cookies, and other page state.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = apps/extension/content-courier.js
WHEN = 2026-11-16.
HOW = Bound selection, normalize site category, and send a typed observation.
LICENSE = Not asserted; existing repository terms govern.
*/
(() => {
  'use strict';
  if (globalThis.__leewayCourierV2) return;
  const MAX_SELECTION = 4096;
  function siteCategory(hostname) {
    const h = hostname.toLowerCase();
    if (h === 'chatgpt.com' || h.endsWith('.chatgpt.com')) return 'CHATGPT';
    if (h === 'gemini.google.com') return 'GEMINI';
    if (h === 'notebooklm.google.com') return 'NOTEBOOKLM';
    return 'WEB';
  }
  function captureSelection() {
    if (!/^https?:$/.test(location.protocol)) throw new Error('UNSUPPORTED_PAGE_SCHEME');
    const selected = String(globalThis.getSelection?.() || '').trim();
    if (!selected) throw new Error('NO_TEXT_SELECTED');
    if (selected.length > MAX_SELECTION) throw new Error('SELECTION_TOO_LONG');
    return {
      protocolVersion: 2,
      category: siteCategory(location.hostname),
      origin: location.origin,
      pageTitle: String(document.title || '').slice(0, 160),
      selectedText: selected,
      capturedAt: new Date().toISOString(),
      attribution: 'USER_SELECTION_ONLY',
      interaction: 'READ_ONLY'
    };
  }
  Object.defineProperty(globalThis, '__leewayCourierV2', { value: Object.freeze({ captureSelection }), configurable: false });
})();
