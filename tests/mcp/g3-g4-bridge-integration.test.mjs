/*
LEEWAY HEADER — DO NOT REMOVE
WHO: GUARD_FAMILY_5_SIGNAL_SENTINEL qualification runner.
WHAT: Actual Bridge file execution through four separate provider processes.
WHEN: 2026-11-15.
WHERE: tests/mcp/g3-g4-bridge-integration.test.mjs.
HOW: Explicit repository bindings, ephemeral test keys, real HTTP, signatures and restarts.
WHY: Catch the unplugged-host, unsigned-custody and volatile-readback regressions.
*/
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';
import {spawn} from 'node:child_process';import {once} from 'node:events';import {pathToFileURL,fileURLToPath} from 'node:url';import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {Bridge} from '../../packages/protocol/index.mjs';import {DesktopAdapter} from '../../apps/desktop/adapter.mjs';
import {bindProviderSpine} from '../../apps/desktop/runtime-composition.mjs';import {createMeasuredFileProvider} from '../../operator/measured-file-formula-provider.mjs';
import {createRuntimeInput} from '../../operator/runtime-fabric-host-provider.mjs';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const configured=process.env.LEEWAY_PROVIDER_TEST_ROOTS;
test('GUARD_FAMILY_5_SIGNAL_SENTINEL: separate-process Bridge file write, signed GET readbacks, replay, restart, tamper and outage', {skip:!configured&&'Set LEEWAY_PROVIDER_TEST_ROOTS to the three owning repository paths',timeout:90000},async t=>{
 const repos=JSON.parse(configured);
 for(const name of ['formula','veritas','receipt','ledger'])assert(path.isAbsolute(repos[name]));
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'leeway-spine-repair-'));const workspace=path.join(temp,'workspace');fs.mkdirSync(workspace);
 const ports={};for(const name of ['formula','veritas','receipt','ledger']){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');ports[name]=s.address().port;await new Promise(resolve=>s.close(resolve));}
 const keys={};for(const name of ['veritas','receipt','ledger']){const pair=generateKeyPairSync('ed25519');keys[name]={privateKey:pair.privateKey.export({type:'pkcs8',format:'pem'}),publicKey:pair.publicKey.export({type:'spki',format:'pem'})};for(const kind of ['privateKey','publicKey'])fs.writeFileSync(path.join(temp,`${name}-${kind}.pem`),keys[name][kind],{mode:0o600});}
 const children=new Map(),logs={};
 const envs={
  formula:{PORT:String(ports.formula),HOST:'127.0.0.1'},
  veritas:{LEEWAY_VERITAS_INSPECTION_ROOT:workspace,LEEWAY_VERITAS_SIGNING_KEY_PATH:path.join(temp,'veritas-privateKey.pem'),LEEWAY_VERITAS_PUBLIC_KEY_PATH:path.join(temp,'veritas-publicKey.pem'),LEEWAY_VERITAS_PORT:String(ports.veritas),LEEWAY_FORMULA_BASE_URL:`http://127.0.0.1:${ports.formula}`,LEEWAY_VERITAS_VERDICT_DIRECTORY:path.join(temp,'verdicts')},
  receipt:{PYTHONPATH:repos.receipt,LEEWAY_RECEIPT_DB_PATH:path.join(temp,'receipts.sqlite'),LEEWAY_VERITAS_PUBLIC_KEY_PATH:path.join(temp,'veritas-publicKey.pem'),LEEWAY_RECEIPT_PRIVATE_KEY_PATH:path.join(temp,'receipt-privateKey.pem'),LEEWAY_RECEIPT_PORT:String(ports.receipt)},
  ledger:{LEEWAY_LEDGER_STORAGE_PATH:path.join(temp,'ledger.jsonl'),LEEWAY_RECEIPT_BASE_URL:`http://127.0.0.1:${ports.receipt}`,LEEWAY_RECEIPT_PUBLIC_KEY_PATH:path.join(temp,'receipt-publicKey.pem'),LEEWAY_VERITAS_PUBLIC_KEY_PATH:path.join(temp,'veritas-publicKey.pem'),LEEWAY_LEDGER_PRIVATE_KEY_PATH:path.join(temp,'ledger-privateKey.pem'),LEEWAY_LEDGER_PORT:String(ports.ledger),LEEWAY_WORKER_BEHAVIORAL_IMPRINT_JSON:JSON.stringify({actingWorkerId:'CODEX_LOCAL_QUALIFICATION',assignedStationGuard:'GUARD_FAMILY_6_CHRONOS_HISTORIAN',sentinelTestPath:'tests/http-admission-service.test.mjs',imprintedRule:'SIGNED_CUSTODY_AND_DURABLE_READBACK'})}
 };
 const args={formula:['runtime/server.mjs'],veritas:['bin/start-g3-verdict-service.mjs'],receipt:['-u','-m','receipt_authority.http_provider'],ledger:['bin/start-admission-service.mjs']};
 const readyRoute={formula:'/runtime/formula/v1/health',veritas:'/v1/veritas/public-key',receipt:'/v1/receipts/public-key',ledger:'/v1/ledger/public-key'};
 const start=async name=>{
  const c=spawn(name==='receipt'?(process.env.LEEWAY_PYTHON||'python'):process.execPath,args[name],{cwd:repos[name],env:{...process.env,...envs[name]},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});children.set(name,c);logs[name]='';c.stdout.on('data',b=>logs[name]+=b);c.stderr.on('data',b=>logs[name]+=b);
  for(let i=0;i<80;i++){if(c.exitCode!==null)throw Error(`${name} exited: ${logs[name]}`);try{const r=await fetch(`http://127.0.0.1:${ports[name]}${readyRoute[name]}`,{signal:AbortSignal.timeout(200)});if(r.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
  throw Error(`${name} failed readiness: ${logs[name]}`);
 };
 const stop=async name=>{const c=children.get(name);if(!c||c.exitCode!==null||c.signalCode!==null)return;const exited=once(c,'exit');if(name==='ledger')c.send('shutdown');else c.kill();await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error(`${name} stop timeout`)),5000).unref())]);};
 t.after(async()=>{for(const name of [...children.keys()].reverse())await stop(name);});
 for(const name of ['formula','veritas','receipt','ledger'])await start(name);
 const formulaModule=path.join(repos.formula,'runtime/canonical/leeway-formula/v1/g3-g4-provider-handoff.mjs');
 const {transitionG3ToG4}=await import(pathToFileURL(formulaModule));
 const bindings={veritas:{endpoint:`http://127.0.0.1:${ports.veritas}/v1/veritas/verdict`,publicKeySpki:keys.veritas.publicKey},receipt:{endpoint:`http://127.0.0.1:${ports.receipt}/v1/receipts/append`,publicKeySpki:keys.receipt.publicKey},learningLedger:{endpoint:`http://127.0.0.1:${ports.ledger}/v1/ledger/admit`,publicKeySpki:keys.ledger.publicKey}};
 const measured=createMeasuredFileProvider({workspace,evidenceDirectory:path.join(temp,'execution-evidence'),formulaBaseUrl:`http://127.0.0.1:${ports.formula}`,repository:'LEEWAY-DEVICE-BRIDGE'});
 const deviceId=process.env.LEEWAY_QUALIFY_DEVICE_ID||`qualification-${os.hostname()}`;
 const runtimeInput=process.env.LEEWAY_QUALIFY_RUNTIME_BASE
  ? await createRuntimeInput({runtimeBaseUrl:process.env.LEEWAY_QUALIFY_RUNTIME_BASE,approvedRuntimeOrigin:new URL(process.env.LEEWAY_QUALIFY_RUNTIME_BASE).origin,controlTokenEnv:'LEEWAY_WORKPLANE_CONTROL_TOKEN',receiptPath:path.join(temp,'controller-observations.jsonl'),agentId:'codex-device-bridge-qualification'})
  : {admission:async q=>q.deviceId===deviceId&&['device.files.write','device.files.read'].includes(q.capability)&&/^qualification-[a-f0-9-]+\.mjs$/.test(q.args.path),receiptSink:async r=>fs.appendFileSync(path.join(temp,'controller-observations.jsonl'),JSON.stringify(r)+'\n')};
 const host=bindProviderSpine(runtimeInput,{formulaEvidenceProvider:measured.formulaEvidenceProvider,transitionG3ToG4,bindings});
 const bridge=new Bridge([{id:deviceId,grants:['device.files.write','device.files.read'],adapter:measured.wrap(new DesktopAdapter(workspace))}],host);
 const invoke=async(capability,args)=>bridge.call(deviceId,capability,args,{complianceCard:host.complianceCardProvider?await host.complianceCardProvider({deviceId,capability,args}):null});
 const text='/*\nWHO: Codex local qualification operator.\nWHAT: Controlled Bridge write.\nWHEN: 2026-11-15.\nWHERE: Isolated host workspace.\nHOW: DesktopAdapter file write and independent readback.\nWHY: Regression proof of provider repair.\n*/\nexport const proof=true;\n';
 const filename=`qualification-${randomUUID()}.mjs`;
 const result=await invoke('device.files.write',{path:filename,text});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.governance.state,'G4_ADMITTED',JSON.stringify(result.governance));assert.equal(fs.readFileSync(path.join(workspace,filename),'utf8'),text);
 const g=result.governance;assert.equal(g.receiptState,'READBACK_CONFIRMED');assert.equal(g.learningLedgerState,'ADMITTED');
 const read=await invoke('device.files.read',{path:filename});assert.equal(read.ok,true);assert.equal(read.result.text,text);assert.equal(read.governance.state,'G4_ADMITTED',JSON.stringify(read.governance));
 fs.writeFileSync(path.join(temp,'bridge-response.json'),JSON.stringify(result,null,2));
 if(process.env.LEEWAY_QUALIFY_RUNTIME_BASE){
  const bridgeRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  const providerModule=path.join(bridgeRoot,'operator/runtime-fabric-host-provider.mjs');
  const configPath=path.join(temp,'host.json'),bridgeConfig=path.join(temp,'bridge.json');
  const sourceHash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  fs.writeFileSync(bridgeConfig,JSON.stringify({devices:[{id:deviceId,type:'desktop',platform:process.platform,workspace,grants:['device.files.write','device.files.read']}]}));
  fs.writeFileSync(configPath,JSON.stringify({runtimeProviderModule:providerModule,runtimeProviderSha256:sourceHash(providerModule),formulaHandoffModule:formulaModule,formulaHandoffSha256:sourceHash(formulaModule),bridgeConfig,measuredDeviceIds:[deviceId],measuredFiles:{workspace,evidenceDirectory:path.join(temp,'mcp-execution-evidence'),formulaBaseUrl:`http://127.0.0.1:${ports.formula}`,repository:'LEEWAY-DEVICE-BRIDGE'},bindings,runtime:{runtimeBaseUrl:process.env.LEEWAY_QUALIFY_RUNTIME_BASE,approvedRuntimeOrigin:new URL(process.env.LEEWAY_QUALIFY_RUNTIME_BASE).origin,controlTokenEnv:'LEEWAY_WORKPLANE_CONTROL_TOKEN',receiptPath:path.join(temp,'mcp-observations.jsonl'),agentId:'codex-device-bridge-qualification'}}));
  const client=new Client({name:'provider-repair-qualification',version:'1.0.0'});
  const transport=new StdioClientTransport({command:process.execPath,args:[path.join(bridgeRoot,'operator/start-provider-bound-mcp.mjs'),configPath],env:process.env,stderr:'pipe'});
  try{await client.connect(transport);const response=await client.callTool({name:'device_files_write',arguments:{deviceId,arguments:{path:`qualification-${randomUUID()}.mjs`,text}}});const actual=JSON.parse(response.content[0].text);assert.equal(actual.ok,true,JSON.stringify(actual));assert.equal(actual.governance.state,'G4_ADMITTED',JSON.stringify(actual.governance));fs.writeFileSync(path.join(temp,'mcp-response.json'),JSON.stringify(actual,null,2));}
  finally{await client.close();}
 }
 const replay=await transitionG3ToG4({bundle:g.evidenceBundle,bindings});assert.match(replay.reason,/HTTP_409/);
 const bad={...g.evidenceBundle,producer:'forged'};assert.match((await transitionG3ToG4({bundle:bad,bindings})).reason,/BUNDLE_INVALID/);
 const post=async(url,body)=>fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const fakeSignature={...g.attestation,signature:Buffer.alloc(64).toString('base64')};const badSigResponse=await post(bindings.receipt.endpoint,{schema:'leeway.receipt-authority.append-request.v1',evidenceBundle:g.evidenceBundle,veritasAttestation:fakeSignature});assert.equal(badSigResponse.status,422);assert.equal((await badSigResponse.json()).error,'RECEIPT_VERITAS_SIGNATURE_INVALID');
 await stop('receipt');await start('receipt');
 const crashed=children.get('ledger'),crashedExit=once(crashed,'exit');crashed.kill();await crashedExit;
 envs.ledger.LEEWAY_LEDGER_RECOVER_DEAD_WRITER='1';await start('ledger');
 const rr=await(await fetch(`http://127.0.0.1:${ports.receipt}/v1/receipts/${g.receipt.receiptId}`)).json();assert.deepEqual(rr,g.receipt);
 const lr=await(await fetch(`http://127.0.0.1:${ports.ledger}/v1/ledger/${g.admission.admissionId}`)).json();assert.deepEqual(lr,g.admission);
 await stop('veritas');
 const outageFile=`qualification-${randomUUID()}.mjs`;const outage=await invoke('device.files.write',{path:outageFile,text});assert.equal(outage.ok,true);assert.equal(outage.governance.state,'G4_NOT_TRANSITIONED');assert.equal(fs.readFileSync(path.join(workspace,outageFile),'utf8'),text);
 console.log(JSON.stringify({scope:'LOCAL_FILE_EXECUTION_WITH_TEST_KEYS',host:os.hostname(),deviceId,receiptId:g.receipt.receiptId,admissionId:g.admission.admissionId,receiptRestartReadback:true,ledgerRestartReadback:true,replayRejected:true,badSignatureRejected:true,outagePreservesExecution:true,evidenceDirectory:temp}));
});
