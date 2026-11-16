/*
LEEWAY HEADER — DO NOT REMOVE
WHAT: Generate one host-held Ed25519 device identity without external native dependencies.
WHY: Every enrolled node must prove possession of its own private key at relay admission.
*/
import fs from 'node:fs';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

const [privatePath, publicPath] = process.argv.slice(2);
if (!privatePath || !publicPath) throw new Error('DEVICE_KEY_PATHS_REQUIRED');
const privateExists = fs.existsSync(privatePath);
const publicExists = fs.existsSync(publicPath);
if (privateExists || publicExists) {
  if (privateExists && publicExists) {
    console.log(JSON.stringify({ created: false, state: 'EXISTING_DEVICE_KEY' }));
    process.exit(0);
  }
  throw new Error('PARTIAL_DEVICE_KEY_STATE');
}
fs.mkdirSync(path.dirname(privatePath), { recursive: true });
fs.mkdirSync(path.dirname(publicPath), { recursive: true });
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
fs.writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
fs.writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), { mode: 0o644, flag: 'wx' });
console.log(JSON.stringify({ created: true, state: 'DEVICE_KEY_CREATED' }));
