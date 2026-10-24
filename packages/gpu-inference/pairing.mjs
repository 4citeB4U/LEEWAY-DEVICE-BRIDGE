import {createHash, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

if (process.platform !== 'win32') throw Error('WINDOWS_DPAPI_REQUIRED');
const root = join(process.env.LOCALAPPDATA || '', 'LeeWayGPU');
if (!process.env.LOCALAPPDATA) throw Error('WINDOWS_USER_PROFILE_REQUIRED');
mkdirSync(root, {recursive: true});
const privateFile = join(root, 'pairing-private.dpapi');
const keyFile = join(root, 'pairing-key.dpapi');
const configFile = join(root, 'runtime.json');

function powershell(script, input) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const result = spawnSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {input, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024});
  if (result.error || result.status !== 0) {
    const detail = result.error?.code || result.status || 'NO_EXIT_STATUS';
    const diagnostic = (result.stderr || '').replace(/\s+/g, ' ').slice(0, 180);
    throw Error(`DPAPI_OPERATION_FAILED_${String(detail).replace(/[^A-Z0-9_]/gi, '_')}_${diagnostic.replace(/[^A-Z0-9_]/gi, '_')}`);
  }
  return result.stdout.trim();
}
function protect(value) {
  return powershell('Add-Type -AssemblyName System.Security; $raw=[Console]::In.ReadToEnd(); $bytes=[Text.Encoding]::UTF8.GetBytes($raw); $sealed=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($sealed))', value);
}
function unprotect(value) {
  return powershell('Add-Type -AssemblyName System.Security; $sealed=[Console]::In.ReadToEnd(); $bytes=[Convert]::FromBase64String($sealed); $raw=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($raw))', value);
}
function fingerprint(hex) { return createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex'); }
function usage() {
  throw 'USAGE: pairing.mjs init | finish <peer-public-key-base64> | configure-host <bind-ip> [model] | configure-client <gpu-host-ip>';
}

const [action, arg, model = 'qwen3.5:4b'] = process.argv.slice(2);
if (action === 'init') {
  const pair = generateKeyPairSync('ec', {namedCurve: 'prime256v1'});
  const publicDer = pair.publicKey.export({format: 'der', type: 'spki'});
  const privateDer = pair.privateKey.export({format: 'der', type: 'pkcs8'});
  writeFileSync(privateFile, protect(privateDer.toString('base64')), {encoding: 'utf8', mode: 0o600});
  console.log(JSON.stringify({publicKey: publicDer.toString('base64'), publicKeySha256: createHash('sha256').update(publicDer).digest('hex')}));
} else if (action === 'finish') {
  if (typeof arg !== 'string' || !/^[A-Za-z0-9+/]+=*$/.test(arg) || arg.length < 80 || arg.length > 1024) usage();
  const privateDer = Buffer.from(unprotect(readFileSync(privateFile, 'utf8')), 'base64');
  const privateKey = createPrivateKey({key: privateDer, format: 'der', type: 'pkcs8'});
  const peerKey = createPublicKey({key: Buffer.from(arg, 'base64'), format: 'der', type: 'spki'});
  const shared = diffieHellman({privateKey, publicKey: peerKey});
  const token = Buffer.from(hkdfSync('sha256', shared, Buffer.from('leeway-gpu-workstation-pair-v1'), Buffer.from('paired-inference-key'), 32)).toString('hex');
  writeFileSync(keyFile, protect(token), {encoding: 'utf8', mode: 0o600});
  rmSync(privateFile, {force: true});
  console.log(JSON.stringify({paired: true, keyFingerprint: fingerprint(token)}));
} else if (action === 'configure-host') {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(arg || '') || arg.startsWith('127.') || arg === '0.0.0.0') usage();
  const config = {schema: 'leeway.gpu.remote-preview.v1', mode: 'workstation', bindAddress: arg, port: 4178, ollamaUrl: 'http://127.0.0.1:21435', ollamaLibrary: 'cuda_v13', models: [model]};
  writeFileSync(configFile, JSON.stringify(config, null, 2), {encoding: 'utf8', mode: 0o600});
  console.log(JSON.stringify({configured: true, mode: config.mode, bindAddress: config.bindAddress, port: config.port, models: config.models}));
} else if (action === 'configure-client') {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(arg || '') || arg.startsWith('127.') || arg === '0.0.0.0') usage();
  const config = {schema: 'leeway.gpu.remote-preview.v1', mode: 'client', remoteHost: arg, remotePort: 4178, models: [model]};
  writeFileSync(configFile, JSON.stringify(config, null, 2), {encoding: 'utf8', mode: 0o600});
  console.log(JSON.stringify({configured: true, mode: config.mode, remoteHost: config.remoteHost, remotePort: config.remotePort}));
} else usage();
