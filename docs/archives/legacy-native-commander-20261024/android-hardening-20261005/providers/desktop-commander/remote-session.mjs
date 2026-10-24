/*
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: COMMANDER_OWNER_APPROVED_REMOTE_SESSION
WHO: Target-computer owner / Device Bridge
WHAT: Extend existing pairing and capability contracts with target-signed grants and results.
WHEN: Behind an authenticated transport, never a new public listener.
WHERE: Existing Desktop Commander provider.
WHY: Relay connectivity and a requester-supplied permission label are not device authority.
HOW: EC P-256 signatures, bounded grants, mandatory durable session/replay store and receipts.
LICENSE: MIT
*/
import {createHash,createPublicKey,sign,verify,randomUUID} from 'node:crypto';
export const COMMANDER_REMOTE_READ_CAPABILITIES=Object.freeze(['device.health','device.info','device.files.read','device.directories.list','device.process.list']);
const sha=b=>createHash('sha256').update(b).digest('hex');
const id=x=>typeof x==='string'&&/^[A-Za-z0-9._:-]{1,128}$/.test(x);
const url=x=>{const u=new URL(x);if(u.protocol!=='wss:'||u.username||u.password||u.hash||u.search||u.href.length>2048)throw Error('COMMANDER_WSS_ENDPOINT_REQUIRED');return u.href;};
function bytes(text,max=65536){if(typeof text!=='string'||text.length>Math.ceil(max/3)*4+4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw Error('COMMANDER_ENCODING_INVALID');const b=Buffer.from(text,'base64');if(b.length>max||b.toString('base64')!==text)throw Error('COMMANDER_ENCODING_INVALID');return b;}
export function commanderPublicKey(der){const b=bytes(der,512),key=createPublicKey({key:b,format:'der',type:'spki'});if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw Error('COMMANDER_P256_KEY_REQUIRED');return{key,bytes:b,fingerprint:sha(b)};}
export function signCommanderPayload(body,privateKey){const payload=Buffer.from(JSON.stringify(body));if(payload.length>65536)throw Error('COMMANDER_PAYLOAD_TOO_LARGE');return{payloadBase64:payload.toString('base64'),signatureBase64:sign('sha256',payload,privateKey).toString('base64')};}
export function verifyCommanderPayload(envelope,publicKey){const payload=bytes(envelope?.payloadBase64),signature=bytes(envelope?.signatureBase64,128);if(!verify('sha256',payload,publicKey,signature))throw Error('COMMANDER_SIGNATURE_INVALID');return JSON.parse(payload.toString('utf8'));}
export class CommanderSessionHost {
 constructor({deviceId,privateKey,publicKeyDerBase64,store,execute,receiptSink,clock=Date.now}){
  if(!id(deviceId)||typeof execute!=='function'||typeof receiptSink!=='function'||!['get','put','reserve'].every(k=>typeof store?.[k]==='function'))throw Error('COMMANDER_SESSION_BINDINGS_REQUIRED');
  const pub=commanderPublicKey(publicKeyDerBase64);const probe=signCommanderPayload({probe:true},privateKey);verifyCommanderPayload(probe,pub.key);
  Object.assign(this,{deviceId,privateKey,publicKeyDerBase64,store,execute,receiptSink,clock});
 }
 async approve(request,{capabilities,expiresAtMs,relayUrl,ownerApprovalEventId}={}){
  if(!id(request?.clientId)||!id(request?.nonce)||!id(ownerApprovalEventId))throw Error('COMMANDER_OWNER_APPROVAL_REQUIRED');
  const key=commanderPublicKey(request.clientPublicKeyDerBase64),now=this.clock();
  if(!Array.isArray(request.requestedCapabilities)||!Array.isArray(capabilities)||!capabilities.length||capabilities.length>5||new Set(capabilities).size!==capabilities.length||capabilities.some(c=>!COMMANDER_REMOTE_READ_CAPABILITIES.includes(c)||!request.requestedCapabilities.includes(c)))throw Error('COMMANDER_GRANT_SCOPE_INVALID');
  if(!Number.isSafeInteger(expiresAtMs)||expiresAtMs<=now||expiresAtMs>now+86400000)throw Error('COMMANDER_GRANT_EXPIRY_INVALID');
  const body={schema:'leeway.commander.grant.v1',pairingId:randomUUID(),sessionId:randomUUID(),deviceId:this.deviceId,clientId:request.clientId,clientPublicKeyDerBase64:request.clientPublicKeyDerBase64,clientPublicKeyFingerprintSha256:key.fingerprint,requestNonce:request.nonce,issuedAtMs:now,expiresAtMs,capabilities,relayUrl:url(relayUrl),ownerApprovalEventId,state:'PAIRED'};
  await this.receiptSink({kind:'commander.owner-approval',pairingId:body.pairingId,sessionId:body.sessionId,deviceId:this.deviceId,clientId:body.clientId,capabilities,ownerApprovalEventId,timeMs:now});
  await this.store.put(body.sessionId,{grant:body,state:'PAIRED'});
  return{targetPublicKeyDerBase64:this.publicKeyDerBase64,...signCommanderPayload(body,this.privateKey)};
 }
 async revoke(sessionId,{ownerApprovalEventId}={}){
  if(!id(sessionId)||!id(ownerApprovalEventId))throw Error('COMMANDER_OWNER_REVOCATION_REQUIRED');
  const record=await this.store.get(sessionId);if(!record)throw Error('COMMANDER_SESSION_UNKNOWN');
  record.state='REVOKED';record.revokedAtMs=this.clock();await this.store.put(sessionId,record);
  await this.receiptSink({kind:'commander.revoked',sessionId,ownerApprovalEventId,timeMs:record.revokedAtMs});
  return{state:'REVOKED',sessionId};
 }
 async dispatch(sessionId,envelope){
  const record=await this.store.get(sessionId);if(!record||record.state!=='PAIRED')throw Error('COMMANDER_SESSION_NOT_PAIRED');
  const grant=record.grant,now=this.clock();if(now>=grant.expiresAtMs)throw Error('COMMANDER_GRANT_EXPIRED');
  const key=commanderPublicKey(grant.clientPublicKeyDerBase64),cmd=verifyCommanderPayload(envelope,key.key);
  if(cmd.schema!=='leeway.commander.command.v1'||cmd.sessionId!==sessionId||cmd.deviceId!==this.deviceId||cmd.clientId!==grant.clientId||!id(cmd.commandId)||!id(cmd.nonce))throw Error('COMMANDER_COMMAND_IDENTITY_INVALID');
  if(!grant.capabilities.includes(cmd.capability)||!COMMANDER_REMOTE_READ_CAPABILITIES.includes(cmd.capability))throw Error('COMMANDER_CAPABILITY_NOT_GRANTED');
  if(!Number.isSafeInteger(cmd.issuedAtMs)||!Number.isSafeInteger(cmd.expiresAtMs)||cmd.issuedAtMs>now+1000||cmd.expiresAtMs<=now||cmd.expiresAtMs<=cmd.issuedAtMs||cmd.expiresAtMs-cmd.issuedAtMs>15000||cmd.expiresAtMs>grant.expiresAtMs)throw Error('COMMANDER_COMMAND_EXPIRED_OR_UNBOUNDED');
  if(cmd.arguments===null||typeof cmd.arguments!=='object'||Array.isArray(cmd.arguments))throw Error('COMMANDER_ARGUMENTS_INVALID');
  if(await this.store.reserve(sessionId,cmd.commandId,cmd.nonce)!==true)throw Error('COMMANDER_COMMAND_REPLAYED');
  const pre={kind:'commander.execution.pre',sessionId,commandId:cmd.commandId,deviceId:this.deviceId,capability:cmd.capability,argumentsHash:sha(Buffer.from(JSON.stringify(cmd.arguments))),timeMs:now};
  await this.receiptSink(pre);
  // Re-read after admission I/O. Revocation always wins before dispatch.
  if((await this.store.get(sessionId))?.state!=='PAIRED'||this.clock()>=grant.expiresAtMs)throw Error('COMMANDER_SESSION_REVOKED_BEFORE_EXECUTION');
  let value,status='PASS',error=null;
  try{value=await this.execute(cmd.capability,cmd.arguments);if(value?.ok===false){status='FAILED';error='COMMANDER_EXECUTOR_REJECTED';}}
  catch{status='FAILED';error='COMMANDER_EXECUTION_FAILED';value=null;}
  const result={schema:'leeway.commander.result.v1',sessionId,commandId:cmd.commandId,nonce:cmd.nonce,deviceId:this.deviceId,clientId:cmd.clientId,capability:cmd.capability,status,value,error,issuedAtMs:this.clock(),formulaExecution:'NOT_EVALUATED_BY_TRANSPORT'};
  await this.receiptSink({kind:'commander.execution.post',sessionId,commandId:cmd.commandId,status,resultHash:sha(Buffer.from(JSON.stringify(result))),timeMs:this.clock()});
  return signCommanderPayload(result,this.privateKey);
 }
}
