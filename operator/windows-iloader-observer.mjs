/*
REGION: Windows iLoader observation adapter
TAG: LEEWAY-WINDOWS-ILOADER-OBSERVER
WHAT: Collect minimal non-secret Windows/iLoader readiness facts for an iOS dry-run plan.
WHY: Supply observed transport and local-state facts without reading credentials or changing Apple state.
HOW: File existence and allowlisted preference-key presence plus read-only Windows service/PnP booleans.
*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

function exists(filePath) {
  try { return fs.existsSync(filePath); } catch { return false; }
}

function jsonObject(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function windowsFacts(commandRunner) {
  const script = [
    "$service = @(Get-Service -Name 'Apple Mobile Device Service','AppleMobileDeviceService' -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'}).Count -gt 0",
    "$usb = @(Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object {$_.InstanceId -match 'VID_05AC' -or $_.FriendlyName -match 'iPhone|iPad'}).Count -gt 0",
    "$iloader = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {$_.ProcessName -match '^iloader$'}).Count -gt 0",
    "[PSCustomObject]@{appleMobileDeviceServiceRunning=$service;appleUsbPresent=$usb;iloaderRunning=$iloader}|ConvertTo-Json -Compress"
  ].join(";");
  try {
    const output = commandRunner(script);
    const facts = JSON.parse(String(output));
    return {
      appleMobileDeviceServiceRunning: facts.appleMobileDeviceServiceRunning === true,
      appleUsbPresent: facts.appleUsbPresent === true,
      iLoaderRunning: facts.iloaderRunning === true,
      hostProbeState: "READ_ONLY_WINDOWS_FACTS_OBSERVED"
    };
  } catch {
    return {
      appleMobileDeviceServiceRunning: false,
      appleUsbPresent: false,
      iLoaderRunning: false,
      hostProbeState: "WINDOWS_FACTS_NOT_OBSERVED"
    };
  }
}

function defaultCommandRunner(script) {
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
}

/**
 * Returns only booleans and named states. Values from preference/data files,
 * credential vaults, pairing files, certificates, profiles, and iLoader logs
 * are never returned or inspected.
 */
export function observeWindowsIloader({ appDataRoot, commandRunner = defaultCommandRunner, hostPlatform = process.platform } = {}) {
  if (hostPlatform !== "win32") return { state: "WINDOWS_HOST_REQUIRED", observation: null, installationTarget: null };
  const root = appDataRoot ?? path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "me.nabdev.iloader");
  const preferencesPath = path.join(root, "preferences.json");
  const dataPath = path.join(root, "data.json");
  const preferences = jsonObject(preferencesPath);
  const data = jsonObject(dataPath);
  const host = windowsFacts(commandRunner);
  const localStatePresent = exists(root) && exists(preferencesPath) && exists(dataPath);
  // iLoader can enumerate a USB device through its own mobile-device stack;
  // Apple Mobile Device Service is useful diagnostic evidence, not a route prerequisite.
  const transportReady = host.appleUsbPresent;
  const providerHealth = localStatePresent && transportReady ? "HEALTHY" : "UNKNOWN";
  const observation = {
    state: "WINDOWS_ILOADER_OBSERVED",
    hostProbeState: host.hostProbeState,
    localStatePresent,
    selectedServerStored: Object.hasOwn(preferences, "newAnisetteServer"),
    accountRecordStored: Object.keys(data).length > 0,
    appleMobileDeviceServiceRunning: host.appleMobileDeviceServiceRunning,
    appleUsbPresent: host.appleUsbPresent,
    iLoaderRunning: host.iLoaderRunning,
    credentialStoreState: "NOT_INSPECTED",
    certificateState: "NOT_OBSERVED",
    provisioningState: "NOT_OBSERVED"
  };
  return {
    state: observation.state,
    observation,
    installationTarget: {
      platform: "ios",
      transport: { ready: transportReady },
      installerProviders: [{
        id: "iloader",
        health: providerHealth,
        authorized: false,
        accountAuthorized: undefined,
        signingIdentityPresent: undefined,
        certificateState: "NOT_OBSERVED",
        profileMatchesBundle: undefined,
        deviceInProfile: undefined,
        entitlementsCompatible: undefined
      }]
    }
  };
}
