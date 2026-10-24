"""REGION: LEEWAY.DEVICES.UI.REPAIR; TAG: QUALIFY_TRANSPARENT_NATIVE_HOST
WHO: Creator-authorized engineering. WHAT: Complete previously drafted host adapter.
WHEN: Before actual launcher replacement. WHERE: same native Device Bridge component.
WHY: Requested transparency is not observed transparency. HOW: Primary-screen binding, native key/shape, evidence.
LICENSE: MIT.
"""
import pathlib,argparse,hashlib,json
p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');a=p.parse_args();f=pathlib.Path(__file__).with_name('agent-ui-host.py');s=f.read_text()
def once(x,y):
 global s
 assert s.count(x)==1,x[:90]
 s=s.replace(x,y)
before=hashlib.sha256(f.read_bytes()).hexdigest()
once('screens=webview.screens;screen=screens[0]','screens=webview.screens;screen=next((item for item in screens if item.x==0 and item.y==0),screens[0])')
once("window=None;recognizer=None;native_handlers=[];panel=False;expanded=False;normal=dict(initial);closed=threading.Event();gate=threading.RLock()","window=None;recognizer=None;native_handlers=[];panel=False;expanded=False;normal=dict(initial);closed=threading.Event();gate=threading.RLock();write_lock=threading.Lock();native_ready=False")
once("temp=output/'host-receipt.tmp';temp.write_text(json.dumps(value,indent=2));os.replace(temp,output/'host-receipt.json')","with write_lock:\n  temp=output/'host-receipt.tmp';temp.write_text(json.dumps(value,indent=2));os.replace(temp,output/'host-receipt.json')")
once("def save():",'''def style_native():
 if not native_ready:return
 from System import Action
 from System.Drawing import Color,Region,Rectangle
 from System.Drawing.Drawing2D import GraphicsPath
 from webview.platforms.winforms import BrowserView
 form=BrowserView.instances[window.uid]
 def update():
  form.AllowTransparency=True;form.BackColor=Color.FromArgb(1,2,3);form.TransparencyKey=Color.FromArgb(1,2,3);form.TopMost=True
  form.webview.DefaultBackgroundColor=Color.Transparent
  if panel or expanded:form.Region=None
  else:
   w,h=form.ClientSize.Width,form.ClientSize.Height
   shape=GraphicsPath();shape.AddEllipse(2,2,w-4,h-30)
   shape.AddRectangle(Rectangle(0,0,min(70,w),min(70,h)))
   shape.AddRectangle(Rectangle(0,max(0,h-75),w,75))
   old=form.Region;form.Region=Region(shape);shape.Dispose()
   if old is not None:old.Dispose()
 form.Invoke(Action(update))
def save():''')
once("save();receipt('NATIVE_HOST_RUNNING');return", "style_native();save();receipt('NATIVE_HOST_RUNNING');return")
once("def loaded():\n try:","def loaded():\n global native_ready\n try:\n  native_ready=True;style_native()")
once("def observe():",'''def qualify_snapshot():
 import ctypes
 from ctypes import wintypes
 from PIL import ImageGrab
 hwnd=user32.FindWindowW(None,'Agent Lee — Floating')
 r=wintypes.RECT();user32.GetWindowRect(hwnd,ctypes.byref(r))
 # Whole desktop here is only a capture source; retain the bounded overlay rectangle and nearby background.
 shot=ImageGrab.grab(all_screens=True)
 left=user32.GetSystemMetrics(76);top=user32.GetSystemMetrics(77)
 crop=shot.crop((r.left-left-10,r.top-top-10,r.right-left+10,r.bottom-top+10));crop.save(output/'native-floating-observed.png')
 if native_ready:
  data=window.evaluate_js('({title:document.title,background:getComputedStyle(document.body).backgroundColor,duplicateTabs:document.querySelectorAll("#agent-emblem,.agent-side-tab").length,pointerAdapter:Boolean(window.__leewayFloating)})')
  (output/'page-observation.json').write_text(json.dumps(data,indent=2))
def observe():''')
once("while not closed.wait(2):", "captured=False\n while not closed.wait(2):")
once("try:receipt('NATIVE_HOST_RUNNING')", "try:\n   receipt('NATIVE_HOST_RUNNING')\n   if native_ready and not captured and time.monotonic()-started>6:qualify_snapshot();captured=True")
once("window.events.closed+=lambda:closed.set()","window.events.closed+=lambda:closed.set()\nwindow.events.resized+=lambda *args:style_native() if native_ready else None")
print(json.dumps({'source':str(f),'beforeSha256':before,'state':'APPLY' if a.apply else 'DRY_RUN'}))
if a.apply:f.write_text(s,encoding='utf8',newline='\n')
