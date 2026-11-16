import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createBrowserLocalGateway } from '../operator/browser-local-gateway.mjs';

const secret='browser-gateway-test-secret-0123456789abcdef';
const extensionId='qualified-extension-id';

async function fixture(t){
  const gateway=createBrowserLocalGateway({port:0,nativeHostSecret:secret,allowedExtensionIds:[extensionId],sessionTtlMs:60_000});
  const address=await gateway.listen(); t.after(()=>gateway.close());
  return {gateway,base:`http://127.0.0.1:${address.port}`,ws:`ws://127.0.0.1:${address.port}/mesh`};
}

function next(ws){return new Promise((resolve,reject)=>{ws.once('message',raw=>resolve(JSON.parse(raw)));ws.once('error',reject);});}
function opened(url){return new Promise((resolve,reject)=>{const ws=new WebSocket(url);ws.once('open',()=>resolve(ws));ws.once('error',reject);});}

test('native broker denies missing secret and unregistered extension',async t=>{
  const f=await fixture(t);
  const denied=await fetch(`${f.base}/native/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({extensionId})});
  assert.equal(denied.status,401);
  const unknown=await fetch(`${f.base}/native/session`,{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},body:JSON.stringify({extensionId:'unknown'})});
  assert.equal(unknown.status,403);
});

test('one-use native session admits enrolled extension and routes bounded browser event',async t=>{
  const f=await fixture(t);
  const response=await fetch(`${f.base}/native/session`,{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},body:JSON.stringify({extensionId})});
  assert.equal(response.status,201); const session=await response.json();
  const event=new Promise(resolve=>f.gateway.server.once('browser-message',resolve));
  const ws=await opened(f.ws); ws.send(JSON.stringify({type:'BROWSER_NODE_HELLO',sessionToken:session.sessionToken,extensionId}));
  assert.equal((await next(ws)).type,'BROWSER_NODE_ACK');
  ws.send(JSON.stringify({type:'COURIER_PAGE_CONTEXT',requestId:'r1',url:'https://example.test'}));
  assert.equal((await event).message.requestId,'r1'); ws.terminate();
  const replay=await opened(f.ws); replay.send(JSON.stringify({type:'BROWSER_NODE_HELLO',sessionToken:session.sessionToken,extensionId}));
  const closed=await new Promise(resolve=>replay.once('close',code=>resolve(code)));
  assert.equal(closed,1008);
});
