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
  await waitFor('',[
    'Secondary Workstation Mode',
    'Open Phone Cloud Workstation',
    'leeway-phone-workstation',
    'PENDING_REMOTE_QUALIFICATION'
  ]);
  await waitFor('secondary-workstation-node.json',[
    'leeway-phone-workstation',
    'mobile-secondary-workstation',
    'PHONE_LOCAL_PLUS_CLOUD_ATTACHMENT'
  ]);
  await waitFor('package-manifest.json',[
    'leeway-device-bridge-android-latest-debug.apk',
    '0.8.5',
    'SECONDARY_WORKSTATION_BUILD_QUALIFIED_INSTALL_REQUIRED'
  ]);
  const apk=await fetch(BASE+'downloads/leeway-device-bridge-android-latest-debug.apk',{method:'HEAD',redirect:'error',cache:'no-store'});
  console.log(JSON.stringify({apkStatus:apk.status,contentLength:apk.headers.get('content-length')}));
  if(!apk.ok)throw new Error('APK_HEAD_FAIL:'+apk.status);
}catch(e){
  console.error(e?.stack||e);
  failed=true;
}
if(failed)process.exit(1);
console.log('DEVICE_BRIDGE_SECONDARY_WORKSTATION_LIVE_GATE=PASS');
