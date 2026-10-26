/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.CONTINUUM.IDENTITY.BINDING
TAG: LEEWAY.CONTINUUM.CANONICAL.PROVIDER.BINDING.V1
WHO: LeeWay Industries
WHAT: Resolve existing owner-admitted Continuum provider for Pocket ID archives
WHEN: 2026-10-26
WHERE: operator/identity/bind-canonical-continuum.mjs
WHY: Reuse canonical provider and prevent the read-only Brain projection from being misidentified as durable intake
HOW: Inject module entrypoint and binding; reject test-only governance and unqualified write intake
AUTHORITY: Provider composition only; never creates authority or bypasses admission
LICENSE: MIT
*/
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
export async function bindCanonicalContinuum({modulePath, binding, context, governancePreGate, allowTestOnlyGate=false}={}){
 if (!modulePath || !binding?.databasePath || !binding?.ownerId || !binding?.bodyId) throw Error('CANONICAL_CONTINUUM_BINDING_REQUIRED');
 if (!context || context.ownerId!==binding.ownerId || context.bodyId!==binding.bodyId || !Array.isArray(context.capabilities) || !context.capabilities.includes('continuum.read') || !context.capabilities.includes('continuum.write')) throw Error('CONTINUUM_OWNER_WRITE_SCOPE_REQUIRED');
 if (allowTestOnlyGate || typeof governancePreGate!=='function') throw Error('CONTINUUM_PRODUCTION_GATE_REQUIRED');
 const module=await import(pathToFileURL(resolve(modulePath)).href);
 if (typeof module.createContinuumService!=='function') throw Error('CANONICAL_CONTINUUM_FACTORY_MISSING');
 const service=module.createContinuumService({binding, governancePreGate, allowTestOnlyGate:false});
 if (typeof service?.ingestFile!=='function' || typeof service?.getContent!=='function') throw Error('CANONICAL_CONTINUUM_RW_UNBOUND');
 // This binding intentionally performs no enrollment, initialization or write.
 // The canonical runtime must complete owner-authorized initialization before archival.
 return Object.freeze({service,context});
}
