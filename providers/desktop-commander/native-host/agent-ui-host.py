


"""REGION: LEEWAY.DEVICES.NATIVE_UI; TAG: TRANSPARENT_OWNER_UI_ADAPTER
WHO: Owner-authorized Agent Lee. WHAT: Native floating host for the existing bound Agent Lee UI.
WHEN: Existing launcher opens. WHERE: Windows adapter under Device Bridge, not another Runtime.
WHY: Browser app mode cannot be the transparent, topmost desktop companion.
HOW: Installed pywebview/WebView2, bounded geometry API, one process lock, native speech recognition.
LICENSE: MIT
"""
import argparse,ctypes,hashlib,json,math,os,pathlib,threading,time,urllib.request,urllib.parse
from ctypes import wintypes
from contextlib import contextmanager
import webview
p=argparse.ArgumentParser();p.add_argument('--binding',required=True);p.add_argument('--evidence',required=True);p.add_argument('--probe-seconds',type=int,default=0);a=p.parse_args()
binding_path=pathlib.Path(a.binding).resolve();binding=json.loads(binding_path.read_text(encoding='utf-8-sig'))
url=binding['agentUiUri'];parts=urllib.parse.urlsplit(url)
assert parts.scheme=='http' and parts.hostname in ('127.0.0.1','localhost') and parts.path=='/ui','LOCAL_OWNER_UI_BINDING_REQUIRED'
origin=parts.scheme+'://'+parts.netloc
with urllib.request.urlopen(origin+'/health',timeout=8) as r:health=json.load(r)
assert health.get('identity')=='LEEWAY_MACHINE_CONSCIOUSNESS','CARRIER_IDENTITY_MISMATCH'
output=pathlib.Path(a.evidence).resolve();output.mkdir(parents=True,exist_ok=True)
state_path=binding_path.parent/'agent-ui-geometry.json'
user32=ctypes.windll.user32;kernel32=ctypes.windll.kernel32
user32.SetThreadDpiAwarenessContext.argtypes=[ctypes.c_void_p]
user32.SetThreadDpiAwarenessContext.restype=ctypes.c_void_p
user32.GetWindowRect.argtypes=[wintypes.HWND,ctypes.POINTER(wintypes.RECT)]
user32.GetCursorPos.argtypes=[ctypes.POINTER(wintypes.POINT)]
user32.SetWindowPos.argtypes=[wintypes.HWND,wintypes.HWND,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int,wintypes.UINT]
user32.MonitorFromWindow.argtypes=[wintypes.HWND,wintypes.DWORD]
user32.MonitorFromWindow.restype=wintypes.HANDLE
user32.MonitorFromPoint.argtypes=[wintypes.POINT,wintypes.DWORD]
user32.MonitorFromPoint.restype=wintypes.HANDLE
user32.GetDpiForWindow.argtypes=[wintypes.HWND]
class MonitorInfo(ctypes.Structure):
 _fields_=[('cbSize',wintypes.DWORD),('rcMonitor',wintypes.RECT),('rcWork',wintypes.RECT),('dwFlags',wintypes.DWORD)]
user32.GetMonitorInfoW.argtypes=[wintypes.HANDLE,ctypes.POINTER(MonitorInfo)]
class Margins(ctypes.Structure):
 _fields_=[(name,ctypes.c_int) for name in ('left','right','top','bottom')]
# Keep our pointer type local; pywebview uses a different MARGINS type for shadows.
native_dwmapi=ctypes.WinDLL('dwmapi',use_last_error=True)
native_dwmapi.DwmExtendFrameIntoClientArea.argtypes=[wintypes.HWND,ctypes.POINTER(Margins)]
@contextmanager
def physical_desktop():
 prior=user32.SetThreadDpiAwarenessContext(ctypes.c_void_p(-4))
 try:yield
 finally:user32.SetThreadDpiAwarenessContext(ctypes.c_void_p(prior))
def native_handle(target):
 from webview.platforms.winforms import BrowserView
 return wintypes.HWND(BrowserView.instances[target.uid].Handle.ToInt64())
def physical_rect(target):
 with physical_desktop():
  r=wintypes.RECT()
  if not user32.GetWindowRect(native_handle(target),ctypes.byref(r)):raise OSError('NATIVE_WINDOW_RECT_UNAVAILABLE')
  return {'x':r.left,'y':r.top,'width':r.right-r.left,'height':r.bottom-r.top}
def cursor_point():
 with physical_desktop():
  point=wintypes.POINT()
  if not user32.GetCursorPos(ctypes.byref(point)):raise OSError('NATIVE_CURSOR_UNAVAILABLE')
  return {'x':point.x,'y':point.y}
def monitor_work(target=None,point=None):
 with physical_desktop():
  if target is not None:monitor=user32.MonitorFromWindow(native_handle(target),2)
  else:
   point=point or {'x':0,'y':0};monitor=user32.MonitorFromPoint(wintypes.POINT(int(point['x']),int(point['y'])),2)
  info=MonitorInfo();info.cbSize=ctypes.sizeof(info)
  if not user32.GetMonitorInfoW(monitor,ctypes.byref(info)):raise OSError('NATIVE_MONITOR_WORK_AREA_UNAVAILABLE')
  r=info.rcWork;return {'x':r.left,'y':r.top,'width':r.right-r.left,'height':r.bottom-r.top}
def fit_rect(rect,area):
 w=min(int(rect['width']),area['width']);h=min(int(rect['height']),area['height'])
 return {'x':max(area['x'],min(int(rect['x']),area['x']+area['width']-w)),'y':max(area['y'],min(int(rect['y']),area['y']+area['height']-h)),'width':w,'height':h}
def place_physical(target,rect):
 with physical_desktop():
  # All geometry uses desktop pixels, including negative monitor origins. No DPI delta conversion.
  if not user32.SetWindowPos(native_handle(target),None,int(rect['x']),int(rect['y']),int(rect['width']),int(rect['height']),0x0004|0x0010):raise OSError('NATIVE_WINDOW_PLACEMENT_FAILED')
 return physical_rect(target)
def popup_geometry(width=1040,height=760):
 area=monitor_work(window);w=min(width,max(320,int(area['width']*.88)));h=min(height,max(300,int(area['height']*.88)))
 return fit_rect({'x':area['x']+(area['width']-w)//2,'y':area['y']+(area['height']-h)//2,'width':w,'height':h},area)
def configure_composition(target,topmost=False):
 from System import Action
 from System.Drawing import Color
 from System.Windows.Forms import ControlStyles
 from webview.platforms.winforms import BrowserView
 form=BrowserView.instances[target.uid]
 def update():
  form.TopMost=topmost;form.SetStyle(ControlStyles.SupportsTransparentBackColor,True)
  # DWM composition preserves WebView alpha and real input. A color key makes the input plane disappear.
  form.BackColor=Color.Black;form.webview.DefaultBackgroundColor=Color.Transparent
  handle=wintypes.HWND(form.Handle.ToInt64());margins=Margins(-1,-1,-1,-1)
  result=native_dwmapi.DwmExtendFrameIntoClientArea(handle,ctypes.byref(margins))
  if result!=0:raise OSError('NATIVE_DESKTOP_COMPOSITION_FAILED:'+str(result))
  user32.SetWindowLongW(handle,-20,user32.GetWindowLongW(handle,-20)&~0x08000000)
  form.Invalidate();form.webview.Invalidate()
 if form.InvokeRequired:form.BeginInvoke(Action(update))
 else:update()
def prepare_popup(target,geometry,transparent=False):
 def ready():
  try:
   actual=place_physical(target,geometry)
   if transparent:configure_composition(target)
   receipt('SURFACE_WINDOW_READY',{'surfaceTitle':target.title,'surfaceGeometry':actual,'coordinateSpace':'PHYSICAL_DESKTOP_PIXELS','transparentSurface':transparent})
  except Exception as error:receipt('SURFACE_WINDOW_SETUP_FAILED',{'error':str(error),'surfaceTitle':target.title})
 target.events.loaded+=ready
 if transparent:target.events.resized+=lambda *args:configure_composition(target)
kernel32.CreateMutexW.restype=ctypes.c_void_p
kernel32.CreateEventW.restype=ctypes.c_void_p
wake_name='Local\\LeeWayAgentLeeWake_'+hashlib.sha256(str(binding_path).casefold().encode()).hexdigest()[:24]
wake=kernel32.CreateEventW(None,False,False,wake_name)
toggle_name='Local\\LeeWayAgentLeeToggle_'+hashlib.sha256(str(binding_path).casefold().encode()).hexdigest()[:24]
toggle=kernel32.CreateEventW(None,False,False,toggle_name)
if not wake or not toggle:raise OSError('NATIVE_CONTROL_EVENT_CREATION_FAILED')
lock=kernel32.CreateMutexW(None,False,'Local\\LeeWayAgentLeeFloatingHost')
if kernel32.GetLastError()==183:
 kernel32.SetEvent(ctypes.c_void_p(wake));raise SystemExit(0)
# Establish pywebview's backend, then keep native placement in one physical coordinate space.
screens=webview.screens
with physical_desktop():work={'x':user32.GetSystemMetrics(76),'y':user32.GetSystemMetrics(77),'width':user32.GetSystemMetrics(78),'height':user32.GetSystemMetrics(79)}
primary=monitor_work();max_compact=max(140,min(640,int(min(primary['width'],primary['height'])*.65)));size=min(300,max_compact)
initial={'width':size,'height':size,'x':primary['x']+primary['width']-size-40,'y':primary['y']+int(primary['height']*.2)}
if state_path.exists():
 try:
  saved=json.loads(state_path.read_text(encoding='utf-8-sig'));s=max(120,min(max_compact,int(saved['width'])));initial.update(width=s,height=s,x=int(saved['x']),y=int(saved['y']))
 except Exception:pass
initial=fit_rect(initial,monitor_work(point=initial))
window=None;recognizer=None;native_handlers=[];panel=False;expanded=False;normal=dict(initial);drag=None;closed=threading.Event();gate=threading.RLock();write_lock=threading.Lock();native_ready=False;input_plane=None;input_handlers=[];last_ui_state={};last_mouse=[];last_evidence_error=None;last_page_observed=0.0;visibility_observation={};page_probe={"task":None,"queued":False,"at":0.0,"error":None};page_probe_lock=threading.Lock()
def receipt(status,extra=None):
 global last_evidence_error
 value={'schemaVersion':'leeway.native-floating-host.v1','observedAt':time.time(),'status':status,'pid':os.getpid(),'provider':'LEEWAY_DEVICE_BRIDGE_NATIVE_UI','url':url,'screen':work,'topmostRequested':True,'transparentRequested':True,'framelessRequested':True,'nativeHitPlane':input_plane is not None,'panelOpen':panel,'expandedByOwner':expanded,'fixedPhysicalPathsInSource':False,'formulaExecution':'NOT_EXECUTED'}
 if window and native_ready:
  rect=physical_rect(window);value['geometry']={**rect,'coordinateSpace':'PHYSICAL_DESKTOP_PIXELS','screenAreaRatio':rect['width']*rect['height']/(work['width']*work['height'])}
 value['ownPage']=last_ui_state;value['ownMouse']=last_mouse[-8:]
 value['pageObservationAgeSeconds']=None if not last_page_observed else max(0,time.time()-last_page_observed)
 value['pageProbeError']=page_probe.get('error');value['visibilityObservation']=dict(visibility_observation)
 value['priorEvidenceWriteError']=last_evidence_error
 if extra:value.update(extra)
 with write_lock:
  temp=output/'host-receipt.tmp'
  try:
   temp.write_text(json.dumps(value,indent=2),encoding='utf-8')
   for attempt in range(4):
    try:os.replace(temp,output/'host-receipt.json');last_evidence_error=None;return True
    except OSError as error:
     if attempt==3 or getattr(error,'winerror',None) not in (5,32):raise
     time.sleep(.025*(attempt+1))
  except OSError as error:
   # This is a mutable status projection, not an immutable execution receipt.
   # A reader may deny replacement while still allowing writes. Honour normal file access;
   # never close its handles or weaken permissions. Readers must validate the snapshot digest.
   if os.name=='nt' and getattr(error,'winerror',None) in (5,32):
    target=output/'host-receipt.json'
    try:
     value['recordClass']='MUTABLE_NATIVE_OBSERVATION_NOT_VERITAS_RECEIPT'
     value['writeMode']='SHARED_FILE_IN_PLACE_CHECKSUM_READBACK'
     value['replacementFailureWinerror']=getattr(error,'winerror',None)
     value['snapshotSha256']=hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()
     data=json.dumps(value,indent=2).encode('utf-8')
     with target.open('r+b') as stream:
      stream.seek(0);stream.write(data);stream.truncate();stream.flush();os.fsync(stream.fileno())
     if target.read_bytes()!=data:raise OSError('NATIVE_STATUS_READBACK_MISMATCH')
     last_evidence_error=None;return True
    except OSError as fallback_error:error=fallback_error
   # Failure remains visible; an owner UI control is not an evidence-write transaction.
   last_evidence_error={'state':'FAILED_LATEST_PROJECTION','at':time.time(),'error':type(error).__name__,'winerror':getattr(error,'winerror',None),'pendingFile':str(temp)}
   return False
def emit(kind,detail):
 if window and not closed.is_set():
  try:window.evaluate_js('window.dispatchEvent(new CustomEvent('+json.dumps(kind)+',{detail:'+json.dumps(detail)+'}))')
  except Exception:pass
def style_native():
 global input_plane,input_handlers
 if not native_ready:return
 try:
  if input_plane is not None:input_plane.Close()
 except Exception:pass
 input_plane=None;input_handlers=[]
 configure_composition(window,topmost=True)
def save():
 if not panel and not expanded and window:
  data={**physical_rect(window),'coordinateSpace':'PHYSICAL_DESKTOP_PIXELS'};temp=state_path.with_suffix('.tmp');temp.write_text(json.dumps(data));os.replace(temp,state_path)
class HostApi:
 def geometry(self,action,value=0,second=0):
  global panel,expanded,normal,drag
  with gate:
   rect=physical_rect(window)
   if action=='drag-start':
    if panel or expanded or not (user32.GetAsyncKeyState(0x01)&0x8000):return {'state':'DRAG_REQUIRES_OWNER_POINTER'}
    drag={'cursor':cursor_point(),'rect':rect,'at':time.monotonic()}
   elif action=='drag-move':
    if drag is None:return {'state':'DRAG_NOT_ACTIVE'}
    if panel or not (user32.GetAsyncKeyState(0x01)&0x8000) or time.monotonic()-drag['at']>120:
     drag=None;return {'state':'DRAG_ENDED'}
    point=cursor_point();base=drag['rect'];rect=place_physical(window,{**base,'x':base['x']+point['x']-drag['cursor']['x'],'y':base['y']+point['y']-drag['cursor']['y']})
   elif action=='drag-end':
    if drag is not None:
     rect=place_physical(window,fit_rect(rect,monitor_work(window)));drag=None;save()
   elif action=='move':
    dx=float(value);dy=float(second)
    if not math.isfinite(dx+dy) or abs(dx)>300 or abs(dy)>300:raise ValueError('MOVE_DELTA_INVALID')
    rect=place_physical(window,fit_rect({**rect,'x':rect['x']+dx,'y':rect['y']+dy},work))
   elif action=='resize':
    amount=int(value)
    if panel:return {'state':'PANEL_OWNS_GEOMETRY'}
    side=max(120,min(max_compact,amount));expanded=False;rect=place_physical(window,fit_rect({**rect,'width':side,'height':side},monitor_work(window)))
   elif action=='expand':
    drag=None
    if not expanded:normal=dict(rect);rect=place_physical(window,monitor_work(window));expanded=True
    else:rect=place_physical(window,fit_rect(normal,monitor_work(point=normal)));expanded=False
   elif action=='panel':
    drag=None
    enabled=bool(value)
    if enabled and not panel:
     if not expanded:normal=dict(rect)
     area=monitor_work(window);panel=True;rect=place_physical(window,fit_rect({**rect,'width':min(420,area['width']),'height':min(760,area['height'])},area))
    elif not enabled and panel:
     panel=False
     if not expanded:rect=place_physical(window,fit_rect(normal,monitor_work(point=normal)))
   elif action=='status':pass
   else:raise ValueError('HOST_GEOMETRY_ACTION_NOT_ALLOWED')
   if action not in ('status','drag-start','drag-move'):style_native();save()
   receipt('NATIVE_HOST_RUNNING');return {**physical_rect(window),'coordinateSpace':'PHYSICAL_DESKTOP_PIXELS','maxCompact':max_compact,'panel':panel,'expanded':expanded}
 def listen(self,enabled=True):
  global recognizer,native_handlers
  if not enabled:
   if recognizer:
    try:recognizer.RecognizeAsyncCancel()
    except Exception:pass
   return {'state':'STOPPED'}
  if panel:return {'state':'BLOCKED_MENU_OPEN'}
  import clr
  assembly=binding['nativeAgentUi'].get('speechAssembly')
  if not assembly or hashlib.sha256(pathlib.Path(assembly['path']).read_bytes()).hexdigest()!=assembly['sha256']:raise RuntimeError('NATIVE_INPUT_ASSEMBLY_NOT_ADMITTED')
  clr.AddReference(assembly['path'])
  from System.Speech.Recognition import SpeechRecognitionEngine,DictationGrammar,RecognizeMode
  if recognizer is None:
   installed=list(SpeechRecognitionEngine.InstalledRecognizers());english=next((r for r in installed if str(r.Culture.Name)=='en-US'),None)
   if english is None:raise RuntimeError('NATIVE_SPEECH_RECOGNIZER_UNAVAILABLE')
   recognizer=SpeechRecognitionEngine(english);recognizer.LoadGrammar(DictationGrammar())
   def on_result(sender,event):emit('leeway:native-transcript',{'text':str(event.Result.Text),'confidence':float(event.Result.Confidence),'source':'WINDOWS_INSTALLED_SPEECH_RECOGNIZER'})
   def on_end(sender,event):emit('leeway:native-listening-ended',{'cancelled':bool(event.Cancelled)})
   recognizer.SpeechRecognized+=on_result;recognizer.RecognizeCompleted+=on_end;native_handlers=[on_result,on_end]
  recognizer.SetInputToDefaultAudioDevice();recognizer.RecognizeAsync(RecognizeMode.Single);return {'state':'LISTENING_OWNER_TAP'}
 def open_workstation(self):
  global vt_window
  record=binding['nativeAgentUi'].get('agentVt')
  if not record:raise RuntimeError('CANONICAL_VT_NOT_BOUND')
  with urllib.request.urlopen(record['url'],timeout=8) as response:content=response.read(16777217)
  if len(content)>16777216 or hashlib.sha256(content).hexdigest()!=record['sha256']:raise RuntimeError('CANONICAL_VT_PAYLOAD_CHANGED')
  if vt_window is not None and vt_window in webview.windows:
   threading.Thread(target=lambda:(vt_window.show(),vt_window.restore()),daemon=True,name='LeeWayAgentVTRestore').start()
   return {'state':'CANONICAL_VT_RESTORE_QUEUED','sourceSha256':record['sha256']}
  def create_vt():
   global vt_window
   try:
    target=popup_geometry();vt_window=webview.create_window('Agent Lee - Agent VT',record['url'],width=800,height=600,resizable=True,js_api=None,on_top=False,focus=True,text_select=True)
    prepare_popup(vt_window,target)
    receipt('CANONICAL_VT_OPENED',{'vtSourceSha256':record['sha256'],'vtNativeBridgeExposed':False})
   except Exception as error:
    receipt('CANONICAL_VT_OPEN_FAILED',{'error':str(error),'vtSourceSha256':record['sha256']})
  threading.Thread(target=create_vt,daemon=True,name='LeeWayAgentVTCreate').start()
  return {'state':'CANONICAL_VT_OPEN_QUEUED','sourceSha256':record['sha256'],'providerState':'NOT_PROMOTED_BY_UI_LAUNCH'}
 def open_voice_studio(self):
  record=binding['nativeAgentUi'].get('voiceStudio')
  if not record:raise RuntimeError('CANONICAL_VOICE_STUDIO_NOT_BOUND')
  parsed=urllib.parse.urlsplit(record['url'])
  if parsed.scheme!='http' or parsed.hostname not in ('127.0.0.1','localhost') or parsed.path!='/studio.html':raise RuntimeError('VOICE_STUDIO_LOCAL_ORIGIN_REQUIRED')
  with urllib.request.urlopen(record['url'],timeout=8) as response:content=response.read(1048577)
  if len(content)>1048576 or hashlib.sha256(content).hexdigest()!=record['sha256']:raise RuntimeError('VOICE_STUDIO_SOURCE_CHANGED')
  current=surface_windows.get('voice-studio')
  if current is not None and current in webview.windows:
   threading.Thread(target=lambda:(current.show(),current.restore()),daemon=True,name='LeeWayVoiceStudioRestore').start()
   return {'state':'CANONICAL_VOICE_STUDIO_RESTORE_QUEUED'}
  def create_voice():
   try:
    target=popup_geometry();surface_windows['voice-studio']=webview.create_window('Agent Lee - LeeWay Voice Studio',record['url'],width=800,height=600,resizable=True,on_top=False,focus=True,text_select=True,js_api=None)
    prepare_popup(surface_windows['voice-studio'],target)
    receipt('CANONICAL_VOICE_STUDIO_OPENED',{'studioSha256':record['sha256'],'nativeBridgeExposed':False,'selectionChanged':False})
   except Exception as error:receipt('CANONICAL_VOICE_STUDIO_OPEN_FAILED',{'error':str(error)})
  threading.Thread(target=create_voice,daemon=True,name='LeeWayVoiceStudioCreate').start()
  return {'state':'CANONICAL_VOICE_STUDIO_OPEN_QUEUED','selectionSynchronization':'SEPARATE_ACCEPTANCE_REQUIRED'}
 def open_surface(self,relative):
  global surface_windows
  allowed={
   '/brain-ui/brain.html':('Agent Lee - Digital Brain',1040,760),
   '/diagnostics-ui/index.html':('Agent Lee - Device Diagnostics',1040,760),
   '/continuum-ui/index.html':('Agent Lee - Continuum',1040,760),
   '/models-ui':('Agent Lee - Models',1040,760),
   '/settings-ui':('Agent Lee - Settings',900,720),
   '/voice-fabric/studio.html':('Agent Lee - LeeWay Voice',980,760)
  }
  if relative not in allowed:raise ValueError('SURFACE_NOT_ALLOWLISTED')
  current=surface_windows.get(relative)
  if current is not None and current in webview.windows:
   threading.Thread(target=lambda:(current.show(),current.restore()),daemon=True,name='LeeWaySurfaceRestore').start()
   return {'state':'RESTORE_EXISTING_SURFACE_QUEUED'}
  title,w,h=allowed[relative]
  class SurfaceApi:
   def close(self):
    current=surface_windows.pop(relative,None)
    if current is not None:
     try:current.destroy()
     except Exception:pass
    post_visibility('show')
    return {'state':'SURFACE_CLOSED_MAIN_AGENT_RETAINED'}
  surface_api=SurfaceApi()
  def create_surface():
   try:
    target=popup_geometry(w,h);transparent=relative=='/brain-ui/brain.html'
    surface_windows[relative]=webview.create_window(title,origin+relative,width=800,height=600,resizable=True,frameless=False,on_top=False,focus=True,text_select=True,js_api=surface_api,transparent=transparent,background_color='#000000' if transparent else '#0b111b')
    prepare_popup(surface_windows[relative],target,transparent=transparent)
    receipt('SURFACE_WINDOW_OPENED',{'surface':relative,'mainAgentLeeReplaced':False})
   except Exception as error:receipt('SURFACE_WINDOW_OPEN_FAILED',{'surface':relative,'error':str(error)})
  threading.Thread(target=create_surface,daemon=True,name='LeeWaySurfaceCreate').start()
  return {'state':'OPEN_SEPARATE_SURFACE_QUEUED'}

vt_window=None
surface_windows={}
api=HostApi()
window=webview.create_window('Agent Lee - Floating',url,js_api=api,width=initial['width'],height=initial['height'],x=initial['x'],y=initial['y'],frameless=True,easy_drag=False,resizable=True,min_size=(120,120),shadow=False,transparent=True,background_color='#000000',on_top=True,focus=True)
def loaded():
 global native_ready
 try:
  first=not native_ready;native_ready=True
  if first:place_physical(window,initial)
  if window.get_current_url()==url and panel:api.geometry('panel',False)
  style_native()
  window.evaluate_js("document.documentElement.dataset.nativeFloating='true';window.dispatchEvent(new Event('leeway:native-ready'))")
  receipt('NATIVE_PAGE_LOADED',{'pageBackground':window.evaluate_js('getComputedStyle(document.body).backgroundColor'),'nativeBackend':'edgechromium'})
 except Exception as e:receipt('NATIVE_PAGE_LOAD_FAILED',{'error':str(e)})
window.events.loaded+=loaded
window.events.closed+=lambda:closed.set()
window.events.resized+=lambda *args:style_native() if native_ready else None
def qualify_snapshot():
 import ctypes
 from ctypes import wintypes
 from PIL import ImageGrab
 from webview.platforms.winforms import BrowserView
 hwnd=BrowserView.instances[window.uid].Handle.ToInt64()
 prior=user32.SetThreadDpiAwarenessContext(ctypes.c_void_p(-4))
 r=wintypes.RECT();user32.GetWindowRect(hwnd,ctypes.byref(r))
 # Whole desktop here is only a capture source; retain the bounded overlay rectangle and nearby background.
 shot=ImageGrab.grab(all_screens=True)
 left=user32.GetSystemMetrics(76);top=user32.GetSystemMetrics(77)
 crop=shot.crop((r.left-left-10,r.top-top-10,r.right-left+10,r.bottom-top+10));crop.save(output/'native-floating-observed.png');user32.SetThreadDpiAwarenessContext(ctypes.c_void_p(prior))
 if native_ready:
  data=dict(last_ui_state);data['scope']='NATIVE_SCREEN_CAPTURE_WITH_ASYNC_PAGE_READBACK'
  (output/'page-observation.json').write_text(json.dumps(data,indent=2))
SNAPSHOT_SCRIPT = "({viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},menu:document.getElementById('drawer')?.classList.contains('open'),hamburger:document.getElementById('hamburger-btn')?.getBoundingClientRect().toJSON(),close:document.getElementById('close-drawer')?.getBoundingClientRect().toJSON(),interaction:window.__leewayInteraction,shrink:document.getElementById('shrink-agent')?.getBoundingClientRect().toJSON(),grow:document.getElementById('grow-agent')?.getBoundingClientRect().toJSON(),expand:document.getElementById('expand-agent')?.getBoundingClientRect().toJSON(),workstation:document.querySelector('[data-setting=workstation]')?.getBoundingClientRect().toJSON(),controls:Object.fromEntries([...document.querySelectorAll('[data-setting]')].map(e=>[e.dataset.setting,e.getBoundingClientRect().toJSON()])),background:getComputedStyle(document.body).backgroundColor,bridgeReady:!!window.pywebview?.api,url:location.href,status:document.getElementById('status-text')?.textContent,workstationHit:(()=>{const e=document.querySelector('[data-setting=workstation]');if(!e)return null;const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {tag:h?.tagName,id:h?.id||null,setting:h?.closest?.('[data-setting]')?.dataset?.setting||null,text:h?.textContent?.trim()?.slice(0,80)||null}})(),lastClick:window.__leewayLastClick||null,lastPointer:window.__leewayLastPointer||null,screenMetrics:{screenX,screenY,outerWidth,outerHeight,innerWidth,innerHeight,devicePixelRatio},apiMethods:Object.keys(window.pywebview?.api||{}),lastSurface:window.__leewayLastSurface||null})"
def post_visibility(action):
 from System import Action
 from System.Windows.Forms import FormWindowState
 from webview.platforms.winforms import BrowserView
 form=BrowserView.instances[window.uid]
 def apply():
  try:
   before=bool(form.Visible);target=True if action=='show' else not before
   if target:form.Show();form.WindowState=FormWindowState.Normal;form.BringToFront()
   else:form.Hide()
   style_native()
   visibility_observation.update(before=before,after=bool(form.Visible),requested=target,at=time.time(),state='NATIVE_VISIBILITY_READBACK')
  except Exception as error:visibility_observation.update(state='FAILED',error=str(error),at=time.time())
 form.BeginInvoke(Action(apply))
def poll_page_async():
 global last_ui_state,last_page_observed
 from System import Action
 from webview.platforms.winforms import BrowserView
 form=BrowserView.instances[window.uid]
 with page_probe_lock:
  task=page_probe['task']
  if task is not None:
   if not task.IsCompleted:
    if time.monotonic()-page_probe['at']>8:page_probe['error']='PAGE_OBSERVATION_TIMED_OUT_OWNER_CONTROLS_REMAIN_AVAILABLE'
    return
   try:
    if task.IsFaulted or task.IsCanceled:raise RuntimeError('WEBVIEW_SNAPSHOT_TASK_FAILED')
    result=json.loads(str(task.Result))
    if not isinstance(result,dict):raise RuntimeError('WEBVIEW_SNAPSHOT_NOT_OBJECT')
    last_ui_state=result;last_page_observed=time.time();page_probe['error']=None
   except Exception as error:page_probe['error']=str(error)
   page_probe['task']=None
  if page_probe['queued']:return
  page_probe['queued']=True;page_probe['at']=time.monotonic()
 def launch():
  with page_probe_lock:
   try:
    if form.Visible and form.webview.CoreWebView2 is not None:
     page_probe['task']=form.webview.CoreWebView2.ExecuteScriptAsync(SNAPSHOT_SCRIPT);page_probe['at']=time.monotonic()
   except Exception as error:page_probe['error']=str(error)
   finally:page_probe['queued']=False
 try:form.BeginInvoke(Action(launch))
 except Exception:
  with page_probe_lock:page_probe['queued']=False
  raise
def observe():
 captured=False
 while not closed.wait(.25):
  try:
   if kernel32.WaitForSingleObject(ctypes.c_void_p(wake),0)==0:post_visibility('show')
   if kernel32.WaitForSingleObject(ctypes.c_void_p(toggle),0)==0:post_visibility('toggle')
   if native_ready and time.monotonic()-page_probe.get('lastPoll',0)>=1:
    page_probe['lastPoll']=time.monotonic();poll_page_async();receipt('NATIVE_HOST_RUNNING')
   if native_ready and last_page_observed and not captured and time.monotonic()-started>6:qualify_snapshot();captured=True
  except Exception as error:
   page_probe['error']=type(error).__name__+': '+str(error);receipt('NATIVE_HOST_OBSERVATION_FAILED')
  if a.probe_seconds and time.monotonic()-started>a.probe_seconds:window.destroy();break
started=time.monotonic()
webview.settings['ALLOW_FILE_URLS']=False
try:webview.start(observe,gui='edgechromium',private_mode=False,storage_path=str(binding_path.parent/'native-ui-webview-state'),debug=False)
finally:
 closed.set()
 if recognizer:
  try:recognizer.Dispose()
  except Exception:pass
 kernel32.CloseHandle(ctypes.c_void_p(toggle));kernel32.CloseHandle(ctypes.c_void_p(wake));kernel32.CloseHandle(ctypes.c_void_p(lock))
