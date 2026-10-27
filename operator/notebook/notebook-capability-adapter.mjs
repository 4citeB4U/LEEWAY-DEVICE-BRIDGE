/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.NOTEBOOK
TAG: LEEWAY.DEVICE.BRIDGE.NOTEBOOK.CAPABILITY.ADAPTER
5WH:
WHAT = Normalize notebook capabilities through the existing Device Bridge authority boundary.
WHY = Replace ungated local Notebook command relay access with fail-closed host-bound routing.
WHO = LeeWay Device Bridge owner and authorized Agent Lee host runtimes.
WHERE = operator/notebook/notebook-capability-adapter.mjs.
WHEN = 2026-10-27.
HOW = Injected authorized executor with host-specific session and operation admission; no duplicate server.
LICENSE: MIT.
AUTHORITY: Additive source contract only. Physical NotebookLM/Chrome connection not qualified.
*/
const OPERATIONS = Object.freeze({
  'notebook.status': {mutates:false},
  'notebook.prompt': {mutates:true},
  'notebook.studio.capture': {mutates:true},
  'notebook.studio.generate': {mutates:true}
});
const STUDIO_TYPES = new Set(['infographic','slide_deck','data_table','mind_map','report','audio','video']);
export const NOTEBOOK_CAPABILITY_VERSION='leeway.device.notebook.v1';
export const NOTEBOOK_ALLOWED_OPERATIONS=Object.freeze(Object.keys(OPERATIONS));
export function createNotebookCapabilityAdapter({authorize,execute,sessionBinding}={}) {
  if(typeof authorize!=='function' || typeof execute!=='function' || typeof sessionBinding!=='function')
    throw new Error('NOTEBOOK_ADAPTER_UNBOUND');
  return Object.freeze({
    async invoke({operation,notebookId,requestId,approval,arguments:args={}}={}) {
      if(!Object.hasOwn(OPERATIONS,operation))throw new Error('NOTEBOOK_OPERATION_NOT_QUALIFIED');
      if(typeof notebookId!=='string'||!/^[a-f0-9-]{20,64}$/i.test(notebookId))
        throw new Error('NOTEBOOK_ID_INVALID');
      if(typeof requestId!=='string'||!/^[a-zA-Z0-9._:-]{8,128}$/.test(requestId))
        throw new Error('NOTEBOOK_REQUEST_ID_INVALID');
      if(args===null||typeof args!=='object'||Array.isArray(args))throw new Error('NOTEBOOK_ARGUMENTS_INVALID');
      const mutates=OPERATIONS[operation].mutates;
      if(operation==='notebook.prompt' && (typeof args.prompt!=='string'||!args.prompt.trim()||args.prompt.length>16000))
        throw new Error('NOTEBOOK_PROMPT_INVALID');
      if(operation==='notebook.studio.generate' && !STUDIO_TYPES.has(args.type))
        throw new Error('NOTEBOOK_ARTIFACT_TYPE_INVALID');
      const session=await sessionBinding({notebookId,operation,requestId});
      if(!session||session.verified!==true||session.notebookId!==notebookId)
        throw new Error('NOTEBOOK_SESSION_NOT_VERIFIED');
      // Approval tokens and credentials remain behind host/runtime; do not serialize them to GitHub.
      const authorized=await authorize({operation,notebookId,requestId,mutates,approval,session});
      if(authorized!==true)throw new Error('NOTEBOOK_ACTION_NOT_AUTHORIZED');
      if(mutates && (!approval||approval.authorized!==true||approval.notebookId!==notebookId))
        throw new Error('NOTEBOOK_OWNER_APPROVAL_REQUIRED');
      const result=await execute({operation,notebookId,requestId,arguments:args,session});
      if(!result||result.executed!==true)throw new Error('NOTEBOOK_EXECUTION_NOT_OBSERVED');
      return {
        capability:NOTEBOOK_CAPABILITY_VERSION,operation,notebookId,requestId,
        state:'EXECUTION_OBSERVED_UNVERIFIED',evidence:result.evidence??null,
        veritas:'NOT_RUN',receipt:'NOT_VERIFIED'
      };
    }
  });
}
