/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.EXTENSION.BUILD
TAG: LEEWAY.EXTENSION.V2.DETERMINISTIC_PACKAGE
5WH:
WHAT = Build deterministic, browser-specific unsigned MV3 packages.
WHY = Keep the same source across browser engines without hiding unsupported native integrations.
WHO = LeeWay Device Bridge extension contributors under Creator authority.
WHERE = scripts/build-extension.mjs
WHEN = 2026-11-16.
HOW = Validate manifest, package an explicit allowlist, and record SHA-256 digests.
LICENSE = Not asserted; existing repository terms govern.
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repoRoot, 'apps', 'extension');
const dist = path.join(repoRoot, 'dist');
const files = ['background.js','browser-polyfill.js','content-courier.js','floating-tablet.js'];
const base = JSON.parse(fs.readFileSync(path.join(source,'manifest.json'), 'utf8'));
const crcTable = Array.from({length:256}, (_,i)=> {let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes) {let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function uint16(n){const b=Buffer.alloc(2); b.writeUInt16LE(n);return b;}
function uint32(n){const b=Buffer.alloc(4); b.writeUInt32LE(n);return b;}
function zip(entries) {
  let offset=0;const local=[],central=[];
  for(const [name,content] of entries.sort(([a],[b])=>a.localeCompare(b))) {
    const filename=Buffer.from(name);const raw=Buffer.from(content);const packed=deflateRawSync(raw,{level:9});const crc=crc32(raw);
    const l=Buffer.concat([uint32(0x04034b50),uint16(20),uint16(0),uint16(8),uint16(0),uint16(33),uint32(crc),uint32(packed.length),uint32(raw.length),uint16(filename.length),uint16(0),filename,packed]);
    local.push(l);
    central.push(Buffer.concat([uint32(0x02014b50),uint16(20),uint16(20),uint16(0),uint16(8),uint16(0),uint16(33),uint32(crc),uint32(packed.length),uint32(raw.length),uint16(filename.length),uint16(0),uint16(0),uint16(0),uint16(0),uint32(0),uint32(offset),filename]));
    offset+=l.length;
  }
  const centralLen=central.reduce((sum,b)=>sum+b.length,0);
  const end=Buffer.concat([uint32(0x06054b50),uint16(0),uint16(0),uint16(entries.length),uint16(entries.length),uint32(centralLen),uint32(offset),uint16(0)]);
  return Buffer.concat([...local,...central,end]);
}
if(base.manifest_version!==3 || base.version!=='2.0.0')throw new Error('MANIFEST_V2_CONTRACT_INVALID');
fs.mkdirSync(dist,{recursive:true});
const hashes={contract:'EXTENSION_MANIFESTO_V2',classification:'UNSIGNED_SOURCE_PACKAGES_NOT_PLATFORM_TESTED',artifacts:{}};
for(const browser of ['chromium','firefox','safari']) {
  const manifest=structuredClone(base);
  if(browser==='chromium') {manifest.background={service_worker:'background.js'};}
  else {manifest.background={scripts:['background.js']};delete manifest.minimum_chrome_version;}
  const entries=[['manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n')],...files.map(f=>[f,fs.readFileSync(path.join(source,f))])];
  const data=zip(entries);
  const name=`leeway-extension-v2-${browser}.zip`;
  fs.writeFileSync(path.join(dist,name),data);
  hashes.artifacts[name]={sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length};
}
const userscript=fs.readFileSync(path.join(source,'userscript-bridge.user.js'));
fs.writeFileSync(path.join(dist,'leeway-browser-courier-v2.user.js'),userscript);
hashes.artifacts['leeway-browser-courier-v2.user.js']={sha256:createHash('sha256').update(userscript).digest('hex'),bytes:userscript.length};
fs.writeFileSync(path.join(dist,'SHA256SUMS.json'),JSON.stringify(hashes,null,2)+'\n');
console.log(JSON.stringify(hashes,null,2));
