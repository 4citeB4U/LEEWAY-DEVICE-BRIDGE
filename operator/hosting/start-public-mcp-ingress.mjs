/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC.MCP.HOST
TAG: LEEWAY.PLATFORM_AGNOSTIC.PUBLIC_MCP_INGRESS.V1
5WH:
WHAT = Run the existing stateless Device Bridge MCP/OAuth ingress on a managed Node HTTP service.
WHY = Permit GitHub-sourced Railway or another qualified always-on host without Vercel, Dockerfile, or local PC dependency.
WHO = LeeWay Industries; owner-authorized deployment operators.
WHERE = operator/hosting/start-public-mcp-ingress.mjs
WHEN = 2026-10-28
HOW = Reuse canonical existing API handlers, route exact paths, validate Railway PORT and fail closed on unbound upstream.
AUTHORITY: Transport only; not a Pocket ID issuer, Runtime Fabric, Device Bridge command provider, Continuum DB, or Veritas qualification.
LICENSE: MIT
*/
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createMcpIngressHandler } from '../../api/mcp.mjs';
import { createOAuthProtectedResourceHandler } from '../../api/oauth-protected-resource.mjs';
import { resolvePublicMcpResourceConfig, PUBLIC_MCP_METADATA_PATH } from '../identity/public-mcp-resource-config.mjs';

export const PUBLIC_GATEWAY_PATHS = Object.freeze([
  '/mcp',
  PUBLIC_MCP_METADATA_PATH,
  '/.well-known/oauth-protected-resource'
]);

export function resolvePublicMcpListenPort(env = process.env) {
  const raw = String(env.PORT ?? '3000');
  if (!/^[0-9]{2,5}$/.test(raw)) throw new Error('PUBLIC_MCP_PORT_INVALID');
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PUBLIC_MCP_PORT_INVALID');
  return port;
}

function json(res, status, payload, method = 'GET') {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  if (method === 'HEAD') res.end();
  else res.end(JSON.stringify(payload));
}

function configuredUpstream(env) {
  const source = String(env.LEEWAY_MCP_UPSTREAM || '').trim();
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
        url.hash || url.search || url.pathname !== '/mcp') return false;
    const resource = resolvePublicMcpResourceConfig(env);
    if (!resource.configured) return false;
    // A gateway must never forward MCP back into its own public resource.
    if (url.toString() === resource.audience) return false;
    return true;
  } catch { return false; }
}

/**
 * The HTTP server is a public, stateless transport only; it never resolves a
 * local device Bridge, signs tokens, or writes Continuum files.
 * Railway terminates external HTTPS and forwards HTTP to this PORT.
 */
export function createPublicMcpHttpServer({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  // Never forward tokens into our own public resource, even if misconfigured.
  const guardedFetch = (target, options) => {
    if (!configuredUpstream(env)) throw new Error('PUBLIC_MCP_UPSTREAM_UNQUALIFIED');
    return fetchImpl(target, options);
  };
  const ingress = createMcpIngressHandler({ env, fetchImpl: guardedFetch });
  const metadata = createOAuthProtectedResourceHandler({ env });
  const server = createServer(async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'no-referrer');
    let pathname;
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.search || url.hash) return json(res, 404, { error: 'NOT_FOUND' });
      pathname = url.pathname;
    } catch {
      return json(res, 400, { error: 'REQUEST_TARGET_INVALID' });
    }

    if (pathname === '/healthz') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, req.method);
      }
      return json(res, 200, {
        service: 'leeway-public-mcp-ingress',
        process: 'RUNNING',
        identityBinding: resolvePublicMcpResourceConfig(env).configured ? 'CONFIGURED_NOT_PROBED' : 'UNBOUND',
        runtimeUpstream: configuredUpstream(env) ? 'CONFIGURED_NOT_PROBED' : 'UNBOUND',
        authenticatedMcp: 'NOT_PROBED',
        deviceControl: 'NOT_AUTHORIZED',
        continuumReadback: 'NOT_PROBED',
        veritas: 'NOT_PROBED',
        receiptLedger: 'NOT_PROBED',
        learningLedger: 'NOT_PROBED'
      }, req.method);
    }
    if (pathname === PUBLIC_MCP_METADATA_PATH || pathname === '/.well-known/oauth-protected-resource') {
      return metadata(req, res);
    }
    if (pathname === '/mcp') {
      try { return await ingress(req, res); }
      catch {
        if (!res.headersSent) json(res, 503, { error: 'PUBLIC_MCP_INGRESS_UNAVAILABLE' });
        else if (!res.writableEnded) res.destroy();
      }
      return;
    }
    return json(res, 404, { error: 'NOT_FOUND' }, req.method);
  });
  server.requestTimeout = 35_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

export async function startPublicMcpIngress({ env = process.env, log = console.error } = {}) {
  const port = resolvePublicMcpListenPort(env);
  const server = createPublicMcpHttpServer({ env });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', resolve);
  });
  // Never log secrets, tokens, device IDs, or owner identity.
  log(JSON.stringify({
    service: 'leeway-public-mcp-ingress',
    listener: 'BOUND',
    port,
    liveQualified: false,
    productionAdmission: 'NOT_GRANTED'
  }));
  return server;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  startPublicMcpIngress().catch(error => {
    console.error(JSON.stringify({
      status: 'PUBLIC_MCP_GATEWAY_START_DENIED',
      code: error?.message === 'PUBLIC_MCP_PORT_INVALID' ? 'PUBLIC_MCP_PORT_INVALID' : 'PUBLIC_MCP_LISTENER_UNAVAILABLE'
    }));
    process.exitCode = 1;
  });
}
