const BASE=process.env.DEVICE_BRIDGE_URL||'https://4citeb4u.github.io/LEEWAY-DEVICE-BRIDGE/';
const checks=[
  ['',['Secondary Workstation Mode','Open Phone Cloud Workstation','leeway-phone-workstation','PENDING_REMOTE_QUALIFICATION']],
  ['secondary-workstation-node.json',['leeway-phone-workstation','mobile-secondary-workstation','PHONE_LOCAL_PLUS_CLOUD_ATTACHMENT']],
  ['package-manifest.json',['leeway-device-bridge-android-v0.7.0-debug.apk','0.7.0','F8_GOVERNED_ALWAYS_ON_REMOTE_BUILD_QUALIFIED_INSTALL_REQUIRED']]
];
let failed=false;
for(const [path,needles] of checks){
 const url=BASE+path;
 const r=await fetch(url,{redirect:'error',cache:'no-store'});
 const t=await r.text();
 console.log(JSON.stringify({url,status:r.status,bytes:t.length}));
 if(!r.ok){failed=true;console.error('HTTP_FAIL',url,r.status);continue;}
 for(const n of needles){if(!t.includes(n)){failed=true;console.error('CONTENT_FAIL',url,n)}else console.log('CONTENT_PASS',url,n)}
}
const apk=await fetch(BASE+'downloads/leeway-device-bridge-android-v0.7.0-debug.apk',{method:'HEAD',redirect:'error',cache:'no-store'});
console.log(JSON.stringify({apkStatus:apk.status,contentLength:apk.headers.get('content-length')}));
if(!apk.ok){failed=true;console.error('APK_HEAD_FAIL',apk.status)}
if(failed)process.exit(1);
console.log('DEVICE_BRIDGE_SECONDARY_WORKSTATION_LIVE_GATE=PASS');