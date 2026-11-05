// LeeWay Device Bridge grant issuer: production signing keys MUST be supplied
// by an authorized external key custodian. No embedded or generated keys here.
import {createPrivateKey,sign,randomUUID} from "node:crypto";
const canonical=g=>JSON.stringify([g.applicationId,g.requestId,g.nonce,g.grantId,g.issuerId,g.expiresAt]);
export function createDeviceBridgeGrantIssuer({privateKeyPem,issuerId,authorizeOwner,now=()=>Date.now(),maxLifetimeMs=120000}={}) {
 let key;
 try {if(privateKeyPem && issuerId){key=createPrivateKey(privateKeyPem);if(key.asymmetricKeyType!=="ed25519")key=null;}}catch{key=null}
 return async function issue({applicationId,requestId,nonce,expiresAt}={}) {
  if(!key || typeof authorizeOwner!=="function") return {status:"BLOCKED",reason:"ISSUER_KEY_OR_OWNER_AUTH_UNBOUND"};
  if(typeof applicationId!=="string" || !applicationId.startsWith("leeway-") ||
    typeof requestId!=="string" || !requestId ||
    typeof nonce!=="string" || nonce.length<16) return {status:"BLOCKED",reason:"INVALID_GRANT_REQUEST"};
  const expiry=Date.parse(expiresAt);
  if(!Number.isFinite(expiry) || expiry<=now() || expiry-now()>maxLifetimeMs)
   return {status:"BLOCKED",reason:"INVALID_GRANT_EXPIRY"};
  let approved=false;
  try {approved=(await authorizeOwner({applicationId,requestId,nonce,expiresAt}))===true;}
  catch{return {status:"BLOCKED",reason:"OWNER_AUTH_FAILED"}}
  if(!approved)return {status:"BLOCKED",reason:"OWNER_DENIED"};
  const grant={applicationId,requestId,nonce,grantId:randomUUID(),issuerId,expiresAt};
  return {...grant,signature:sign(null,Buffer.from(canonical(grant),"utf8"),key).toString("base64")};
 };
}
