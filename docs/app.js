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
function renderPackage(manifest,pkg){
  if(!pkg){
    $("#packageState").textContent="NO ROUTE";
    $("#packageCard").innerHTML=`<h3>No verified Android package published</h3><p class="package-meta">GitHub Pages will expose a package only after size, SHA-256 and runtime qualification pass.</p>`;
    return;
  }
  $("#packageState").textContent=pkg.status;
  const measured=pkg.sizeBytes==null?"NOT MEASURED":`${pkg.sizeBytes} bytes`;
  const formula=pkg.formulaQualification?.status||"UNVERIFIED";
  const action=pkg.downloadUrl
    ? `<a class="action" href="${esc(pkg.downloadUrl)}" download>Download & update LeeWay Device Bridge ${esc(pkg.versionName||"")}</a>`
    : `<button id="handoffBtn" class="action">Package build required</button>`;
  $("#packageCard").innerHTML=`<h3>${esc(pkg.label)}</h3><p class="package-meta">Current release: ${esc(pkg.versionName||"UNKNOWN")}<br>Source: GitHub Pages<br>Runtime: phone-local<br>Docker required: no<br>Status: ${esc(pkg.status)}<br>Measured size: ${esc(measured)}<br>SHA-256: ${esc(pkg.sha256||"UNVERIFIED")}<br>Formula qualification: ${esc(formula)}<br>Package target ceiling: ${esc(manifest.targetBootstrapPackageMaxBytes)} bytes</p>${action}<p class="package-meta"><strong>After installing v0.7.0:</strong> open the app and tap <strong>ENABLE ALWAYS-ON REMOTE BRIDGE</strong> once. After that, the phone maintains its outbound connection and reconnects after restart; USB/PC are not part of the runtime path.</p><p class="package-meta"><a href="./llm-entrypoint.json">LLM entrypoint</a> · <a href="./provider-registry.json">provider registry</a> · <a href="./remote-relay.json">remote relay contract</a></p>`;
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
$("#discoverBtn").addEventListener("click",async()=>{
  $("#discoveryState").textContent="RUNNING";
  const profile=await discoverDevice();
  renderFacts(profile);
  $("#discoveryState").textContent="OBSERVED";
  $("#confidenceBadge").textContent=profile.exactModel.value?"MODEL OBSERVED":"NATIVE VERIFY REQUIRED";
  const {manifest,pkg}=await resolvePackage(profile);
  const bootstrap=buildBootstrap(profile,pkg);
  localStorage.setItem("leeway.device.bootstrap",JSON.stringify(bootstrap));
  $("#profileOutput").textContent=JSON.stringify(bootstrap,null,2);
  renderPackage(manifest,pkg);
});
showPublishedAndroidPackage();
