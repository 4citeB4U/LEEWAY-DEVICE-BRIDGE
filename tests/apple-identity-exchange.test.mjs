/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_IDENTITY.TEST
TAG: LEEWAY.APPLE_SIGNIN_RUNTIME_EXCHANGE_NEGATIVE_TEST
5WH:
WHAT = Exercise Apple ID token verification and Runtime-only session issuance using synthetic cryptographic keys.
WHY = Reject forged, expired, replayed, cross-client and unapproved Apple logins without accessing real accounts.
WHO = LeeWay owner-authorized engineering contributors.
WHERE = tests/apple-identity-exchange.test.mjs.
WHEN = 2026-11-07.
HOW = Generated RSA test key, fake Apple JWKS, mocked Runtime callbacks and HTTP response assertions.
LICENSE = MIT.
*/
import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign,createHash} from "node:crypto";
import {createAppleSessionExchangeHandler} from "../operator/identity/apple-session-exchange.mjs";

const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const publicJwk=publicKey.export({format:"jwk"});
const key={...publicJwk,kid:"synthetic-apple-kid",kty:"RSA",use:"sig",alg:"RS256"};
const nonce="11111111-2222-4333-8444-55555555555522222222-3333-4444-8555-666666666666";
const nowValue=1794082800000;
const nowSeconds=Math.floor(nowValue/1000);
const hashNonce=x=>createHash("sha256").update(x).digest("hex");
const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
const baseClaims={
 iss:"https://appleid.apple.com",
 aud:"industries.leeway.devicebridge",
 sub:"apple-synthetic-user-00001",
 exp:nowSeconds+300,iat:nowSeconds-5,nonce:hashNonce(nonce)
};
function token(claims=baseClaims,keyMaterial=privateKey) {
 const unsigned=encode({alg:"RS256",kid:key.kid,typ:"JWT"})+"."+encode(claims);
 return unsigned+"."+sign("RSA-SHA256",Buffer.from(unsigned),keyMaterial).toString("base64url");
}
function request(identityToken=token(),challengeNonce=nonce) {
 return {method:"POST",url:"/v1/device-bridge/apple/session",
  headers:{host:"identity.leeway.example", "content-type":"application/json"},
  body:{client:"industries.leeway.devicebridge",identityToken,nonce:challengeNonce}};
}
function response(){
 let state={status:null,body:null,headers:null};
 return {state,writeHead(status,headers){state.status=status;state.headers=headers;},
  end(content){state.body=JSON.parse(content);}};
}
function makeFixture(overrides={}){
 let calls={keys:0,consume:0,session:0};
 const replay=new Set();
 const dependencies={
  allowedHosts:["identity.leeway.example"],
  now:()=>nowValue,
  fetchImpl:async url=>{
    calls.keys++;
    assert.equal(url,"https://appleid.apple.com/auth/keys");
    return {ok:true,status:200,json:async()=>({keys:[key]})};
  },
  consumeNonce:async data=>{
    calls.consume++;
    assert.equal(data.authority,"LEEWAY_RUNTIME_FABRIC");
    if(replay.has(data.nonceHash)) return {consumed:false,authority:"LEEWAY_RUNTIME_FABRIC"};
    replay.add(data.nonceHash);
    return {consumed:true,authority:"LEEWAY_RUNTIME_FABRIC"};
  },
  issueRuntimeSession:async data=>{
    calls.session++;
    return {issuer:"LEEWAY_RUNTIME_FABRIC",verified:true,providerSubject:data.providerSubject};
  },
  ...overrides
 };
 return {calls,handler:createAppleSessionExchangeHandler(dependencies)};
}
test("a valid synthetic Apple-signed token reaches existing Runtime, not a new issuer",async()=>{
 const {calls,handler}=makeFixture();
 const res=response();
 await handler(request(),res);
 assert.equal(res.state.status,200);
 assert.equal(res.state.body.state,"AUTHENTICATED");
 assert.equal(res.state.body.deviceAdmission,"SEPARATE_C3_REQUIRED");
 assert.equal(res.state.headers["Cache-Control"],"no-store");
 assert.equal(calls.consume,1);
 assert.equal(calls.session,1);
 assert.equal(JSON.stringify(res.state.body).includes("apple-synthetic-user"),false);
});
test("nonce replay fails before asking Runtime to create a new session",async()=>{
 const {calls,handler}=makeFixture();
 const a=response(),b=response();
 await handler(request(),a);
 await handler(request(),b);
 assert.equal(a.state.status,200);
 assert.equal(b.state.status,401);
 assert.equal(b.state.body.state,"APPLE_NONCE_REPLAY_OR_UNADMITTED");
 assert.equal(calls.session,1);
});
test("mismatched audience, issuer, expiration and client nonce are rejected",async()=>{
 for(const claims of [
  {...baseClaims,aud:"some.other.app"},
  {...baseClaims,iss:"https://evil.example"},
  {...baseClaims,exp:nowSeconds-1},
  {...baseClaims,iat:nowSeconds+500},
  {...baseClaims,nonce:hashNonce("wrong")}
 ]){
   const {calls,handler}=makeFixture();
   const res=response();
   await handler(request(token(claims)),res);
   assert.equal(res.state.status,401);
   assert.equal(calls.consume,0);
   assert.equal(calls.session,0);
 }
});
test("signed-looking token from a different RSA key is rejected",async()=>{
 const {privateKey:impostor}=generateKeyPairSync("rsa",{modulusLength:2048});
 const {handler,calls}=makeFixture();
 const res=response();
 await handler(request(token(baseClaims,impostor)),res);
 assert.equal(res.state.status,401);
 assert.equal(calls.session,0);
});
test("missing or unavailable trusted Runtime providers never become sessions",async()=>{
 assert.throws(()=>createAppleSessionExchangeHandler(),/TRUSTED_APPLE_IDENTITY_EXCHANGE_REQUIRED/);
 for(const override of [
  {consumeNonce:async()=>({consumed:false})},
  {issueRuntimeSession:async()=>({issuer:"LEEWAY_RUNTIME_FABRIC",verified:false})},
  {issueRuntimeSession:async()=>{throw Error("provider unavailable")}}
 ]){
   const {handler}=makeFixture(override);
   const res=response();
   await handler(request(),res);
   assert.notEqual(res.state.status,200);
 }
});
test("foreign host, unknown method and oversized body fail before Apple key discovery",async()=>{
 const {handler,calls}=makeFixture();
 const foreign=request();foreign.headers.host="evil.example";
 const denied=response();
 await handler(foreign,denied);
 assert.equal(denied.state.status,403);
 const get=request();get.method="GET";
 const wrongMethod=response();
 await handler(get,wrongMethod);
 assert.equal(wrongMethod.state.status,404);
 const large=request();large.body.identityToken="x".repeat(25000);
 const oversized=response();
 await handler(large,oversized);
 assert.equal(oversized.state.status,400);
 assert.equal(calls.keys,0);
});
