import assert from 'node:assert/strict';
import {timingSafeEqual} from 'node:crypto';
import http from 'node:http';
import test from 'node:test';
import {handlePairedModelInventory} from '../phone-model-inventory.mjs';

const pairedBody='fixture-phone-body';
const token='fixture-only-token-not-a-live-credential';
const document={schemaVersion:'leeway.model-inventory.v1',
  owner:{repository:'4citeB4U/Leeway-Runtime-Fabric',component:'model-execution-runtime',provider:'OLLAMA_LOCAL'},
  body:{kind:'PC',name:'Fixture-PC'},scope:'PC_MODEL_SERVICE_INVENTORY',state:'OBSERVED',
  installed:{state:'OBSERVED',count:1,models:[{name:'fixture-model'}]},
  loaded:{state:'OBSERVED',count:0,models:[]}};
function send(res,code,value){res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(value));}
// Mirrors the unchanged gateway's existing constant-time header checker with fixture data.
function authorized(req){const supplied=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'';const a=Buffer.from(supplied),b=Buffer.from(token);return a.length===b.length&&a.length>0&&timingSafeEqual(a,b);}
async function serve(t,handler){const server=http.createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});return `http://127.0.0.1:${server.address().port}`;}
async function setup(t,reply){
  const observations=[];
  const carrier=await serve(t,(req,res)=>{observations.push({method:req.method,path:req.url,origin:req.headers.origin});if(reply)return reply(req,res);send(res,200,document);});
  const gateway=await serve(t,(req,res)=>handlePairedModelInventory({req,res,authorized,pairedBody,carrier,send}).catch(()=>send(res,500,{error:'FIXTURE_HANDLER_FAILED'})));
  return {observations,carrier,gateway,call:async(body={bodyId:pairedBody},auth=token,route='/models/inventory',method='POST')=>{
    const response=await fetch(gateway+route,{method,headers:{'content-type':'application/json',...(auth===null?{}:{Authorization:'Bearer '+auth})},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};
  }};
}

test('authenticated paired body receives exact PC document through one fixed GET',async t=>{
  const f=await setup(t);const result=await f.call();assert.equal(result.status,200);assert.deepEqual(result.body,document);
  assert.deepEqual(f.observations,[{method:'GET',path:'/api/models/inventory',origin:f.carrier}]);
});
test('missing or wrong existing pairing token cannot read upstream',async t=>{
  const f=await setup(t);for(const auth of [null,'wrong-token']){const result=await f.call({bodyId:pairedBody},auth);assert.equal(result.status,403);}assert.equal(f.observations.length,0);
});
test('wrong body or additional target fields cannot choose a route or model',async t=>{
  const f=await setup(t);for(const body of [{bodyId:'unpaired'}, {bodyId:pairedBody,url:'http://example.invalid'}, {bodyId:pairedBody,path:'/api/generate'}, {bodyId:pairedBody,model:'other'},[]]){const result=await f.call(body);assert.equal(result.status,400);}assert.equal(f.observations.length,0);
});
test('malformed and oversized requests stop before upstream',async t=>{
  const f=await setup(t);assert.equal((await f.call('{')).status,400);assert.equal((await f.call('x'.repeat(1025))).status,413);assert.equal(f.observations.length,0);
});
test('only the fixed method and route are handled',async t=>{
  const f=await setup(t);assert.equal((await f.call({},token,'/models/inventory?command=x')).status,404);assert.equal((await f.call({},token,'/models/inventory','GET')).status,404);assert.equal(f.observations.length,0);
});
test('upstream failure and malformed JSON do not become an empty inventory',async t=>{
  for(const reply of [(_req,res)=>send(res,503,{error:'fixture unavailable'}),(_req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('{');}]){
    const f=await setup(t,reply);const result=await f.call();assert.equal(result.status,503);assert.equal(result.body.installed,undefined);
  }
});
test('wrong provider owner or count integrity is rejected',async t=>{
  for(const changed of [{...document,owner:{...document.owner,repository:'wrong'}},{...document,installed:{...document.installed,count:7}}]){
    const f=await setup(t,(_req,res)=>send(res,200,changed));const result=await f.call();assert.equal(result.status,503);assert.equal(result.body.error,'PC_MODEL_INVENTORY_INVALID_RESPONSE');
  }
});
test('valid unavailable state retains null counts and serving-PC identity',async t=>{
  const value={...document,state:'UNAVAILABLE',installed:{state:'UNAVAILABLE',count:null,models:[]},loaded:{state:'UNAVAILABLE',count:null,models:[]}};
  const f=await setup(t,(_req,res)=>send(res,200,value));const result=await f.call();assert.equal(result.status,200);assert.deepEqual(result.body,value);
});
