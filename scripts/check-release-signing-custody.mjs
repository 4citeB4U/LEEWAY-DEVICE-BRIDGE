/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RELEASE.SECURITY
TAG: LEEWAY.DEVICE_BRIDGE.RELEASE.SECRET_CUSTODY_GATE.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Deny release when tracked signing secrets, plaintext Gradle passwords or invalid public-release claims remain.
WHY = Prevent repeat of the exposed Android release signing identity and false OS-trust assertions.
WHO = Original Device Bridge signing/release owner under LeeWay Standards.
WHERE = scripts/check-release-signing-custody.mjs.
WHEN = 2026-11-12.
HOW = Read-only Git tracked-file and Gradle/release-manifest validation with negative findings.
LICENSE: Existing repository terms remain unchanged.
*/
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const failures = [];
const secretFiles = tracked.filter(name => /(^|\/)([^/]+\.(?:jks|keystore|p12|pfx)|signing-secrets\.properties)$/i.test(name));
if (secretFiles.length) failures.push('TRACKED_PRIVATE_SIGNING_ASSET');
const gradle = fs.readFileSync('apps/android/app/build.gradle.kts', 'utf8');
if (/storePassword\s*=\s*["'][^"']+["']|keyPassword\s*=\s*["'][^"']+["']/.test(gradle)) failures.push('LITERAL_RELEASE_SIGNING_PASSWORD');
if (/file\(["']\.\.\/leeway-release-key\.jks["']\)/.test(gradle)) failures.push('SOURCE_CHECKOUT_SIGNING_KEY');
const manifest = JSON.parse(fs.readFileSync('docs/downloads/leeway-device-bridge-android-latest.json','utf8'));
if (/eliminat(?:e|ing|ed) (?:all )?(?:Play Protect|harmful app|security) warnings/i.test(String(manifest.releaseNotes || ''))) failures.push('UNVERIFIED_OS_WARNING_CLEARANCE');
if (manifest.releaseState?.startsWith('SECURITY_HOLD_') && manifest.downloadEnabled !== false) failures.push('HELD_RELEASE_MARKED_DOWNLOADABLE');
console.log(JSON.stringify({gate:'LEEWAY_RELEASE_SIGNING_CUSTODY',status:failures.length?'BLOCKED':'PASS',failures,trackedSecretCount:secretFiles.length,releaseState:manifest.releaseState??'UNCLASSIFIED'}));
if (failures.length) process.exitCode = 1;
