import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const camera = readFileSync("apps/apple/Sources/AppleCameraCapture.swift", "utf8");
const receipt = readFileSync("apps/apple/Sources/AppleCameraReceipt.swift", "utf8");
const bridgeServer = readFileSync("apps/apple/Sources/AppleCameraBridgeServer.swift", "utf8");
const project = readFileSync("apps/apple/project.yml", "utf8");
const catalog = readFileSync("apps/apple/Sources/AppleCapabilityCatalog.swift", "utf8");

test("Apple package contains a native owner-started camera provider", () => {
  assert.match(camera, /AVCaptureSession/);
  assert.match(camera, /requestAccessAndStart/);
  assert.match(camera, /AVCaptureVideoDataOutputSampleBufferDelegate/);
  assert.match(camera, /jpegRepresentation/);
  assert.match(camera, /8 \* 1024 \* 1024/);
  assert.match(catalog, /id: "device\.camera"/);
  assert.match(catalog, /Host streaming requires a separately paired Device Bridge transport/);
});

test("camera frames have bounded hash-bound local receipts", () => {
  assert.match(camera, /sha256: SHA256\.hash/);
  assert.match(camera, /vision\.session\.start/);
  assert.match(camera, /vision\.frames\.observe/);
  assert.match(camera, /vision\.session\.stop/);
  assert.match(receipt, /AppleCameraReceiptStore/);
});

test("the generated iPhone package requests camera permission", () => {
  assert.match(project, /INFOPLIST_KEY_NSCameraUsageDescription/);
});

test("Apple camera source includes an owner-started authenticated host transport", () => {
  assert.match(bridgeServer, /NWListener/);
  assert.match(bridgeServer, /_leeway-camera\._tcp/);
  assert.match(bridgeServer, /pairingToken/);
  assert.match(bridgeServer, /PAIRING_TOKEN_INVALID/);
  for (const operation of ["vision.sources.list", "vision.session.start", "vision.frames.observe", "vision.session.stop"]) {
    assert.match(bridgeServer, new RegExp(operation.replaceAll('.', '\\.'), 'g'));
  }
  assert.match(bridgeServer, /base64EncodedString/);
  assert.match(bridgeServer, /receiptHash/);
});
