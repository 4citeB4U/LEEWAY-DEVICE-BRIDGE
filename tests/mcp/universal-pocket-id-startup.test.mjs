/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.IDENTITY.TEST
TAG: LEEWAY.UNIVERSAL.POCKET_ID.STARTUP.GUARDS.TEST
WHO: LeeWay Industries
WHAT: Confirm universal Pocket ID host cannot bind to public interface or privileged port
WHEN: 2026-10-26
WHERE: tests/mcp/universal-pocket-id-startup.test.mjs
WHY: Preserve authenticated loopback host boundary before resolving device configuration
HOW: Node test; no credentials, database or live device access
AUTHORITY: Unit guard only
LICENSE: MIT
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import {startUniversalPocketIdMcp} from '../../operator/identity/start-universal-pocket-id-mcp.mjs';
test('public interface refused before any Bridge provider composition',async()=>{
 await assert.rejects(startUniversalPocketIdMcp({host:'0.0.0.0',port:4272}),/PUBLIC_HTTP_BIND_DENIED/);
});
test('invalid port refused before any Bridge provider composition',async()=>{
 await assert.rejects(startUniversalPocketIdMcp({port:80}),/MCP_PORT_INVALID/);
});
