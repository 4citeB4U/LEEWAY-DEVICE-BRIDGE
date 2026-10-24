/* REGION: LEEWAY.DEVICES.TRANSPORT; TAG: FIXED_PAIRED_MODEL_INVENTORY_READ
 * The existing paired gateway supplies its existing token check, body identity,
 * response writer and loopback carrier. A phone cannot supply an upstream URL,
 * path, model, or command. This handler reads exactly one inventory document.
 * LICENSE: Existing repository terms.
 */
export async function handlePairedModelInventory({req,res,authorized,pairedBody,carrier,send}) {
  if (!authorized(req)) return send(res,403,{error:'PAIRING_AUTHORITY_REQUIRED'});
  if (req.method !== 'POST' || req.url !== '/models/inventory') return send(res,404,{error:'NOT_FOUND'});
  let chunks=[],size=0;
  for await (const chunk of req) {
    const bytes=Buffer.from(chunk);size+=bytes.length;
    if(size>1024)return send(res,413,{error:'MODEL_INVENTORY_REQUEST_LIMIT'});
    chunks.push(bytes);
  }
  let input;
  try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch{return send(res,400,{error:'MODEL_INVENTORY_REQUEST_NOT_ADMITTED'});}
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||
      input.bodyId!==pairedBody)return send(res,400,{error:'MODEL_INVENTORY_REQUEST_NOT_ADMITTED'});
  // These values come from the existing gateway, never the request document.
  const origin=new URL(carrier);
  if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||origin.username||origin.password||
      origin.search||origin.hash||origin.pathname!=='/')throw Error('LOCAL_MODEL_INVENTORY_CARRIER_REQUIRED');
  try{
    const response=await fetch(origin.origin+'/api/models/inventory',{
      method:'GET',headers:{Accept:'application/json',Origin:origin.origin,'Sec-Fetch-Site':'same-origin'},
      signal:AbortSignal.timeout(6500),redirect:'error',
    });
    if(!response.ok||!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')){
      return send(res,503,{error:'PC_MODEL_INVENTORY_UNAVAILABLE'});
    }
    chunks=[];size=0;
    for await(const chunk of response.body){size+=chunk.length;if(size>2200000)return send(res,503,{error:'MODEL_INVENTORY_RESPONSE_LIMIT'});chunks.push(Buffer.from(chunk));}
    let document;
    try{document=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
    catch{return send(res,503,{error:'PC_MODEL_INVENTORY_INVALID_RESPONSE'});}
    if(document?.schemaVersion!=='leeway.model-inventory.v1'||document.owner?.repository!=='4citeB4U/Leeway-Runtime-Fabric'||
        document.owner?.component!=='model-execution-runtime'||document.owner?.provider!=='OLLAMA_LOCAL'||
        document.body?.kind!=='PC'||typeof document.body?.name!=='string'||document.scope!=='PC_MODEL_SERVICE_INVENTORY'||
        !['OBSERVED','PARTIAL','UNAVAILABLE','BLOCKED'].includes(document.state)){
      return send(res,503,{error:'PC_MODEL_INVENTORY_INVALID_RESPONSE'});
    }
    for(const key of ['installed','loaded']){
      const section=document[key];
      if(!section||!Array.isArray(section.models)||section.models.length>1024||
          (section.state==='OBSERVED'?section.count!==section.models.length:section.count!==null||section.models.length!==0)){
        return send(res,503,{error:'PC_MODEL_INVENTORY_INVALID_RESPONSE'});
      }
    }
    return send(res,200,document);
  }catch{return send(res,503,{error:'PC_MODEL_INVENTORY_UNAVAILABLE'});}
}
