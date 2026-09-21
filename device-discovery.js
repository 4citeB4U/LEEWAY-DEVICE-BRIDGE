const E = Object.freeze({OBSERVED:"OBSERVED",INFERRED:"INFERRED",NATIVE:"NATIVE_VERIFICATION_REQUIRED",UNKNOWN:"UNKNOWN"});

function fact(value,evidence,source){return {value:value ?? null,evidence,source};}
function platformFromUA(ua,platform){
  const text=(ua+" "+platform).toLowerCase();
  if(/iphone|ipad|ipod/.test(text)) return "ios";
  if(/android/.test(text)) return "android";
  return "unknown";
}
export async function discoverDevice(){
  const nav=navigator;
  const ua=nav.userAgent||"";
  const uaData=nav.userAgentData;
  let high={};
  if(uaData?.getHighEntropyValues){
    try{high=await uaData.getHighEntropyValues(["architecture","bitness","model","platformVersion","fullVersionList"]);}catch{}
  }
  const platform=uaData?.platform||nav.platform||"";
  const os=platformFromUA(ua,platform);
  const exactModel=high.model||null;
  return {
    schemaVersion:"0.1.0",
    capturedAt:new Date().toISOString(),
    platform:fact(os,os==="unknown"?E.UNKNOWN:E.INFERRED,"user-agent/client-hints"),
    browserPlatform:fact(uaData?.platform||nav.platform||null,E.OBSERVED,"navigator"),
    exactModel:fact(exactModel,exactModel?E.OBSERVED:E.NATIVE,"user-agent client hints/native handoff"),
    architecture:fact(high.architecture||null,high.architecture?E.OBSERVED:E.NATIVE,"client hints/native handoff"),
    bitness:fact(high.bitness||null,high.bitness?E.OBSERVED:E.NATIVE,"client hints/native handoff"),
    platformVersion:fact(high.platformVersion||null,high.platformVersion?E.OBSERVED:E.NATIVE,"client hints/native handoff"),
    logicalProcessors:fact(nav.hardwareConcurrency||null,nav.hardwareConcurrency?E.OBSERVED:E.UNKNOWN,"navigator.hardwareConcurrency"),
    memoryHintGiB:fact(nav.deviceMemory||null,nav.deviceMemory?E.OBSERVED:E.UNKNOWN,"navigator.deviceMemory"),
    touchPoints:fact(nav.maxTouchPoints??null,E.OBSERVED,"navigator.maxTouchPoints"),
    screen:fact({width:screen.width,height:screen.height,pixelRatio:devicePixelRatio},E.OBSERVED,"window.screen"),
    language:fact(nav.language||null,E.OBSERVED,"navigator.language"),
    online:fact(nav.onLine,E.OBSERVED,"navigator.onLine"),
    userAgent:fact(ua,E.OBSERVED,"navigator.userAgent")
  };
}
export {E};