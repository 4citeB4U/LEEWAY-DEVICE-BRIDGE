/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PHONE.SOURCE_INTEGRATION_TEST
TAG: LEEWAY.PHONE.CANONICAL_RELAY_SOURCE_SHA_V1
5WH:
WHAT = Ensure existing Fold remote-controller qualification uses the package manifest's actual source commit and native phone device identity.
WHY = An undefined PINNED_SHA crashes strict Bash before phone Voice can be qualified and guessed handset IDs must not substitute for the app's real LDB identity.
WHO = LeeWay outside support under Creator authority, not Agent Lee.
WHERE = tests/termux-direct-phone-source-lock.test.mjs
WHEN = 2026-11-21
HOW = Static source contracts and Bash parse-only checks; no phone/relay execution, tokens, camera, microphone or device mutation.
LICENSE = MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('direct-phone qualifier parses under strict Bash and pins to actual manifest commit',()=>{
 const script=read('clients/remote-controller/termux-qualify.sh');
 const parse=spawnSync('bash',['-n'],{input:script,encoding:'utf8'});
 assert.equal(parse.status,0,parse.stderr);
 assert.match(script,/set -euo pipefail/);
 assert.match(script,/SOURCE_COMMIT="\$\(node -e/);
 assert.match(script,/\[\[ "\$SOURCE_COMMIT" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
 assert.match(script,/BASE_RAW="https:\/\/raw\.githubusercontent\.com\/4citeB4U\/LEEWAY-DEVICE-BRIDGE\/\$\{SOURCE_COMMIT\}"/);
 assert.match(script,/staging the existing remote controller pinned to \$\{SOURCE_COMMIT\}/);
 assert.doesNotMatch(script,/\$\{PINNED_SHA\}|\$PINNED_SHA/);
});

test('Android pairing uses its persisted, keystore-backed real LDB ID and governed relay, not PC identification',()=>{
 const identity=read('apps/android/app/src/main/java/industries/leeway/devicebridge/DeviceIdentity.kt');
 const relay=read('apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteRelayService.kt');
 const state=read('apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteRelayState.kt');
 const router=read('apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt');
 assert.match(identity,/LDB-.*UUID\.randomUUID/);
 assert.match(identity,/AndroidKeyStore/);
 assert.match(relay,/DeviceIdentity\.ensure\(this@RemoteRelayService\)/);
 assert.match(relay,/put\("deviceId", identity\.optString\("deviceId"\)\)/);
 assert.match(state,/put\("deviceId", identity\.optString\("deviceId"\)\)/);
 assert.match(state,/put\("connected", prefs\.getBoolean\(CONNECTED, false\)\)/);
 assert.match(router,/"voice\.status", "voice\.speak", "agent\.chat"/);
 assert.match(router,/FormulaF8Gate\.evaluate/);
 assert.doesNotMatch(router,/fun execute[\s\S]*?\{[\s\S]{0,300}pc-primary/);
});
