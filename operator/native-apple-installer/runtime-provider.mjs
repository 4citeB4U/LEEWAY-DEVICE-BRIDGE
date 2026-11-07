/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_NATIVE_INSTALLER.RUNTIME
TAG: LEEWAY.APPLE.NATIVE_INSTALL_TRUSTED_PROVIDER
5WH:
WHAT = Execute Bridge-owned Rust signing only through the existing Runtime-admitted device command.
WHY = Bring native Apple installation inside the Device Bridge without leaking signing secrets into MCP.
WHO = LeeWay Runtime Fabric owner and authorized Device Bridge host operators.
WHERE = operator/native-apple-installer/runtime-provider.mjs.
WHEN = 2026-11-07.
HOW = Exact device mapping, measured IPA and worker hashes, host-only consent/credentials and 2FA, native readback.
LICENSE = MIT; isideload remains a separately attributed upstream MIT library.
*/
import fs from "node:fs/promises";
import {createReadStream} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {spawn} from "node:child_process";

const RELEASE_URL = "https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-latest/LeeWayDeviceBridge-unsigned.ipa";
const BUNDLE_ID = "industries.leeway.devicebridge";
const HEX = /^[0-9a-f]{64}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localPath = x => typeof x === "string" && x.length < 2048 && !x.includes("\0") && path.isAbsolute(x);

async function measuredFile(file, maximum) {
  const st = await fs.lstat(file);
  if (!st.isFile() || st.isSymbolicLink() || st.size < 1 || st.size > maximum)
    throw Error("APPLE_LOCAL_FILE_NOT_TRUSTED");
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return {sha256: hash.digest("hex"), size: st.size};
}

function checkRelease(manifest) {
  if (manifest?.authority !== "4citeB4U/LEEWAY-DEVICE-BRIDGE" ||
      manifest?.distributionRole !== "GITHUB_PAGES_DISCOVERY_AND_DOWNLOAD" ||
      !Array.isArray(manifest.packages)) throw Error("APPLE_MANIFEST_UNTRUSTED");
  const hits = manifest.packages.filter(p => p?.platform === "ios" && p?.id === "apple-native");
  if (hits.length !== 1) throw Error("APPLE_RELEASE_IDENTITY_AMBIGUOUS");
  const p = hits[0];
  if (p.downloadUrl !== RELEASE_URL || !HEX.test(p.sha256 ?? "") ||
      p.source !== "github-release" ||
      p.status !== "QUALIFIED_ARTIFACT_OWNER_INSTALL_REQUIRED" ||
      !Number.isSafeInteger(p.sizeBytes) || p.sizeBytes < 1 || p.sizeBytes > 104857600 ||
      p.githubActionsQualification?.state !== "VERIFIED" ||
      p.githubActionsQualification?.ipaSha256 !== p.sha256 ||
      p.githubActionsQualification?.ipaSizeBytes !== p.sizeBytes) {
    throw Error("APPLE_RELEASE_PROVENANCE_UNVERIFIED");
  }
  return {sha256: p.sha256, sizeBytes: p.sizeBytes};
}

function launchInstaller({binaryPath, request, requestId, twoFactor, signedBundleId, timeoutMs, spawnBinary}) {
  return new Promise((resolve, reject) => {
    let child;
    try { child = spawnBinary(binaryPath, [], {shell: false, windowsHide: true, stdio: ["pipe", "pipe", "ignore"]}); }
    catch { reject(Error("APPLE_INSTALLER_SPAWN_FAILED")); return; }
    let settled = false, outputSize = 0, pending = "", challenges = 0;
    let installAck = false, bundleReadback = false, signedReadbackBundleId = null, finishState = null;
    const timeout = setTimeout(() => fail("APPLE_INSTALLER_TIMEOUT"), timeoutMs);
    const fail = code => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      child.kill();
      reject(Error(code));
    };
    const processLine = async value => {
      if (settled || !value || typeof value !== "object") return fail("APPLE_INSTALLER_RESPONSE_INVALID");
      if (value.type === "leeway.apple.two_factor") {
        if (++challenges > 4) return fail("APPLE_INSTALLER_TWO_FACTOR_LIMIT");
        let reply;
        try { reply = await twoFactor({requestId, sms: value.sms === true, unknown: value.unknown === true,
          availableNumberIds: Array.isArray(value.availableNumberIds) ? value.availableNumberIds : []}); }
        catch { return fail("APPLE_TWO_FACTOR_OWNER_UNAVAILABLE"); }
        if (settled) return;
        if (!reply || !["submit", "send-sms", "send-to-devices", "resend", "abort"].includes(reply.action)) return fail("APPLE_TWO_FACTOR_RESPONSE_INVALID");
        child.stdin.write(JSON.stringify({action: reply.action,
          code: reply.action === "submit" ? reply.code : undefined,
          numberId: reply.action === "send-sms" ? reply.numberId : undefined}) + "\n");
        return;
      }
      if (value.type !== "leeway.apple.installer" || typeof value.stage !== "string" ||
          typeof value.state !== "string") return fail("APPLE_INSTALLER_STATUS_INVALID");
      if (value.stage === "INSTALL" && value.state === "NATIVE_INSTALLER_ACKNOWLEDGED") installAck = true;
      if (value.stage === "POST_INSTALL" && value.state === "LEEWAY_BUNDLE_PRESENT") {
        const observed = value.signedBundleId;
        if (typeof observed !== "string" || !/^industries\.leeway\.devicebridge\.[A-Za-z0-9]{10}$/.test(observed) ||
            (signedBundleId && observed !== signedBundleId)) {
          return fail("APPLE_POST_INSTALL_BUNDLE_IDENTITY_MISMATCH");
        }
        signedReadbackBundleId = observed;
        bundleReadback = true;
      }
      if (value.stage === "FINAL") finishState = value.state;
    };
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", chunk => {
      if (settled) return;
      outputSize += Buffer.byteLength(chunk, "utf8");
      if (outputSize > 65536) return fail("APPLE_INSTALLER_OUTPUT_LIMIT");
      pending += chunk;
      while (pending.includes("\n")) {
        const index = pending.indexOf("\n"), line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        let value;
        try { value = JSON.parse(line); } catch { return fail("APPLE_INSTALLER_JSON_INVALID"); }
        void processLine(value);
      }
    });
    child.on("error", () => fail("APPLE_INSTALLER_PROCESS_ERROR"));
    child.on("close", code => {
      if (settled) return;
      settled = true; clearTimeout(timeout);
      if (code !== 0 || !installAck || !bundleReadback ||
          finishState !== "HOST_INSTALL_OBSERVED_NOT_INDEPENDENTLY_VERIFIED") {
        reject(Error("APPLE_INSTALL_OR_READBACK_FAILED")); return;
      }
      resolve({
        state: "HOST_INSTALL_OBSERVED_VERITAS_PENDING",
        nativeInstallAttempted: true,
        installedBundleId: signedReadbackBundleId,
        formulaState: "NOT_EVALUATED",
        veritasState: "NOT_INDEPENDENTLY_VERIFIED",
        canonicalReceiptState: "NOT_ADMITTED",
        requestId
      });
    });
    try { child.stdin.write(JSON.stringify(request) + "\n"); }
    catch { fail("APPLE_INSTALLER_STDIN_FAILED"); }
  });
}

export function createAppleNativeInstallProvider({
  deviceHardwareId, deviceUDID, binaryPath, binarySha256, ipaPath, manifestPath,
  observePhysicalDevice, approveOwnerAction, getHostCredentials, handleTwoFactor,
  timeoutMs = 240000, spawnBinary = spawn
} = {}) {
  if (!/^[0-9a-f]{16,64}$/i.test(deviceHardwareId ?? "") ||
      !/^[a-z0-9-]{16,64}$/i.test(deviceUDID ?? "") ||
      ![binaryPath, ipaPath, manifestPath].every(localPath) ||
      !HEX.test(binarySha256 ?? "") ||
      ![observePhysicalDevice, approveOwnerAction, getHostCredentials, handleTwoFactor, spawnBinary]
        .every(fn => typeof fn === "function") ||
      !Number.isInteger(timeoutMs) || timeoutMs < 30000 || timeoutMs > 600000) {
    throw Error("TRUSTED_APPLE_INSTALL_PROVIDER_CONFIG_INVALID");
  }
  async function exactObservation() {
    const o = await observePhysicalDevice({deviceHardwareId, deviceUDID});
    if (o?.authority !== "LEEWAY_DEVICE_BRIDGE_PHYSICAL_READBACK" ||
        o.hardwareId !== deviceHardwareId || o.udid !== deviceUDID ||
        o.physicallyProbed !== true || o.trustedPairing !== true ||
        !["NONE", "KNOWN"].includes(o.installedAppState)) throw Error("APPLE_PHYSICAL_DEVICE_NOT_QUALIFIED");
    if (o.installedAppState === "KNOWN" &&
        (!/^[A-Z0-9]{10}$/.test(o.existingTeamId ?? "") ||
         o.existingBundleId !== BUNDLE_ID + "." + o.existingTeamId)) {
      throw Error("APPLE_EXISTING_APP_PROVENANCE_UNVERIFIED");
    }
    return o;
  }
  return Object.freeze({
    describe: async () => ({
      capability: "device.apps.install.apple",
      hostAuthority: "LEEWAY_RUNTIME_FABRIC_PRE_GATE_REQUIRED",
      nativeProvider: "LEEWAY_ISIDELOAD",
      physicalQualification: "REQUIRES_LIVE_PROBE"
    }),
    health: async () => {
      try { await exactObservation(); return {state:"READY_TO_EXECUTE", physicallyProbed:true, independentVeritas:false}; }
      catch { return {state:"PHYSICAL_PREFLIGHT_NOT_READY", physicallyProbed:false, independentVeritas:false}; }
    },
    execute: async input => {
      if (input?.deviceHardwareId !== deviceHardwareId || input?.packageId !== "apple-native" ||
          !HEX.test(input?.expectedSha256 ?? "") || !UUID.test(input?.requestId ?? "")) {
        throw Error("APPLE_INSTALL_COMMAND_NOT_BOUND");
      }
      const observation = await exactObservation();
      const decision = await approveOwnerAction({requestId:input.requestId, packageId:"apple-native",
        expectedSha256:input.expectedSha256, deviceHardwareId, deviceUDID});
      if (decision?.approved !== true || decision.requestId !== input.requestId ||
          decision.authority !== "LEEWAY_RUNTIME_FABRIC") throw Error("APPLE_OWNER_CONSENT_MISSING");
      const manifest = checkRelease(JSON.parse(await fs.readFile(manifestPath, "utf8")));
      if (input.expectedSha256.toLowerCase() !== manifest.sha256.toLowerCase()) throw Error("APPLE_MANIFEST_HASH_NOT_MATCHED");
      const ipa = await measuredFile(ipaPath, 104857600);
      if (ipa.sha256.toLowerCase() !== manifest.sha256.toLowerCase() ||
          ipa.size !== manifest.sizeBytes) throw Error("APPLE_IPA_MEASURED_HASH_MISMATCH");
      const binary = await measuredFile(binaryPath, 104857600);
      if (binary.sha256.toLowerCase() !== binarySha256.toLowerCase()) throw Error("APPLE_NATIVE_BINARY_HASH_MISMATCH");
      const cred = await getHostCredentials({requestId:input.requestId, deviceUDID});
      if (typeof cred?.appleId !== "string" || typeof cred?.applePassword !== "string" ||
          (cred.developerTeamId != null && !/^[A-Z0-9]{10}$/.test(cred.developerTeamId)) ||
          (cred.anisetteUrl != null && typeof cred.anisetteUrl !== "string")) {
        throw Error("APPLE_SIGNING_CREDENTIAL_PROVIDER_UNAVAILABLE");
      }
      // A free Apple Account normally has one Personal Team; the Rust worker
      // discovers it after authentication. Known existing installs need an
      // exact owner-selected signing team to prevent app-data migration.
      if (observation.installedAppState === "KNOWN" &&
          (cred.developerTeamId == null || observation.existingTeamId !== cred.developerTeamId)) {
        throw Error("APPLE_EXISTING_SIGNING_TEAM_SELECTION_REQUIRED");
      }
      return launchInstaller({
        binaryPath, requestId:input.requestId, timeoutMs, spawnBinary, twoFactor:handleTwoFactor,
        signedBundleId:cred.developerTeamId ? BUNDLE_ID + "." + cred.developerTeamId : null,
        request:{
          action:"install-official-leeway-ipa",appleId:cred.appleId,applePassword:cred.applePassword,
          developerTeamId:cred.developerTeamId,deviceUdid:deviceUDID,
          ipaPath,expectedSha256:manifest.sha256,anisetteUrl:cred.anisetteUrl
        }
      });
    }
  });
}
