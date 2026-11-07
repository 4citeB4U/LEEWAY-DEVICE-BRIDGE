/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_CUSTOMER_IDENTITY.TEST
TAG: LEEWAY.APPLE.CONSUMER_IDENTITY_SOURCE_GATE
5WH:
WHAT = Verify customer-facing Sign in with Apple uses platform control and no unbound Bridge session.
WHY = Keep millions of prospective customers away from developer Apple account signing.
WHO = LeeWay Device Bridge owner-authorized contributors.
WHERE = tests/apple-native-consumer-auth-source.test.mjs.
WHEN = 2026-11-07.
HOW = Source assertions; Apple account and production identity backend still need live qualification.
LICENSE = MIT.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift","utf8");
const auth=readFileSync("apps/apple/Sources/AppleSignInCoordinator.swift","utf8");
const project=readFileSync("apps/apple/project.yml","utf8");
const entitlements=readFileSync("apps/apple/LeeWayDeviceBridge.entitlements","utf8");
test("consumer sign-in is native iOS and only visible with trusted endpoint",()=>{
  assert.match(ui,/SignInWithAppleButton\(\.signIn/);
  assert.match(ui,/if appleSignIn\.exchangeConfigured/);
  assert.match(auth,/import AuthenticationServices/);
  assert.match(entitlements,/com\.apple\.developer\.applesignin/);
  assert.match(project,/LeeWayDeviceBridge\.entitlements/);
});
test("Apple login never becomes an automatic Bridge capability grant",()=>{
  assert.match(auth,/request\.nonce = SHA256/);
  assert.match(auth,/URLSessionConfiguration\.ephemeral/);
  assert.match(auth,/url\.scheme == "https"/);
  assert.match(auth,/sessionEstablished = false/);
  assert.match(auth,/BRIDGE_ADMISSION_REQUIRED/);
  assert.match(ui,/Signing in does not grant installation or device control/);
  assert.doesNotMatch(auth,/UserDefaults\.standard|print\(tokenText|Keychain\.set/);
});
test("existing native Metal and camera sources remain wired",()=>{
  assert.match(ui,/store\.runProbe\(\)/);
  assert.match(ui,/camera\.requestAccessAndStart\(\)/);
  assert.match(ui,/cameraBridge\.start\(camera: camera\)/);
  assert.match(project,/PRODUCT_BUNDLE_IDENTIFIER: industries\.leeway\.devicebridge/);
});
