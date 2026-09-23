import assert from "node:assert/strict";
import http from "node:http";
import { HomeAssistantProvider } from "../providers/home-assistant/index.mjs";

let serviceBody=null;
const server=http.createServer(async (req,res)=>{
  if(req.method==="GET" && req.url==="/api/"){
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify({message:"API running."}));
    return;
  }
  if(req.method==="GET" && req.url==="/api/states"){
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify([{entity_id:"light.kitchen",state:"on",attributes:{brightness:128}}]));
    return;
  }
  if(req.method==="GET" && req.url==="/api/states/light.kitchen"){
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify({entity_id:"light.kitchen",state:"on",attributes:{brightness:128}}));
    return;
  }
  if(req.method==="POST" && req.url==="/api/services/light/turn_off"){
    const chunks=[];
    for await (const chunk of req) chunks.push(chunk);
    serviceBody=JSON.parse(Buffer.concat(chunks).toString("utf8"));
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify([{entity_id:"light.kitchen",state:"off"}]));
    return;
  }
  res.writeHead(404,{"content-type":"application/json"});
  res.end(JSON.stringify({error:"not-found"}));
});

await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const baseUrl="http://127.0.0.1:" + server.address().port;

try{
  const provider=new HomeAssistantProvider({baseUrl,token:"test-token"});
  const health=await provider.health();
  assert.equal(health.ok,true);
  const states=await provider.listStates();
  assert.equal(states.capability,"device.list-states");
  assert.equal(Array.isArray(states.body),true);
  const state=await provider.readState("light.kitchen");
  assert.equal(state.body.entity_id,"light.kitchen");
  const action=await provider.callService("light","turn_off",{entity_id:"light.kitchen"});
  assert.equal(action.ok,true);
  assert.equal(action.capability,"device.service-call");
  assert.equal(action.physicalPostStateVerified,false);
  assert.deepEqual(serviceBody,{entity_id:"light.kitchen"});
  console.log("PASS Home Assistant provider mock contract");
} finally {
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
