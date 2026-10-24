/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.AGENT_SKILLS
TAG: LEEWAY.SKILLS_REFERENCE_INTEGRATION_ACCEPTANCE_V1
WHO: LeeWay Industries.
WHAT: Test existing Agent Skills catalog integration and zero-execution semantics.
WHEN: 2026-10-24; WHERE: tests/mcp/agent-skills-integration.test.mjs.
WHY: Device Bridge must carry canonical LeeWay Agent Skills without duplicated runtime.
HOW: Strict paths, manifest digest, synthetic tamper checks, real SKILL.md discovery
     and MCP fail-closed command boundary.
AUTHORITY: REFERENCE_ONLY / TEST. No owner or independent Veritas execution grants.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {DesktopAdapter} from '../../apps/desktop/adapter.mjs';
import {schemas,Bridge} from '../../packages/protocol/index.mjs';
import {createServer} from '../../apps/desktop/mcp-server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const realSkills='C:/Users/Leona/.codex/leeway/LeeWay-Agent-Skills/skills';
async function fixtures(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-skills-bridge-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100}));
 const workspace=path.join(dir,'work'),skills=path.join(dir,'skills');
 await fs.mkdir(workspace); await fs.mkdir(skills);
 await fs.mkdir(path.join(skills,'leeway-device-bridge'));
 const content='---\nname: leeway-device-bridge\ndescription: Governed device bridge\n---\n# Test policy';
 await fs.writeFile(path.join(skills,'leeway-device-bridge','SKILL.md'),content);
 return {workspace,skills,adapter:new DesktopAdapter(workspace,{skillsRoot:skills}),content};
}
test('skills are optional and not advertised when root is not configured',async t=>{
 const {workspace}=await fixtures(t);
 const adapter=new DesktopAdapter(workspace);
 assert.ok(!(await adapter.discover()).includes('skills.list'));
 assert.equal(schemas['skills.read'].safeParse({skillId:'../bad',expectedSha256:sha('good')}).success,true);
 await assert.rejects(adapter.execute('skills.list',{query:'',offset:0,limit:20}),/CAPABILITY_UNAVAILABLE/);
});
test('reference-only source hash, exact readback and tampering denial',async t=>{
 const {skills,adapter,content}=await fixtures(t);
 const caps=await adapter.discover();
 assert.ok(caps.includes('skills.list')&&caps.includes('skills.read'));
 const data=await adapter.execute('skills.list',{query:'device',offset:0,limit:10});
 assert.equal(data.total,1);
 assert.equal(data.skills[0].name,'leeway-device-bridge');
 assert.equal(data.skills[0].sha256,sha(content));
 assert.equal(data.skills[0].executionAuthorized,false);
 const read=await adapter.execute('skills.read',{skillId:'leeway-device-bridge',expectedSha256:data.skills[0].sha256});
 assert.equal(read.content,content);assert.equal(read.referenceOnly,true);assert.equal(read.workflowExecuted,false);
 await assert.rejects(adapter.execute('skills.read',{skillId:'../outside',expectedSha256:sha(content)}),/SKILL_ID_INVALID/);
 await fs.appendFile(path.join(skills,'leeway-device-bridge','SKILL.md'),'\nTAMPER');
 await assert.rejects(adapter.execute('skills.read',{skillId:'leeway-device-bridge',expectedSha256:sha(content)}),/SKILL_SOURCE_CHANGED/);
});
test('MCP advertises canonical skill reference capabilities but does not bypass admission',async t=>{
 const {adapter}=await fixtures(t);
 const dev={id:'agent-skills-host',grants:['skills.list','skills.read'],adapter};
 const server=createServer(new Bridge([dev],{receiptSink:async()=>{}}));
 const client=new Client({name:'skills-admission-test',version:'1.0.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();
 t.after(()=>Promise.all([client.close(),server.close()]));
 await server.connect(b);await client.connect(a);
 const tools=(await client.listTools()).tools.map(x=>x.name);
 assert.ok(tools.includes('skills_list'));assert.ok(tools.includes('skills_read'));
 const result=await client.callTool({name:'skills_list',arguments:{deviceId:dev.id,arguments:{query:'leeway',limit:10,offset:0}}});
 assert.equal(JSON.parse(result.content[0].text).error,'ADMISSION_DENIED');
});
test('real local canonical Agent Skills repository exposes Device Bridge and Continuity',async t=>{
 const {workspace}=await fixtures(t);
 try{await fs.access(realSkills);}catch{return t.skip('Canonical Agent Skills tree not mounted on this host');}
 const adapter=new DesktopAdapter(workspace,{skillsRoot:realSkills});
 const catalog=await adapter.execute('skills.list',{query:'leeway-device-bridge',offset:0,limit:100});
 assert.ok(catalog.total>=1);
 const found=catalog.skills.find(s=>s.skillId==='leeway-device-bridge');
 assert.ok(found, 'canonical Device Bridge skill is present');
 const read=await adapter.execute('skills.read',{skillId:found.skillId,expectedSha256:found.sha256});
 assert.match(read.content,/Veritas PRE/);
 const continuity=await adapter.execute('skills.list',{query:'leeway-continuity-authority',offset:0,limit:5});
 assert.ok(continuity.total>=1);
});
