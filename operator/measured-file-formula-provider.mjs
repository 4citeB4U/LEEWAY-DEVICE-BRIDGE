/*
LEEWAY HEADER — DO NOT REMOVE
WHO: Trusted Device Bridge host.
WHAT: Observe bounded local file operations and bind their real lifecycle to Formula.
WHEN: 2026-11-15.
WHERE: operator/measured-file-formula-provider.mjs.
HOW: Snapshot bytes around the actual adapter, retain rollback evidence, obtain Formula execution ID.
WHY: Replace caller-invented pre/post facts and the missing 16-row execution collector.
*/
import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const emptyHash=hash(Buffer.alloc(0));
export function createMeasuredFileProvider({workspace,evidenceDirectory,formulaBaseUrl,repository}={}){
 const root=fs.realpathSync(workspace);fs.mkdirSync(evidenceDirectory,{recursive:true});
 const observations=new Map();
 const bounded=relative=>{
  if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('MEASURED_FILE_PATH_INVALID');
  const file=path.resolve(root,relative),rel=path.relative(root,file);
  if(!rel||rel==='..'||rel.startsWith(`..${path.sep}`)||path.isAbsolute(rel))throw Error('MEASURED_FILE_PATH_ESCAPES_ROOT');
  const real=fs.existsSync(file)?fs.realpathSync(file):path.join(fs.realpathSync(path.dirname(file)),path.basename(file));
  if(real!==file)throw Error('MEASURED_FILE_LINK_DENIED');return file;
 };
 const read=file=>{if(!fs.existsSync(file))return null;const s=fs.statSync(file);if(!s.isFile()||s.size>65536||s.nlink!==1)throw Error('MEASURED_FILE_TARGET_INVALID');return fs.readFileSync(file);};
 return {
  wrap(adapter){return {discover:()=>adapter.discover(),async execute(capability,args){
   if(!['device.files.read','device.files.write'].includes(capability))return adapter.execute(capability,args);
   const file=bounded(args.path),lock=`${file}.leeway-lease`,fd=fs.openSync(lock,'wx',0o600),requestId=randomUUID();
   try{
    const before=read(file);if(before)fs.writeFileSync(path.join(evidenceDirectory,`${requestId}.pre`),before,{flag:'wx',mode:0o600});
    const result=await adapter.execute(capability,args);if(result?.ok===false)throw Error('MEASURED_ADAPTER_FAILED');
    const after=read(file);if(!after)throw Error('MEASURED_POSTSTATE_MISSING');
    if(capability==='device.files.write'&&!after.equals(Buffer.from(args.text)))throw Error('MEASURED_WRITE_READBACK_MISMATCH');
    const observation={preStateSha256:before?hash(before):emptyHash,postStateSha256:hash(after),commandSha256:hash(JSON.stringify({capability,args})),stdoutSha256:hash(JSON.stringify(result)),exitCode:0,operationKind:capability==='device.files.read'?'READ':'MUTATE',observedAt:new Date().toISOString()};
    observations.set(hash(JSON.stringify({capability,args,result})),{requestId,observation,target:{repository,paths:[args.path]}});
    return result;
   }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
  }};},
  async formulaEvidenceProvider(execution){
   const key=hash(JSON.stringify({capability:execution.capability,args:execution.args,result:execution.result}));
   const measured=observations.get(key);if(!measured)throw Error('MEASURED_OPERATION_EVIDENCE_MISSING');observations.delete(key);
   if(execution.lifecycle?.length!==16)throw Error('MEASURED_LIFECYCLE_INCOMPLETE');
   const post=async(route,payload)=>{const r=await fetch(new URL(`/runtime/formula/v1/${route}`,formulaBaseUrl),{method:'POST',redirect:'error',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('MEASURED_FORMULA_HTTP_FAILURE');return r.json();};
   // Explicit mapping: admission, adapter membership, elapsed budget headroom,
   // free-memory ratio, observation-digest availability, completed checkpoint.
   // These are runtime features; the Formula output is a rank, never an A7 score.
   const evaluated=await post('evaluate',{adapterId:'runtime-state-v1',input:{stateRows:execution.lifecycle.map(x=>x.state),ranges:Array.from({length:6},()=>[0,1])},caller:'device-bridge-measured-file-v1',traceId:measured.requestId});
   const bundle=await post('g3-evidence-bundles',{...measured,producer:'LEEWAY-DEVICE-BRIDGE',formulaExecution:{executionId:evaluated.hostTraceId,inputHash:evaluated.inputHash,resultHash:evaluated.resultHash}});
   const record={schema:'leeway.measured-file-execution.v1',...measured,lifecycle:execution.lifecycle,formulaExecution:evaluated.hostTraceId,bundleSha256:bundle.bundleSha256,preReceipt:execution.preReceipt,postReceipt:execution.postReceipt};
   const fd=fs.openSync(path.join(evidenceDirectory,`${measured.requestId}.json`),'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(record,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
   return bundle;
  }
 };
}
