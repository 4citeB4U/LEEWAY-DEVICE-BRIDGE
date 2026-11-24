/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.BROWSER.NATIVE_TRANSPORT
TAG: LEEWAY.BRIDGE_NATIVE_STDIO_FRAMING.V1
5WH:
WHAT = Carry browser Native Messaging frames over stdio for the existing Bridge session adapter.
WHY = Chrome and Edge cannot invoke an MCP device process without an approved installed native host.
WHO = Creator-authorized Bridge adapter contributors; original Device Bridge installer/Runtime retain control.
WHERE = operator/browser/native-message-transport.mjs.
WHEN = 2026-11-23.
HOW = Bounded 32-bit little-endian JSON frames routed only to an injected authenticated session handler.
LICENSE = MIT; does not install a host or create execution authority.
*/
const MAX_MESSAGE=1024*1024;
export function encodeNativeFrame(value){
 const bytes=Buffer.from(JSON.stringify(value),'utf8');
 if(bytes.length<2||bytes.length>MAX_MESSAGE)throw Error('BRIDGE_NATIVE_FRAME_INVALID');
 const out=Buffer.allocUnsafe(bytes.length+4);
 out.writeUInt32LE(bytes.length,0);
 bytes.copy(out,4);
 return out;
}
export function createNativeMessageDecoder(onMessage,{maxBytes=MAX_MESSAGE}={}){
 if(typeof onMessage!=='function'||!Number.isSafeInteger(maxBytes)||
    maxBytes<1024||maxBytes>MAX_MESSAGE)throw Error('BRIDGE_NATIVE_DECODER_CONFIG_INVALID');
 let buffered=Buffer.alloc(0),expected=null;
 return Object.freeze({
  push(chunk){
   if(!Buffer.isBuffer(chunk))throw Error('BRIDGE_NATIVE_CHUNK_INVALID');
   if(chunk.length>MAX_MESSAGE+4||buffered.length+chunk.length>MAX_MESSAGE+4)
     throw Error('BRIDGE_NATIVE_FRAME_TOO_LARGE');
   buffered=Buffer.concat([buffered,chunk]);
   for(;;){
    if(expected===null){
     if(buffered.length<4)break;
     expected=buffered.readUInt32LE(0);
     if(expected<2||expected>maxBytes)throw Error('BRIDGE_NATIVE_FRAME_SIZE_DENIED');
     buffered=buffered.subarray(4);
    }
    if(buffered.length<expected)break;
    const bytes=buffered.subarray(0,expected);
    buffered=buffered.subarray(expected);
    expected=null;
    let object;
    try{object=JSON.parse(bytes.toString('utf8'))}
    catch{throw Error('BRIDGE_NATIVE_FRAME_JSON_INVALID')}
    if(!object||typeof object!=='object'||Array.isArray(object))
      throw Error('BRIDGE_NATIVE_FRAME_OBJECT_REQUIRED');
    onMessage(object);
   }
  }
 });
}
export async function runNativeBrowserSession({input,output,session}={}){
 if(!input?.on||typeof output?.write!=='function'||typeof session?.handle!=='function')
   throw Error('BRIDGE_NATIVE_RUNTIME_BINDINGS_REQUIRED');
 let closed=false;
 let chain=Promise.resolve();
 const decoder=createNativeMessageDecoder(message=>{
  chain=chain.then(async()=>{
    if(closed)return;
    const result=await session.handle(message);
    if(!closed)output.write(encodeNativeFrame(result));
  }).catch(()=>{closed=true;input.destroy?.()});
 });
 input.on('data',part=>{
  if(closed)return;
  try{decoder.push(part)}catch{closed=true;input.destroy?.()}
 });
 input.on('end',()=>{closed=true});
 return Object.freeze({drain:()=>chain,stop:()=>{closed=true;input.destroy?.()}});
}
