const BASE=process.env.DEVICE_BRIDGE_URL||'https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/docs/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function fetchText(path){
  const url=BASE+path;
  const r=await fetch(url,{redirect:'error',cache:'no-store'});
  return {url,r,text:await r.text()};
}
async function waitFor(path,needles,{attempts=30,delayMs=10000}={}){
  let last=null;
  for(let i=1;i<=attempts;i++){
    last=await fetchText(path);
    const ok=last.r.ok&&needles.every(n=>last.text.includes(n));
    console.log(JSON.stringify({attempt:i,url:last.url,status:last.r.status,bytes:last.text.length,ok}));
    if(ok)return last;
    if(i<attempts)await sleep(delayMs);
  }
  for(const n of needles)if(!last?.text.includes(n))console.error('CONTENT_FAIL',last?.url,n);
  throw new Error('LIVE_CONTENT_NOT_PROPAGATED:'+path);
}

let failed=false;
try{
  // PRIMARY: device-neutral workstation/PWA
  await waitFor('',[
    'LeeWay Device-Neutral Workstation',
    'Install LeeWay Device-Neutral Workstation',
    'INSTALL LEEWAY WORKSTATION',
    'Native Android capability packages are optional extensions'
  ]);
  await waitFor('manifest.webmanifest',[
    'LeeWay Device-Neutral Workstation',
    'standalone',
    'leeway-official-logo-192.png',
    'leeway-official-logo-512.png'
  ]);
  for(const icon of ['icons/leeway-official-logo-192.png','icons/leeway-official-logo-512.png']){
    const r=await fetch(BASE+icon,{method:'HEAD',redirect:'error',cache:'no-store'});
    console.log(JSON.stringify({icon,status:r.status,contentLength:r.headers.get('content-length')}));
    if(!r.ok)throw new Error('PWA_ICON_FAIL:'+icon+':'+r.status);
  }
  const sw=await fetch(BASE+'sw.js',{cache:'no-store'});
  console.log(JSON.stringify({serviceWorkerStatus:sw.status}));
  if(!sw.ok)throw new Error('SERVICE_WORKER_FAIL:'+sw.status);

  // OPTIONAL: Android native extension must not block base workstation
  const pkg=await waitFor('package-manifest.json',[
    'OPTIONAL_NATIVE_EXTENSION_BUILD_QUALIFIED',
    '0.8.5',
    'b65710deba8579d0e2eb38cf289d976e3622b25d1ed6f8d5d2ef9114033f5bec'
  ]);
  console.log('OPTIONAL_ANDROID_EXTENSION=AVAILABLE');
}catch(e){
  console.error(e?.stack||e);
  failed=true;
}
if(failed)process.exit(1);
console.log('LEEWAY_DEVICE_NEUTRAL_WORKSTATION_LIVE_GATE=PASS');
