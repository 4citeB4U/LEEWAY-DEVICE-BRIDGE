import {discoverDevice} from "./device-discovery.js";

const $=s=>document.querySelector(s);
function esc(v){return String(v??"UNKNOWN").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
function renderFacts(profile){
  $("#facts").innerHTML=Object.entries(profile).filter(([k])=>!["schemaVersion","capturedAt","userAgent"].includes(k)).map(([k,f])=>`<div class="fact"><small>${esc(k)}</small><b>${esc(typeof f.value==="object"?JSON.stringify(f.value):f.value)}</b><span class="evidence">${esc(f.evidence)}</span></div>`).join("");
}
async function resolvePackage(profile){
  const manifest=await fetch("./package-manifest.json",{cache:"no-store"}).then(r=>r.json());
  const platform=profile.platform.value;
  return manifest.packages.find(p=>p.platform===platform)||null;
}
function buildBootstrap(profile,pkg){
  const id=crypto.randomUUID?.()||`ldb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    bootstrapSessionId:id,
    createdAt:new Date().toISOString(),
    browserProfile:profile,
    selectedPackageId:pkg?.id||null,
    nativeVerificationRequired:true,
    authority:"BROWSER_DISCOVERY_ONLY"
  };
}
$("#discoverBtn").addEventListener("click",async()=>{
  $("#discoveryState").textContent="RUNNING";
  const profile=await discoverDevice();
  renderFacts(profile);
  $("#discoveryState").textContent="OBSERVED";
  $("#profileState").textContent="BUILT";
  $("#confidenceBadge").textContent=profile.exactModel.value?"MODEL OBSERVED":"NATIVE VERIFY REQUIRED";
  const pkg=await resolvePackage(profile);
  const bootstrap=buildBootstrap(profile,pkg);
  localStorage.setItem("leeway.device.bootstrap",JSON.stringify(bootstrap));
  $("#profileOutput").textContent=JSON.stringify(bootstrap,null,2);
  if(!pkg){
    $("#packageState").textContent="NO ROUTE";
    $("#packageCard").innerHTML=`<h3>No package route yet</h3><p class="package-meta">Platform: ${esc(profile.platform.value)}. No blind package will be offered.</p>`;
    return;
  }
  $("#packageState").textContent=pkg.status;
  $("#packageCard").innerHTML=`<h3>${esc(pkg.label)}</h3><p class="package-meta">Route: ${esc(pkg.id)}<br>Channel: ${esc(pkg.channel)}<br>Status: ${esc(pkg.status)}<br>Exact device verification: required in native app</p><button id="handoffBtn" class="action">Prepare native handoff</button>`;
  $("#handoffBtn").addEventListener("click",()=>alert("Bootstrap profile saved locally. Native package handoff activates after the Android build artifact is verified."));
});