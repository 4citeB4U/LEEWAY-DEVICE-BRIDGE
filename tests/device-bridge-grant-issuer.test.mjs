import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,verify} from "node:crypto";
import {createDeviceBridgeGrantIssuer} from "../packages/protocol/device-bridge-grant-issuer.mjs";
const {privateKey,publicKey}=generateKeyPairSync("ed25519");
const pem=privateKey.export({format:"pem",type:"pkcs8"});
const now=Date.parse("2026-10-19T15:00:00Z");
const input={applicationId:"leeway-gpu-apple",requestId:"apple-gpu-req-001",nonce:"owner-challenge-nonce-12345",expiresAt:"2026-10-19T15:01:00Z"};
const issuer=overrides=>createDeviceBridgeGrantIssuer({privateKeyPem:pem,issuerId:"leeway-device-bridge-test",now:()=>now,authorizeOwner:async()=>true,...overrides});
test("owner-approved fixture grant carries authentic Ed25519 signature",async()=>{
 const grant=await issuer()(input);
 assert.equal(grant.applicationId,input.applicationId);
 const payload=JSON.stringify([grant.applicationId,grant.requestId,grant.nonce,grant.grantId,grant.issuerId,grant.expiresAt]);
 assert.equal(verify(null,Buffer.from(payload),publicKey,Buffer.from(grant.signature,"base64")),true);
});
test("no owner authorization provider blocks issuance",async()=>{
 assert.equal((await issuer({authorizeOwner:null})(input)).status,"BLOCKED");
});
test("owner denial blocks issuance",async()=>{
 assert.equal((await issuer({authorizeOwner:async()=>false})(input)).reason,"OWNER_DENIED");
});
test("missing external signing key blocks issuance",async()=>{
 assert.equal((await issuer({privateKeyPem:null})(input)).reason,"ISSUER_KEY_OR_OWNER_AUTH_UNBOUND");
});
test("expired and oversized grant lifetime denied",async()=>{
 assert.equal((await issuer()({...input,expiresAt:"2026-10-19T14:00:00Z"})).reason,"INVALID_GRANT_EXPIRY");
 assert.equal((await issuer()({...input,expiresAt:"2026-10-19T15:30:00Z"})).reason,"INVALID_GRANT_EXPIRY");
});
