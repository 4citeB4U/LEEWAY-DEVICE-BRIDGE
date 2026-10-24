import fs from 'node:fs/promises';
import path from 'node:path';
import { start } from '../../../apps/desktop/mcp-server.mjs';

const configPath = process.argv[2];
if (!configPath) throw new Error('CONFIG_REQUIRED');
const allowed = new Set(['device.health', 'device.files.read', 'device.files.write', 'device.ui.tap']);
const receiptPath = path.join(path.dirname(path.resolve(configPath)), 'receipts.jsonl');

// This test-only process supplies a bounded fixture authority. Production startup
// still requires the separately composed LeeWay Runtime callbacks.
await start(configPath, {
  admission: async ({ deviceId, capability }) => deviceId === 'test-host' && allowed.has(capability),
  receiptSink: async record => fs.appendFile(receiptPath, `${JSON.stringify(record)}\n`, { mode: 0o600 }),
});

