/*
  LEEWAY UI-WIDGET ISOLATED LANE — visual/runtime bindings retained by ID.
  Camera permission, video streams and vision analysis remain governed by their original handlers.
  The edge tabs are viewport-fixed and vertically movable ONLY; the eye is freely resizable/draggable.
*/
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const eye=$('widget'),left=$('optLeftDock'),right=$('optRightDock'),nav=$('optLowerDock'),pad=$('optPad');
 if(!eye||!left||!right||!nav||!pad||!window.AgentLeeOpticalPad)return;
 const B=document.body;B.classList.add('vision-widget-mode');
 const clamp=(n,a,b)=>Math.min(Math.max(n,a),b);
 const load=(key,fallback)=>{try{const x=Number(localStorage.getItem(key));return Number.isFinite(x)&&x>0?x:fallback}catch{return fallback}};
 const save=(key,x)=>{try{localStorage.setItem(key,String(x))}catch{}};
 const defaultSize=()=>Math.round(Math.min(innerWidth*.76,innerHeight*.77*1.18,640));
 let width=clamp(load('leeway.vision.widget.width.v1',defaultSize()),Math.min(195,innerWidth-14),Math.max(195,Math.min(innerWidth-14,innerHeight*1.16)));
 let railY=load('leeway.vision.tabs.y.v1',80),active=null,railDrag=null,resizeDrag=null;
 const applySize=(v)=>{width=clamp(Math.round(v),Math.min(190,innerWidth-14),Math.max(190,Math.min(innerWidth-14,innerHeight*1.16)));eye.style.setProperty('--vision-widget-size',width+'px');save('leeway.vision.widget.width.v1',width);const output=$('visionSizeOutput'),range=$('visionSizeRange');if(output)output.textContent=width+' px';if(range){range.max=Math.max(220,Math.round(Math.min(innerWidth-14,innerHeight*1.16)));range.value=String(width)}return width};
 // The original optical drag owner clamps by old full-screen dimensions. It continues to move
 // the eye, but its bounds are improved to reflect the actual resized widget (see scoped change).
 applySize(width);
 const menu=document.createElement('button');menu.id='visionEyeMenu';menu.type='button';menu.title='Show or hide left-edge optical control tags';menu.setAttribute('aria-label','Toggle optical control tags');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-controls','visionEdgeRail');
 menu.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';eye.append(menu);
 const grip=document.createElement('button');grip.id='visionEyeResize';grip.type='button';grip.setAttribute('aria-label','Drag to resize optical vision, preserving proportions');grip.title='Drag diagonally to resize. Use + / - keys when focused.';grip.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 19L19 9M12 20h8v-8M4 13V4h9"/></svg>';eye.append(grip);
 const rail=document.createElement('nav');rail.id='visionEdgeRail';rail.setAttribute('aria-label','Optical control tags fixed to screen left');
 const railGrip=document.createElement('button');railGrip.id='visionRailGrip';railGrip.type='button';railGrip.setAttribute('aria-label','Move the left control tags vertically');railGrip.title='Drag up or down only';railGrip.textContent='↕';rail.append(railGrip);
 const cats=[['optics','◈','OPTICS'],['cameras','▣','CAMERAS'],['navigation','⌘','TOOLS'],['settings','⚙','SETTINGS'],['matrix','▦','WALL'],['diagnostics','◎','STATUS']];
 for(const [key,glyph,title] of cats){const tab=document.createElement('button');tab.type='button';tab.className='vision-edge-tab';tab.dataset.visionTab=key;tab.setAttribute('aria-label','Open '+title.toLowerCase()+' popup');tab.setAttribute('aria-controls',key==='optics'?'optLeftDock':key==='navigation'?'optLowerDock':'optRightDock');tab.setAttribute('aria-selected','false');tab.innerHTML='<span class="ico" aria-hidden="true">'+glyph+'</span><span class="txt">'+title+'</span>';rail.append(tab)}
 B.append(rail);
 function setRailY(n){const max=Math.max(8,innerHeight-rail.offsetHeight-8);railY=clamp(n,8,max);rail.style.setProperty('--vision-tab-offset',railY+'px');B.style.setProperty('--vision-panel-top',clamp(railY,8,Math.max(8,innerHeight-Math.min(675,innerHeight*.72)-14))+'px');save('leeway.vision.tabs.y.v1',railY);}
 setRailY(railY);
 // Remove fixed left and right dock dragging, without changing their inner controls.
 // These old listeners are attached to .dock-header / camera title; replace their DOM
 // headings with equivalent passive nodes so horizontal mouse drag cannot move drawers.
 for(const handle of [left.querySelector('.dock-header'),right.querySelector('#padCameraPane > .pad-section-title')]){
  if(!handle)continue;
  const clean=handle.cloneNode(true);handle.replaceWith(clean);clean.style.touchAction='auto';clean.style.cursor='default';clean.removeAttribute('tabindex');clean.removeAttribute('aria-keyshortcuts');
 }
 left.classList.remove('is-collapsed','is-dragging');right.classList.remove('is-collapsed','is-dragging');
 for(const e of [left,right]){e.style.setProperty('--dock-x','0px');e.style.setProperty('--dock-y','0px');}
 // Disable legacy edge collapse buttons: new tabs are the only drawer controls.
 ['optLeftToggle','optRightToggle'].forEach(id=>{const b=$(id);if(b)b.hidden=true;});
 function addHeader(panel,title){const top=document.createElement('div');top.className='vision-drawer-header';top.innerHTML='<span>'+title+'</span><button type="button" aria-label="Close '+title+' popup">×</button>';panel.prepend(top);top.querySelector('button').onclick=()=>openDrawer(null);}
 addHeader(left,'OPTICAL CONTROLS');addHeader(right,'CAMERA / VISION CONTROL');
 const lowerHeader=document.createElement('div');lowerHeader.className='vision-drawer-header';lowerHeader.innerHTML='<span>OPTICAL NAVIGATION</span><button type="button" aria-label="Close navigation popup">×</button>';nav.prepend(lowerHeader);lowerHeader.querySelector('button').onclick=()=>openDrawer(null);
 const nt=document.createElement('div');nt.id='visionNavTools';nt.innerHTML='<div class="vision-range-row"><label for="visionSizeRange">EYE WIDGET SIZE</label><output id="visionSizeOutput"></output></div><input id="visionSizeRange" type="range" min="190" max="1060" step="10"><button type="button" id="visionCenterEye">RECENTER EYE</button><button type="button" id="visionPopOut">OPEN IN SEPARATE WINDOW</button><div class="small">The eye moves and resizes. The left tags move vertically only. Browser pop-out windows are not guaranteed always-on-top; native Golden UI can host the widget.</div>';
 nav.append(nt);applySize(width);
 $('visionSizeRange').addEventListener('input',e=>applySize(Number(e.target.value)));
 $('visionCenterEye').onclick=()=>{$('centerButton').click();};
 $('visionPopOut').onclick=()=>{const url=location.href;const name='AgentLeeVisionFloating';const w=window.open(url,name,'popup=yes,width=720,height=630,resizable=yes,scrollbars=no');if(w)w.focus();else $('padMessage').textContent='Browser blocked a separate popup window. Enable popups if desired.'};
 function openDrawer(name){
  if(!B.classList.contains('vision-tags-visible'))name=null;
  active=active===name?null:name;B.dataset.visionDrawer=active||'none';
  for(const btn of rail.querySelectorAll('[data-vision-tab]'))btn.setAttribute('aria-selected',String(btn.dataset.visionTab===active));
  if(active==='cameras'||active==='optics'||active==='navigation')window.AgentLeeOpticalPad.openPane('controls');
  if(['settings','matrix','diagnostics'].includes(active))window.AgentLeeOpticalPad.openPane(active==='matrix'?'wall':active);
  menu.setAttribute('aria-label',active?'Hide optical control tags':'Toggle optical control tags');
  return active;
 }
 function toggleRail(){const show=!B.classList.contains('vision-tags-visible');B.classList.toggle('vision-tags-visible',show);menu.setAttribute('aria-expanded',String(show));if(!show){active=null;B.dataset.visionDrawer='none';for(const x of rail.querySelectorAll('.vision-edge-tab'))x.setAttribute('aria-selected','false');}else{setRailY(railY);}return show}
 menu.onclick=toggleRail;
 for(const b of rail.querySelectorAll('[data-vision-tab]'))b.onclick=()=>openDrawer(b.dataset.visionTab);
 // Make opt system actions open their original content inside the left-anchored panel.
 const openVia=which=>{if(!B.classList.contains('vision-tags-visible'))toggleRail();active=null;return openDrawer(which)};
 $('optSysSettings').onclick=()=>openVia('settings');$('optSysLogs').onclick=()=>openVia('diagnostics');$('optSysDevices').onclick=()=>openVia('cameras');$('optSysHelp').onclick=()=>{openVia('diagnostics');$('padMessage').textContent='Grant browser camera permission to view local footage. Phone lenses require a genuine authorized Wi-Fi video path.'};
 $('padMenu').addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();openVia('settings')},true);
 // Retain keyboard shortcuts but ensure drawers become visibly exposed.
 document.addEventListener('keydown',e=>{if(e.altKey&&e.key.toLowerCase()==='d'){e.stopImmediatePropagation();e.preventDefault();openVia('diagnostics')}else if(e.altKey&&e.key.toLowerCase()==='m'){e.stopImmediatePropagation();e.preventDefault();openVia('matrix')}else if(e.key==='Escape'&&B.classList.contains('vision-tags-visible')){e.stopImmediatePropagation();e.preventDefault();if(active)openDrawer(active);else toggleRail();}},true);
 railGrip.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;railDrag={id:e.pointerId,y:e.clientY,from:railY};railGrip.setPointerCapture(e.pointerId);e.preventDefault();});
 railGrip.addEventListener('pointermove',e=>{if(railDrag?.id===e.pointerId)setRailY(railDrag.from+e.clientY-railDrag.y)});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])railGrip.addEventListener(name,e=>{if(railDrag?.id===e.pointerId)railDrag=null});
 railGrip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){setRailY(railY+(e.key==='ArrowUp'?-15:15));e.preventDefault();}});
 // Resize uses pointer capture on the grip. The parent drag excludes button targets.
 grip.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;resizeDrag={id:e.pointerId,x:e.clientX,y:e.clientY,from:width};grip.setPointerCapture(e.pointerId);e.stopPropagation();e.preventDefault();});
 grip.addEventListener('pointermove',e=>{if(resizeDrag?.id===e.pointerId){const delta=(e.clientX-resizeDrag.x)*1.2+(e.clientY-resizeDrag.y)*.7;applySize(resizeDrag.from+delta);e.stopPropagation()}});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(type,e=>{if(resizeDrag?.id===e.pointerId)resizeDrag=null;e.stopPropagation()});
 grip.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowDown','-'].includes(e.key)){applySize(width-20);e.preventDefault()}else if(['ArrowRight','ArrowUp','+','='].includes(e.key)){applySize(width+20);e.preventDefault()}});
 // Recenter should NOT suddenly expand controls.
 const reset=$('padReset');reset?.addEventListener('click',()=>{applySize(defaultSize());setRailY(84)});
 addEventListener('resize',()=>{applySize(width);setRailY(railY);},{passive:true});
 window.AgentLeeFloatingWidget={
  status:()=>({enabled:true,edgePinned:true,railVisible:B.classList.contains('vision-tags-visible'),activeDrawer:active,
   railX:Math.round(rail.getBoundingClientRect().left),railY,eyeWidth:Math.round(eye.getBoundingClientRect().width),eyeHeight:Math.round(eye.getBoundingClientRect().height),
   eyeOffset:window.AgentLeeVision?.status?.().offset,videoReady:window.AgentLeeOpticalPad?.status?.().videoReady}),
  toggleRail,open:(name)=>openVia(name),setRailY,resize:applySize
 };
})();
