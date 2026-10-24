import assert from 'node:assert/strict';
import { Bridge } from '../packages/protocol/index.mjs';
import { createServer, createProductionAdmission } from '../apps/desktop/mcp-server.mjs';

// This tests the actual production admission factory, not a mock C3/Veritas callback.
// Device adapters are deliberately fake to demonstrate NO adapter dispatch occurs.
let executes = 0;
const devices = [
  { id: 'pc', type: 'desktop', grants: ['device.info'], adapter: {
    discover: async () => ['device.info'],
    execute: async () => { executes++; return { ok: true }; }
  }},
  { id: 'phone', type: 'relay', grants: ['device.info', 'device.files.write'], adapter: {
    discover: async () => ['device.info', 'device.files.write'],
    execute: async () => { executes++; return { ok: true }; }
  }}
];
const evidence = [];
const bridge = new Bridge(devices, {
  admission: createProductionAdmission(devices),
  receiptSink: async record => { evidence.push(record); }
});
const server = createServer(bridge);
for (const [tool, deviceId, args] of [
  ['device_info', 'pc', {}],
  ['device_info', 'phone', {}],
  ['device_files_write', 'phone', { path: 'test.txt', text: 'not written' }]
]) {
  const res = await server._registeredTools[tool].handler({ deviceId, arguments: args });
  const body = JSON.parse(res.content[0].text);
  assert.equal(body.ok, false, tool + ' must fail closed');
  assert.equal(body.error, 'ADMISSION_DENIED', tool + ' must be denied before dispatch');
}
assert.equal(executes, 0, 'No fake adapter may execute');
assert.equal(evidence.length, 3, 'Blocked operations must have audit records');
assert(evidence.every(r => r.outcome === 'BLOCKED' && r.formula === 'NOT_EVALUATED'));
console.log('PASS: actual production admission factory refuses all governed commands without canonical authenticated Runtime Fabric Veritas; no adapter executes');
