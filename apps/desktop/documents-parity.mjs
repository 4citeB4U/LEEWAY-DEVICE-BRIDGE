/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.GOVERNED_LOCAL_TEXT_TO_PDF_V1
WHO: LeeWay Industries; WHAT: bounded create-only PDF output.
WHEN: 2026-10-24; WHERE: apps/desktop/documents-parity.mjs.
WHY: Avoid incomplete optional ReportLab/Pillow dependency and external PDF services.
HOW: Direct Python script, isolated interpreter, JSON stdin, PDF header/EOF validation,
     bounded output, no shell, fail-closed exclusive write in approved workspace.
AUTHORITY: Adapter-only; Formula/owner/independent Veritas and receipts are upstream.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'pdf-renderer.py');
const MAX_PDF=4*1024*1024;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function writePdf(adapter,args){
  if(!/\.pdf$/i.test(args.path)||!args.text||Buffer.byteLength(args.text,'utf8')>65536)
    throw Error('PDF_INPUT_INVALID');
  const target=await adapter.safePath(args.path,true);
  // The bundled Python script receives no user-chosen executable, command or paths.
  const bytes=await new Promise((resolve,reject)=>{
    const child=spawn('python',['-I',script],{
      shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']
    });
    let stdout=Buffer.alloc(0),stderr=Buffer.alloc(0),pending=null;
    const fail=e=>{
      if(pending)return;
      pending=e;child.kill();
    };
    const timer=setTimeout(()=>fail(Error('PDF_RENDER_TIMEOUT')),12000);
    child.stdout.on('data',chunk=>{
      if(stdout.length+chunk.length>MAX_PDF)return fail(Error('PDF_RENDER_OUTPUT_TOO_LARGE'));
      stdout=Buffer.concat([stdout,chunk]);
    });
    child.stderr.on('data',chunk=>{
      if(stderr.length+chunk.length>1024)return fail(Error('PDF_RENDER_FAILURE'));
      stderr=Buffer.concat([stderr,chunk]);
    });
    child.on('error',()=>fail(Error('PDF_RENDERER_UNAVAILABLE')));
    child.on('close',code=>{
      clearTimeout(timer);
      if(pending)return reject(pending);
      if(code!==0)return reject(Error('PDF_RENDER_FAILURE'));
      if(!stdout.subarray(0,5).equals(Buffer.from('%PDF-'))||
         !stdout.subarray(-1024).includes(Buffer.from('%%EOF')))
        return reject(Error('PDF_FORMAT_INVALID'));
      resolve(stdout);
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(JSON.stringify({title:args.title||'',text:args.text}));
  });
  // Create-only; never delete/overwrite an existing user document.
  await fs.writeFile(target,bytes,{flag:'wx',mode:0o600});
  return {created:true,type:'application/pdf',bytes:bytes.length,sha256:sha(bytes),
    source:'OFFLINE_PYTHON_STDLIB_TEXT_PDF',independentProductionVerified:false};
}
