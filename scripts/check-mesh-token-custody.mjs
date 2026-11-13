/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.SECURITY.CREDENTIAL_CUSTODY
TAG: LEEWAY.SECURITY.NO_COMMITTED_MESH_TOKEN.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Reject source-embedded shared mesh pairing credential material in active tracked code.
WHY = Avoid a publicly inspectable relay credential granting cross-device access.
WHO = Original Device Bridge / ZITADEL / Runtime owner under Creator security approval.
WHERE = scripts/check-mesh-token-custody.mjs.
WHEN = 2026-11-12.
HOW = Read-only tracked source scan; no token contents printed; live rotation is separate.
LICENSE: Existing repository terms remain unchanged.
*/
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const prefix=['leeway','mesh','token'].join('-')+'-';
const problems=[];
for(const file of paths){
 if(!/\.(?:js|mjs|html|ts|kt|swift|json)$/i.test(file))continue;
 const content=readFileSync(file,'utf8');
 if(content.includes(prefix))problems.push({path:file,reason:'SOURCE_EMBEDDED_RELAY_TOKEN'});
}
console.log(JSON.stringify({gate:'LEEWAY_MESH_CREDENTIAL_CUSTODY',status:problems.length?'BLOCKED':'PASS',count:problems.length,problems}));
if(problems.length)process.exitCode=1;
