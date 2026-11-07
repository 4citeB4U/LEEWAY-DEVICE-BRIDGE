/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_HOST_DISTRIBUTION.TEST
TAG: LEEWAY.APPLE_HOST_DOWNLOAD_PROVENANCE_TEST
5WH:
WHAT = Verify official LeeWay native Apple installer download readiness is not mistaken for a GitHub project link.
WHY = Publish direct host binaries only when a validated release identity, archive hash and size exist.
WHO = LeeWay Device Bridge authorized contributors.
WHERE = tests/apple-native-host-distribution.test.mjs.
WHEN = 2026-11-07.
HOW = Positive and negative manifest fixtures and real Apple download-page source contracts.
LICENSE = MIT.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {qualifyLeeWayHostInstallers} from "../docs/apple-download.js";
const manifest=JSON.parse(readFileSync("docs/package-manifest.json","utf8"));
const html=readFileSync("docs/index.html","utf8");
test("native Apple installer is not made clickable until a qualified release exists",()=>{
  assert.deepEqual(qualifyLeeWayHostInstallers(manifest),{
    state:"HOST_INSTALLER_NOT_PUBLISHED",available:false
  });
  assert.equal((html.match(/data-apple-host-installers/g)||[]).length,2);
  assert.match(html,/first-party LeeWay installer signs the official IPA/);
});
test("valid manifest exposes three correct direct platform archives",()=>{
  const j=structuredClone(manifest), p=j.appleInstallerDistribution;
  p.state="PUBLISHED";p.qualificationRunId=42420000000;p.sourceRevision="a".repeat(40);
  for(const platform of ["windows","macos","linux"]){
    const ext=platform==="windows"?".zip":".tar.gz";
    p.assets[platform]={
      url:"https://github.com/4citeB4U/LEEWAY-DEVICE-BRIDGE/releases/download/apple-installer-latest/LeeWay-Apple-Installer-"+platform+ext,
      sha256:"b".repeat(64),
      sizeBytes:10342
    };
  }
  const valid=qualifyLeeWayHostInstallers(j);
  assert.equal(valid.available,true);
  assert.equal(valid.items.length,3);
  for(const change of [
    data=>data.appleInstallerDistribution.assets.windows.url="https://evil.example/installer.zip",
    data=>data.appleInstallerDistribution.assets.macos.sha256="broken",
    data=>data.appleInstallerDistribution.assets.linux.sizeBytes=0,
    data=>data.appleInstallerDistribution.sourceRevision="not-a-commit",
    data=>data.appleInstallerDistribution.qualificationRunId=null,
    data=>data.appleInstallerDistribution.requiresPaidDeveloperMembership=true
  ]){
    const corrupted=structuredClone(j);change(corrupted);
    assert.equal(qualifyLeeWayHostInstallers(corrupted).available,false);
  }
});
