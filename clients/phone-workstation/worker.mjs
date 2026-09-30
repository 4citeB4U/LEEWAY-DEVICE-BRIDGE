import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";

const execFileAsync=promisify(execFile);
const ROOT=process.env.LEEWAY_WORKSTATION_ROOT || path.join(os.homedir(),".leeway","workstation");
const CREDS=JSON.parse(fs.readFileSync(path.join(ROOT,"credentials.json"),"utf8"));
const RELAY=CREDS.relay || "wss://agent-lee-x.vercel.app/api/device-relay";
const DEVICE_ID=CREDS.deviceId;
const TOKEN=CREDS.token;
const RECEIPTS=path.join(ROOT,"receipts.jsonl");
const ALLOWED_ROOTS=[path.resolve(os.homedir()),"/sdcard","/storage/emulated/0"];
const MAX_OUTPUT=512*1024;
const MAX_FILE=1024*1024;
const MAX_TIMEOUT=120000;
let reconnectMs=1000;

const insideAllowed=(p)=>{
  const resolved=path.resolve(p);
  return ALLOWED_ROOTS.some(root=>resolved===root||resolved.startsWith(root+path.sep));
};
const safeCwd=(value)=>{
  const requested=String(value||os.homedir());
  if(!insideAllowed(requested))throw new Error("CWD_NOT_ALLOWED");
  return requested;
};
const safePath=(value)=>{
  const requested=String(value||"");
  if(!requested)throw new Error("PATH_REQUIRED");
  const resolved=path.resolve(requested);
  if(!insideAllowed(resolved))throw new Error("PATH_NOT_ALLOWED");
  return resolved;
};
const receipt=(entry)=>{
  fs.mkdirSync(ROOT,{recursive:true});
  fs.appendFileSync(RECEIPTS,JSON.stringify({at:new Date().toISOString(),...entry})+"\n");
};
async function execute(capability,args){
  if(capability==="workstation.health"){
    let storage=null;
    try{storage=fs.statfsSync(os.homedir())}catch{}
    return {
      ok:true,
      nodeId:"leeway-phone-workstation",
      executionPlane:"TERMUX",
      platform:process.platform,
      arch:process.arch,
      node:process.version,
      home:os.homedir(),
      cwd:process.cwd(),
      uptimeSeconds:Math.round(os.uptime()),
      freeMemoryBytes:os.freemem(),
      totalMemoryBytes:os.totalmem(),
      storage:storage?{bsize:storage.bsize,blocks:storage.blocks,bavail:storage.bavail}:null,
      pcRequired:false,
      usbRequired:false
    };
  }
  if(capability==="workstation.exec"){
    const command=String(args?.command||"").trim();
    if(!command)throw new Error("COMMAND_REQUIRED");
    if(command.length>8192)throw new Error("COMMAND_TOO_LONG");
    const timeout=Math.max(1000,Math.min(Number(args?.timeoutMs)||60000,MAX_TIMEOUT));
    const cwd=safeCwd(args?.cwd);
    try{
      const result=await execFileAsync("/data/data/com.termux/files/usr/bin/bash",["-lc",command],{
        cwd,timeout,maxBuffer:MAX_OUTPUT,env:{...process.env,LEEWAY_EXECUTION_NODE:"leeway-phone-workstation"}
      });
      return {ok:true,exitCode:0,cwd,stdout:result.stdout,stderr:result.stderr};
    }catch(error){
      return {
        ok:false,
        cwd,
        exitCode:Number(error?.code)||1,
        stdout:String(error?.stdout||"").slice(0,MAX_OUTPUT),
        stderr:String(error?.stderr||error?.message||"").slice(0,MAX_OUTPUT)
      };
    }
  }
  if(capability==="workstation.file.read"){
    const file=safePath(args?.path);
    const stat=fs.statSync(file);
    if(!stat.isFile())throw new Error("NOT_A_FILE");
    if(stat.size>MAX_FILE)throw new Error("FILE_TOO_LARGE");
    return {ok:true,path:file,bytes:stat.size,text:fs.readFileSync(file,"utf8")};
  }
  if(capability==="workstation.file.write"){
    const file=safePath(args?.path);
    const text=String(args?.text??"");
    if(Buffer.byteLength(text,"utf8")>MAX_FILE)throw new Error("FILE_TOO_LARGE");
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,text,"utf8");
    return {ok:true,path:file,bytes:Buffer.byteLength(text,"utf8")};
  }
  throw new Error("CAPABILITY_NOT_SUPPORTED");
}
function connect(){
  const ws=new WebSocket(RELAY);
  ws.on("open",()=>{
    ws.send(JSON.stringify({type:"hello",role:"workstation",deviceId:DEVICE_ID,token:TOKEN}));
  });
  ws.on("message",async raw=>{
    let msg;try{msg=JSON.parse(raw.toString())}catch{return}
    if(msg.type==="hello-ack"){
      reconnectMs=1000;
      receipt({event:"workstation.connect",status:"PASS",deliveryMode:msg.deliveryMode||null});
      return;
    }
    if(msg.type!=="command"||!msg.id)return;
    const capability=String(msg.capability||"");
    let value;
    try{
      value=await execute(capability,msg.arguments||{});
      const ok=value?.ok!==false;
      receipt({event:capability,status:ok?"PASS":"FAIL",commandId:msg.id});
      ws.send(JSON.stringify({type:"result",id:msg.id,ok,capability,result:value}));
    }catch(error){
      const detail=String(error?.message||error);
      receipt({event:capability,status:"BLOCKED",commandId:msg.id,detail});
      ws.send(JSON.stringify({type:"result",id:msg.id,ok:false,capability,error:detail}));
    }
  });
  ws.on("close",()=>{
    receipt({event:"workstation.disconnect",status:"OBSERVED"});
    setTimeout(connect,reconnectMs);
    reconnectMs=Math.min(reconnectMs*2,30000);
  });
  ws.on("error",()=>{ try{ws.close()}catch{} });
}
receipt({event:"workstation.worker.start",status:"PASS",pid:process.pid});
connect();
