/**
 * LEEWAY HEADER — DO NOT REMOVE
 * REGION: LEEWAY.DEVICE_BRIDGE.GPU_SERVICE.SOFTWARE_GRAPHICS_DIAGNOSTIC
 * TAG: ORIGINAL_UMD_SOFTWARE_QUEUE_LIVE_DIAGNOSTIC_ONLY_V1
 * WHO: Creator-authorized LeeWay recovery integration.
 * WHAT: Invoke the already built first-party UMD lab program and DLL from the GPU service.
 * WHEN: 2026-10-24. WHERE: Device Bridge GPU service, loopback host only.
 * WHY: Make the original LeeWay software compute demonstrably callable by the app.
 * HOW: Opt-in pinned executable path; no shell, input arguments or execution claims.
 * AUTHORITY: DIAGNOSTIC_ONLY; never substitutes canonical Runtime/Formula/LDWMD/Veritas.
 * LICENSE: Existing LeeWay repository terms.
 */
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,statSync} from 'node:fs';
import {basename,dirname,isAbsolute,resolve} from 'node:path';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
const expected='LEEWAY_D3D11_UMD_LAB_SOFTWARE_ENGINE_PASS nativeDll=true borrowedPixels=16 requestScoped=true fence=1 independentReadback=true foreignRejected=true protectedAdmission=false dxgiLeeWayRegistered=false';
const sha256=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
export function createNativeSoftwareGraphicsDiagnostic({runnerPath,dllPath}={}){
 if(process.platform!=='win32')throw Error('LEEWAY_SOFTWARE_DIAG_WINDOWS_ONLY');
 if(!isAbsolute(runnerPath||'')||!isAbsolute(dllPath||'')||
    basename(runnerPath).toLowerCase()!=='leeway_umd_lab_bridge_test.exe'||
    basename(dllPath).toLowerCase()!=='leeway_d3d11_umd.dll'||
    resolve(dirname(runnerPath)).toLowerCase()!==resolve(dirname(dllPath)).toLowerCase())
  throw Error('LEEWAY_SOFTWARE_DIAG_BINARIES_INVALID');
 for(const p of [runnerPath,dllPath])if(!statSync(p).isFile())throw Error('LEEWAY_SOFTWARE_DIAG_NOT_FILE');
 return Object.freeze({
  mode:'LEEWAY_NATIVE_SOFTWARE_GRAPHICS_LAB',
  async run(){
   const [runnerSha256,dllSha256]=[sha256(runnerPath),sha256(dllPath)];
   let stdout;
   try{({stdout}=await execFileAsync(runnerPath,[dllPath],{
      windowsHide:true,shell:false,timeout:6000,maxBuffer:4096,encoding:'utf8',
      cwd:dirname(runnerPath)
   }));}catch{throw Error('LEEWAY_SOFTWARE_DIAG_NATIVE_FAILED');}
   if(stdout.trim()!==expected)throw Error('LEEWAY_SOFTWARE_DIAG_NATIVE_EVIDENCE_MISMATCH');
   return Object.freeze({
    schema:'leeway.gpu.software-graphics-diagnostic.v1',
    serviceId:'leeway.gpu.service',
    status:'PASS_DIAGNOSTIC_ONLY',
    backend:'LEEWAY_GPU_SOFTWARE',
    scope:'LAB_ONLY',
    implementation:'ORIGINAL_LEEWAY_D3D11_UMD_SOFTWARE_QUEUE',
    borrowedPixels:16,completedFence:1,independentReadback:true,
    requestCorrelated:true,foreignRejected:true,
    runnerSha256,dllSha256,
    canonicalReceiptIssued:false,osGpuRegistered:false,
    productionReady:false,dispatchAllowed:false
   });
  }
 });
}
