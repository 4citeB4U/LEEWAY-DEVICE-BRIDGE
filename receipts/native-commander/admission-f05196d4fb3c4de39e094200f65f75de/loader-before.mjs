/*
REGION: LEEWAY.PC.BOOT_COMPATIBILITY
TAG: LEEWAY_DEVICES_COMMANDER_LOADER
WHO: Creator-authorized Agent Lee; WHAT: Load the existing Device Bridge-owned Commander.
WHEN: Existing PC boot entry; WHERE: compatibility entry only, no duplicate executor.
WHY: Preserve startup while moving implementation ownership into LeeWay Devices.
HOW: Pinned source/policy hashes and explicit body/root configuration, loopback only.
LICENSE: MIT
*/
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const binding=JSON.parse(fs.readFileSync(path.join(here,'host-commander.binding.v1.json'),'utf8').replace(/^\uFEFF/,''));
if(binding.owner!=='4citeB4U/LEEWAY-DEVICE-BRIDGE'||binding.provider!=='LEEWAY_NATIVE_HOST_COMMANDER'||binding.remoteExposure!==false)throw Error('COMMANDER_OWNER_BINDING_INVALID');
for(const [file,expected] of [[binding.sourcePath,binding.sourceSha256],[binding.policyPath,binding.policySha256]]){
 if(createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase()!==expected)throw Error('COMMANDER_SOURCE_HASH_MISMATCH');
}
if(!path.isAbsolute(binding.workspaceRoot)||!fs.statSync(binding.workspaceRoot).isDirectory())throw Error('COMMANDER_WORKSPACE_UNAVAILABLE');
process.env.LEEWAY_HOST_COMMANDER_ROOT=binding.workspaceRoot;
process.env.LEEWAY_HOST_COMMANDER_PORT=String(binding.port);
process.env.LEEWAY_BODY_ID=binding.bodyId;
await import(pathToFileURL(binding.sourcePath).href);