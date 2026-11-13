/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.UNIVERSAL.ZITADEL.STARTUP.GUARDS.TEST.V2
WHO: LeeWay Industries
WHAT: Confirm universal ZITADEL host cannot bind to public interface or privileged port
WHEN: 2026-11-12
WHERE: tests/mcp/universal-zitadel-startup.test.mjs
WHY: Preserve authenticated loopback host boundary before resolving device configuration
HOW: Node test; no credentials, database or live device access
AUTHORITY: Unit guard only
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { startUniversalZitadelMcp } from '../../operator/identity/start-universal-zitadel-mcp.mjs';

test('public interface refused before any Bridge provider composition', async () => {
  await assert.rejects(startUniversalZitadelMcp({ host: '0.0.0.0', port: 4272 }), /PUBLIC_HTTP_BIND_DENIED/);
});

test('invalid port refused before any Bridge provider composition', async () => {
  await assert.rejects(startUniversalZitadelMcp({ port: 80 }), /MCP_PORT_INVALID/);
});
