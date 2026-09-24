import crypto from "node:crypto";
import { experimental_upgradeWebSocket } from "@vercel/functions";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const IDENTITIES_URL=
  "https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/relay-identities.json";

const state=globalThis.__leewayDeviceRelay || {
  devices:new Map(),
  controllers:new Map()
};
globalThis.__leewayDeviceRelay=state;

async function identityFor(role,id){
  const response=await fetch(IDENTITIES_URL,{cache:"no-store"});
  if(!response.ok) throw new Error("IDENTITY_REGISTRY_HTTP_"+response.status);
  const registry=await response.json();
  const list=role==="device" ? registry.devices : registry.controllers;
  return (list||[]).find(x=>x.id===id && String(x.status||"").startsWith("AUTHORIZED"));
}

async function verifySignature(role,id,nonce,signatureBase64){
  const identity=await identityFor(role,id);
  if(!identity) return false;
  const publicKey=crypto.createPublicKey({
    key:Buffer.from(identity.publicKeyDerBase64,"base64"),
    format:"der",
    type:"spki"
  });
  return crypto.verify(
    "sha256",
    Buffer.from(nonce,"utf8"),
    publicKey,
    Buffer.from(signatureBase64,"base64")
  );
}

export async function GET(request){
  const url=new URL(request.url);
  const role=url.searchParams.get("role");
  const id=url.searchParams.get("id");
  if(!["device","controller"].includes(role)||!id){
    return new Response("role and id required",{status:400});
  }

  return experimental_upgradeWebSocket((ws)=>{
    const challenge=crypto.randomBytes(32).toString("base64url");
    let authenticated=false;

    ws.send(JSON.stringify({type:"challenge",nonce:challenge,role,id}));

    ws.on("message",async raw=>{
      let message;
      try{message=JSON.parse(raw.toString());}catch{return;}

      if(!authenticated){
        if(message.type!=="auth") return;
        const ok=await verifySignature(
          role,
          id,
          challenge,
          String(message.signatureBase64||"")
        ).catch(()=>false);
        if(!ok){
          ws.send(JSON.stringify({type:"auth_fail"}));
          ws.close(1008,"authentication-failed");
          return;
        }
        authenticated=true;
        const map=role==="device" ? state.devices : state.controllers;
        map.set(id,ws);
        ws.send(JSON.stringify({type:"auth_ok",role,id}));
        return;
      }

      if(role==="controller" && message.type==="command"){
        const target=String(message.deviceId||"");
        const device=state.devices.get(target);
        if(!device){
          ws.send(JSON.stringify({
            type:"command_status",
            commandId:message.commandId,
            status:"DEVICE_OFFLINE",
            deviceId:target
          }));
          return;
        }
        device.send(JSON.stringify({
          ...message,
          type:"command",
          controllerId:id
        }));
        return;
      }

      if(role==="device" && message.type==="receipt"){
        const controllerId=String(message.controllerId||"");
        const controller=state.controllers.get(controllerId);
        if(controller) controller.send(JSON.stringify(message));
        return;
      }

      if(message.type==="ping"){
        ws.send(JSON.stringify({type:"pong",at:new Date().toISOString()}));
      }
    });

    ws.on("close",()=>{
      const map=role==="device" ? state.devices : state.controllers;
      if(map.get(id)===ws) map.delete(id);
    });
  },{maxPayload:64*1024});
}
