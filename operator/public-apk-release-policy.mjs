/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE_BRIDGE.RELEASE.ADMISSION
TAG: LEEWAY.RELEASE.PUBLIC_APK_ADMISSION.V1
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
5WH:
WHAT = Deny public APK download unless release manifest explicitly authorizes the exact signed production artifact.
WHY = Stop bypass of revoked release via a tracked debug APK or renamed file.
WHO = Original Device Bridge Release/OS Trust owner.
WHERE = operator/public-apk-release-policy.mjs.
WHEN = 2026-11-12.
HOW = Pure source-level policy check; actual live hosting, signer and vendor reputation must be separately verified.
LICENSE: Existing repository terms remain unchanged.
*/
import path from 'node:path';
const sha=v=>typeof v==='string' && /^[a-f0-9]{64}$/i.test(v);
export function publicApkReleaseAuthorized(filename, meta){
 if(typeof filename!=='string'||!filename.toLowerCase().endsWith('.apk')) return false;
 if(filename.toLowerCase().includes('debug')||!meta||typeof meta!=='object') return false;
 if(meta.releaseState!=='AUTHORIZED_RELEASED'||meta.downloadEnabled!==true||
    meta.publicReleaseAuthorized!==true||!sha(meta.sha256)||
    !sha(meta.signingCertificateSha256)||typeof meta.authorizedReleaseEvidenceRef!=='string'||
    !meta.authorizedReleaseEvidenceRef.trim()||typeof meta.downloadUrl!=='string') return false;
 try{
   const pathname=new URL(meta.downloadUrl,'https://release.local.invalid/').pathname;
   return path.posix.basename(pathname)===filename;
 }catch{return false}
}
