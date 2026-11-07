/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.TESTS.APPLE_DISTRIBUTION
TAG: LEEWAY.DEVICE_BRIDGE.APPLE_DIRECT_DOWNLOAD_TEST
5WH:
WHAT = Exercise direct Apple IPA download routing and release-manifest fail-closed checks.
WHY = Prevent a workstation or repository link from masquerading as native Apple delivery.
WHO = LeeWay Device Bridge engineering contributors under Creator and LeeWay Standards.
WHERE = tests/apple-direct-download.test.mjs.
WHEN = 2026-11-07.
HOW = Check real canonical published metadata and negative malformed/foreign/ambiguous package cases.
LICENSE = MIT.
*/
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {APPLE_IPA_URL, APPLE_IPA_FILENAME, qualifyAppleRelease} from "../docs/apple-download.js";

const publishedManifest = JSON.parse(readFileSync("docs/package-manifest.json", "utf8"));
const page = readFileSync("docs/index.html", "utf8");

test("Apple controls deliver a release IPA rather than a project or release landing page", () => {
  assert.equal(APPLE_IPA_FILENAME, "LeeWayDeviceBridge-unsigned.ipa");
  assert.match(APPLE_IPA_URL, /^https:\/\/github\.com\/4citeB4U\/LEEWAY-DEVICE-BRIDGE\/releases\/download\/apple-latest\/LeeWayDeviceBridge-unsigned\.ipa$/);
  assert.equal((page.match(/data-apple-ipa-download/g) || []).length, 2);
  assert.match(page, /id="appleNativeDownload" data-apple-ipa-download/);
  assert.match(page, /Download Developer IPA \(\.IPA\)/);
  assert.match(page, /src="\.\/apple-download\.js"/);
  assert.doesNotMatch(page, /Check Apple Release<\/a>/);
  assert.match(page, /Apple signing and approved installation are still required/);
});

test("published Apple release carries internally consistent source, build and artifact metadata", () => {
  const outcome = qualifyAppleRelease(publishedManifest);
  assert.equal(outcome.state, "PUBLISHED_UNSIGNED_IPA");
  assert.equal(outcome.usable, true);
  assert.equal(outcome.downloadUrl, APPLE_IPA_URL);
  assert.equal(outcome.signingRequired, true);
  assert.equal(outcome.nativeInstallVerified, false);
  assert.match(outcome.sha256, /^[a-f0-9]{64}$/);
  assert.ok(outcome.sizeBytes > 0);
  assert.ok(outcome.qualifyingRunId > 0);
});

test("foreign download URL cannot be installed through the Apple tile", () => {
  const manifest = structuredClone(publishedManifest);
  manifest.packages.find(p => p.platform === "ios").downloadUrl = "https://example.com/other.ipa";
  assert.equal(qualifyAppleRelease(manifest).state, "APPLE_RELEASE_ROUTE_UNVERIFIED");
});

test("unqualified and mismatched Apple digests cannot be presented as valid publication", () => {
  const wrongDigest = structuredClone(publishedManifest);
  wrongDigest.packages.find(p => p.platform === "ios").sha256 = "f".repeat(64);
  assert.equal(qualifyAppleRelease(wrongDigest).state, "APPLE_PACKAGE_PROVENANCE_UNVERIFIED");
  const wrongSize = structuredClone(publishedManifest);
  wrongSize.packages.find(p => p.platform === "ios").sizeBytes += 1;
  assert.equal(qualifyAppleRelease(wrongSize).state, "APPLE_PACKAGE_PROVENANCE_UNVERIFIED");
  const missingRun = structuredClone(publishedManifest);
  missingRun.packages.find(p => p.platform === "ios").githubActionsQualification.runId = null;
  assert.equal(qualifyAppleRelease(missingRun).state, "APPLE_PACKAGE_PROVENANCE_UNVERIFIED");
});

test("duplicate Apple identity and altered publication authority fail closed", () => {
  const duplicate = structuredClone(publishedManifest);
  duplicate.packages.push(structuredClone(duplicate.packages.find(p => p.platform === "ios")));
  assert.equal(qualifyAppleRelease(duplicate).state, "APPLE_PACKAGE_IDENTITY_AMBIGUOUS");
  const wrongAuthority = structuredClone(publishedManifest);
  wrongAuthority.authority = "another-owner";
  assert.equal(qualifyAppleRelease(wrongAuthority).state, "MANIFEST_AUTHORITY_UNVERIFIED");
});

test("no package or invalid version cannot claim a downloadable release", () => {
  const missing = structuredClone(publishedManifest);
  missing.packages = missing.packages.filter(p => p.platform !== "ios");
  assert.equal(qualifyAppleRelease(missing).state, "APPLE_PACKAGE_IDENTITY_AMBIGUOUS");
  const badVersion = structuredClone(publishedManifest);
  badVersion.packages.find(p => p.platform === "ios").versionCode = -1;
  assert.equal(qualifyAppleRelease(badVersion).state, "APPLE_PACKAGE_PROVENANCE_UNVERIFIED");
});
