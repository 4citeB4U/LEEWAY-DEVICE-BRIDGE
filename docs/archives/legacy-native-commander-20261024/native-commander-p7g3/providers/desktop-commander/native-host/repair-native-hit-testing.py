"""REGION: LEEWAY.DEVICES.WINDOWS; TAG: OBSERVED_TRANSPARENT_COMPOSITOR_INPUT_REPAIR
WHO: Owner-authorized Agent Lee. WHAT: Add a bounded native input plane to the existing transparent host.
WHEN: Real WindowFromPoint proved transparent WebView2 passes sphere clicks to the desktop.
WHERE: Native host only, same process. WHY: Visually rendered pixels do not guarantee native hit testing.
HOW: Shaped 1%-opacity WinForms input plane; forward owner mouse events only to this host's WebView2.
No global input hook, other-window capture, new service or speaker authority. LICENSE: MIT.
"""
import pathlib,hashlib
p=pathlib.Path(__file__).with_name('agent-ui-host.py');s=p.read_text(encoding='utf8');before=hashlib.sha256(p.read_bytes()).hexdigest()
assert before=='00d07e26cc53e79dae6ec75745abc1cea03e9d747838cbf5027a5b86a37b2045'
x='native_ready=False';assert s.count(x)==1;s=s.replace(x,'native_ready=False;input_plane=None;input_handlers=[]')
x='def style_native():\n if not native_ready:return';assert s.count(x)==1;s=s.replace(x,'def style_native():\n global input_plane,input_handlers\n if not native_ready:return')
x=' def update():\n  form.AllowTransparency=True';assert s.count(x)==1
s=s.replace(x,''' def update():
  global input_plane,input_handlers
  form.AllowTransparency=True''')
x='   if old is not None:old.Dispose()';assert s.count(x)==1
s=s.replace(x,'''   if old is not None:old.Dispose()
  # WebView2's composed pixels are absent from Win32's color-key hit map.
  # Own only the shaped sphere/menu controls, never the full desktop.
  if input_plane is None:
   import System.Windows.Forms as Forms
   f=Forms.Form();f.Text='Agent Lee native input plane';f.FormBorderStyle=getattr(Forms.FormBorderStyle,'None')
   f.ShowInTaskbar=False;f.TopMost=True;f.BackColor=Color.Black;f.Opacity=.01
   handle=f.Handle.ToInt64();user32.SetWindowLongW(handle,-20,user32.GetWindowLongW(handle,-20)|0x08000000|0x80)
   def forward(kind,event,pressed=False):
    if form.webview.CoreWebView2 is None:return
    scale=float(form._scale)
    payload={'type':kind,'x':event.X/scale,'y':event.Y/scale,'button':'left' if pressed else 'none','buttons':1 if pressed else 0}
    if kind in ('mousePressed','mouseReleased'):payload['clickCount']=1;payload['button']='left'
    if kind=='mouseWheel':payload.update(deltaX=0,deltaY=-event.Delta)
    form.webview.CoreWebView2.CallDevToolsProtocolMethodAsync('Input.dispatchMouseEvent',json.dumps(payload))
   def down(sender,event):
    if str(event.Button)=='Left':f.Capture=True;forward('mousePressed',event,True)
   def move(sender,event):forward('mouseMoved',event,f.Capture)
   def up(sender,event):
    if str(event.Button)=='Left':forward('mouseReleased',event,False);f.Capture=False
   def wheel(sender,event):forward('mouseWheel',event,False)
   f.MouseDown+=down;f.MouseMove+=move;f.MouseUp+=up;f.MouseWheel+=wheel
   input_handlers=[down,move,up,wheel];input_plane=f
  input_plane.Bounds=form.Bounds
  prior_region=input_plane.Region
  input_plane.Region=form.Region.Clone() if form.Region is not None else None
  if prior_region is not None:prior_region.Dispose()
  input_plane.Show();input_plane.BringToFront()''')
x="'panelOpen':panel,";assert s.count(x)==1;s=s.replace(x,"'nativeHitPlane':input_plane is not None,'panelOpen':panel,")
p.write_text(s,encoding='utf8',newline='\n');print({'before':before,'after':hashlib.sha256(p.read_bytes()).hexdigest(),'acceptance':'ACTUAL_MOUSE_RETEST_REQUIRED'})
