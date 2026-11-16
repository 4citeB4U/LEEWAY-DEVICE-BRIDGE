import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root=new URL('../apps/extension/',import.meta.url);
const read=name=>fs.readFile(new URL(name,root),'utf8');

test('universal browser package contains the six canonical lanes',async()=>{
  const expected=['manifest.json','browser-polyfill.js','background.js','content-courier.js','floating-tablet.js','userscript-bridge.user.js'];
  for(const name of expected)assert.equal((await fs.stat(new URL(name,root))).isFile(),true,name);
});

test('manifest declares MV3, Chromium worker, Firefox scripts, native messaging and Safari metadata',async()=>{
  const manifest=JSON.parse(await read('manifest.json'));
  assert.equal(manifest.manifest_version,3);
  assert.equal(manifest.background.service_worker,'background.js');
  assert.deepEqual(manifest.background.scripts,['browser-polyfill.js','background.js']);
  assert.ok(manifest.permissions.includes('nativeMessaging'));
  assert.equal(manifest.browser_specific_settings.gecko.id,'bridge@leewayindustries.com');
  assert.equal(manifest.browser_specific_settings.safari.strict_min_version,'17.0');
});

test('background requires Native Messaging session before local WebSocket routing',async()=>{
  const source=await read('background.js');
  assert.match(source,/connectNative/);
  assert.match(source,/LEEWAY_BROWSER_SESSION_REQUEST/);
  assert.match(source,/validSession\(session\)/);
  assert.doesNotMatch(source,/eval\(|new Function/);
});
