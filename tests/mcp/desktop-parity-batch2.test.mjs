import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DesktopAdapter } from '../../apps/desktop/adapter.mjs';
import { schemas } from '../../packages/protocol/index.mjs';

test('UI schemas reject arbitrary keys and out-of-contract coordinates',()=>{
 assert.throws(()=>schemas['device.ui.key'].parse({key:'WIN+R'}));
 assert.throws(()=>schemas['device.ui.click'].parse({x:-1,y:0,button:'left'}));
 assert.throws(()=>schemas['device.ui.type'].parse({text:'x'.repeat(4097)}));
});

test('Windows screen observation returns bounded real screen data', {skip:process.platform!=='win32'}, async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-ui-')); try{
  const a=new DesktopAdapter(root); const info=await a.execute('device.screen.info',{});
  assert.ok(info.width>0&&info.height>0);
  const shot=await a.execute('device.screen.capture',{});
  assert.equal(shot.mimeType,'image/png'); assert.ok(shot.base64.length>100);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('click refuses coordinates outside the observed desktop', {skip:process.platform!=='win32'}, async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'leeway-ui-')); try{
  const a=new DesktopAdapter(root); const info=await a.execute('device.screen.info',{});
  await assert.rejects(a.execute('device.ui.click',{x:Math.min(16384,info.x+info.width+10),y:0,button:'left'}),/UI_COORDINATE_OUTSIDE_SCREEN/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
