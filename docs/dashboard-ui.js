/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC
TAG: LEEWAY.DEVICE.CONSOLE.INTERACTION.V2
WHO: LeeWay Industries
WHAT: Evidence-bound dashboard interaction and browser diagnostics
WHEN: 2026-11-02
WHERE: docs/dashboard-ui.js
WHY: Device map, panels and diagnostics must respond to user actions without simulated remote authority
HOW: Expandable surfaces, real browser capability reads, read-only public gateway checks
AUTHORITY: Presentation and browser observation only; no authenticated MCP command execution
LICENSE: MIT
*/
const q=(s,root=document)=>root.querySelector(s);
const qa=(s,root=document)=>Array.from(root.querySelectorAll(s));
const localEvents=[];
const state={group:"all",selectedDevice:null,remoteInventory:null,authorized:false,expanded:null};
const groupLabels={desktop:"Desktop",laptop:"Laptop",mobile:"Mobile",iot:"IoT / Edge",server:"Servers",tablet:"Tablet",all:"All Devices"};
function eventLog(message){
  const entry={time:new Date().toLocaleTimeString(),message};
  localEvents.unshift(entry);if(localEvents.length>60)localEvents.pop();
  const target=q("#dbEventList");if(!target)return;
  target.replaceChildren();
  for(const item of localEvents){
    const row=document.createElement("p");row.textContent=item.time+"  •  "+item.message;target.append(row);
  }
}
function expand(id){
  const panel=document.getElementById(id);if(!panel)return;
  const previous=state.expanded&&document.getElementById(state.expanded);
  if(previous){previous.classList.remove("db-expanded");q(".db-expand",previous)?.setAttribute("aria-label","Expand "+state.expanded);}
  if(previous===panel){state.expanded=null;document.body.classList.remove("db-modal-open");return;}
  panel.classList.add("db-expanded");q(".db-expand",panel)?.setAttribute("aria-label","Restore panel size");
  state.expanded=id;document.body.classList.add("db-modal-open");
  q(".db-expand",panel)?.focus();
}
qa("[data-expand]").forEach(button=>button.addEventListener("click",()=>expand(button.dataset.expand)));
window.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.expanded)expand(state.expanded)});
function renderInventory(){
  const label=groupLabels[state.group]||state.group;
  q("#dbInventoryTitle").textContent=label+" · owner-scoped inventory";
  const rows=q("#dbInventoryRows");rows.replaceChildren();
  const inventory=Array.isArray(state.remoteInventory)?state.remoteInventory:[];
  const matches=inventory.filter(item=>state.group==="all"||item.category===state.group);
  if(matches.length===0){
    const row=document.createElement("tr"),cell=document.createElement("td");
    cell.colSpan=4;cell.className="db-pending";
    cell.textContent=state.remoteInventory===null
      ?"No authenticated device inventory available. Connection must be authorized through the canonical Device Bridge."
      :"No devices in this verified group.";
    row.append(cell);rows.append(row);
  }else{
    for(const item of matches){
      const row=document.createElement("tr");
      for(const field of ["name","platform","health","status"]){
        const cell=document.createElement("td");cell.textContent=String(item[field]??"Unverified");row.append(cell);
      }
      row.tabIndex=0;row.setAttribute("role","button");
      row.addEventListener("click",()=>selectDevice(item));
      row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();selectDevice(item)}});
      rows.append(row);
    }
  }
  q("#dbInventoryState").textContent=state.remoteInventory===null?"Discovery connection not established":matches.length+" verified records";
}
function selectDevice(item){
  // Only call this on an actual owner-scoped inventory record, never a constructed diagram node.
  if(!state.authorized||!state.remoteInventory?.includes(item))return;
  state.selectedDevice=item;
  q("#dbSelectedDevice").textContent="Selected "+item.name+" — verify each capability and command admission before enabling controls.";
  eventLog("Selected verified inventory record: "+item.name);
}
function groupSelect(group){
  if(!groupLabels[group])return;
  state.group=group;
  qa(".db-node").forEach(node=>node.classList.toggle("db-node-selected",node.dataset.deviceKind===group));
  qa(".db-filter-row [data-device-kind]").forEach(node=>node.classList.toggle("db-filter-active",node.dataset.deviceKind===group));
  renderInventory();expand("dbDevices");
  eventLog("Opened "+groupLabels[group]+" inventory; authentication still required for device records");
}
qa(".db-node").forEach(node=>node.addEventListener("click",()=>groupSelect(node.dataset.deviceKind)));
qa(".db-filter-row [data-device-kind]").forEach(node=>node.addEventListener("click",()=>{state.group=node.dataset.deviceKind;renderInventory()}));
async function browserDiagnostics(){
  const facts=[];
  const add=(label,value,scope)=>facts.push({label,value,scope});
  add("Capture time",new Date().toLocaleString(),"Current browser");
  add("Browser platform",navigator.userAgentData?.platform||navigator.platform||"Unavailable","Browser reported");
  add("Online hint",navigator.onLine?"Online":"Offline","Browser hint; not bridge health");
  add("Logical processors",navigator.hardwareConcurrency??"Unavailable","Browser hint; not CPU usage");
  add("Device memory hint",navigator.deviceMemory? navigator.deviceMemory+" GiB":"Unavailable","Browser hint; not RAM utilization");
  add("Display",screen.width+" × "+screen.height,"Browser display");
  add("Pixel ratio",window.devicePixelRatio||"Unavailable","Browser display");
  add("Touch points",navigator.maxTouchPoints??"Unavailable","Browser observation");
  add("Connection type",navigator.connection?.effectiveType||"Unavailable","Network Information API");
  if(navigator.storage?.estimate){
    try{
      const storage=await navigator.storage.estimate();
      add("Origin storage used",storage.usage!=null?(storage.usage/1048576).toFixed(1)+" MiB":"Unavailable","This browser origin only");
      add("Origin storage quota",storage.quota!=null?(storage.quota/1073741824).toFixed(2)+" GiB":"Unavailable","This browser origin only");
    }catch{add("Browser storage","Read failed","Browser only")}
  }
  if(navigator.getBattery){
    try{
      const battery=await navigator.getBattery();
      add("Battery",Math.round(battery.level*100)+"%"+(battery.charging?" · Charging":""),"Browser-exposed device value");
    }catch{add("Battery","Access unavailable","Browser only")}
  }
  const target=q("#dbRealDiagnostics");target.replaceChildren();
  for(const fact of facts){
    const card=document.createElement("div");
    const small=document.createElement("small");small.textContent=fact.label;
    const value=document.createElement("strong");value.textContent=String(fact.value);
    const scope=document.createElement("small");scope.textContent=fact.scope;
    card.append(small,value,scope);target.append(card);
  }
  eventLog("Measured "+facts.length+" browser diagnostic facts (not remote device telemetry)");
}
q("#dbMeasure")?.addEventListener("click",browserDiagnostics);
q("#dbRunBrowserDiagnostics")?.addEventListener("click",()=>{expand("dbDiagnostics");browserDiagnostics()});
async function checkGateway(){
  // Only public OIDC protected-resource metadata. Never send OAuth tokens from this page.
  q("#dbConnection").textContent="● Checking public gateway";
  try{
    const response=await fetch(location.hostname==="4citeb4u.github.io" ? "https://leeway-device-bridge.vercel.app/.well-known/oauth-protected-resource/mcp" : "/.well-known/oauth-protected-resource/mcp",{cache:"no-store",headers:{accept:"application/json"},signal:AbortSignal.timeout(8000)});
    const contentType=response.headers.get("content-type")||"";
    if(response.ok&&contentType.includes("json")){
      const meta=await response.json();
      if(typeof meta.resource==="string"&&Array.isArray(meta.authorization_servers)){
        q("#dbConnection").textContent="● Gateway metadata available";
        q("#dbRuntime").textContent="▣ MCP resource advertised";
        q("#dbConnection").classList.remove("db-pill-alert");
        eventLog("Public OAuth resource metadata reachable; device authentication not established");
      }else throw new Error("Invalid OAuth resource metadata");
    }else throw new Error("Gateway metadata HTTP "+response.status);
  }catch(error){
    q("#dbConnection").textContent="● Browser bridge session unverified";
    q("#dbRuntime").textContent="▣ Runtime unverified here";
    q("#dbConnection").classList.add("db-pill-alert");
    eventLog("Gateway discovery unavailable: "+String(error.message||error).slice(0,120));
  }
  q("#dbDeviceCount").textContent="◇ Devices: not discovered";
  renderInventory();
}
q("#dbRefresh")?.addEventListener("click",()=>{checkGateway();loadAutomationFeed()});
q("#dbShowAutomation")?.addEventListener("click",()=>{expand("dbActions");loadAutomationFeed();loadRegisteredProviders()});
q("#dbShowPolicies")?.addEventListener("click",()=>{
  q("#dbAutomationState").textContent="Policy state is not exposed to this browser; no policy was applied.";
  expand("dbActions");eventLog("Viewed policy connection state; no mutation requested");
});
q("#dbOpenSettings")?.addEventListener("click",()=>{
  const legacy=q("#dbLegacy");if(legacy)legacy.open=true;
  legacy?.scrollIntoView({behavior:"smooth",block:"start"});
  eventLog("Opened existing platform setup controls");
});
const capabilityMap={
 "Remote View":"device.screen.capture (native adapter and consent required)",
 "Open Shell":"device.process.execute (explicit governed command admission required)",
 "File Access":"device.files.read / device.files.write (scoped filesystem grant required)",
 "App Control":"device.app.* (native platform provider and grant required)",
 "Power":"device.power.* (native platform provider and grant required)",
 "Restart":"device.power.restart (explicit high-impact consent required)",
 "Shutdown":"device.power.shutdown (explicit high-impact consent required)",
 "Wake":"device.power.wake (platform and network support required)",
 "Services":"device.service.* (native adapter required)",
 "Processes":"device.process.* (device adapter and owner grant required)",
 "Install / Update":"device.package.* (signed and verified package required)",
 "Execute Skill":"agent skill dispatch (governed admission required)"
};
qa(".db-control").forEach(button=>{
  const name=button.textContent.trim();
  button.addEventListener("click",()=>{
    const details=q("#dbControlDetails");
    const selected=state.selectedDevice?.name||"No verified device selected";
    details.textContent=name+" — "+(capabilityMap[name]||"Device capability required")+
      ". Device: "+selected+". Remote action NOT EXECUTED. Owner-bound discovery and command admission must pass first.";
    eventLog("Inspected "+name+" capability; no device command executed");
  });
});
async function verifyDownloads(){
  try{
    const res=await fetch("./package-manifest.json",{cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!res.ok)throw new Error("Package manifest HTTP "+res.status);
    const manifest=await res.json();
    const android=manifest.packages?.find(item=>item.platform==="android");
    const tile=qa(".db-download-tile")[3];
    if(android?.downloadUrl&&android?.sha256&&android?.sizeBytes&&tile){
      const link=q("a",tile);link.href=new URL(android.downloadUrl,location.href).href;
      link.title="Native Android extension "+(android.versionName||"")+"; SHA-256: "+android.sha256;
      eventLog("Published Android extension manifest read; full workstation bundle not asserted");
    }
  }catch(error){eventLog("Package manifest unavailable: "+String(error.message||error))}
}


async function loadRegisteredProviders(){
  const target=q("#dbProviderState");if(!target)return;
  try{
    const response=await fetch("./provider-registry.json",{cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error("Provider registry HTTP "+response.status);
    const registry=await response.json();
    if(!Array.isArray(registry.providers))throw new Error("Registry format invalid");
    const providers=registry.providers.filter(item=>item.class==="automation");
    target.replaceChildren();
    const heading=document.createElement("strong");heading.textContent="Registered automation providers (source declarations, not live jobs)";
    target.append(heading);
    if(!providers.length){const row=document.createElement("p");row.textContent="No automation providers declared";target.append(row);}
    for(const provider of providers){
      const row=document.createElement("div");row.className="db-workflow-row";
      const name=document.createElement("span");
      name.textContent=String(provider.id||"Unnamed")+" — "+String(provider.status||"UNVERIFIED");
      row.append(name);target.append(row);
    }
    const note=document.createElement("small");
    note.textContent="Registered capabilities do not prove current execution, runtime health, or owner authorization.";
    target.append(note);
  }catch(error){target.textContent="Provider registry unavailable: "+String(error.message||error)}
}

async function loadAutomationFeed(){
  const target=q("#dbAutomationState");if(!target)return;
  target.textContent="Checking GitHub Actions workflow activity (not the LeeWay workforce task feed)…";
  try{
    const response=await fetch("https://api.github.com/repos/4citeB4U/LEEWAY-DEVICE-BRIDGE/actions/runs?per_page=6",{
      headers:{accept:"application/vnd.github+json"},cache:"no-store",signal:AbortSignal.timeout(9000)
    });
    if(!response.ok)throw new Error("GitHub HTTP "+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload.workflow_runs))throw new Error("Unexpected workflow response");
    target.replaceChildren();
    const heading=document.createElement("strong");
    heading.textContent="Live GitHub Actions — repository workflows only";
    target.append(heading);
    if(!payload.workflow_runs.length){
      const empty=document.createElement("p");empty.textContent="No recent GitHub workflow runs were returned.";
      target.append(empty);return;
    }
    for(const run of payload.workflow_runs){
      const row=document.createElement("div");row.className="db-workflow-row";
      const label=document.createElement("span");
      label.textContent=String(run.name||"Workflow")+" — "+String(run.status||"Unknown")+
        (run.conclusion?" / "+run.conclusion:"");
      row.append(label);
      if(typeof run.html_url==="string"){
        const url=new URL(run.html_url);
        if(url.protocol==="https:"&&url.hostname==="github.com"){
          const link=document.createElement("a");link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";link.textContent="View run";
          row.append(link);
        }
      }
      target.append(row);
    }
    const note=document.createElement("small");
    note.textContent="Runtime Fabric, workforce agents and externally scheduled automations are not included until their authorized feeds are connected.";
    target.append(note);
    eventLog("Read public GitHub Actions workflow status");
  }catch(error){
    target.textContent="GitHub Actions feed unavailable: "+String(error.message||error)+
      ". Runtime workforce automations remain unconnected.";
    eventLog("Workflow feed lookup failed");
  }
}

renderInventory();
eventLog("Dashboard initialized: device and automation feeds require authenticated service");
verifyDownloads();
checkGateway();
loadAutomationFeed();
loadRegisteredProviders();
