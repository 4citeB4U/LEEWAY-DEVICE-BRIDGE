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
  if(!pkg){
    $("#packageState").textContent="NO ROUTE";
    $("#packageCard").innerHTML=`<h3>No verified Android package published</h3><p class="package-meta">GitHub Pages will expose a package only after size, SHA-256 and runtime qualification pass.</p>`;
    return;
  }
  $("#packageState").textContent=pkg.status;
  const measured=pkg.sizeBytes==null?"Not measured":`${pkg.sizeBytes} bytes`;
  const action=pkg.downloadUrl
    ? `<a class="action" href="${esc(pkg.downloadUrl)}" download>Download & update LeeWay Device Bridge ${esc(pkg.versionName||"")}</a>`
    : `<button id="handoffBtn" class="action">Package build required</button>`;
  $("#packageCard").innerHTML=`<h3>${esc(pkg.label)}</h3><p class="package-meta">Release: ${esc(pkg.versionName||"Unknown")} · Status: ${esc(pkg.status)}<br>Published from GitHub Pages · SHA-256: ${esc(pkg.sha256||"Not published")}</p>${action}<p class="package-meta"><strong>Update:</strong> install the published Android package over the current one. If Android reports a signature conflict, stop and use the platform’s controlled migration path; do not erase app data.</p>`;
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
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
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
  const help=$("#appleInstallSteps");
  if(help){help.open=true;help.scrollIntoView({behavior:"smooth",block:"center"});}
  if(isStandalone()){
    pwaState("INSTALLED");
    pwaOut("LeeWay is already installed. Launch and use it from the LeeWay Home Screen icon. There is no additional Apple download.");
    return;
  }
  pwaState("SAFARI: ADD TO HOME");
  pwaOut("Safari does not let a web page open Apple's Add to Home Screen control. Tap Safari Share, choose Add to Home Screen, then tap Add. Do not download the Android APK.");
};

function refreshPwaInstallState(){
  if(isStandalone()){
    pwaState("INSTALLED");
    pwaOut("LeeWay is running as an installed Home Screen app. There is no additional Apple download.");
    const btn=$("#installPwaBtn");if(btn){btn.disabled=false;btn.textContent="LEEWAY APP INSTALLED — SHOW STATUS";}
    return;
  }
  if(isAppleMobile()){
    pwaState("SAFARI: ADD TO HOME");
    pwaOut("Apple iPhone installation: tap Safari Share, choose Add to Home Screen, then tap Add. Do not download the Android APK.");
    const btn=$("#installPwaBtn");if(btn)btn.textContent="SHOW APPLE INSTALL STEPS";
    return;
  }
  if(deferredInstallPrompt){
    pwaState("READY TO INSTALL");
    pwaOut("Install the LeeWay Device-Neutral Workstation directly from this browser.");
    return;
  }
  pwaState("BROWSER INSTALL");
  pwaOut("If this browser does not show a direct install prompt yet, use its menu and choose Install app or Add to Home screen. No APK is required for the base workstation.");
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
    pwaOut("Open the browser menu and choose Install app or Add to Home screen. This installs the LeeWay workstation without sideloading an APK.");
    return;
  }
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice.catch(()=>null);
  deferredInstallPrompt=null;
  pwaState(choice?.outcome==="accepted"?"INSTALL ACCEPTED":"INSTALL NOT COMPLETED");
  pwaOut(choice?.outcome==="accepted"?"LeeWay Workstation installation was accepted.":"The workstation remains available in the browser; no APK is required.");
});
$("#launchPwaBtn")?.addEventListener("click",()=>location.reload());
refreshPwaInstallState();
