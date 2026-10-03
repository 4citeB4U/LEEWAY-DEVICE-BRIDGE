import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('gateway source stays loopback, authenticated and mutation-fail-closed',()=>{
  const s=fs.readFileSync(new URL('../clients/remote-controller/device-mcp-gateway.mjs',import.meta.url),'utf8');
  assert.match(s,/127\.0\.0\.1/);
  assert.match(s,/LEEWAY_DEVICE_MCP_BEARER_TOKEN_REQUIRED/);
  assert.match(s,/timingSafeEqual/);
  assert.match(s,/device\.list/);
  assert.match(s,/device\.capabilities/);
  assert.match(s,/ROUTE_NOT_QUALIFIED/);
  assert.match(s,/mutationRoutesEnabled:false/);
});
