/* LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.PUBLIC
TAG: LEEWAY-DEVICE-CONSOLE-CONTROLS-V1
WHO: LeeWay Industries
WHAT: Presentation-only dashboard navigation and browser-safe quick actions
WHEN: 2026-11-02
WHERE: docs/dashboard-ui.js
WHY: Responsive shell must work without impersonating MCP device command authority
HOW: Native DOM navigation, browser check delegation, session-only status
AUTHORITY: Browser UI only; not authenticated remote device execution
LICENSE: MIT
*/
const q=s=>document.querySelector(s);
const sidebar=q("#dbSidebar");
q("#dbMenu")?.addEventListener("click",()=>{
 const open=sidebar.classList.toggle("db-open");
 q("#dbMenu").setAttribute("aria-expanded",String(open));
});
document.querySelectorAll(".db-nav").forEach(link=>link.addEventListener("click",()=>{
 document.querySelectorAll(".db-nav").forEach(x=>x.classList.remove("active"));
 link.classList.add("active");
 sidebar?.classList.remove("db-open");
 q("#dbMenu")?.setAttribute("aria-expanded","false");
}));
function record(message){
 const list=q("#dbEventList");
 if(!list)return;
 const p=document.createElement("p");
 p.textContent=new Date().toLocaleTimeString()+" — "+message;
 list.prepend(p);
 while(list.childElementCount>6)list.lastElementChild.remove();
}
q("#dbRefresh")?.addEventListener("click",()=>{
 // Browser online state is not evidence of MCP authentication or device health.
 const online=navigator.onLine;
 q("#dbConnection").textContent=online?"● Browser online · bridge unverified":"● Browser offline";
 q("#dbConnection").classList.toggle("db-pill-alert",true);
 record("Browser connectivity refreshed; no remote device command was issued");
});
q("#dbRunBrowserDiagnostics")?.addEventListener("click",()=>{
 const details=q("#dbLegacy");
 if(details)details.open=true;
 const button=q("#discoverBtn");
 if(button){button.click();record("Browser-only device observation requested");}
 document.querySelector("#androidRuntime")?.scrollIntoView({behavior:"smooth",block:"start"});
});
q("#dbRuntime").title="Browser page does not hold an authenticated MCP session";
q("#dbDeviceCount").title="Never infer connected device counts from the visual design reference";
record("Dashboard loaded; live bridge status requires authenticated discovery");
