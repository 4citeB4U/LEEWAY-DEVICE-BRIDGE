/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP.COMPUTE
TAG: LEEWAY.NATIVE.COMPUTE.HOST_PROVIDER.V1
WHO: LeeWay Industries; WHAT: fixed-binary host provider for bounded native GPU evidence.
WHEN: 2026-11-16; WHERE: apps/desktop/native-compute-provider.mjs.
WHY: Route GPU work through Bridge admission without exposing arbitrary process execution.
HOW: Host-injected absolute executable, fixed subcommand, bounded JSON stdin/stdout.
AUTHORITY: Transport provider only; Bridge, Formula, Veritas, and receipt gates remain upstream.
LICENSE: MIT
*/
import path from 'node:path';
import { spawn } from 'node:child_process';

export class NativeComputeProvider {
  constructor(executablePath, { timeoutMs = 15000 } = {}) {
    if (typeof executablePath !== 'string' || !path.isAbsolute(executablePath)) throw new Error('NATIVE_COMPUTE_EXECUTABLE_ABSOLUTE_PATH_REQUIRED');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) throw new Error('NATIVE_COMPUTE_TIMEOUT_INVALID');
    this.executablePath = executablePath;
    this.timeoutMs = timeoutMs;
  }

  async execute({ values }) {
    const input = JSON.stringify(values);
    if (Buffer.byteLength(input) > 65536) throw new Error('NATIVE_COMPUTE_INPUT_LIMIT_EXCEEDED');
    return new Promise((resolve, reject) => {
      const child = spawn(this.executablePath, ['compute-native-probe'], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
      const finish = error => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : null; };
      const append = (prior, chunk) => {
        const next = Buffer.concat([prior, chunk]);
        if (next.length > 65536) throw new Error('NATIVE_COMPUTE_OUTPUT_LIMIT_EXCEEDED');
        return next;
      };
      child.stdout.on('data', chunk => { try { stdout = append(stdout, chunk); } catch (error) { child.kill(); finish(error); } });
      child.stderr.on('data', chunk => { try { stderr = append(stderr, chunk); } catch (error) { child.kill(); finish(error); } });
      child.on('error', () => finish(new Error('NATIVE_COMPUTE_SPAWN_FAILED')));
      child.on('close', code => {
        if (settled) return;
        clearTimeout(timer); settled = true;
        if (code !== 0) return reject(new Error('NATIVE_COMPUTE_EXECUTION_FAILED'));
        try {
          const evidence = JSON.parse(stdout.toString('utf8'));
          if (evidence?.canonicalReceiptIssued !== false || evidence?.laneCount !== 256 || evidence?.toleranceMismatchCount !== 0)
            throw new Error('NATIVE_COMPUTE_EVIDENCE_INVALID');
          resolve(evidence);
        } catch (error) { reject(/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error : new Error('NATIVE_COMPUTE_EVIDENCE_INVALID')); }
      });
      const timer = setTimeout(() => { child.kill(); finish(new Error('NATIVE_COMPUTE_TIMEOUT')); }, this.timeoutMs);
      child.stdin.end(input);
    });
  }
}
