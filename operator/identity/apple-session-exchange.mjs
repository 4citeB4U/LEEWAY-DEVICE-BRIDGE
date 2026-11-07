/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.APPLE_IDENTITY.RUNTIME
TAG: LEEWAY.APPLE_IDENTITY_TRUSTED_EXCHANGE
5WH:
WHAT = Verify Apple identity assertions before asking existing LeeWay Runtime Fabric to issue a session.
WHY = Native Apple sign-in alone must never become a Device Bridge grant or a second identity issuer.
WHO = LeeWay Runtime Fabric owner and Device Bridge authenticated host integrators.
WHERE = operator/identity/apple-session-exchange.mjs.
WHEN = 2026-11-07.
HOW = RS256 Apple JWKS, exact audience/issuer/nonce/time, atomic Runtime replay gate and trusted session callback.
LICENSE = MIT.
*/
import {createHash,createPublicKey,timingSafeEqual,verify as verifySignature} from 'node:crypto';
import {once} from 'node:events';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS = 'https://appleid.apple.com/auth/keys';
const APP_ID = 'industries.leeway.devicebridge';
const SESSION_PATH = '/v1/device-bridge/apple/session';
const B64URL = /^[A-Za-z0-9_-]+$/;
const NONCE = /^[A-Fa-f0-9-]{32,96}$/;
function part(value) {
  if(typeof value!=='string' || value.length<2 || value.length>8192 || !B64URL.test(value)) throw Error('APPLE_TOKEN_MALFORMED');
  const data=Buffer.from(value,'base64url');
  if(data.toString('base64url')!==value) throw Error('APPLE_TOKEN_MALFORMED');
  return JSON.parse(data.toString('utf8'));
}
function cleanHeader(req) {
  const raw=String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase();
  return raw==='application/json';
}
function write(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}
async function readBody(req,maxBytes) {
  if(req.body!==undefined) {
    const value=typeof req.body==='string'?req.body:JSON.stringify(req.body);
    if(Buffer.byteLength(value)>maxBytes) throw Error('APPLE_REQUEST_TOO_LARGE');
    return JSON.parse(value);
  }
  const chunks=[];let total=0;
  for await(const chunk of req) {
    total+=chunk.length;
    if(total>maxBytes) throw Error('APPLE_REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createAppleSessionExchangeHandler({
  consumeNonce, issueRuntimeSession, allowedHosts, allowedOrigins=[], fetchImpl=fetch,
  now=()=>Date.now(), maxBodyBytes=24_576
}={}) {
  if(typeof consumeNonce!=='function'||typeof issueRuntimeSession!=='function'||
     typeof fetchImpl!=='function'||typeof now!=='function'||
     !Array.isArray(allowedHosts)||allowedHosts.length<1||
     allowedHosts.some(x=>typeof x!=='string'||!x.trim()||x.includes('*'))||
     !Array.isArray(allowedOrigins)||allowedOrigins.some(x=>typeof x!=='string'||!x.startsWith('https://')||x.includes('*'))||
     !Number.isSafeInteger(maxBodyBytes)||maxBodyBytes<1024||maxBodyBytes>65536)
    throw Error('TRUSTED_APPLE_IDENTITY_EXCHANGE_REQUIRED');
  const hosts=new Set(allowedHosts),origins=new Set(allowedOrigins);
  let keys={until:0,values:[]};
  async function verifyAppleIdToken(identityToken,nonce) {
    if(typeof identityToken!=='string'||identityToken.length>16384||typeof nonce!=='string'||!NONCE.test(nonce)) throw Error('APPLE_ASSERTION_INVALID');
    const pieces=identityToken.split('.');
    if(pieces.length!==3||!B64URL.test(pieces[2])||pieces[2].length>8192) throw Error('APPLE_ASSERTION_INVALID');
    const head=part(pieces[0]),claims=part(pieces[1]);
    if(head?.alg!=='RS256'||typeof head.kid!=='string'||head.kid.length>128||head.kid.length<1||
       (head.typ!==undefined && head.typ!=='JWT')||head.jku||head.jwk||head.x5u||head.crit)
      throw Error('APPLE_JWT_HEADER_REJECTED');
    const sec=Math.floor(now()/1000);
    if(claims.iss!==APPLE_ISSUER||claims.aud!==APP_ID||
       typeof claims.sub!=='string'||claims.sub.length<5||claims.sub.length>256||
       !Number.isSafeInteger(claims.exp)||claims.exp<=sec||
       !Number.isSafeInteger(claims.iat)||claims.iat>sec+30||claims.iat<sec-900||
       (claims.nbf!==undefined&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>sec+30))||
       typeof claims.nonce!=='string') throw Error('APPLE_JWT_CLAIMS_REJECTED');
    const expected=createHash('sha256').update(nonce).digest('hex');
    if(claims.nonce.length!==expected.length||
       !timingSafeEqual(Buffer.from(claims.nonce),Buffer.from(expected))) throw Error('APPLE_NONCE_MISMATCH');
    if(keys.until<=now() || !keys.values.some(k=>k.kid===head.kid)) {
      const response=await fetchImpl(APPLE_KEYS,{signal:AbortSignal.timeout(5000),redirect:'error',headers:{Accept:'application/json'}});
      if(!response?.ok||response.status!==200) throw Error('APPLE_JWKS_UNAVAILABLE');
      const payload=await response.json();
      if(!Array.isArray(payload?.keys)||payload.keys.length<1||payload.keys.length>20) throw Error('APPLE_JWKS_INVALID');
      keys={until:now()+300000,values:payload.keys};
    }
    const matches=keys.values.filter(k=>k.kid===head.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig'&&
      typeof k.n==='string'&&typeof k.e==='string');
    if(matches.length!==1) throw Error('APPLE_JWKS_KEY_AMBIGUOUS');
    const key=createPublicKey({key:matches[0],format:'jwk'});
    const good=verifySignature('RSA-SHA256',Buffer.from(pieces[0]+'.'+pieces[1]),key,Buffer.from(pieces[2],'base64url'));
    if(!good) throw Error('APPLE_TOKEN_SIGNATURE_INVALID');
    return Object.freeze({subject:claims.sub,issuer:claims.iss,audience:APP_ID,expiresAt:claims.exp,nonceHash:expected});
  }
  return async function exchange(req,res) {
    if(!hosts.has(req.headers?.host) ||
       (req.headers?.origin!==undefined&&!origins.has(req.headers.origin))) return write(res,403,{state:'APPLE_ORIGIN_DENIED'});
    if(req.method!=='POST'||(req.url||'').split('?')[0]!==SESSION_PATH) return write(res,404,{state:'APPLE_SESSION_ROUTE_UNAVAILABLE'});
    if(!cleanHeader(req)) return write(res,415,{state:'APPLE_JSON_REQUIRED'});
    let body;
    try{body=await readBody(req,maxBodyBytes)}catch{return write(res,400,{state:'APPLE_BODY_INVALID'});}
    if(!body||Object.keys(body).sort().join(',')!=='client,identityToken,nonce'||body.client!==APP_ID) return write(res,400,{state:'APPLE_ASSERTION_INVALID'});
    let verified;
    try{verified=await verifyAppleIdToken(body.identityToken,body.nonce);}
    catch{return write(res,401,{state:'APPLE_ASSERTION_REJECTED'});}
    let consumed;
    try{consumed=await consumeNonce({
       authority:'LEEWAY_RUNTIME_FABRIC',subject:verified.subject,
       nonceHash:verified.nonceHash,expiresAt:verified.expiresAt,audience:APP_ID
    });}
    catch{return write(res,503,{state:'RUNTIME_REPLAY_AUTHORITY_UNAVAILABLE'});}
    if(consumed?.consumed!==true||consumed?.authority!=='LEEWAY_RUNTIME_FABRIC') return write(res,401,{state:'APPLE_NONCE_REPLAY_OR_UNADMITTED'});
    let session;
    try{session=await issueRuntimeSession({provider:'apple',providerSubject:verified.subject,providerIssuer:verified.issuer,deviceClientId:APP_ID});}
    catch{return write(res,503,{state:'RUNTIME_SESSION_UNAVAILABLE'});}
    if(session?.issuer!=='LEEWAY_RUNTIME_FABRIC'||session?.verified!==true||
       session?.providerSubject!==verified.subject) return write(res,503,{state:'RUNTIME_SESSION_NOT_ADMITTED'});
    // Return an acknowledgement, not an arbitrary unsigned bearer. Actual Bridge commands require Runtime-scoped access tokens.
    return write(res,200,{state:'AUTHENTICATED',sessionVerified:true,issuer:'LEEWAY_RUNTIME_FABRIC',deviceAdmission:'SEPARATE_C3_REQUIRED'});
  };
}
