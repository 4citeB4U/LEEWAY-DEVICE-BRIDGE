import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=relative=>fs.readFile(new URL(relative,root),'utf8');
const partitions=['Workspace','Sandbox','Continuum','DigitalBrain','Diagnostics','Ledger','Receipts'];

test('Rust vault and both bootstraps materialize the same seven portable partitions',async()=>{
  const [vault,windows,unix]=await Promise.all([
    read('crates/leeway-core/src/vault.rs'),read('bootstrap.ps1'),read('bootstrap.sh')
  ]);
  for(const partition of partitions){
    assert.match(vault,new RegExp(`\\b${partition}\\b`));
    assert.match(windows,new RegExp(`['\"]${partition}['\"]`));
    assert.match(unix,new RegExp(`\\b${partition}\\b`));
  }
  assert.doesNotMatch(windows,/pc-primary|pc-hp-secondary/);
  assert.doesNotMatch(unix,/pc-primary|pc-hp-secondary/);
});

test('Sandbox evidence is wired to diagnostics, brain, Continuum, ledger, receipts and mesh outbox',async()=>{
  const source=await read('crates/leeway-core/src/sandbox.rs');
  for(const marker of ['diagnostics_dir','digital_brain_dir','SandboxFieldEvidence','ledger_dir','mesh-outbox']){
    assert.match(source,new RegExp(marker.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')));
  }
  assert.match(source,/create_new\(true\)/);
  assert.match(source,/signature_ed25519_base64/);
  assert.match(source,/previous_receipt_sha256/);
  assert.match(source,/RECOVERY_REQUIRED/);
  assert.match(source,/PENDING_MESH_REPLICATION/);
});

test('bootstrap binds host keys, registry admission and user-level daemon lifecycle',async()=>{
  const [windows,unix]=await Promise.all([read('bootstrap.ps1'),read('bootstrap.sh')]);
  for(const source of [windows,unix]){
    assert.match(source,/generate-device-key\.mjs/);
    assert.match(source,/registry-key-verify/);
    assert.match(source,/LEEWAY_DEVICE_ENROLLMENT_REQUIRED/);
    assert.match(source,/workstation-relay-agent\.mjs/);
    assert.match(source,/mesh-replication-worker\.mjs/);
  }
  assert.match(windows,/Register-ScheduledTask/);
  assert.match(unix,/LaunchAgents|systemd\/user|\.termux\/boot/);
});

test('replication worker consumes outbox into acknowledged or conflict custody',async()=>{
  const source=await read('scripts/mesh-replication-worker.mjs');
  assert.match(source,/mesh-acknowledged/);
  assert.match(source,/mesh-conflicts/);
  assert.match(source,/idempotency-key/);
});
