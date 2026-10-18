/*
REGION: LeeWay Device Bridge K2 candidate
TAG: LEEWAY-K2-APPLE-PREFLIGHT
WHAT: Shape-check non-secret Apple preflight facts bound to a selected target and release.
WHY: Reject stale, conflicting, or wrong-target observations before canonical integration.
HOW: Strict field-source mapping and release binding; no live authority claim.
WHO: K2 contributor; K1 owns integration review.
WHEN: 2026-10-18
WHERE: Isolated candidate, not production runtime.
*/
const SOURCE_BY_FIELD = Object.freeze({
  targetIdentity: 'DEVICE_ENUMERATION',
  deviceTrust: 'DEVICE_ENUMERATION',
  providerSession: 'PROVIDER_SUPPORTED_STATUS',
  accountAuthorization: 'PROVIDER_SUPPORTED_STATUS',
  signingIdentity: 'SIGNING_METADATA',
  certificateValidity: 'SIGNING_METADATA',
  profileBundle: 'PROFILE_METADATA',
  profileDevice: 'PROFILE_METADATA',
  entitlements: 'PROFILE_METADATA'
});
const STATES = new Set(['PASS','FAIL','NOT_OBSERVED']);
const VALID_DIGEST = /^[a-f\d]{64}$/i;
const hasOwn = (o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function qualifyAppleEvidence(evidence,{targetToken,bundleId,version,build,packageSha256,at=Date.now(),maxAgeMs=300000}={}) {
  if (!evidence || typeof targetToken !== 'string' || !targetToken || typeof bundleId !== 'string' || !bundleId || typeof version !== 'string' || !version || !Number.isInteger(build) || build <= 0 || !VALID_DIGEST.test(packageSha256 ?? '') || !Number.isFinite(at) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return {state:'INPUT_INCOMPLETE',ready:false,installationAuthorized:false};
  if (!Array.isArray(evidence.observations)) return {state:'OBSERVATIONS_MISSING',ready:false,installationAuthorized:false};
  const results={};
  for (const [field,source] of Object.entries(SOURCE_BY_FIELD)) {
    const items=evidence.observations.filter(x=>x?.field===field);
    if(items.length!==1){results[field]=items.length?'CONFLICTING_OBSERVATIONS':'NOT_OBSERVED';continue;}
    const x=items[0];
    if(!STATES.has(x.state) || x.sourceType!==source || !Number.isFinite(x.observedAt) || x.observedAt>at || (at-x.observedAt)>maxAgeMs){results[field]='INVALID_OR_STALE_EVIDENCE';continue;}
    if(x.targetToken!==targetToken || x.bundleId!==bundleId){results[field]='TARGET_OR_BUNDLE_MISMATCH';continue;}
    if(x.version!==version || x.build!==build || typeof x.packageSha256!=='string' || x.packageSha256.toLowerCase()!==packageSha256.toLowerCase()) {results[field]='RELEASE_MISMATCH';continue;}
    // Source labels, tokens, and local timestamps are not cryptographic provenance.
    results[field]=x.state;
  }
  const blockers=Object.entries(results).filter(([,state])=>state!=='PASS').map(([field,state])=>({field,state}));
  return {state:blockers.length?'APPLE_PREFLIGHT_NOT_QUALIFIED':'EVIDENCE_SHAPE_QUALIFIED_ONLY',ready:false,results,blockers,sourceAuthorityVerified:false,installationAuthorized:false};
}
