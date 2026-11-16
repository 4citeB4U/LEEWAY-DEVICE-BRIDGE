// ==UserScript==
// @name         LeeWay Browser Courier — Local Selection Mirror
// @namespace    https://leeway.industries/
// @version      2.0.0
// @description  Explicit read-only selection preview; no device control, native host or automatic upload.
// @match        https://*/*
// @match        http://*/*
// @grant        none
// ==/UserScript==
/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION
TAG: LEEWAY.EXTENSION.V2.USERSCRIPT
5WH:
WHAT = Offer a limited browser-only selected-text mirror on unsupported extension hosts.
WHY = Avoid falsely claiming native bridge access on browsers without an extension adapter.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = apps/extension/userscript-bridge.user.js
WHEN = 2026-11-16.
HOW = Local preview of explicitly selected text with no network, credentials or automation.
LICENSE = Not asserted; existing repository terms govern.
*/
(() => {
  'use strict';
  if (document.getElementById('leeway-userscript-courier-v2')) return;
  const button = document.createElement('button');
  button.id = 'leeway-userscript-courier-v2';
  button.type = 'button';
  button.textContent = 'LeeWay: preview selection';
  button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;border-radius:8px;padding:8px;color:white;background:#205995;border:0';
  button.addEventListener('click', () => {
    const selected = String(globalThis.getSelection?.() || '').trim();
    if (!selected || selected.length > 4096) { button.textContent = 'Select 1–4096 characters'; return; }
    button.textContent = 'Selection preview only — no Bridge connection';
  });
  (document.body || document.documentElement).append(button);
})();
