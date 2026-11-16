/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION
TAG: LEEWAY.EXTENSION.V2.BACKGROUND_BRIDGE
5WH:
WHAT = Forward bounded owner-selected browser observations to the installed LeeWay native host.
WHY = Prevent the extension from becoming an ungoverned runtime or privileged device control plane.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = apps/extension/background.js
WHEN = 2026-11-16.
HOW = Active-tab gesture, sender/shape checks, one-shot Native Messaging and explicit transport errors.
LICENSE = Not asserted; existing repository terms govern.
*/
(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const HOST = 'com.leeway.devicebridge';
  const MAX_TEXT = 4096;
  const MAX_TITLE = 160;
  const MAX_NATIVE_LATENCY_MS = 12000;
  if (!api?.runtime || !api?.action || !api?.scripting) return;
  function errorCode(error) {
    return /^[A-Z][A-Z0-9_]{0,95}$/.test(error?.message || '') ? error.message : 'NATIVE_HOST_UNAVAILABLE';
  }
  function validateSnapshot(s, sender) {
    if (!s || typeof s !== 'object' || Array.isArray(s) || s.protocolVersion !== 2) throw new Error('OBSERVATION_INVALID');
    if (typeof s.selectedText !== 'string' || !s.selectedText.trim() || s.selectedText.length > MAX_TEXT) throw new Error('SELECTION_INVALID');
    if (typeof s.pageTitle !== 'string' || s.pageTitle.length > MAX_TITLE) throw new Error('TITLE_INVALID');
    if (typeof s.origin !== 'string' || s.origin.length > 512 || !/^https?:\/\/[^/]+$/.test(s.origin)) throw new Error('ORIGIN_INVALID');
    if (typeof sender?.url !== 'string') throw new Error('TAB_ORIGIN_UNVERIFIED');
    let actual;
    try { actual = new URL(sender.url); } catch { throw new Error('TAB_ORIGIN_UNVERIFIED'); }
    if (actual.origin !== s.origin) throw new Error('TAB_ORIGIN_MISMATCH');
    if (!['CHATGPT','GEMINI','NOTEBOOKLM','WEB'].includes(s.category)) throw new Error('CATEGORY_INVALID');
    if (s.attribution !== 'USER_SELECTION_ONLY' || s.interaction !== 'READ_ONLY') throw new Error('SCOPE_INVALID');
    if (typeof s.capturedAt !== 'string' || !Number.isFinite(Date.parse(s.capturedAt))) throw new Error('CAPTURE_TIME_INVALID');
    const age = Math.abs(Date.now() - Date.parse(s.capturedAt));
    if (age > 60000) throw new Error('CAPTURE_STALE');
    return {protocolVersion:2, selectedText:s.selectedText, pageTitle:s.pageTitle, origin:s.origin,
      category:s.category, attribution:s.attribution, interaction:s.interaction, capturedAt:s.capturedAt};
  }
  function sendNative(message) {
    return new Promise((resolve, reject) => {
      let finished = false;
      const done = (res) => {
        if (finished) return;
        finished = true; clearTimeout(timeout);
        const lastError = globalThis.chrome?.runtime?.lastError;
        if (lastError) reject(new Error('NATIVE_HOST_UNAVAILABLE'));
        else resolve(res);
      };
      const timeout = setTimeout(() => {
        if (finished) return;
        finished = true;
        reject(new Error('NATIVE_HOST_TIMEOUT'));
      }, MAX_NATIVE_LATENCY_MS);
      try {
        if (globalThis.browser?.runtime?.sendNativeMessage) {
          Promise.resolve(globalThis.browser.runtime.sendNativeMessage(HOST, message)).then(done, () => {
            if (!finished) { finished = true; clearTimeout(timeout); reject(new Error('NATIVE_HOST_UNAVAILABLE')); }
          });
          return;
        }
        const pending = api.runtime.sendNativeMessage(HOST, message, done);
        if (pending && typeof pending.then === 'function') pending.then(done, () => {
          if (!finished) { finished = true; clearTimeout(timeout); reject(new Error('NATIVE_HOST_UNAVAILABLE')); }
        });
      } catch (_) { if (!finished) { finished = true; clearTimeout(timeout); reject(new Error('NATIVE_HOST_UNAVAILABLE')); } }
    });
  }
  async function submit(raw, sender) {
    if (sender?.id !== api.runtime.id || !Number.isInteger(sender?.tab?.id)) throw new Error('SENDER_UNTRUSTED');
    const snapshot = validateSnapshot(raw, sender);
    const requestId = globalThis.crypto?.randomUUID?.();
    if (!requestId) throw new Error('CRYPTO_UNAVAILABLE');
    const result = await sendNative({type:'browser.observation.submit',version:2,requestId,tabId:sender.tab.id,snapshot});
    if (!result || result.version !== 2 || result.requestId !== requestId || result.ok !== true || result.admission !== 'ACCEPTED') throw new Error('NATIVE_ADMISSION_NOT_CONFIRMED');
    return {ok:true, state:'NATIVE_ACCEPTED_NOT_VERITAS_VERIFIED', requestId};
  }
  api.action.onClicked.addListener(async (tab) => {
    if (!Number.isInteger(tab?.id) || !/^https?:\/\//.test(tab.url || '')) return;
    try {
      await api.scripting.executeScript({target:{tabId:tab.id}, files:['browser-polyfill.js','content-courier.js','floating-tablet.js']});
    } catch (_) { /* Unsupported/restricted tabs remain unmodified. */ }
  });
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'leeway.observation.submit') return false;
    submit(message.snapshot, sender).then(sendResponse, e=>sendResponse({ok:false,error:errorCode(e)}));
    return true;
  });
  // No ambient polling, no auto-reconnect in suspended service workers, no page-origin command ingress.
})();
