import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const receiptSource = readFileSync("apps/apple/Sources/AppleDeviceBridgeReceipt.swift", "utf8");
const viewSource = readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift", "utf8");

test("Apple receipt source binds a local Metal observation without claiming external verification", () => {
  assert.match(receiptSource, /import CryptoKit/);
  assert.match(receiptSource, /device\.gpu\.metal\.probe/);
  assert.match(receiptSource, /LOCAL_NATIVE_METAL_PROBE/);
  assert.match(receiptSource, /PENDING_EXTERNAL_VERIFICATION/);
  assert.match(receiptSource, /SHA256\.hash/);
  assert.match(receiptSource, /\.sortedKeys/);
  assert.match(receiptSource, /ios-install-sha256:/);
  assert.match(receiptSource, /maximumReceiptCount = 32/);
  assert.match(viewSource, /ShareLink\(item: receipt\.exportText\)/);
  assert.match(viewSource, /NOT_CREATED/);
});
