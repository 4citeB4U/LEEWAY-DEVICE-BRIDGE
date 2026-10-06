/*
LEEWAY_HEADER - DO NOT REMOVE
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER.ADMISSION
TAG: NATIVE_COMMANDER_ADMISSION_EVIDENCE
5WH: WHAT=Independently verify retained live-admission evidence; WHY=Actual binding and native read-back must agree;
WHO=Creator-authorized verifier; WHERE=scripts/Verify-NativeAdmission.mjs; WHEN=2026-10-06;
HOW=Hash raw envelopes, compare live source/policy/loader bindings and persisted admission receipt. LICENSE: MIT
*/
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const dir=path.resolve(process.argv[2]),bindingFile=path.resolve(process.argv[3]);const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const receipt=JSON.parse(fs.readFileSync(path.join(dir,'receipt.json'),'utf8'));
const binding=JSON.parse(fs.readFileSync(bindingFile,'utf8'));
const envelopes=fs.readdirSync(dir).filter(f=>f.endsWith('.native.json')).map(file=>{const bytes=fs.readFileSync(path.join(dir,file));const value=JSON.parse(bytes),{receiptHash,...body}=value;return {file,rawSha256:sha(bytes),integrity:sha(JSON.stringify(body))===receiptHash,provider:value.provider,receiptHash};});
const before=JSON.parse(fs.readFileSync(path.join(dir,'prestate.json'),'utf8'));
const checks={receiptPass:receipt.status==='PASS',sourcePin:sha(fs.readFileSync(binding.sourcePath)).toUpperCase()===binding.sourceSha256,policyPin:sha(fs.readFileSync(binding.policyPath)).toUpperCase()===binding.policySha256,sourceCommit:receipt.sourceCommit===binding.sourceCommit,bindingHash:sha(fs.readFileSync(bindingFile)).toUpperCase()===receipt.newBindingSha256,loaderUnchanged:sha(fs.readFileSync(path.join(path.dirname(bindingFile),'host-commander-server.mjs'))).toUpperCase()===before.loaderSha256,threeNativeEnvelopes:envelopes.length===3,envelopeIntegrity:envelopes.every(e=>e.integrity&&e.provider==='LEEWAY_NATIVE_HOST_COMMANDER'),oldBindingRetained:sha(fs.readFileSync(path.join(dir,'binding-before.json'))).toUpperCase()===receipt.oldBindingSha256};
const result={receiptType:'NATIVE_ADMISSION_INDEPENDENT_VERIFICATION',status:Object.values(checks).every(Boolean)?'PASS':'FAIL',checks,envelopes,admissionReceiptSha256:sha(fs.readFileSync(path.join(dir,'receipt.json'))),signatureClaim:'UNSIGNED_CONTENT_INTEGRITY_ONLY',at:new Date().toISOString()};
fs.writeFileSync(path.join(dir,'independent-verification.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));if(result.status!=='PASS')process.exitCode=1;
