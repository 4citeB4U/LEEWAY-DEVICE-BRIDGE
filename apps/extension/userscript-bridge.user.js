// ==UserScript==
// @name         LeeWay Device Bridge Companion (bounded userscript)
// @namespace    https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE
// @version      0.2.0
// @description  Copy explicitly selected text where native extensions are unavailable; no device-control privilege.
// @match        https://*/*
// @match        http://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.BROWSER_EXTENSION
TAG: LEEWAY.EXTENSION.V2.USER.SCRIPT
5WH:
WHAT = Provide limited manual selection-copy in browsers that cannot use native messaging.
WHY = Avoid misrepresenting userscript sandbox access as Device Bridge execution.
WHO = Creator-authorized Device Bridge contributors.
WHERE = apps/extension/userscript-bridge.user.js.
WHEN = 2026-11-16.
HOW = One explicit user click, no network calls or stored credentials.
LICENSE = Existing repository terms; no new license asserted.
*/
(function(){
  'use strict';
  if(window.__LEEWAY_USERSCRIPT_V2__)return;
  window.__LEEWAY_USERSCRIPT_V2__=true;
  const button=document.createElement('button');
  button.textContent='Copy selection for LeeWay';
  button.setAttribute('aria-label','Copy selected text to clipboard for manual LeeWay transfer');
  Object.assign(button.style,{position:'fixed',bottom:'16px',right:'16px',zIndex:'2147483647',padding:'8px',background:'#101827',color:'white',borderRadius:'8px'});
  button.onclick=async()=>{
    const selected=String(window.getSelection()||'').trim();
    if(!selected||selected.length>8192){button.textContent='Select 1–8192 characters';return;}
    try{await navigator.clipboard.writeText(selected);button.textContent='Copied by your request';}
    catch{button.textContent='Clipboard permission denied';}
  };
  document.documentElement.appendChild(button);
})();
