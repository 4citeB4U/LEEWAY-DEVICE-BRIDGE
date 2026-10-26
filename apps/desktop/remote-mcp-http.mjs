/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE / MCP REMOTE TRANSPORT
TAG: LEEWAY-DEVICE-BRIDGE-REMOTE-MCP-READONLY-V1
WHO: LeeWay Industries, owner-authorized Device Bridge maintainers.
WHAT: Authenticated stateless Streamable HTTP transport for canonical read-only MCP tools.
WHEN: Remote MCP integration qualification; no production deployment asserted.
WHERE: apps/desktop/remote-mcp-http.mjs
WHY: Reuse canonical Device Bridge tool registration without granting remote execution.
HOW: Authenticated request -> canonical createServer(discoveryOnly) -> SDK HTTP transport.
AUTHORITY: Authentication callback is supplied by approved host; no OAuth issuer is created here.
LICENSE: MIT
*/
import http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './mcp-server.mjs';

const MAX_BODY_BYTES = 128 * 1024;
const asUrl = value => new URL(value);
const jsonResponse = (res, status, payload) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
};
const send = (res, status, message) => {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify({ error: message }));
};
async function readBody(req) {
  let length = 0;
  const parts = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    parts.push(chunk);
  }
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

/**
 * Requires an already-authorized canonical Bridge instance and a host-supplied
 * authentication function. No bearer secret is hardcoded or logged.
 * Loopback-only by default; public deployment requires approved OAuth resource
 * validation at the hosting boundary before calling this handler.
 */
export function createRemoteMcpHttpServer({ bridge, authenticate, host = '127.0.0.1', resourceUrl, authorizationServerUrl } = {}) {
  if (!bridge || !(bridge.devices instanceof Map) || typeof bridge.discover !== 'function') {
    throw new Error('CANONICAL_BRIDGE_REQUIRED');
  }
  if (typeof authenticate !== 'function') throw new Error('AUTHENTICATION_PROVIDER_REQUIRED');
  if (host !== '127.0.0.1' && host !== '::1') {
    throw new Error('REMOTE_PUBLIC_BIND_NOT_QUALIFIED');
  }
  // OAuth-protected public resources require the exact registered HTTPS URL.
  const publicResource = resourceUrl ? asUrl(resourceUrl) : null;
  const issuerUrl = authorizationServerUrl ? asUrl(authorizationServerUrl) : null;
  if ((publicResource === null) !== (issuerUrl === null)) throw new Error('OAUTH_METADATA_CONFIGURATION_INCOMPLETE');
  if (publicResource && (publicResource.protocol !== 'https:' || issuerUrl.protocol !== 'https:' || publicResource.search || publicResource.hash || issuerUrl.search || issuerUrl.hash)) throw new Error('OAUTH_METADATA_HTTPS_REQUIRED');
  if (publicResource && publicResource.pathname !== '/mcp') throw new Error('OAUTH_RESOURCE_PATH_REQUIRED');
  const publicResourceId = publicResource?.href;
  return http.createServer(async (req, res) => {
    if (publicResource && req.url === '/.well-known/oauth-protected-resource') return jsonResponse(res, 200, { resource: publicResourceId, authorization_servers: [issuerUrl.href.replace(/\/$/, '')], scopes_supported: ['device.bridge.read'], bearer_methods_supported: ['header'] });
    if (publicResource && req.url === '/.well-known/oauth-protected-resource/mcp') return jsonResponse(res, 200, { resource: publicResourceId, authorization_servers: [issuerUrl.href.replace(/\/$/, '')], scopes_supported: ['device.bridge.read'], bearer_methods_supported: ['header'] });
    if (req.url !== '/mcp') return send(res, 404, 'NOT_FOUND');
    // Reject browser-origin calls: no browser origin is authorized by this
    // loopback-only service. Host-level OAuth verification is still required
    // before any public deployment or reverse proxy may be qualified.
    if (typeof req.headers.origin === 'string') return send(res, 403, 'ORIGIN_NOT_AUTHORIZED');
    let approved = false;
    try { approved = (await authenticate(req)) === true; }
    catch { approved = false; }
    if (!approved) {
      if (publicResource) res.setHeader('www-authenticate', `Bearer resource_metadata="${publicResource.origin}/.well-known/oauth-protected-resource/mcp", scope="device.bridge.read"`);
      return send(res, 401, 'UNAUTHORIZED');
    }
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST');
      return send(res, 405, 'METHOD_NOT_ALLOWED');
    }
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      return send(res, 415, 'JSON_REQUIRED');
    }
    let body;
    try { body = await readBody(req); }
    catch { return send(res, 400, 'INVALID_OR_OVERSIZED_JSON'); }
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const mcp = createServer(bridge, { discoveryOnly: true });
    try {
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) send(res, 500, 'MCP_REQUEST_FAILED');
    } finally {
      // Stateless per-request SDK instance: never persist sessions or tool privilege.
      if (res.writableFinished) await mcp.close().catch(() => {});
      else res.once('finish', () => { void mcp.close().catch(() => {}); });
    }
  });
}
