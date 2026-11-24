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
  // PRIMARY: the public device bridge starts with protected, mobile-first
  // account onboarding. Development workstations remain under Advanced.
  await waitFor('',[
    'Set up LeeWay on this device',
    'id="bridgeOnboardingForm"',
    'Android phone / tablet',
    'id="dbAdvanced"',
    'Review secure Device Bridge setup'
  ]);
  await waitFor('manifest.webmanifest',[
    'LeeWay Device Bridge',
    'standalone',
    'leeway-official-logo-192.png',
    'leeway-official-logo-512.png'
  ]);
  for(const icon of ['icons/leeway-official-logo-192.png','icons/leeway-official-logo-512.png']){
    const r=await fetch(BASE+icon,{method:'HEAD',redirect:'error',cache:'no-store'});
    console.log(JSON.stringify({icon,status:r.status,contentLength:r.headers.get('content-length')}));
    if(!r.ok)throw new Error('PWA_ICON_FAIL:'+icon+':'+r.status);
  }
  const sw=await waitFor('sw.js',['v20-secure-onboarding-no-debug','status: 410']);
  console.log(JSON.stringify({serviceWorkerStatus:sw.r.status}));

  // The historical debug artifact is preserved in Git history and CI ONLY.
  // Current public release discovery explicitly denies installer delivery.
  await waitFor('package-manifest.json',[
    'android-latest-debug',
    'DEVELOPMENT_ONLY_NOT_PUBLIC_RELEASE',
    '"downloadUrl": null',
    '"nativeVerification": true'
  ]);
  await waitFor('downloads/leeway-device-bridge-android-latest.json',[
    '"downloadUrl": null',
    'NOT_APPROVED_FOR_CUSTOMER_INSTALL'
  ]);
  // No debugger APK may remain in the GitHub Pages published tree.
  const binary=await fetch(BASE+'downloads/leeway-device-bridge-android-latest-debug.apk',
    {method:'HEAD',redirect:'error',cache:'no-store'});
  console.log(JSON.stringify({apkStatus:binary.status}));
  if(binary.ok)throw new Error('PUBLIC_DEVELOPER_DEBUG_APK_STILL_ACCESSIBLE');
  console.log('ANDROID_NATIVE_RELEASE=OWNER_SIGNING_AND_ENROLLMENT_REQUIRED');
}catch(e){
  console.error(e?.stack||e);
  failed=true;
}
if(failed)process.exit(1);
console.log('LEEWAY_DEVICE_BRIDGE_PUBLIC_ONBOARDING_LIVE_GATE=PASS');
