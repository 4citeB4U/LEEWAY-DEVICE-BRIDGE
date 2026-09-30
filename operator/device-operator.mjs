/*
REGION: LeeWay Device Operator portable kernel
TAG: LEEWAY-DEVICE-OPERATOR-CORE
WHO: Agent Lee / authorized LeeWay runtimes
WHAT: Normalize platform adapter discovery and command admission.
WHEN: Before platform-specific device execution.
WHERE: 4citeB4U/LEEWAY-DEVICE-BRIDGE/operator
WHY: One governed operator contract with replaceable native adapters.
HOW: Capability-state + authority-tier + consent gates; no platform privilege inference.
LICENSE: MIT
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY = path.join(HERE, "adapter-registry.json");
const ORDER = ["UNKNOWN","SUPPORTED","AVAILABLE","AUTHORIZED","ACTIVE","HEALTHY","VERIFIED"];
const CONSEQUENTIAL = new Set(["MUTATE","ADMIN"]);

export function loadAdapterRegistry(registryPath = DEFAULT_REGISTRY) {
  const value = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  if (value?.operatorId !== "leeway.device.operator" || !Array.isArray(value.adapters)) {
    throw new Error("INVALID_DEVICE_OPERATOR_REGISTRY");
  }
  return value;
}

export function adapterForPlatform(platform, registry = loadAdapterRegistry()) {
  const adapter = registry.adapters.find((item) => item.platform === platform);
  if (!adapter) throw new Error("PLATFORM_ADAPTER_NOT_REGISTERED:" + platform);
  return adapter;
}

export function capabilityState(adapter, capability) {
  return adapter?.capabilities?.[capability]?.state ?? "UNKNOWN";
}

export function isAtLeast(state, minimum) {
  const a = ORDER.indexOf(state);
  const b = ORDER.indexOf(minimum);
  return a >= 0 && b >= 0 && a >= b;
}

export function admitCommand({ platform, capability, authorityTier = "READ", humanConfirmed = false }, registry = loadAdapterRegistry()) {
  const adapter = adapterForPlatform(platform, registry);
  const claim = adapter.capabilities?.[capability];
  if (!claim) return { admitted:false, state:"BLOCKED", reason:"CAPABILITY_NOT_DECLARED", adapterId:adapter.adapterId };
  if (["BLOCKED","UNAVAILABLE","UNKNOWN"].includes(claim.state)) {
    return { admitted:false, state:"BLOCKED", reason:"CAPABILITY_NOT_AVAILABLE", adapterId:adapter.adapterId, capabilityState:claim.state };
  }
  if (CONSEQUENTIAL.has(authorityTier) && !humanConfirmed) {
    return { admitted:false, state:"BLOCKED", reason:"HUMAN_CONFIRMATION_REQUIRED", adapterId:adapter.adapterId, capabilityState:claim.state };
  }
  if (claim.requiresHumanConsent && !humanConfirmed && authorityTier !== "READ") {
    return { admitted:false, state:"BLOCKED", reason:"PLATFORM_CONSENT_REQUIRED", adapterId:adapter.adapterId, capabilityState:claim.state };
  }
  return { admitted:true, state:"AUTHORIZED_TO_ROUTE", adapterId:adapter.adapterId, capabilityState:claim.state };
}

export function describePlatform(platform, registry = loadAdapterRegistry()) {
  const adapter = adapterForPlatform(platform, registry);
  return {
    adapterId: adapter.adapterId,
    platform: adapter.platform,
    implementationStatus: adapter.implementationStatus,
    authorityBoundary: adapter.authorityBoundary,
    capabilities: adapter.capabilities
  };
}
