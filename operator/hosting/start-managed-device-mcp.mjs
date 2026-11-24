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
import { createConfiguredBridge } from '../../apps/desktop/mcp-server.mjs';
import { createZitadelMcpHandler } from '../identity/create-zitadel-mcp-handler.mjs';

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

export function createManagedDeviceMcpServer({ config, bridge, fetchImpl } = {}) {
  if (!config || !bridge) throw Error('MANAGED_BRIDGE_CONFIGURATION_REQUIRED');
  const registryBound = bridge.deviceRegistry instanceof Map || Array.isArray(bridge.deviceRegistry);
  const registrationAuthority = registryBound ? 'TRUSTED_RUNTIME_DEVICE_REGISTRY' : null;
  const registrationState = registryBound
    ? 'TRUSTED_RUNTIME_DEVICE_REGISTRY_BOUND'
    : 'REGISTRATION_AUTHORITY_UNBOUND';
  const handler = createZitadelMcpHandler({
    issuer:config.issuer, resource:config.resource,
    ownerSubject:config.ownerSubject, tokenAudiences:config.tokenAudiences,
    fetchImpl, executionEnabled:false,
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
    if((route==='/healthz'||route==='/readyz') && (req.method==='GET'||req.method==='HEAD')) {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(req.method==='HEAD'?'':JSON.stringify({
        service:'leeway-managed-device-mcp',
        status:route==='/readyz'?'READY_FOR_AUTHENTICATED_DISCOVERY':'RUNNING',
        identity:'CONFIGURED_NOT_PROBED',deviceRegistry:registrationState,
        registrationAuthority,
        deviceReachability:'NOT_PROBED',execution:'NOT_AUTHORIZED',
        formula:'NOT_PROBED',independentVeritas:'NOT_PROBED',receiptAdmission:'NOT_PROBED'
      }));return;
    }
    if(route!== '/mcp') {
      res.writeHead(404,{'content-type':'application/json'});res.end('{"error":"NOT_FOUND"}');return;
    }
    // The established Zitadel verifier and canonical MCP tool policy own this path.
    return handler(req,res);
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
  env=process.env,fetchImpl=globalThis.fetch,log=console.error,runtimeInput=null
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
  // A config lists adapters, not trusted enrollment. When supplied, the
  // Runtime composition is host-injected and validated by the canonical
  // factory; request/env/config data cannot manufacture registry authority.
  // This managed ingress remains discovery-only even with a trusted registry.
  const bridge = await createConfiguredBridge(config.configPath,runtimeInput);
  const server = createManagedDeviceMcpServer({config,bridge,fetchImpl});
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(config.port,'0.0.0.0',resolve);
  });
  log(JSON.stringify({service:'leeway-managed-device-mcp',status:'BOUND',
    port:config.port,scope:'ZITADEL_DISCOVERY_ONLY',
    authority:bridge.deviceRegistry instanceof Map || Array.isArray(bridge.deviceRegistry)
      ? 'TRUSTED_RUNTIME_DEVICE_REGISTRY'
      : 'REGISTRATION_AUTHORITY_UNBOUND',
    productionAdmission:'NOT_GRANTED'}));
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolvePath(process.argv[1])).href) {
  startManagedDeviceMcp().catch(error=>{
    console.error('MANAGED_BRIDGE_STARTUP_DENIED '+(
      /^[A-Z0-9_]+$/.test(error?.message||'')?error.message:'CONFIGURATION_OR_ADAPTER_FAILURE'));
    process.exitCode=1;
  });
}
