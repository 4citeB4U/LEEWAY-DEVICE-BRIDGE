/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MANAGED.MCP.HOST
TAG: LEEWAY.ZITADEL.MANAGED.NATIVE_BRIDGE.V1
5WH:
WHAT = Start the existing canonical Bridge MCP on managed Node hosting, independent of a workstation.
WHY = A public gateway must forward to a genuine Bridge, not a Tailscale-only host or back to Runtime.
WHO = Creator-scoped operator; authenticated Zitadel principal.
WHERE = operator/hosting/start-managed-device-mcp.mjs.
WHEN = 2026-11-23.
HOW = Explicit HTTPS/owner/host bindings, canonical Bridge factory, read-only discovery; no manufactured registry or C3 gates.
AUTHORITY = Discoverability only; physical enrollment and execution require separately qualified trusted host composition.
LICENSE = MIT
*/
import http from 'node:http';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createConfiguredBridge,
  createDiscoveryConfiguredBridge,
} from '../../apps/desktop/mcp-server.mjs';
import { createZitadelMcpHandler } from '../identity/create-zitadel-mcp-handler.mjs';
import { loadApprovedRegistryResolver } from './approved-registry-resolver.mjs';

function secureUrl(value, expectedPath) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw Error('MANAGED_BRIDGE_URL_INVALID'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
      url.search || url.hash || url.pathname !== expectedPath) {
    throw Error('MANAGED_BRIDGE_URL_INVALID');
  }
  return url;
}

/** No issuer, owner, device, port, host or authority is inferred from OS. */
export function resolveManagedDeviceMcpConfig(env = process.env) {
  const configPath = String(env.LEEWAY_DEVICE_BRIDGE_CONFIG || '').trim();
  const issuer = secureUrl(env.LEEWAY_MCP_AUTH_ISSUER, '/');
  const resource = secureUrl(env.LEEWAY_MCP_AUDIENCE, '/mcp');
  const publicUrl = secureUrl(env.LEEWAY_MANAGED_DEVICE_BRIDGE_URL, '/mcp');
  const ownerSubject = String(env.LEEWAY_MCP_OWNER_SUB || '').trim();
  const portValue = String(env.PORT || '').trim();
  if (!configPath) throw Error('MANAGED_BRIDGE_ADAPTER_CONFIG_REQUIRED');
  if (!/^[A-Za-z0-9_-][A-Za-z0-9_.:-]{7,127}$/.test(ownerSubject)) {
    throw Error('MANAGED_BRIDGE_OWNER_SUB_REQUIRED');
  }
  if (!/^[0-9]{4,5}$/.test(portValue) || Number(portValue)<1024 ||
      Number(portValue)>65535) throw Error('MANAGED_BRIDGE_PORT_INVALID');
  if (publicUrl.origin === resource.origin ||
      publicUrl.origin === issuer.origin) throw Error('MANAGED_BRIDGE_ROUTE_LOOP_DENIED');
  const tokenAudiences = [...new Set(String(env.LEEWAY_MCP_TOKEN_AUDIENCES || '')
    .split(/[\n,]/).map(x => x.trim()).filter(Boolean))];
  if (tokenAudiences.some(x=>x.length>256 || !/^[A-Za-z0-9][A-Za-z0-9._:\/-]{0,255}$/.test(x))) {
    throw Error('MANAGED_BRIDGE_TOKEN_AUDIENCE_INVALID');
  }
  return Object.freeze({
    configPath, issuer:String(env.LEEWAY_MCP_AUTH_ISSUER).trim(), resource:resource.toString(),
    publicUrl:publicUrl.toString(), ownerSubject, port:Number(portValue),
    allowedHost:publicUrl.host, tokenAudiences:Object.freeze(tokenAudiences),
    executionEnabled:false,
  });
}

export function createManagedDeviceMcpServer({
  config,
  bridge,
  fetchImpl,
  onDeny = null,
  registryState = null,
} = {}) {
  if (!config || !bridge) throw Error('MANAGED_BRIDGE_CONFIGURATION_REQUIRED');
  const effectiveRegistryState = registryState ?? Object.freeze({
    authority:null,
    registrationState:'REGISTRATION_AUTHORITY_UNBOUND',
    registeredDeviceCount:0,
    ready:false,
  });
  const handler = createZitadelMcpHandler({
    issuer:config.issuer, resource:config.resource,
    ownerSubject:config.ownerSubject, tokenAudiences:config.tokenAudiences,
    fetchImpl, executionEnabled:false, onDeny,
    resolveBridge:async principal=>principal?.subject === config.ownerSubject ? bridge : null,
    allowedHosts:[config.allowedHost], allowedOrigins:[],
  });
  return http.createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    const route = (req.url || '').split('?')[0];
    if (req.url?.includes('?') || req.url?.includes('#')) {
      res.writeHead(404,{'content-type':'application/json'});res.end('{"error":"NOT_FOUND"}');return;
    }
    if(route==='/healthz' && (req.method==='GET'||req.method==='HEAD')) {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(req.method==='HEAD'?'':JSON.stringify({
        service:'leeway-managed-device-mcp',status:'RUNNING',
        identity:'CONFIGURED_NOT_PROBED',
        deviceRegistry:effectiveRegistryState.authority ?? 'REGISTRATION_AUTHORITY_UNBOUND',
        registrationState:effectiveRegistryState.registrationState,
        registeredDeviceCount:effectiveRegistryState.registeredDeviceCount,
        deviceReachability:'NOT_PROBED',execution:'NOT_AUTHORIZED',
        formula:'NOT_PROBED',independentVeritas:'NOT_PROBED',receiptAdmission:'NOT_PROBED'
      }));return;
    }
    if(route==='/readyz' && (req.method==='GET'||req.method==='HEAD')) {
      res.writeHead(effectiveRegistryState.ready ? 200 : 503,{'content-type':'application/json'});
      res.end(req.method==='HEAD'?'':JSON.stringify({
        service:'leeway-managed-device-mcp',
        status:effectiveRegistryState.ready?'READY':'NOT_READY',
        deviceRegistry:effectiveRegistryState.authority ?? 'REGISTRATION_AUTHORITY_UNBOUND',
        registrationState:effectiveRegistryState.registrationState,
        registeredDeviceCount:effectiveRegistryState.registeredDeviceCount,
        deviceReachability:'NOT_PROBED',execution:'NOT_AUTHORIZED',
      }));return;
    }
    if(route!== '/mcp') {
      res.writeHead(404,{'content-type':'application/json'});res.end('{"error":"NOT_FOUND"}');return;
    }
    // The established Zitadel verifier and canonical MCP tool policy own this path.
    return handler(req,res);
  });
}

export function normalizeManagedDeviceRegistry(value) {
  if (!value || value.authority !== 'TRUSTED_RUNTIME_DEVICE_REGISTRY') {
    throw Error('MANAGED_BRIDGE_REGISTRY_AUTHORITY_INVALID');
  }
  if (!(value.records instanceof Map) && !Array.isArray(value.records)) {
    throw Error('MANAGED_BRIDGE_REGISTRY_RECORDS_INVALID');
  }
  const entries = value.records instanceof Map
    ? [...value.records.entries()]
    : value.records.map(record=>[record?.id ?? record?.deviceId,record]);
  const ids = new Set();
  for (const [id,record] of entries) {
    if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) ||
        !record || typeof record !== 'object' || Array.isArray(record) ||
        typeof record.platform !== 'string' || !record.platform.trim() || ids.has(id)) {
      throw Error('MANAGED_BRIDGE_REGISTRY_RECORD_INVALID');
    }
    ids.add(id);
  }
  return Object.freeze({
    authority:'TRUSTED_RUNTIME_DEVICE_REGISTRY',
    records:value.records,
    registrationState:entries.length === 0
      ? 'NO_REGISTERED_ADAPTERS'
      : 'TRUSTED_REGISTRY_READ',
    registeredDeviceCount:entries.length,
    ready:true,
  });
}

// Owner-private identity bindings cannot be retrieved from the managed hosting
// provider's redacted variable API. Provisioning never authorizes a fallback
// issuer, default owner subject, or synthetic enrolled device.
const REQUIRED_MANAGED_BINDINGS = Object.freeze([
  'LEEWAY_DEVICE_BRIDGE_CONFIG',
  'LEEWAY_MCP_AUTH_ISSUER',
  'LEEWAY_MCP_AUDIENCE',
  'LEEWAY_MANAGED_DEVICE_BRIDGE_URL',
  'LEEWAY_MCP_OWNER_SUB'
]);

function configuredManagedPort(env) {
  const value = String(env.PORT || '').trim();
  if (!/^[0-9]{4,5}$/.test(value) || Number(value)<1024 ||
      Number(value)>65535) throw Error('MANAGED_BRIDGE_PORT_INVALID');
  return Number(value);
}

export function unboundManagedBindings(env=process.env) {
  return Object.freeze(REQUIRED_MANAGED_BINDINGS.filter(
    name=>!String(env[name] || '').trim()));
}

export function createUnboundManagedDeviceMcpServer({missing=[]}={}) {
  const required = [...missing];
  return http.createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','application/json');
    const path = req.url || '/';
    if (path === '/healthz' && (req.method==='GET'||req.method==='HEAD')) {
      res.writeHead(200);
      res.end(req.method==='HEAD'?'':JSON.stringify({
        service:'leeway-managed-device-mcp',status:'BOOTSTRAP_ONLY',
        identity:'UNBOUND',runtimeBridge:'NOT_CONSTRUCTED',deviceRegistry:'REGISTRATION_AUTHORITY_UNBOUND',
        deviceReachability:'NOT_PROBED',execution:'NOT_AUTHORIZED',
        formula:'NOT_PROBED',independentVeritas:'NOT_PROBED',receiptAdmission:'NOT_PROBED',
        productionAdmission:'NOT_GRANTED',missingConfiguration:required
      }));
      return;
    }
    if (path === '/readyz' || path === '/mcp') {
      res.writeHead(503);
      res.end(JSON.stringify({error:'MANAGED_BRIDGE_CONFIGURATION_UNBOUND'}));
      return;
    }
    res.writeHead(404);
    res.end(JSON.stringify({error:'NOT_FOUND'}));
  });
}

/**
 * Render Free may create the public hostname before Zitadel's exact owner
 * subject is securely bound. The bootstrap returns liveness only and denies
 * every MCP request until all five explicit bindings are present. No
 * untrusted request can elevate the bootstrap mode.
 */
export async function startManagedDeviceMcp({
  env=process.env,
  fetchImpl=globalThis.fetch,
  log=console.error,
  resolveDeviceRegistry=null,
}={}) {
  const port = configuredManagedPort(env);
  const missing = unboundManagedBindings(env);
  if (missing.length) {
    const server = createUnboundManagedDeviceMcpServer({missing});
    await new Promise((resolve,reject)=>{
      server.once('error',reject);
      server.listen(port,'0.0.0.0',resolve);
    });
    log(JSON.stringify({service:'leeway-managed-device-mcp',
      status:'BOOTSTRAP_ONLY',port,missingConfiguration:missing,
      productionAdmission:'NOT_GRANTED'}));
    return server;
  }
  const config = resolveManagedDeviceMcpConfig(env);
  // A config lists adapters, not trusted enrollment. Runtime admission is
  // intentionally absent. This service MUST NOT grant device execution.
  let registryState = Object.freeze({
    authority:null,
    registrationState:'REGISTRATION_AUTHORITY_UNBOUND',
    registeredDeviceCount:0,
    ready:false,
  });
  if (typeof resolveDeviceRegistry === 'function') {
    try {
      registryState = normalizeManagedDeviceRegistry(await resolveDeviceRegistry());
    } catch (error) {
      log(JSON.stringify({service:'leeway-managed-device-mcp',
        event:'TRUSTED_REGISTRY_PROVIDER_FAILED',
        reasonCode:/^[A-Z0-9_]+$/.test(error?.message||'')
          ? error.message
          : 'MANAGED_BRIDGE_REGISTRY_PROVIDER_FAILURE'}));
    }
  }
  const bridge = registryState.ready
    ? await createDiscoveryConfiguredBridge(config.configPath, {deviceRegistry:registryState.records})
    : await createConfiguredBridge(config.configPath);
  // Opt-in codes only; no bearer token, claim, subject, issuer or key logged.
  const onDeny = env.LEEWAY_BRIDGE_AUTH_DIAGNOSTICS === 'SAFE_CODES'
    ? code=>log(JSON.stringify({service:'leeway-managed-device-mcp',
        event:'ZITADEL_AUTH_DENIED',reasonCode:code}))
    : null;
  const server = createManagedDeviceMcpServer({config,bridge,fetchImpl,onDeny,registryState});
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(config.port,'0.0.0.0',resolve);
  });
  log(JSON.stringify({service:'leeway-managed-device-mcp',status:'BOUND',
    port:config.port,scope:'ZITADEL_DISCOVERY_ONLY',
    authority:registryState.authority ?? 'REGISTRATION_AUTHORITY_UNBOUND',
    registrationState:registryState.registrationState,
    registeredDeviceCount:registryState.registeredDeviceCount,
    productionAdmission:'NOT_GRANTED'}));
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolvePath(process.argv[1])).href) {
  // GitHub stores revision-pinned source; it does not establish device enrollment.
  // Missing or invalid source preserves the existing fail-closed managed boundary.
  (async()=>{
    const resolver=await loadApprovedRegistryResolver(process.env);
    await startManagedDeviceMcp({resolveDeviceRegistry:resolver});
  })().catch(error=>{
    console.error('MANAGED_BRIDGE_STARTUP_DENIED '+(
      /^[A-Z0-9_]+$/.test(error?.message||'')?error.message:'CONFIGURATION_OR_ADAPTER_FAILURE'));
    process.exitCode=1;
  });
}
