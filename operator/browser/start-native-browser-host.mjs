/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER.HOST_BINDING
TAG: LEEWAY.ORIGINAL_DEVICE_BRIDGE_NATIVE_BROWSER_BINDING.V1
5WH:
WHAT = Compose the canonical owner-authorized Device Bridge browser session with OS-native stdio.
WHY = The browser side-panel is only a display and cannot create its own Runtime or device registry.
WHO = Approved original Device Bridge native installer and trusted Runtime host.
WHERE = operator/browser/start-native-browser-host.mjs.
WHEN = 2026-11-23.
HOW = Require injected trusted providers, store-pinned extension origin and original native-messaging transport.
LICENSE = MIT; this is not a signed installer or self-starting untrusted process.
*/
import {createNativeBridgeBrowserSession} from './native-bridge-session.mjs';
import {runNativeBrowserSession} from './native-message-transport.mjs';
export function createOriginalBridgeBrowserHost({
  extensionOrigin,approvedOrigins,providers,input=process.stdin,output=process.stdout
}={}){
 const session=createNativeBridgeBrowserSession({
  extensionOrigin,approvedOrigins,providers
 });
 return runNativeBrowserSession({input,output,session});
}
// Deliberately no direct CLI fallback: real trusted providers must be injected
// by the signed original Device Bridge native installation and Runtime host.
// Browser request JSON, localhost discovery, drive paths or environment tokens
// cannot manufacture C3, signer, owner subject or an enrolled device.
