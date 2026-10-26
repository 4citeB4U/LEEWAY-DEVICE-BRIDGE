"""REGION: LEEWAY.DEVICES.UI; TAG: OBSERVED_MIXED_DPI_REPAIR
WHO: Owner-authorized qualification. WHAT: Repair the actual probe's scaled-outside-primary placement.
WHEN: Before launcher admission. WHERE: existing native UI adapter only.
WHY: OS pixels and logical pixels must not be multiplied twice. HOW: Use host adapter logical screens and actual HWND.
LICENSE: MIT.
"""
import pathlib,re,hashlib
p=pathlib.Path(__file__).with_name('agent-ui-host.py');s=p.read_text(encoding='utf8');before=hashlib.sha256(p.read_bytes()).hexdigest()
x="try:user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))\nexcept Exception:pass\n";assert s.count(x)==1;s=s.replace(x,'# Let the existing pywebview adapter establish DPI awareness and convert logical geometry.\n')
s,n=re.subn(r"window=webview.create_window\('[^']+',url", "window=webview.create_window('Agent Lee - Floating',url",s);assert n==1
x="hwnd=user32.FindWindowW(None,'Agent Lee";start=s.index(x);end=s.index('\n r=wintypes.RECT()',start)
s=s[:start]+"from webview.platforms.winforms import BrowserView\n hwnd=BrowserView.instances[window.uid].Handle.ToInt64()\n prior=user32.SetThreadDpiAwarenessContext(ctypes.c_void_p(-4))"+s[end:]
s=s.replace("crop.save(output/'native-floating-observed.png')","crop.save(output/'native-floating-observed.png');user32.SetThreadDpiAwarenessContext(ctypes.c_void_p(prior))")
p.write_text(s,encoding='utf8',newline='\n');print({'before':before,'after':hashlib.sha256(p.read_bytes()).hexdigest(),'liveAcceptance':'REQUIRED'})
