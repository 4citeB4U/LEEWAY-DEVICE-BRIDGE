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
    configPath, issuer:issuer.toString(), resource:resource.toString(),
    publicUrl:publicUrl.toString(), ownerSubject, port:Number(portValue),
    allowedHost:publicUrl.host, tokenAudiences:Object.freeze(tokenAudiences),
    executionEnabled:false,
  });
}

export function createManagedDeviceMcpServer({ config, bridge, fetchImpl } = {}) {
  if (!config || !bridge) throw Error('MANAGED_BRIDGE_CONFIGURATION_REQUIRED');
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
    if(route==='/healthz' && (req.method==='GET'||req.method==='HEAD')) {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(req.method==='HEAD'?'':JSON.stringify({
        service:'leeway-managed-device-mcp',status:'RUNNING',
        identity:'CONFIGURED_NOT_PROBED',deviceRegistry:'REGISTRATION_AUTHORITY_UNBOUND',
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

export async function startManagedDeviceMcp({env=process.env,fetchImpl=globalThis.fetch,log=console.error}={}) {
  const config = resolveManagedDeviceMcpConfig(env);
  // A config lists adapters, not trusted enrollment. Runtime admission is
  // intentionally absent. This service MUST NOT grant device execution.
  const bridge = await createConfiguredBridge(config.configPath);
  const server = createManagedDeviceMcpServer({config,bridge,fetchImpl});
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(config.port,'0.0.0.0',resolve);
  });
  log(JSON.stringify({service:'leeway-managed-device-mcp',status:'BOUND',
    port:config.port,scope:'ZITADEL_DISCOVERY_ONLY',
    authority:'REGISTRATION_AUTHORITY_UNBOUND',productionAdmission:'NOT_GRANTED'}));
  return server;
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolvePath(process.argv[1])).href) {
  startManagedDeviceMcp().catch(error=>{
    console.error('MANAGED_BRIDGE_STARTUP_DENIED '+(
      /^[A-Z0-9_]+$/.test(error?.message||'')?error.message:'CONFIGURATION_OR_ADAPTER_FAILURE'));
    process.exitCode=1;
  });
}
