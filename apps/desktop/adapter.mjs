import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

// Bounded workspace files and explicitly allowlisted process execution. Never invokes a shell.
export class DesktopAdapter {
  constructor(root) { this.root = path.resolve(root); }
  async discover() { await fs.access(this.root); return ['device.health', 'device.info', 'device.files.read', 'device.files.write', 'device.process.execute']; }
  async safePath(relative, writing = false) {
    if (path.isAbsolute(relative) || relative.includes(':') || relative.includes('\0')) throw new Error('PATH_OUTSIDE_WORKSPACE');
    const parts = relative.replaceAll('\\', '/').split('/');
    if (parts.some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(p))) throw new Error('INVALID_PATH');
    const root = await fs.realpath(this.root);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      current = path.join(current, parts[i]);
      try {
        const stat = await fs.lstat(current);
        if (stat.isSymbolicLink()) throw new Error('LINK_NOT_ALLOWED');
        if (i < parts.length - 1 && !stat.isDirectory()) throw new Error('INVALID_PATH');
        if (i === parts.length - 1 && !stat.isFile()) throw new Error('REGULAR_FILE_REQUIRED');
        if (i === parts.length - 1 && stat.nlink > 1) throw new Error('LINK_NOT_ALLOWED');
      } catch (e) { if (!(writing && i === parts.length - 1 && e.code === 'ENOENT')) throw e; }
    }
    return current;
  }
  async safeDirectory(relative) {
    if (relative === '.') return fs.realpath(this.root);
    const resolved = await this.safePath(relative);
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) throw new Error('WORKING_DIRECTORY_REQUIRED');
    return resolved;
  }
  async executeProcess(args) {
    const cwd = await this.safeDirectory(args.cwd);
    const executable = process.platform === 'win32' && args.executable === 'powershell' ? 'powershell.exe'
      : process.platform === 'win32' && args.executable === 'npm' ? 'npm.cmd'
      : process.platform === 'win32' && args.executable === 'git' ? 'git.exe'
      : process.platform === 'win32' && args.executable === 'node' ? 'node.exe'
      : args.executable;
    return await new Promise((resolve, reject) => {
      const child = spawn(executable, args.arguments, { cwd, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const limit = 65536;
      let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), settled = false;
      const append = (prior, chunk) => {
        const next = Buffer.concat([prior, chunk]);
        if (next.length > limit) throw new Error('PROCESS_OUTPUT_TOO_LARGE');
        return next;
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        child.kill();
        reject(error);
      };
      child.stdout.on('data', chunk => { try { stdout = append(stdout, chunk); } catch (e) { fail(e); } });
      child.stderr.on('data', chunk => { try { stderr = append(stderr, chunk); } catch (e) { fail(e); } });
      child.on('error', () => fail(new Error('PROCESS_SPAWN_FAILED')));
      const timer = setTimeout(() => fail(new Error('PROCESS_TIMEOUT')), args.timeoutMs);
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        resolve({ exitCode: Number.isInteger(code) ? code : null, signal: signal || null, stdout: stdout.toString('utf8'), stderr: stderr.toString('utf8') });
      });
    });
  }
  async execute(capability, args) {
    if (capability === 'device.health') return { ok: true, platform: process.platform, adapter: 'bounded-workspace', uiControl: false };
    if (capability === 'device.info') return { platform: process.platform, architecture: os.arch(), node: process.version, uiControl: false };
    if (capability === 'device.process.execute') return this.executeProcess(args);
    if (capability === 'device.files.read') {
      const handle = await fs.open(await this.safePath(args.path), 'r');
      try {
        const stat = await handle.stat();
        if (!stat.isFile() || stat.size > 65536) throw new Error('FILE_TOO_LARGE');
        const buffer = Buffer.alloc(65537);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
        if (bytesRead > 65536) throw new Error('FILE_TOO_LARGE');
        return { text: buffer.subarray(0, bytesRead).toString('utf8') };
      } finally { await handle.close(); }
    }
    if (capability === 'device.files.write') {
      if (Buffer.byteLength(args.text, 'utf8') > 65536) throw new Error('FILE_TOO_LARGE');
      // Create-only prevents replacement of user files. Owner can rename/delete externally.
      await fs.writeFile(await this.safePath(args.path, true), args.text, { flag: 'wx', mode: 0o600 });
      return { created: true, bytes: Buffer.byteLength(args.text, 'utf8') };
    }
    throw new Error('CAPABILITY_UNAVAILABLE');
  }
}
