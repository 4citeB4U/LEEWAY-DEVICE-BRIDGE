import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';
import { schemas } from '../../packages/protocol/index.mjs';

test('process schema exposes only bounded executable identities', () => {
  for (const executable of ['node','npm','git','powershell']) {
    assert.equal(schemas['device.process.execute'].parse({ executable, arguments: [], cwd: '.', timeoutMs: 1000 }).executable, executable);
  }
  for (const executable of ['cmd','bash','sh','python','node.exe','C:\\Windows\\System32\\cmd.exe']) {
    assert.throws(() => schemas['device.process.execute'].parse({ executable, arguments: [], cwd: '.', timeoutMs: 1000 }));
  }
});

test('desktop process execution stays inside workspace and never needs shell syntax', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-process-'));
  t.after(async () => { await new Promise(r => setTimeout(r, 500)); try { await fs.rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch (e) { if (!['EBUSY','EPERM'].includes(e.code)) throw e; } });
  await fs.mkdir(path.join(root, 'child'));
  const adapter = new DesktopAdapter(root);
  assert.ok((await adapter.discover()).includes('device.process.execute'));
  const ok = await adapter.execute('device.process.execute', {
    executable: 'node', arguments: ['-e', 'process.stdout.write(process.cwd())'], cwd: 'child', timeoutMs: 5000,
  });
  assert.equal(ok.exitCode, 0);
  assert.equal(await fs.realpath(ok.stdout), await fs.realpath(path.join(root, 'child')));
  await assert.rejects(adapter.execute('device.process.execute', {
    executable: 'node', arguments: ['-e', 'process.stdout.write("bad")'], cwd: '..', timeoutMs: 5000,
  }), /PATH_OUTSIDE_WORKSPACE|INVALID_PATH/);
});

test('process execution bounds timeout and output', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'leeway-process-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const adapter = new DesktopAdapter(root);
  await assert.rejects(adapter.execute('device.process.execute', {
    executable: 'node', arguments: ['-e', 'setTimeout(()=>{},5000)'], cwd: '.', timeoutMs: 100,
  }), /PROCESS_TIMEOUT/);
  await assert.rejects(adapter.execute('device.process.execute', {
    executable: 'node', arguments: ['-e', 'process.stdout.write("x".repeat(70000))'], cwd: '.', timeoutMs: 5000,
  }), /PROCESS_OUTPUT_TOO_LARGE/);
});
