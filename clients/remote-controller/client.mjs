import WebSocket from "ws";
import crypto from "node:crypto";

const relay=process.env.LEEWAY_RELAY_URL ||
  "wss://agent-lee-x.vercel.app/api/device-relay";
const deviceId=process.env.LEEWAY_DEVICE_ID;
const token=process.env.LEEWAY_PAIRING_TOKEN;
const capability=process.argv[2] || "device.health";
const args=process.argv[3] ? JSON.parse(process.argv[3]) : {};

if(!deviceId || !token){
  console.error("LEEWAY_DEVICE_ID and LEEWAY_PAIRING_TOKEN are required.");
  process.exit(2);
}

const commandId=crypto.randomUUID();
const ws=new WebSocket(relay);
const timer=setTimeout(()=>{
  console.error("Timed out waiting for Device Bridge result.");
  process.exit(3);
},30000);

ws.on("open",()=>{
  ws.send(JSON.stringify({
    type:"hello",
    role:"client",
    deviceId,
    token
  }));
});

ws.on("message",(raw)=>{
  const msg=JSON.parse(raw.toString());
  if(msg.type==="hello-ack"){
    ws.send(JSON.stringify({
      type:"command",
      id:commandId,
      capability,
      arguments:args
    }));
    return;
  }
  if(msg.type==="result" && msg.id===commandId){
    console.log(JSON.stringify(msg,null,2));
    clearTimeout(timer);
    ws.close();
    return;
  }
  if(msg.type==="error"){
    console.error(JSON.stringify(msg));
  }
});

ws.on("error",(error)=>{
  console.error(error.message);
  process.exit(4);
});
