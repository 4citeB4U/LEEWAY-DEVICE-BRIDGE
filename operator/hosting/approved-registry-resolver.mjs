/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.REGISTRY.GITHUB
TAG: LEEWAY.MANAGED.REGISTRY.GITHUB_SNAPSHOT.V1
5WH:
WHAT = Load the canonical Device Bridge registry snapshot from an immutable GitHub source revision.
WHY = Managed startup must receive an explicit registry source rather than a device-local provider.
WHO = Creator-scoped LeeWay Bridge operator; GitHub is source custody, not device admission authority.
WHERE = operator/hosting/approved-registry-resolver.mjs.
WHEN = 2026-11-25.
HOW = Pin repository, commit, content SHA-256, schema, and fail-closed zero-device admission.
AUTHORITY = SOURCE_SNAPSHOT_ONLY; nonempty enrollment requires separately qualified signed passport verification.
LICENSE = MIT
*/
import { createHash } from 'node:crypto';

const REPO='4citeB4U/LEEWAY-DEVICE-BRIDGE';
const REGISTRY_PATH='registry/managed-device-registry.v1.json';
const MAX_REGISTRY_BYTES=65536;
const CANONICAL_AUTHORITY='TRUSTED_RUNTIME_DEVICE_REGISTRY';
const CANONICAL_SCHEMA='leeway.managed-device-registry.v1';

/**
 * GitHub hosts the canonical revisioned record. Its contents alone never
 * confer trusted *device* identity. Until canonical signed passport evidence
 * and revocation validation are integrated, only the explicit empty snapshot
 * may be admitted; a nonempty snapshot is denied, not promoted by a flag.
 */
export async function loadApprovedRegistryResolver(env=process.env, {
  fetchImpl=globalThis.fetch,
}={}) {
  const revision=String(env.LEEWAY_DEVICE_REGISTRY_GITHUB_COMMIT || '').trim().toLowerCase();
  const digest=String(env.LEEWAY_DEVICE_REGISTRY_GITHUB_SHA256 || '').trim().toLowerCase();
  if (!revision && !digest) return null;
  if (!/^[a-f0-9]{40}$/.test(revision) || !/^[a-f0-9]{64}$/.test(digest)) {
    throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_PIN_INVALID');
  }
  const ownerSubject=String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  if (!/^[A-Za-z0-9_-][A-Za-z0-9_.:-]{7,127}$/.test(ownerSubject)) {
    throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_OWNER_UNBOUND');
  }
  if (typeof fetchImpl!=='function') throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_FETCH_UNAVAILABLE');
  const url='https://raw.githubusercontent.com/'+REPO+'/'+revision+'/'+REGISTRY_PATH;
  return async function resolveDeviceRegistry() {
    let response;
    try {
      response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
    } catch {
      throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_UNAVAILABLE');
    }
    if (!response?.ok || response.status!==200) {
      throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_UNAVAILABLE');
    }
    const claimedLength=Number(response.headers?.get?.('content-length')||0);
    if (claimedLength>MAX_REGISTRY_BYTES) throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_TOO_LARGE');
    let bytes;
    try {bytes=new Uint8Array(await response.arrayBuffer());}
    catch {throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_READ_FAILED');}
    if (bytes.length>MAX_REGISTRY_BYTES) throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_TOO_LARGE');
    if (createHash('sha256').update(bytes).digest('hex')!==digest) {
      throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_DIGEST_MISMATCH');
    }
    let doc;
    try {doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
    catch {throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_JSON_INVALID');}
    if (!doc || Array.isArray(doc) || typeof doc!=='object' ||
        Object.keys(doc).sort().join(',')!=='authority,records,schemaVersion' ||
        doc.schemaVersion!==CANONICAL_SCHEMA || doc.authority!==CANONICAL_AUTHORITY ||
        !Array.isArray(doc.records)) {
      throw Error('MANAGED_BRIDGE_GITHUB_REGISTRY_SCHEMA_INVALID');
    }
    if (doc.records.length!==0) {
      throw Error('MANAGED_BRIDGE_SIGNED_ENROLLMENT_NOT_QUALIFIED');
    }
    return Object.freeze({
      authority:CANONICAL_AUTHORITY,
      ownerSubject,
      records:Object.freeze([]),
      provenance:Object.freeze({repository:REPO,commit:revision,sha256:digest}),
    });
  };
}
