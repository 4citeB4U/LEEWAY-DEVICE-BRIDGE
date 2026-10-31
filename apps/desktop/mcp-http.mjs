/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.MCP
TAG: LEEWAY_AUTHENTICATED_HTTP_MCP
5WH: WHAT=Stateless HTTP MCP ingress; WHY=Route all devices through the existing Bridge; WHO=LeeWay Industries; WHERE=apps/desktop/mcp-http.mjs; WHEN=2026-10-26; HOW=Authenticate then resolve owner-scoped Bridge then shared MCP tools.
AUTHORIZED_ROLES: Trusted Runtime startup supplies authentication, device scope, admission and durable evidence.
LICENSE: MIT
*/
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Bridge } from '../../packages/protocol/index.mjs';
import { createServer } from './mcp-server.mjs';

const MAX_BYTES = 1024 * 1024;
const reply = (res, status, error) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error }));
};

/**
 * Host code supplies these callbacks; request data never selects modules/providers.
 * resolveBridge must return a fresh, principal-scoped Bridge with owner providers.
 * This factory issues no credentials and infers no authority from an OS or device name.
 */
export function createRemoteMcpHandler({ authenticate, resolveBridge, allowedHosts, allowedOrigins = [], discoveryOnly = false } = {}) {
  if (typeof authenticate !== 'function' || typeof resolveBridge !== 'function' ||
      !Array.isArray(allowedHosts) || !allowedHosts.length ||
      allowedHosts.some(x => typeof x !== 'string' || !x.trim() || x.includes('*')) ||
      !Array.isArray(allowedOrigins) ||
      allowedOrigins.some(x => typeof x !== 'string' || !x.startsWith('https://') || x.includes('*')) ||
      (typeof discoveryOnly !== 'boolean' && typeof discoveryOnly !== 'function')) {
    throw Error('TRUSTED_MCP_HTTP_CONFIGURATION_REQUIRED');
  }
  const hosts = new Set(allowedHosts);
  const origins = new Set(allowedOrigins);
  return async function handleMcp(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (!hosts.has(req.headers.host) ||
        (req.headers.origin !== undefined && !origins.has(req.headers.origin))) {
      return reply(res, 403, 'MCP_ORIGIN_OR_HOST_DENIED');
    }
    let principal;
    try { principal = await authenticate(req); } catch {}
    if (!principal) return reply(res, 401, 'MCP_AUTHENTICATION_REQUIRED');
    // Stateless mode: no cross-request session or server-initiated event stream.
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return reply(res, 405, 'METHOD_NOT_ALLOWED');
    }
    if (!String(req.headers['content-type'] || '').split(';')[0].trim().match(/^application\/json$/i)) {
      return reply(res, 415, 'JSON_CONTENT_TYPE_REQUIRED');
    }
    let body;
    try {
      if (req.body !== undefined) {
        const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        if (Buffer.byteLength(raw) > MAX_BYTES) return reply(res, 413, 'MCP_BODY_TOO_LARGE');
        body = JSON.parse(raw);
      } else {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += Buffer.byteLength(chunk);
          if (size > MAX_BYTES) return reply(res, 413, 'MCP_BODY_TOO_LARGE');
          chunks.push(Buffer.from(chunk));
        }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      }
    } catch { return reply(res, 400, 'INVALID_JSON'); }
    let server;
    try {
      const bridge = await resolveBridge(principal);
      if (!(bridge instanceof Bridge) || typeof bridge.admission !== 'function' ||
          typeof bridge.receiptSink !== 'function') {
        return reply(res, 503, 'TRUSTED_BRIDGE_UNAVAILABLE');
      }
      // A trusted host policy, not request JSON, determines tool exposure per principal.
      const principalDiscoveryOnly = typeof discoveryOnly === 'function'
        ? await discoveryOnly(principal)
        : discoveryOnly;
      if (typeof principalDiscoveryOnly !== 'boolean') {
        return reply(res, 503, 'TRUSTED_MCP_TOOL_POLICY_REQUIRED');
      }
      server = createServer(bridge, { discoveryOnly: principalDiscoveryOnly });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) reply(res, 503, 'MCP_REQUEST_UNAVAILABLE');
      else if (!res.writableEnded) res.end();
    } finally {
      if (server) await server.close().catch(() => {});
    }
  };
}
