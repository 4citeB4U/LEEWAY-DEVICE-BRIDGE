/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_STOREFRONT.TEST
TAG: LEEWAY.APPLE.STOREFRONT_SAFE_DISTRIBUTION_GATE
5WH:
WHAT = Separate real App Store customer listing from developer IPA distribution.
WHY = No public customer should be sent through USB/Apple developer authentication.
WHO = LeeWay Device Bridge owner-authorized contributors.
WHERE = tests/apple-storefront-routing.test.mjs.
WHEN = 2026-11-07.
HOW = Published/unpublished, official/mismatched-host and native update-channel checks.
LICENSE = MIT.
*/
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {qualifyAppleStoreDistribution} from "../docs/apple-download.js";

const existing=JSON.parse(readFileSync("docs/package-manifest.json","utf8"));
const page=readFileSync("docs/index.html","utf8");
const apple=existing.packages.find(x=>x.platform==="ios"&&x.id==="apple-native");

test("existing native IPA is a developer distribution, not a published App Store listing",()=>{
  const status=qualifyAppleStoreDistribution(existing);
  assert.deepEqual(status,{state:"APP_STORE_NOT_PUBLISHED",available:false});
  assert.equal(apple.consumerDistribution.signInRequiredForLocalMetal,false);
  assert.equal(apple.consumerDistribution.customerInstallRequiresDeveloperMembership,false);
  assert.equal((page.match(/data-apple-customer-install/g)||[]).length,2);
  assert.equal((page.match(/data-apple-ipa-download/g)||[]).length,2);
  assert.match(page,/DOWNLOAD DEVELOPER IPA/);
});

test("only exact published official Apple listing may become a customer link",()=>{
  const future=structuredClone(existing);
  const c=future.packages.find(x=>x.platform==="ios").consumerDistribution;
  c.state="PUBLISHED";
  c.appStoreId="1234567890";
  c.installUrl="https://apps.apple.com/us/app/leeway-device-bridge/id1234567890";
  const state=qualifyAppleStoreDistribution(future);
  assert.deepEqual(state,{state:"APP_STORE_PUBLISHED",available:true,installUrl:c.installUrl});
  for(const invalidURL of [
    "http://apps.apple.com/us/app/leeway-device-bridge/id1234567890",
    "https://evil.example/us/app/leeway-device-bridge/id1234567890",
    "https://apps.apple.com/us/app/leeway-device-bridge/id1234567899",
    "https://apps.apple.com/us/app/leeway-device-bridge/id1234567890?tracking=1",
    "https://apps.apple.com.evil.example/us/app/leeway-device-bridge/id1234567890"
  ]){
    c.installUrl=invalidURL;
    assert.equal(qualifyAppleStoreDistribution(future).available,false,invalidURL);
  }
});

test("App Store builds never prompt the owner to import a GitHub IPA",()=>{
  const updater=readFileSync("apps/apple/Sources/AppleUpdateCoordinator.swift","utf8");
  const view=readFileSync("apps/apple/Sources/AppleDeviceBridgeView.swift","utf8");
  const project=readFileSync("apps/apple/project.yml","utf8");
  assert.match(updater,/usesAppStoreUpdates/);
  assert.match(updater,/APPLE_APP_STORE_MANAGED/);
  assert.match(view,/if updater\.usesAppStoreUpdates/);
  assert.match(view,/Apple manages package signing and updates/);
  assert.match(project,/INFOPLIST_KEY_LEEWAY_APPLE_DISTRIBUTION_CHANNEL/);
  assert.match(view,/Download Developer IPA/);
});
