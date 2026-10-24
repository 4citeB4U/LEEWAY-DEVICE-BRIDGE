/*
REGION: LEEWAY.DEVICES.COMMANDER.QUALIFICATION
TAG: COMMANDER_SIGNED_SESSION_TEST
WHO: Agent Lee qualification; WHAT: Exercise actual signatures, durable replay and revocation.
WHEN: Before remote exposure; WHERE: test-only file store and execution fixture.
WHY: Transport acknowledgements must not be confused with target-authorized execution.
HOW: Real P-256 signatures and persisted session/replay state; no public relay or physical remote claim.
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {CommanderSessionHost,signCommanderPayload,verifyCommanderPayload} from '../providers/desktop-commander/remote-session.mjs';
const pair=()=>generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const der=k=>k.publicKey.export({format:'der',type:'spki'}).toString('base64');
const fp=k=>createHash('sha256').update(k.publicKey.export({format:'der',type:'spki'})).digest('hex');

test('signed owner session, persistence and target-side refusal',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'leeway-remote-session-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const target=pair(),client=pair(),attacker=pair();let now=2000000000000,executions=0;const receipts=[];
 const name=(kind,id)=>path.join(root,kind+'-'+createHash('sha256').update(id).digest('hex')+'.json');
 const store={async get(id){try{return JSON.parse(fs.readFileSync(name('session',id),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}},async put(id,value){const p=name('session',id),tmp=p+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value));fs.renameSync(tmp,p)},async reserve(session,id,nonce){const keys=[name('command',session+':'+id),name('nonce',session+':'+nonce)];try{for(const p of keys)fs.writeFileSync(p,'seen',{flag:'wx'});return true}catch(e){if(e.code==='EEXIST')return false;throw e}}};
 const common={deviceId:'target-pc',...target,publicKeyDerBase64:der(target),store,clock:()=>now,execute:async(cap,args)=>{executions++;return{capability:cap,observed:args}},receiptSink:async r=>{receipts.push(r);fs.appendFileSync(path.join(root,'receipts.jsonl'),JSON.stringify(r)+'\n')}};
 const host=new CommanderSessionHost(common);
 const request={clientId:'client-phone',clientPublicKeyDerBase64:der(client),nonce:'pairing-request-1',requestedCapabilities:['device.health','device.files.read']};
 const approval={capabilities:request.requestedCapabilities,expiresAtMs:now+60000,relayUrl:'wss://example.invalid/relay',ownerApprovalEventId:'owner-approval-fixture'};
 let signedGrant,grant;
 await t.test('owner approval produces a real target-signed bounded grant',async()=>{signedGrant=await host.approve(request,approval);grant=verifyCommanderPayload(signedGrant,target.publicKey);assert.equal(grant.state,'PAIRED');assert.equal(grant.clientPublicKeyFingerprintSha256,fp(client));assert.equal(grant.ownerApprovalEventId,approval.ownerApprovalEventId)});
 const command=(id='command-1')=>({schema:'leeway.commander.command.v1',sessionId:grant.sessionId,deviceId:'target-pc',clientId:'client-phone',commandId:id,nonce:id+'-nonce',issuedAtMs:now,expiresAtMs:now+10000,capability:'device.health',arguments:{}});
 await t.test('valid signed command executes and returns a signed correlated result',async()=>{const c=command();const result=verifyCommanderPayload(await host.dispatch(grant.sessionId,signCommanderPayload(c,client.privateKey)),target.publicKey);assert.equal(result.commandId,c.commandId);assert.equal(result.nonce,c.nonce);assert.equal(result.status,'PASS');assert.equal(executions,1)});
 await t.test('replay is rejected after constructing a new host instance',async()=>{const restarted=new CommanderSessionHost(common);await assert.rejects(()=>restarted.dispatch(grant.sessionId,signCommanderPayload(command(),client.privateKey)),/COMMAND_REPLAYED/);assert.equal(executions,1)});
 await t.test('untrusted controller signature is rejected before execution',async()=>{await assert.rejects(()=>host.dispatch(grant.sessionId,signCommanderPayload(command('forged'),attacker.privateKey)),/SIGNATURE_INVALID/);assert.equal(executions,1)});
 await t.test('target identity cannot be changed',async()=>{await assert.rejects(()=>host.dispatch(grant.sessionId,signCommanderPayload({...command('wrong-target'),deviceId:'other-pc'},client.privateKey)),/IDENTITY_INVALID/)});
 await t.test('write capability cannot be smuggled inside a signed read session',async()=>{await assert.rejects(()=>host.dispatch(grant.sessionId,signCommanderPayload({...command('write'),capability:'device.files.write'},client.privateKey)),/CAPABILITY_NOT_GRANTED/)});
 await t.test('expired command is rejected',async()=>{await assert.rejects(()=>host.dispatch(grant.sessionId,signCommanderPayload({...command('expired'),expiresAtMs:now},client.privateKey)),/EXPIRED_OR_UNBOUNDED/)});
 await t.test('oversized command lifetime is rejected',async()=>{await assert.rejects(()=>host.dispatch(grant.sessionId,signCommanderPayload({...command('unbounded'),expiresAtMs:now+20000},client.privateKey)),/EXPIRED_OR_UNBOUNDED/)});
 await t.test('missing owner event cannot create a session',async()=>{await assert.rejects(()=>host.approve(request,{...approval,ownerApprovalEventId:''}),/OWNER_APPROVAL_REQUIRED/)});
 await t.test('unrequested grant scope is rejected',async()=>{await assert.rejects(()=>host.approve(request,{...approval,capabilities:['device.process.list']}),/GRANT_SCOPE_INVALID/)});
 await t.test('plaintext relay is rejected',async()=>{await assert.rejects(()=>host.approve(request,{...approval,relayUrl:'ws://example.invalid/relay'}),/WSS_ENDPOINT_REQUIRED/)});
 await t.test('pre-execution receipt failure blocks the operation',async()=>{const failing=new CommanderSessionHost({...common,receiptSink:async()=>{throw Error('storage failed')}});await assert.rejects(()=>failing.dispatch(grant.sessionId,signCommanderPayload(command('pre-fail'),client.privateKey)),/storage failed/);assert.equal(executions,1)});
 await t.test('revocation persists and denies the next valid command',async()=>{await host.revoke(grant.sessionId,{ownerApprovalEventId:'owner-revoke-fixture'});const again=new CommanderSessionHost(common);await assert.rejects(()=>again.dispatch(grant.sessionId,signCommanderPayload(command('after-revoke'),client.privateKey)),/SESSION_NOT_PAIRED/);assert.equal(executions,1)});
 await t.test('receipts are actually persisted without private key material',()=>{const lines=fs.readFileSync(path.join(root,'receipts.jsonl'),'utf8');assert.ok(lines.includes('commander.execution.pre'));assert.ok(lines.includes('commander.revoked'));assert.ok(!lines.includes('PRIVATE KEY'))});
});
