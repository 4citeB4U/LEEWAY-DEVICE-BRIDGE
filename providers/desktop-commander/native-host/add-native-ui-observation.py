"""REGION: LEEWAY.DEVICES.OBSERVABILITY; TAG: EXACT_NATIVE_UI_COORDINATES
WHO: Creator-authorized qualification. WHAT: Record actual own-window DOM bounds and interaction counters.
WHEN: Native interaction repair. WHERE: Existing host receipt, no new endpoint or foreign-window reads.
WHY: Native DPI/compositor coordinates must be observed, not guessed. HOW: Read own bound page and limited input events.
LICENSE: MIT.
"""
import pathlib,hashlib
p=pathlib.Path(__file__).with_name('agent-ui-host.py');s=p.read_text(encoding='utf8');before=hashlib.sha256(p.read_bytes()).hexdigest()
assert before=='d2495fd80ffc0e9517caf7495e2d38cc83fab27110d99753ad66b22bfac6198a'
s=s.replace('input_handlers=[]','input_handlers=[];last_ui_state={};last_mouse=[]',1)
s=s.replace("if extra:value.update(extra)","value['ownPage']=last_ui_state;value['ownMouse']=last_mouse[-8:]\n if extra:value.update(extra)",1)
s=s.replace("if kind=='mouseWheel':payload.update(deltaX=0,deltaY=-event.Delta)","if kind=='mouseWheel':payload.update(deltaX=0,deltaY=-event.Delta)\n    last_mouse.append({'event':kind,'nativeX':event.X,'nativeY':event.Y,'scale':scale,'cssX':payload['x'],'cssY':payload['y']});del last_mouse[:-8]",1)
s=s.replace('def observe():\n captured=False',"def observe():\n global last_ui_state\n captured=False",1)
s=s.replace("   receipt('NATIVE_HOST_RUNNING')",'''   if native_ready:
    last_ui_state=window.evaluate_js("({viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},menu:document.getElementById('drawer')?.classList.contains('open'),hamburger:document.getElementById('hamburger-btn')?.getBoundingClientRect().toJSON(),close:document.getElementById('close-drawer')?.getBoundingClientRect().toJSON(),interaction:window.__leewayInteraction,status:document.getElementById('status-text')?.textContent})")
   receipt('NATIVE_HOST_RUNNING')''',1)
p.write_text(s,encoding='utf8',newline='\n');print({'before':before,'after':hashlib.sha256(p.read_bytes()).hexdigest()})
