/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.REGISTRY.BINDING
TAG: LEEWAY.MANAGED.REGISTRY.APPROVED_RESOLVER.V1
5WH:
WHAT = Bind a host-supplied approved registry provider to the existing managed Device Bridge resolver seam.
WHY = The standalone entrypoint previously invoked startup without any registry provider.
WHO = Creator-authorized Bridge deployment operator; not an identity issuer.
WHERE = operator/hosting/approved-registry-resolver.mjs.
WHEN = 2026-11-25.
HOW = Require an explicit module path, SHA-256 content pin, verified export and owner binding; fail closed.
AUTHORITY = Binding only. The approved provider must independently verify canonical signed enrollment and revocation.
LICENSE = MIT
*/
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * An approved provider is source-controlled and pin-verified; it must export
 * resolveDeviceRegistry({ ownerSubject }) and return the existing canonical
 * {authority, ownerSubject, records} contract. No registry or owner is inferred.
 * Missing provider => null, so existing /readyz=503 and discovery=UNBOUND remain.
 */
export async function loadApprovedRegistryResolver(env=process.env, {
  readFileImpl=readFile,
  importModule=url=>import(url),
}={}) {
  const filename=String(env.LEEWAY_APPROVED_DEVICE_REGISTRY_PROVIDER_MODULE || '').trim();
  const pin=String(env.LEEWAY_APPROVED_DEVICE_REGISTRY_PROVIDER_SHA256 || '').trim().toLowerCase();
  if (!filename && !pin) return null;
  if (!filename || !isAbsolute(filename) || !/^[a-f0-9]{64}$/.test(pin)) {
    throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_BINDING_INVALID');
  }
  const ownerSubject=String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  if (!ownerSubject || !/^[A-Za-z0-9_-][A-Za-z0-9_.:-]{7,127}$/.test(ownerSubject)) {
    throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_OWNER_UNBOUND');
  }
  let source;
  try { source=await readFileImpl(filename); }
  catch { throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_SOURCE_UNAVAILABLE'); }
  const digest=createHash('sha256').update(source).digest('hex');
  if (digest!==pin) throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_DIGEST_MISMATCH');
  let module;
  try { module=await importModule(pathToFileURL(filename).href); }
  catch { throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_LOAD_FAILED'); }
  if (typeof module?.resolveDeviceRegistry !== 'function') {
    throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_EXPORT_INVALID');
  }
  return async function resolveDeviceRegistry() {
    const value=await module.resolveDeviceRegistry({ownerSubject});
    if (!value || value.ownerSubject!==ownerSubject) {
      throw Error('MANAGED_BRIDGE_REGISTRY_PROVIDER_OWNER_MISMATCH');
    }
    return value;
  };
}
