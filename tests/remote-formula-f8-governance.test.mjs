import fs from "node:fs";
import assert from "node:assert/strict";

const router=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteCommandRouter.kt",
  "utf8"
);
const service=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/RemoteRelayService.kt",
  "utf8"
);
const main=fs.readFileSync(
  "apps/android/app/src/main/java/industries/leeway/devicebridge/MainActivity.kt",
  "utf8"
);

assert.match(router,/FormulaF8Gate\.evaluate/);
assert.match(router,/governance = governance/);
assert.match(router,/supported/);
assert.match(router,/firstSeen/);
assert.match(router,/AUTHORITY_HOLD/);
assert.match(router,/localAuthorizationPassed/);
assert.match(router,/AgentLeeConversation\.respond/);
assert.doesNotMatch(router,/optInt\("qA"\)/);
assert.match(service,/seenCommandIds/);
assert.match(service,/seenCommandIds\.add\(id\)/);
assert.match(service,/RemoteCommandRouter\.execute\(this, id, capability, args, firstSeen\)/);
assert.match(main,/Owner enabled always-on remote bridge/);
assert.match(main,/RemoteRelayService\.stop\(this@MainActivity\)/);

console.log("PASS remote local pre-gate governance contract");
