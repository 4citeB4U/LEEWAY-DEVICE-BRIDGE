"""
REGION: LEEWAY.DEVICES.NATIVE_UI.VISION
TAG: LEEWAY.LFW.V1.VISION_EYE_NATIVE_WINDOW
5WH: WHAT = Bind the approved Vision eye to native multi-monitor geometry, elliptical hit-region,
 and a separate edge-anchored Vision controls tag.
WHY = Prevent a transparent rectangular Vision window from blocking the Agent Lee Digital Brain.
WHO = LeeWay Industries / Creator-authorized existing Agent Lee native host.
WHERE = Existing native-host/vision_native_widget.py; no new runtime or application identity.
WHEN = 2026-10-10.
HOW = Existing pywebview surface owner, Win32 geometry and region, separate same-process tag.
AUTHORIZED ROLES: OWNER_UI, VISION_WIDGET_CONTROL. Camera requires explicit owner action.
LICENSE: MIT.
"""
import ctypes
import math
import threading

_TAG_HTML = """<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}html,body{padding:0;margin:0;overflow:hidden;background:transparent;color:#d8faff;font:600 12px "Segoe UI",system-ui,sans-serif}
#body{height:100vh;width:100vw;background:rgba(5,22,36,.94);border:1px solid #4ec8e1;border-radius:15px;box-shadow:inset 0 1px 7px #76eeff36;display:flex;flex-direction:column}
#tab{width:100%;height:100%;flex:0 0 auto;border:0;background:transparent;color:#7ef8ff;cursor:pointer;font-size:12px;font-weight:800;letter-spacing:1px;writing-mode:vertical-rl;text-orientation:mixed}
#drag{display:block;position:absolute;left:0;top:4px;height:24px;width:100%;cursor:ns-resize;touch-action:none}
#actions{display:none;overflow-y:auto;padding:9px;gap:6px;grid-template-columns:1fr 1fr}
#actions button{min-height:34px;background:#10344b;color:#e2faff;border:1px solid #317b8d;border-radius:8px;cursor:pointer;padding:5px;font:600 11px system-ui}
#actions button:focus-visible,#tab:focus-visible{outline:2px solid #9affef}
body.expanded #tab{height:42px;flex:none;writing-mode:horizontal-tb;border-bottom:1px solid #3b91a4}
body.expanded #actions{display:grid;flex:1}
body.expanded #drag{height:12px}
#status{grid-column:span 2;text-align:center;color:#a3d3e0;font-size:10px;min-height:22px;overflow:hidden}
</style></head><body><div id="body"><button id="tab" aria-label="Vision controls side tag">VISION</button><div id="drag" title="Move Vision controls vertically"></div>
<div id="actions">
<button data-action="restore">Show eye</button><button data-action="minimize">Hide eye</button>
<button data-action="zoom_in">Larger</button><button data-action="zoom_out">Smaller</button>
<button data-action="center">Recenter</button><button data-action="camera">Camera</button>
<button data-action="flip">Switch camera</button><button data-action="scan">Tracking</button>
<button data-action="matrix">Camera wall</button><button data-action="close">Close eye</button>
<div id="status" role="status" aria-live="polite">Owner controls</div></div></div>
<script>
const api=()=>window.pywebview?.api;
const status=(s)=>{const e=document.getElementById('status');if(e)e.textContent=s};
document.getElementById('tab').addEventListener('click',async()=>{
 try{const r=await api()?.toggle();document.body.classList.toggle('expanded',Boolean(r?.expanded));}
 catch(e){status('Controls unavailable');}
});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',async()=>{
 try{const r=await api()?.action(button.dataset.action);status(r?.state||'Requested');}
 catch(e){status('Action blocked');}
}));
let last=null;const grab=document.getElementById('drag');
grab.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;last={id:e.pointerId,y:e.screenY};grab.setPointerCapture(e.pointerId);e.preventDefault()});
grab.addEventListener('pointermove',async e=>{if(!last||e.pointerId!==last.id)return;const dy=e.screenY-last.y;if(Math.abs(dy)<2)return;last.y=e.screenY;try{await api()?.move_vertical(dy)}catch{}});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])grab.addEventListener(ev,()=>last=null);
</script></body></html>"""


class VisionNativeWidget:
    """Owned child surface adapter. Never starts a separate backend or package."""

    def __init__(self, webview, main_window, surfaces, physical_rect,
                 place_physical, monitor_work, native_handle,
                 physical_desktop, prepare_popup, open_vision, receipt):
        self.webview = webview
        self.main_window = main_window
        self.surfaces = surfaces
        self.physical_rect = physical_rect
        self.place_physical = place_physical
        self.monitor_work = monitor_work
        self.native_handle = native_handle
        self.physical_desktop = physical_desktop
        self.prepare_popup = prepare_popup
        self.open_vision = open_vision
        self.receipt = receipt
        self.tag = None
        self.tag_expanded = False
        self.tag_y = None
        self.region_state = {'state': 'NOT_APPLIED'}
        self.lock = threading.RLock()

    def eye(self):
        w = self.surfaces.get('/vision-ui/index.html')
        return w if w is not None and w in self.webview.windows else None

    def virtual_bounds(self):
        with self.physical_desktop():
            u = ctypes.windll.user32
            return {'x': int(u.GetSystemMetrics(76)), 'y': int(u.GetSystemMetrics(77)),
                    'width': int(u.GetSystemMetrics(78)), 'height': int(u.GetSystemMetrics(79))}

    @staticmethod
    def bounded(rect, desktop, visible=130):
        """Virtual desktop union allows cross-monitor travel; keeps an operable part on screen."""
        if any(not math.isfinite(float(v)) for v in rect.values()):
            raise ValueError('VISION_GEOMETRY_NONFINITE')
        if desktop['width'] < 150 or desktop['height'] < 150:
            raise ValueError('VISION_VIRTUAL_DESKTOP_INVALID')
        w = max(260, min(1500, int(round(rect['width']))))
        h = max(210, min(1100, int(round(rect['height']))))
        keep = min(visible, w // 3, h // 3)
        x = max(desktop['x'] - w + keep,
                min(int(round(rect['x'])), desktop['x'] + desktop['width'] - keep))
        y = max(desktop['y'] - h + keep,
                min(int(round(rect['y'])), desktop['y'] + desktop['height'] - keep))
        return {'x': x, 'y': y, 'width': w, 'height': h}

    def geometry(self, edge, dx, dy):
        if edge not in ('move', 'scale'):
            raise ValueError('VISION_WIDGET_GEOMETRY_ACTION_DENIED')
        dx = float(dx); dy = float(dy)
        if not math.isfinite(dx + dy) or abs(dx) > 250 or abs(dy) > 250:
            raise ValueError('VISION_WIDGET_DELTA_OUT_OF_BOUNDS')
        eye = self.eye()
        if eye is None:
            raise RuntimeError('VISION_EYE_NOT_OPEN')
        r = self.physical_rect(eye)
        with self.physical_desktop():
            scale = ctypes.windll.user32.GetDpiForWindow(self.native_handle(eye)) / 96.0
        if not 0.5 <= scale <= 4.0:
            raise RuntimeError('VISION_WINDOW_DPI_INVALID')
        if edge == 'move':
            r['x'] += int(round(dx * scale))
            r['y'] += int(round(dy * scale))
        else:
            factor = 0.92 if dx > 0 else 1.08
            oldw, oldh = r['width'], r['height']
            nextw = max(300, min(1350, int(round(oldw * factor))))
            ratio = nextw / oldw
            nexth = max(230, min(960, int(round(oldh * ratio))))
            r['x'] += (oldw - nextw) // 2
            r['y'] += (oldh - nexth) // 2
            r['width'], r['height'] = nextw, nexth
        bounded = self.bounded(r, self.virtual_bounds())
        observed = self.place_physical(eye, bounded)
        return {'state':'VISION_NATIVE_WIDGET_GEOMETRY_APPLIED',
                'action':edge, 'coordinateSpace':'VIRTUAL_DESKTOP_PHYSICAL',
                **observed}

    def configure_region(self, target):
        """Clip native HWND hit testing to the oval eye, not its bounding rectangle."""
        def update():
            try:
                from webview.platforms.winforms import BrowserView
                form = BrowserView.instances[target.uid]
                if form.IsDisposed: return
                actual = self.physical_rect(target)
                w, h = actual['width'], actual['height']
                gdi = ctypes.windll.gdi32
                win = ctypes.windll.user32
                gdi.CreateEllipticRgn.argtypes = [ctypes.c_int] * 4
                gdi.CreateEllipticRgn.restype = ctypes.c_void_p
                win.SetWindowRgn.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int]
                win.SetWindowRgn.restype = ctypes.c_int
                region = gdi.CreateEllipticRgn(int(w*.13), int(h*.01),
                                                int(w*.90), int(h*.99))
                if not region: raise OSError('VISION_NATIVE_REGION_ALLOC_FAILED')
                accepted = win.SetWindowRgn(self.native_handle(target), region, 1)
                if not accepted:
                    gdi.DeleteObject(ctypes.c_void_p(region))
                    raise OSError('VISION_NATIVE_REGION_APPLY_FAILED')
                self.region_state = {'state':'NATIVE_ELLIPTICAL_HIT_REGION_APPLIED',
                                     'width':w,'height':h,'nativeHandle':int(self.native_handle(target))}
            except Exception as err:
                self.region_state = {'state':'NATIVE_REGION_FAILED','reason':type(err).__name__+':'+str(err)}
                self.receipt('VISION_HIT_REGION_FAILED',self.region_state)
        try:
            from System import Action
            from webview.platforms.winforms import BrowserView
            form = BrowserView.instances[target.uid]
            if form.InvokeRequired: form.BeginInvoke(Action(update))
            else: update()
        except Exception as err:
            self.region_state={'state':'NATIVE_REGION_DISPATCH_FAILED','reason':str(err)}
            self.receipt('VISION_REGION_DISPATCH_FAILED',self.region_state)

    def _tag_bounds(self, expanded=None, delta=0):
        if expanded is None: expanded=self.tag_expanded
        area = self.monitor_work(self.main_window)
        width,height = (235,340) if expanded else (55,205)
        if self.tag_y is None:
            self.tag_y = area['y'] + max(20,(area['height']-height)//3)
        self.tag_y = max(area['y']+4, min(area['y']+area['height']-height-4,
                                        self.tag_y+int(round(delta))))
        return {'x':area['x']+area['width']-width-3, 'y':self.tag_y,
                'width':width, 'height':height}

    def toggle_tag(self):
        with self.lock:
            if not self.tag or self.tag not in self.webview.windows:
                raise RuntimeError('VISION_TAG_UNAVAILABLE')
            self.tag_expanded = not self.tag_expanded
            geometry = self._tag_bounds()
            self.place_physical(self.tag, geometry)
            return {'state':'VISION_EDGE_TAG_EXPANDED' if self.tag_expanded else 'VISION_EDGE_TAG_COLLAPSED',
                    'expanded':self.tag_expanded}

    def shift_tag_y(self, css_delta):
        with self.lock:
            if not self.tag or self.tag not in self.webview.windows:
                raise RuntimeError('VISION_TAG_UNAVAILABLE')
            if not math.isfinite(float(css_delta)) or abs(float(css_delta)) > 250:
                raise ValueError('VISION_TAG_VERTICAL_DELTA_INVALID')
            area=self.monitor_work(self.tag)
            with self.physical_desktop():
                scale=ctypes.windll.user32.GetDpiForWindow(self.native_handle(self.tag))/96.0
            self.tag_y=max(area['y']+4,min(area['y']+area['height']-(340 if self.tag_expanded else 205)-4,
                                         (self.tag_y or area['y'])+int(float(css_delta)*scale)))
            rect=self._tag_bounds()
            self.place_physical(self.tag, rect)
            return {'state':'VISION_TAG_VERTICAL_ONLY','y':self.tag_y}

    def action(self, name):
        if name not in ('restore','minimize','close','zoom_in','zoom_out',
                        'center','camera','flip','scan','matrix'):
            raise ValueError('VISION_TAG_ACTION_NOT_ALLOWED')
        eye=self.eye()
        if name=='restore':
            if eye is None:
                self.open_vision()
                return {'state':'VISION_REOPEN_REQUESTED'}
            threading.Thread(target=lambda:(eye.show(),eye.restore()),daemon=True).start()
            return {'state':'VISION_RESTORE_REQUESTED'}
        if eye is None:
            raise RuntimeError('VISION_EYE_NOT_OPEN')
        if name == 'minimize':
            threading.Thread(target=eye.minimize,daemon=True).start()
            return {'state':'VISION_MINIMIZE_REQUESTED'}
        if name == 'close':
            self.surfaces.pop('/vision-ui/index.html',None)
            threading.Thread(target=eye.destroy,daemon=True).start()
            return {'state':'VISION_CLOSED_TAG_RETAINED'}
        if name in ('zoom_in','zoom_out'):
            return self.geometry('scale', -1 if name=='zoom_in' else 1, 0)
        if name == 'center':
            r=self.physical_rect(eye)
            area=self.monitor_work(self.main_window)
            new=self.bounded({'x':area['x']+(area['width']-r['width'])//2,
                              'y':area['y']+(area['height']-r['height'])//2,
                              'width':r['width'],'height':r['height']},self.virtual_bounds())
            self.place_physical(eye,new)
            return {'state':'VISION_NATIVE_EYE_RECENTERED'}
        # Invoke the existing app's controls, not another camera capability.
        button={'camera':'cameraButton','flip':'flipButton','scan':'scanButton','matrix':'matrixButton'}[name]
        eye.evaluate_js("document.getElementById("+repr(button)+")?.click()")
        return {'state':'VISION_EXISTING_CONTROL_REQUESTED','control':name,
                'cameraPermission':'OWNER_PLATFORM_PROMPT_IF_REQUIRED'}

    def ensure_controls(self):
        if self.tag and self.tag in self.webview.windows:
            self.tag.show();return self.tag
        owner=self
        class DockApi:
            def toggle(self):return owner.toggle_tag()
            def move_vertical(self, delta):return owner.shift_tag_y(delta)
            def action(self, name):return owner.action(name)
        geo=self._tag_bounds(False)
        self.tag=self.webview.create_window('Agent Lee - Vision Controls',
            html=_TAG_HTML,js_api=DockApi(),width=geo['width'],height=geo['height'],
            resizable=False,frameless=True,transparent=True,
            background_color='#000000',on_top=True,focus=False,
            shadow=False,min_size=(50,180))
        self.prepare_popup(self.tag,geo,transparent=True)
        self.receipt('VISION_EDGE_TAG_CREATED',{'scope':'CHILD_SURFACE','x':geo['x'],'y':geo['y'],
                                                'expanded':False,'behavior':'RIGHT_EDGE_VERTICAL_ONLY'})
        return self.tag
