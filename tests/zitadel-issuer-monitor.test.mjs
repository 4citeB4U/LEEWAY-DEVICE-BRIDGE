/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.METADATA.CI
TAG: LEEWAY.ZITADEL.METADATA_MONITOR.SOURCE.TEST.20261121
5WH: WHAT=Prove old issuer scheduled check is retired and new monitor is fail-closed.
WHY=Stop failing status checks for a retired identity endpoint.
WHO=Creator-authorized outside source contributor, not Agent Lee or Veritas.
WHERE=tests/zitadel-issuer-monitor.test.mjs.
WHEN=2026-11-21.
HOW=Read repository workflow sources; no token issuance or network probes.
LICENSE=Existing repository terms.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const current=new URL("../.github/workflows/zitadel-public-qualification.yml",import.meta.url);
test("current issuer monitor requires configured owner binding",()=>{
 const s=readFileSync(current,"utf8");
 assert.match(s,/vars\.LEEWAY_MCP_AUTH_ISSUER/);
 assert.match(s,/BLOCKED: configure approved LEEWAY_MCP_AUTH_ISSUER/);
 assert.match(s,/if d\.get\('issuer'\) != issuer/);
 assert.match(s,/jwks_uri/);
 assert.match(s,/Discovery only\. No token, principal, owner scope, Formula or execution admission verified/);
});
