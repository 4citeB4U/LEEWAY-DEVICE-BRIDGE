import {discoverDevice} from "./device-discovery.js";
import {createApplePwaDiagnostics, runBrowserComputeProbe} from "./apple-pwa-diagnostics.js";

const $=s=>document.querySelector(s);
const isAppleMobile=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(
  navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1
);
if(isAppleMobile())document.documentElement.classList.add("apple-pwa");
function esc(v){return String(v??"UNKNOWN").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
function renderFacts(profile){
  $("#facts").innerHTML=Object.entries(profile).filter(([k])=>!["schemaVersion","capturedAt","userAgent"].includes(k)).map(([k,f])=>`<div class="fact"><small>${esc(k)}</small><b>${esc(typeof f.value==="object"?JSON.stringify(f.value):f.value)}</b><span class="evidence">${esc(f.evidence)}</span></div>`).join("");
}
async function resolvePackage(profile){
  const manifest=await fetch("./package-manifest.json",{cache:"no-store"}).then(r=>r.json());
  const platform=profile.platform.value;
  return {manifest,pkg:manifest.packages.find(p=>p.platform===platform)||null};
}
function renderPackage(manifest,pkg){
  const state=$("#packageState"),card=$("#packageCard");
  if(!state||!card)return;
  // Public GitHub Pages is a non-authoritative onboarding display. A
  // development APK or manifest-declared URL is NEVER a customer release.
  // Signed native installers require original Runtime account/invitation
  // admission, verified architecture and owner-confirmed package signing.
  state.textContent="NATIVE RELEASE NOT ADMITTED";
  card.replaceChildren();
  const title=document.createElement("h3");
  title.textContent="Device Bridge enrollment comes before a native installer";
  const detail=document.createElement("p");
  detail.className="package-meta";
  detail.textContent=pkg?.channel==="development"
    ?"This source currently lists an Android debug build. It is a developer artifact, not a signed customer package. No download or update is offered."
    :"Complete original LeeWay sign-in, invitation verification and device-specific native signing qualification before a package can be released.";
  const link=document.createElement("a");
  link.className="action secondary";
  link.href="#bridgeSetup";
  link.textContent="Review secure device setup";
  card.append(title,detail,link);
}
async function showPublishedAndroidPackage(){
  try{
    const manifest=await fetch("./package-manifest.json",{cache:"no-store"}).then(r=>r.json());
    const pkg=manifest.packages.find(p=>p.platform==="android")||null;
    renderPackage(manifest,pkg);
  }catch{
    $("#packageState").textContent="UNAVAILABLE";
  }
}

function buildBootstrap(profile,pkg){
  const id=crypto.randomUUID?.()||`ldb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    bootstrapSessionId:id,
    createdAt:new Date().toISOString(),
    browserProfile:profile,
    selectedPackageId:pkg?.id||null,
    nativeVerificationRequired:true,
    authority:"BROWSER_DISCOVERY_ONLY",
    publication:"GITHUB_PAGES",
    runtimeLocation:"PHONE_LOCAL",
    dockerRuntimeRequired:false,
    llmEntrypoint:"./llm-entrypoint.json",
    providerRegistry:"./provider-registry.json"
  };
}
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").then(registration=>registration.update()).catch(()=>{});
}

const appleState=message=>{const el=$("#applePwaState");if(el)el.textContent=message;};
const appleOut=value=>{const el=$("#appleBrainOutput");if(el)el.textContent=typeof value==="string"?value:JSON.stringify(value,null,2);};
const appleSummary=message=>{const el=$("#appleDiagnosticsSummary");if(el)el.textContent=message;};
function refreshAppleDiagnostics(){
  const diagnostics=createApplePwaDiagnostics();
  appleState("BROWSER OBSERVED");
  appleSummary("Safari browser details were recorded locally. This does not claim native Metal, Formula, Veritas, or a receipt.");
  appleOut(diagnostics);
  return diagnostics;
}
function beginAppleQualification(){
  refreshAppleDiagnostics();
  $("#appleBrowserAdapter")?.scrollIntoView({behavior:"smooth",block:"start"});
}
$("#refreshAppleDiagnostics")?.addEventListener("click",refreshAppleDiagnostics);
$("#beginAppleQualification")?.addEventListener("click",beginAppleQualification);
$("#runBrowserCompute")?.addEventListener("click",async()=>{
  appleState("COMPUTE RUNNING");
  appleSummary("Running the browser compute check. It will remain browser evidence even if readback passes.");
  appleOut("Running deterministic browser WebGPU compute and readback. Native Metal, Formula, Veritas, and receipt state remain separate.");
  const result=await runBrowserComputeProbe();
  appleState(result.state);
  appleSummary(result.state==="BROWSER_WEBGPU_READBACK_PASSED"
    ? "Browser compute readback passed. This is Apple browser evidence, not native Metal or model-inference evidence."
    : "Browser compute did not complete. Open technical browser evidence only if you need the diagnostic record.");
  appleOut({...createApplePwaDiagnostics(),browserCompute:result});
});
appleState("NOT RUN");
appleSummary("Run a browser check when you need current Safari evidence. Browser evidence is separate from native Metal evidence.");
$("#discoverBtn").addEventListener("click",async()=>{
  $("#discoveryState").textContent="RUNNING";
  const profile=await discoverDevice();
  renderFacts(profile);
  $("#discoveryState").textContent="OBSERVED";
  const confidenceBadge=$("#confidenceBadge");
  if(confidenceBadge)confidenceBadge.textContent=profile.exactModel.value?"MODEL OBSERVED":"NATIVE VERIFY REQUIRED";
  const {manifest,pkg}=await resolvePackage(profile);
  const bootstrap=buildBootstrap(profile,pkg);
  localStorage.setItem("leeway.device.bootstrap",JSON.stringify(bootstrap));
  $("#profileOutput").textContent=JSON.stringify(bootstrap,null,2);
  renderPackage(manifest,pkg);
});
showPublishedAndroidPackage();


let deferredInstallPrompt=null;
const pwaState=message=>{const el=$("#pwaState");if(el)el.textContent=message;};
const pwaOut=message=>{const el=$("#pwaOutput");if(el)el.textContent=message;};
const isStandalone=()=>window.matchMedia?.("(display-mode: standalone)")?.matches||window.navigator.standalone===true;
const showAppleInstallHelp=()=>{
  const help=$("#bridgeAppleInstructions");
  if(help){help.hidden=false;help.scrollIntoView({behavior:"smooth",block:"center"});} const steps=$("#bridgeApplePwaSteps");if(steps)steps.hidden=false;
  if(isStandalone()){
    pwaState("INSTALLED");
    pwaOut("LeeWay Device Bridge is opened as a Home Screen browser shortcut. This does NOT prove Apple native Bridge installation or device enrollment.");
    return;
  }
  pwaState("SAFARI: ADD TO HOME");
  pwaOut("Safari: optionally tap Share, then Add to Home Screen for a browser display shortcut. It does not enroll Apple Device Bridge or grant native device access.");
};

function refreshPwaInstallState(){
  if(isStandalone()){
    pwaState("INSTALLED");
    pwaOut("LeeWay Device Bridge is opened from a Home Screen display shortcut. Native Apple enrollment and Runtime identity are separate.");
    const btn=$("#installPwaBtn");if(btn){btn.disabled=false;btn.textContent="LEEWAY APP INSTALLED — SHOW STATUS";}
    return;
  }
  if(isAppleMobile()){
    pwaState("SAFARI: ADD TO HOME");
    pwaOut("iPhone/iPad display shortcut: in Safari tap Share, then Add to Home Screen. Native Device Bridge installation and Runtime authorization are separate.");
    const btn=$("#installPwaBtn");if(btn)btn.textContent="SHOW APPLE INSTALL STEPS";
    return;
  }
  if(deferredInstallPrompt){
    pwaState("READY TO INSTALL");
    pwaOut("Install only the Device Bridge display shortcut from this browser. This cannot install a native capability adapter.");
    return;
  }
  pwaState("BROWSER INSTALL");
  pwaOut("Use the browser Install app or Add to Home Screen option for a display shortcut only; signed native Device Bridge setup remains separate.");
}

addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  refreshPwaInstallState();
});
addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  refreshPwaInstallState();
});
$("#installPwaBtn")?.addEventListener("click",async()=>{
  if(isAppleMobile()||isStandalone()){showAppleInstallHelp();return;}
  if(!deferredInstallPrompt){
    pwaState("USE BROWSER INSTALL");
    pwaOut("Open the browser menu and choose Install app or Add to Home Screen for the Bridge display shortcut; native device enrollment is separate.");
    return;
  }
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice.catch(()=>null);
  deferredInstallPrompt=null;
  pwaState(choice?.outcome==="accepted"?"INSTALL ACCEPTED":"INSTALL NOT COMPLETED");
  pwaOut(choice?.outcome==="accepted"?"LeeWay Device Bridge display shortcut installation was accepted; native device enrollment NOT verified.":"The Bridge page remains available in this browser; signed native installation remains a separate approval.");
});
$("#launchPwaBtn")?.addEventListener("click",()=>location.reload());
refreshPwaInstallState();
