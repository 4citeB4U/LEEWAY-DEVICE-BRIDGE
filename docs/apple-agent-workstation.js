const RELAY_URL="wss://agent-lee-x.vercel.app/api/device-relay";
const RELAY_TIMEOUT_MS=30000;
// Pairing is intentionally held in page memory only; this module never uses localStorage.

const $=selector=>document.querySelector(selector);
const setText=(selector,value)=>{const element=$(selector);if(element)element.textContent=typeof value==="string"?value:JSON.stringify(value,null,2);};
const setState=value=>setText("#agentLeeState",value);
const commandId=()=>crypto.randomUUID?.()||`apple-pwa-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function sanitize(value){
  if(Array.isArray(value))return value.map(sanitize);
  if(!value||typeof value!=="object")return value;
  return Object.fromEntries(Object.entries(value).map(([key,entry])=>[
    key,/token|secret|authorization|credential|password/i.test(key)?"REDACTED":sanitize(entry)
  ]));
}

function remoteCapabilities(result){
  const raw=result?.remoteQualified??result?.result?.remoteQualified;
  if(Array.isArray(raw))return raw.filter(value=>typeof value==="string");
  if(typeof raw==="string"&&/^\[[^\[\]\r\n]*\]$/.test(raw)&&raw.length<=16384){
    const body=raw.slice(1,-1).trim();
    return body?body.split(",").map(value=>value.trim()).filter(Boolean):[];
  }
  return [];
}

function executeRelay({deviceId,token,capability,args}){
  return new Promise((resolve,reject)=>{
    const id=commandId();
    let settled=false;
    let authenticated=false;
    let socket;
    const finish=(error,result)=>{
      if(settled)return;
      settled=true;
      clearTimeout(timer);
      try{socket?.close();}catch{}
      error?reject(new Error(error)):resolve(result);
    };
    const timer=setTimeout(()=>finish("RELAY_TIMEOUT"),RELAY_TIMEOUT_MS);
    try{socket=new WebSocket(RELAY_URL);}catch{finish("RELAY_CONNECTION_FAILED");return;}
    socket.onopen=()=>socket.send(JSON.stringify({type:"hello",role:"client",deviceId,token}));
    socket.onerror=()=>finish("RELAY_CONNECTION_FAILED");
    socket.onclose=()=>{if(!settled)finish("RELAY_CLOSED");};
    socket.onmessage=event=>{
      let message;
      try{message=JSON.parse(event.data);}catch{finish("INVALID_RELAY_RESPONSE");return;}
      if(message.type==="hello-ack"&&!authenticated){
        authenticated=true;
        socket.send(JSON.stringify({type:"command",id,capability,arguments:args}));
        return;
      }
      if(message.type==="result"&&message.id===id){
        if(!authenticated||message.capability!==capability||message.ok!==true||message.result?.ok===false){finish("REMOTE_EXECUTION_DENIED");return;}
        finish(null,message.result);
        return;
      }
      if(message.type==="error")finish("RELAY_REJECTED");
    };
  });
}

function renderConversation(execution){
  const value=execution?.result??execution;
  const summary={
    transport:"REMOTE_RESULT_RECEIVED",
    executionState:value?.ok===false?"REMOTE_RUNTIME_REPORTED_FAILURE":"REMOTE_RUNTIME_RESULT_RECEIVED",
    modelExecuted:value?.modelExecuted??"NOT_REPORTED",
    modelId:value?.modelId??"NOT_REPORTED",
    authority:value?.authority??"NOT_REPORTED",
    canonicalFormulaState:execution?.canonicalFormulaState??value?.canonicalFormulaState??"NOT_REPORTED",
    veritasState:value?.veritasState??"NOT_REPORTED",
    receiptState:value?.receiptState??"NOT_REPORTED",
    response:value?.response??"NOT_REPORTED",
    runtimeEvidence:sanitize(execution)
  };
  setText("#agentLeeConversation",summary);
}

export function initializeAppleAgentWorkstation(){
  const panel=$("#agentLeeWorkstation");
  if(!panel)return;
  let activePairing=null;
  const pairButton=$("#pairRuntimeBtn");
  const healthButton=$("#remoteHealthBtn");
  const consoleElement=$("#agentLeeConsole");

  $("#clearPairingBtn")?.addEventListener("click",()=>{
    activePairing=null;
    $("#deviceIdInput").value="";
    $("#pairingTokenInput").value="";
    $("#agentLeePrompt").value="";
    consoleElement.hidden=true;
    healthButton.disabled=true;
    setState("NOT PAIRED");
    setText("#agentLeeOutput","Runtime pairing cleared from this PWA page memory.");
    setText("#agentLeeConversation","No Agent Lee request has been sent from this Apple workstation.");
  });

  pairButton?.addEventListener("click",async()=>{
    const deviceId=$("#deviceIdInput").value.trim();
    const token=$("#pairingTokenInput").value.trim();
    if(!deviceId||!token){
      setState("PAIRING INPUT REQUIRED");
      setText("#agentLeeOutput","Enter the Device ID and owner pairing token from the runtime you are authorizing for this Apple workstation.");
      return;
    }
    pairButton.disabled=true;
    setState("CHECKING RUNTIME CAPABILITIES");
    setText("#agentLeeOutput","Connecting to the LeeWay relay and checking the paired runtime’s advertised capabilities.");
    try{
      const result=await executeRelay({deviceId,token,capability:"device.capabilities",args:{}});
      const capabilities=remoteCapabilities(result);
      if(!capabilities.includes("agent.chat"))throw new Error("AGENT_CHAT_NOT_ADVERTISED");
      activePairing={deviceId,token,capabilities};
      $("#pairingTokenInput").value="";
      healthButton.disabled=false;
      consoleElement.hidden=false;
      setState("AGENT CHAT READY");
      setText("#agentLeeOutput",{
        pairingState:"AGENT_CHAT_READY",
        advertisedCapabilities:capabilities,
        formulaState:"NOT_EXECUTED_UNTIL_RUNTIME_REPORTS_A_REAL_EVALUATION",
        veritasState:"NOT_EXECUTED_UNTIL_RUNTIME_REPORTS_A_REAL_VERIFICATION",
        receiptState:"NOT_CREATED_UNTIL_RUNTIME_RETURNS_A_RECEIPT"
      });
    }catch(error){
      activePairing=null;
      healthButton.disabled=true;
      consoleElement.hidden=true;
      setState("PAIRING BLOCKED");
      setText("#agentLeeOutput",{pairingState:"BLOCKED",reason:error.message});
    }finally{pairButton.disabled=false;}
  });

  healthButton?.addEventListener("click",async()=>{
    if(!activePairing)return;
    healthButton.disabled=true;
    setState("CHECKING RUNTIME HEALTH");
    try{
      const result=await executeRelay({...activePairing,capability:"device.health",args:{}});
      setState("RUNTIME HEALTH RECEIVED");
      setText("#agentLeeOutput",{transport:"REMOTE_RESULT_RECEIVED",capability:"device.health",runtimeEvidence:sanitize(result)});
    }catch(error){
      setState("RUNTIME HEALTH BLOCKED");
      setText("#agentLeeOutput",{transport:"NO_VERIFIED_RUNTIME_RESULT",capability:"device.health",reason:error.message});
    }finally{healthButton.disabled=false;}
  });

  $("#sendAgentLeeBtn")?.addEventListener("click",async()=>{
    const prompt=$("#agentLeePrompt").value.trim();
    if(!activePairing){setState("PAIRING REQUIRED");return;}
    if(!prompt){setText("#agentLeeConversation","Write a task for Agent Lee before sending it to the paired runtime.");return;}
    setState("AGENT LEE REQUEST RUNNING");
    setText("#agentLeeConversation","Sending the user-authored task to the paired runtime. The returned execution evidence will determine the displayed state.");
    try{
      const result=await executeRelay({
        ...activePairing,
        capability:"agent.chat",
        args:{userRequest:prompt,prompt,speak:false,creatorContext:"apple-pwa"}
      });
      setState("AGENT LEE RESULT RECEIVED");
      renderConversation(result);
    }catch(error){
      setState("AGENT LEE REQUEST BLOCKED");
      setText("#agentLeeConversation",{transport:"NO_VERIFIED_RUNTIME_RESULT",capability:"agent.chat",reason:error.message});
    }
  });
}
