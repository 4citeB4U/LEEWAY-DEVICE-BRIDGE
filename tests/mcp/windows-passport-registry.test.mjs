/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: WINDOWS-PASSPORT-REGISTRY-TEST
WHAT: Prove real source-bound Windows passport verification, owner binding, and MCP registry discovery
WHY: pc-primary identity must be mathematically proven and bound to owner 4citeB4U; no synthetic identity or config-only TRUSTED flag
HOW: Node crypto Ed25519 verification against in-memory registry, anti-replay, TTL, and real MCP SDK tool readbacks
LICENSE: Internal LeeWay governance.
*/
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Bridge } from "../../packages/protocol/index.mjs";
import { createServer } from "../../apps/desktop/mcp-server.mjs";
import {
  createSignedWindowsPassport,
  verifyWindowsPassport,
  registerVerifiedWindowsDevice,
  CANONICAL_OWNER_ID
} from "../../operator/identity/windows-passport-verifier.mjs";
import { ConsentReplayGuard } from "../../operator/trusted-issuer-registry.mjs";

// In-Memory Ed25519 Keypairs for Isolated Verification
const { publicKey: carrierPub, privateKey: carrierPriv } = generateKeyPairSync("ed25519");
const carrierPubSpki = carrierPub.export({ type: "spki", format: "pem" });
const carrierPrivPkcs8 = carrierPriv.export({ type: "pkcs8", format: "pem" });

const { publicKey: attackerPub, privateKey: attackerPriv } = generateKeyPairSync("ed25519");
const attackerPubSpki = attackerPub.export({ type: "spki", format: "pem" });
const attackerPrivPkcs8 = attackerPriv.export({ type: "pkcs8", format: "pem" });

const TEST_ISSUERS = {
  "leeway.runtime.carrier.v1": {
    issuerId: "leeway.runtime.carrier.v1",
    displayName: "LeeWay Canonical Runtime Fabric Carrier",
    keyId: "carrier-ed25519-key-001",
    algorithm: "Ed25519",
    publicKeySpki: carrierPubSpki,
    status: "ACTIVE",
    validUntil: "2027-01-01T00:00:00.000Z"
  }
};

function createValidPassport(overrides = {}) {
  const nonce = "nonce-" + Math.random().toString(36).slice(2);
  return createSignedWindowsPassport({
    privateKeyPem: carrierPrivPkcs8,
    deviceId: "pc-primary",
    platform: "windows",
    manufacturer: "LeeWay Industries",
    model: "PC-Workstation-Primary",
    device: "pc-primary",
    product: "LeeWay Workstation",
    architecture: "x64",
    osVersion: "10.0.26100",
    hostname: "LEEWAY-PC-PRIMARY",
    hardwareUid: "4c434255-0000-1000-8000-002590aabbcc",
    ownerId: CANONICAL_OWNER_ID,
    ownerName: "The Creator",
    sessionNonce: "sess-" + nonce,
    tokenNonce: "token-" + nonce,
    issuedAt: new Date().toISOString(),
    ttlMs: 120000,
    ...overrides
  });
}

test("owner binding: passport bound to 4citeB4U verifies successfully and records owner", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const passport = createValidPassport();
  const res = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });

  assert.equal(res.valid, true);
  assert.equal(res.record.id, "pc-primary");
  assert.equal(res.record.ownerId, CANONICAL_OWNER_ID);
  assert.equal(res.record.identityVerified, true);
  assert.equal(res.record.identitySource, "WINDOWS_CIM_READONLY");
  assert.equal(res.record.passportAuthority, "OWNER_SIGNED_WINDOWS_PASSPORT");
  assert.equal(res.record.registrationState, "TRUSTED_REGISTRY_READ");
  assert.equal(res.record.trustStatus, "TRUSTED");
  assert.equal(res.record.registrationAuthority, "TRUSTED_RUNTIME_DEVICE_REGISTRY");
});

test("owner binding denial: foreign owner is rejected with OWNER_MISMATCH", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const passport = createValidPassport({ ownerId: "untrusted-adversary" });
  const res = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard,
    expectedOwnerId: CANONICAL_OWNER_ID
  });

  assert.equal(res.valid, false);
  assert.equal(res.error, "OWNER_MISMATCH");
});

test("freshness denial: expired passport is rejected with PASSPORT_EXPIRED", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const past = new Date(Date.now() - 300000).toISOString();
  const passport = createValidPassport({
    issuedAt: past,
    ttlMs: 60000 // Expired 4 minutes ago
  });

  const res = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard,
    clockToleranceMs: 1000
  });

  assert.equal(res.valid, false);
  assert.equal(res.error, "PASSPORT_EXPIRED");
});

test("anti-replay denial: reusing the same token nonce is rejected with NONCE_REPLAYED", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const passport = createValidPassport();

  const first = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });
  assert.equal(first.valid, true);

  const replay = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });
  assert.equal(replay.valid, false);
  assert.equal(replay.error, "NONCE_REPLAYED");
});

test("tamper denial: altered hardware UID or signature fails with SIGNATURE_INVALID", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const passport = createValidPassport();

  // Tamper with hardwareUid
  const tampered = { ...passport, hardwareUid: "tampered-hardware-id-0000" };
  const res = verifyWindowsPassport(tampered, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, "SIGNATURE_INVALID");
});

test("forgery denial: passport signed by untrusted attacker key fails verification", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const nonce = "attacker-" + Date.now();
  const forged = createSignedWindowsPassport({
    privateKeyPem: attackerPrivPkcs8,
    deviceId: "pc-primary",
    platform: "windows",
    hardwareUid: "4c434255-0000-1000-8000-002590aabbcc",
    ownerId: CANONICAL_OWNER_ID,
    sessionNonce: "sess-" + nonce,
    tokenNonce: "token-" + nonce,
    issuer: "leeway.runtime.carrier.v1"
  });

  const res = verifyWindowsPassport(forged, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, "SIGNATURE_INVALID");
});

test("platform denial: non-windows platform in windows verifier fails with PLATFORM_MISMATCH", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const passport = createValidPassport({ platform: "linux" });
  const res = verifyWindowsPassport(passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });
  assert.equal(res.valid, false);
  assert.equal(res.error, "PLATFORM_MISMATCH");
});

test("MCP discovery: verified Windows passport in deviceRegistry produces identityVerified=true and TRUSTED_REGISTRY_READ", async t => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const deviceRegistry = new Map();
  const passport = createValidPassport({ deviceId: "pc-primary" });

  registerVerifiedWindowsDevice(deviceRegistry, passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });

  const bridge = new Bridge([{
    id: "pc-primary",
    grants: ["device.health", "device.info"],
    adapter: {
      discover: async () => ["device.health", "device.info"],
      execute: async () => ({ ok: true, platform: "win32" })
    }
  }], {
    admission: async () => false,
    receiptSink: async () => {},
    deviceRegistry
  });

  const server = createServer(bridge, { deviceRegistry });
  const client = new Client({ name: "windows-passport-mcp-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  t.after(async () => { await client.close(); await server.close(); });

  // 1. bridge_devices tool call
  const devicesRes = await client.callTool({ name: "bridge_devices", arguments: {} });
  const parsedDevices = JSON.parse(devicesRes.content[0].text);

  assert.deepEqual(parsedDevices.devices, ["pc-primary"]);
  assert.equal(parsedDevices.registrationState, "TRUSTED_REGISTRY_READ");
  assert.equal(parsedDevices.registrationAuthority, "TRUSTED_RUNTIME_DEVICE_REGISTRY");
  assert.equal(parsedDevices.reachability, "NOT_PROBED");

  // 2. bridge_capabilities tool call
  const capsRes = await client.callTool({ name: "bridge_capabilities", arguments: { deviceId: "pc-primary" } });
  const parsedCaps = JSON.parse(capsRes.content[0].text);

  assert.equal(parsedCaps.registrationState, "REGISTERED_IN_TRUSTED_RUNTIME");
  assert.equal(parsedCaps.identityVerified, true);
  assert.equal(parsedCaps.identitySource, "WINDOWS_CIM_READONLY");
  assert.equal(parsedCaps.executionAdmission, "NOT_CONFERRED_BY_DISCOVERY");
});

test("MCP discovery fallback: unverified registry record reports identityVerified=false and REGISTRY_FALLBACK", async t => {
  const fallbackRegistry = new Map([
    ["pc-primary", { platform: "windows", identityVerified: false, identitySource: "REGISTRY_FALLBACK" }]
  ]);

  const bridge = new Bridge([{
    id: "pc-primary",
    grants: ["device.health"],
    adapter: {
      discover: async () => ["device.health"],
      execute: async () => ({ ok: true })
    }
  }], {
    admission: async () => false,
    receiptSink: async () => {},
    deviceRegistry: fallbackRegistry
  });

  const server = createServer(bridge, { deviceRegistry: fallbackRegistry });
  const client = new Client({ name: "fallback-mcp-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  t.after(async () => { await client.close(); await server.close(); });

  const devicesRes = await client.callTool({ name: "bridge_devices", arguments: {} });
  const parsed = JSON.parse(devicesRes.content[0].text);

  // Unverified Windows pc-primary record is excluded from devices (PR #98 contract)
  assert.deepEqual(parsed.devices, []);
  assert.equal(parsed.registrationState, "NO_REGISTERED_ADAPTERS");
  assert.equal(parsed.registrationAuthority, "TRUSTED_RUNTIME_DEVICE_REGISTRY");

  const capsRes = await client.callTool({ name: "bridge_capabilities", arguments: { deviceId: "pc-primary" } });
  const parsedCaps = JSON.parse(capsRes.content[0].text);
  assert.equal(parsedCaps.registrationState, "NOT_IN_TRUSTED_RUNTIME_REGISTRY");
  assert.equal(parsedCaps.identityVerified, false);
  assert.equal(parsedCaps.identitySource, null);
  assert.equal(parsedCaps.executionAdmission, "IDENTITY_UNVERIFIED");
});

test("multi-device qualification: secondary device (pc-secondary) signed by hardware authority is accepted", () => {
  const replayGuard = new ConsentReplayGuard({ inMemoryOnly: true });
  const deviceRegistry = new Map();
  const passport = createValidPassport({
    deviceId: "pc-secondary",
    model: "PC-Workstation-Secondary",
    device: "pc-secondary",
    hardwareUid: "4c434255-0000-2000-8000-002590ddeeff"
  });

  const record = registerVerifiedWindowsDevice(deviceRegistry, passport, {
    trustedIssuerRegistry: TEST_ISSUERS,
    replayGuard
  });

  assert.equal(record.id, "pc-secondary");
  assert.equal(record.ownerId, CANONICAL_OWNER_ID);
  assert.equal(record.identityVerified, true);
  assert.equal(deviceRegistry.has("pc-secondary"), true);
});
