import fs from 'node:fs';
export function inspectRuntimeGpuProvider({registryPath,adapterManifestPath}={}){
 if(!registryPath||!adapterManifestPath)return {registered:false,serviceReady:false,reason:'CANONICAL_REGISTRY_BINDING_REQUIRED'};
 try{
  const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
  const provider=registry.providers?.['edge-gpu-provider'];
  const manifest=JSON.parse(fs.readFileSync(adapterManifestPath,'utf8'));
  const registered=provider?.providerId==='edge-gpu-provider'&&provider.capability==='compute.gpu'&&provider.binding?.adapterId==='edge-gpu'&&provider.required===true&&manifest.id==='edge-gpu'&&manifest.contract==='compute.gpu';
  return {registered,providerStatus:provider?.status??null,providerId:provider?.providerId??null,serviceReady:false,governedDispatchQualified:false,reason:registered?'REGISTRY_PRESENT_GOVERNED_EXECUTION_UNVERIFIED':'GPU_REGISTRY_BINDING_MISMATCH'};
 }catch{return {registered:false,serviceReady:false,reason:'CANONICAL_REGISTRY_UNREADABLE'}}
}