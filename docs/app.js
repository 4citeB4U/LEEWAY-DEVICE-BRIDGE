import {discoverDevice} from "./device-discovery.js";

const $=s=>document.querySelector(s);
function esc(v){return String(v??"UNKNOWN").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}
function renderFacts(profile){
  $("#facts").innerHTML=Object.entries(profile).filter(([k])=>!["schemaVersion","capturedAt","userAgent"].includes(k)).map(([k,f])=>`<div class="fact"><small>${esc(k)}</small><b>${esc(typeof f.value==="object"?JSON.stringify(f.value):f.value)}</b><span class="evidence">${esc(f.evidence)}</span></div>`).join("");
}
async function resolvePackage(profile){
  const manifest=await fetch("./package-manifest.json",{cache:"no-store"}).then(r=>r.json());
  const platform=profile.platform.value;
  return {manifest,pkg:manifest.packages.find(p=>p.platform===platform)||null};
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
    runtimeLocation:"PHONE_LOCAL",
    llmEntrypoint:"./llm-entrypoint.json"
  };
}
$("#discoverBtn").addEventListener("click",async()=>{
  $("#discoveryState").textContent="RUNNING";
  const profile=await discoverDevice();
  renderFacts(profile);
  $("#discoveryState").textContent="OBSERVED";
  $("#profileState").textContent="BUILT";
  $("#confidenceBadge").textContent=profile.exactModel.value?"MODEL OBSERVED":"NATIVE VERIFY REQUIRED";
  const {manifest,pkg}=await resolvePackage(profile);
  const bootstrap=buildBootstrap(profile,pkg);
  localStorage.setItem("leeway.device.bootstrap",JSON.stringify(bootstrap));
  $("#profileOutput").textContent=JSON.stringify(bootstrap,null,2);
  if(!pkg){
    $("#packageState").textContent="NO ROUTE";
    $("#packageCard").innerHTML=`<h3>No package route yet</h3><p class="package-meta">Platform: ${esc(profile.platform.value)}. No blind package will be offered.</p>`;
    return;
  }
  $("#packageState").textContent=pkg.status;
  const measured=pkg.sizeBytes==null?"NOT MEASURED":`${pkg.sizeBytes} bytes`;
  const formula=pkg.formulaQualification?.status||"UNVERIFIED";
  const action=pkg.downloadUrl
    ? `<a class="action" href="${esc(pkg.downloadUrl)}" download>Download verified phone package</a>`
    : `<button id="handoffBtn" class="action">Package build required</button>`;
  $("#packageCard").innerHTML=`<h3>${esc(pkg.label)}</h3><p class="package-meta">Route: ${esc(pkg.id)}<br>Channel: ${esc(pkg.channel)}<br>Status: ${esc(pkg.status)}<br>Runtime: phone-local<br>Docker required: no<br>Measured size: ${esc(measured)}<br>Formula qualification: ${esc(formula)}<br>Package target ceiling: ${esc(manifest.targetBootstrapPackageMaxBytes)} bytes<br>Exact device verification: required in native app</p>${action}<p class="package-meta"><a href="./llm-entrypoint.json">LLM entrypoint</a> · <a href="./PHONE-RUNTIME-CONTRACT.md">phone runtime contract</a></p>`;
  const btn=$("#handoffBtn");
  if(btn) btn.addEventListener("click",()=>alert("The GitHub source is ready for package qualification, but no verified APK is published yet. Generated is not executed."));
});