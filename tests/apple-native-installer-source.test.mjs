/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_NATIVE_INSTALLER.TEST
TAG: LEEWAY.APPLE.NATIVE_INSTALLER_SOURCE_NEGATIVE_GATE
5WH:
WHAT = Check Bridge-native signing worker source for bounded trust and execution semantics.
WHY = Prevent accidental credential logging, certificate revocation, wrong target or fake physical PASS.
WHO = LeeWay Device Bridge authorized contributors.
WHERE = tests/apple-native-installer-source.test.mjs.
WHEN = 2026-11-07.
HOW = Source acceptance; actual compiler and physical qualifications remain separate.
LICENSE = MIT.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("operator/native-apple-installer/src/main.rs","utf8");
const cargo=readFileSync("operator/native-apple-installer/Cargo.toml","utf8");
test("installer belongs to Bridge and imports the upstream MIT signing library",()=>{
  assert.match(cargo,/name = "leeway-apple-native-installer"/);
  assert.match(cargo,/isideload = \{ version = "=0\.5\.2"/);
  assert.match(source,/SideloaderBuilder/);
  assert.match(source,/\.install_app\(/);
  assert.match(source,/KeyringStorage/);
});
test("native installer binds exact iPhone and published IPA digest",()=>{
  assert.match(source,/exact\.len\(\) != 1/);
  assert.match(source,/dev\.udid == req\.device_udid/);
  assert.match(source,/Sha256::new\(\)/);
  assert.match(source,/IPA_HASH_MISMATCH/);
  assert.match(source,/MAX_IPA_SIZE/);
  assert.match(source,/install-official-leeway-ipa/);
});
test("no unapproved certificate revocation, untrusted file or invented Veritas result",()=>{
  assert.match(source,/MaxCertsBehavior::Error/);
  assert.doesNotMatch(source,/revoke_certificate|delete_credential|reset_anisette_state|delete_app\(/);
  assert.match(source,/symlink_metadata/);
  assert.match(source,/LEEWAY_BUNDLE_NOT_FOUND|LEEWAY_SIGNED_BUNDLE_NOT_FOUND/);
  assert.match(source,/HOST_INSTALL_OBSERVED_NOT_INDEPENDENTLY_VERIFIED/);
  assert.doesNotMatch(source,/VERITAS_PASS|PRODUCTION_QUALIFIED|APPSTORE_PUBLISHED/);
});
test("owner secrets flow only by private process stdin and don't reach printed messages",()=>{
  assert.match(source,/bounded_line\(REQUEST_LIMIT\)/);
  assert.match(source,/TwoFactorCallbackResponse::Abort/);
  assert.doesNotMatch(source,/println!\([^\n]*apple_password|println!\([^\n]*identityToken/);
  assert.doesNotMatch(source,/TcpListener|axum|actix_web|hyper::server/);
});
