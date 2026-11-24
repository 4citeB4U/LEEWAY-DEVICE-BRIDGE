/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER.NATIVE_REGISTRATION
TAG: LEEWAY.BRIDGE_CHROME_EDGE_HOST_MANIFEST_V1
5WH:
WHAT = Build the original Device Bridge native-host manifest for published Chrome and Edge extension identities.
WHY = Users must not manually specify host drives or browser extension IDs after installing the approved native companion.
WHO = Original signed Device Bridge installer, under Creator/owner authorization.
WHERE = operator/browser/native-host-manifest.mjs.
WHEN = 2026-11-23.
HOW = Validate explicit published store IDs and installer-discovered absolute executable path; no writes or registry changes.
LICENSE = MIT; this does not assert an installed host, a store listing or a production signer.
*/
import path from 'node:path';
export const LEEWAY_BROWSER_HOST_NAME='com.leewayindustries.device_bridge';
function id(value){
 if(typeof value!=='string'||!/^[a-p]{32}$/.test(value))
  throw Error('BRIDGE_NATIVE_PUBLISHED_EXTENSION_ID_REQUIRED');
 return value;
}
export function createNativeHostManifest({
 installedExecutable,chromeStoreId,edgeStoreId
}={}){
 if(typeof installedExecutable!=='string'||installedExecutable.length<2||
    installedExecutable.length>2048||/[\r\n\u0000]/.test(installedExecutable)||
    !(path.win32.isAbsolute(installedExecutable)||path.posix.isAbsolute(installedExecutable)))
  throw Error('BRIDGE_NATIVE_INSTALLER_EXE_PATH_UNBOUND');
 const origins=[...new Set([id(chromeStoreId),id(edgeStoreId)])]
   .map(browserId=>'chrome-extension://'+browserId+'/');
 return Object.freeze({
  name:LEEWAY_BROWSER_HOST_NAME,
  description:'Original LeeWay Device Bridge owner-authenticated native browser adapter',
  path:installedExecutable,
  type:'stdio',
  allowed_origins:Object.freeze(origins)
 });
}
