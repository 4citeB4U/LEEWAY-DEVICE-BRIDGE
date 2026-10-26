/* LeeWay Device Bridge — fail-closed, device-neutral Agent Lee cursor projection.
   This module does NOT execute mouse/touch actions. It authorizes rendering only
   after a correlated real device actuator result and independent observation. */
import crypto from 'node:crypto';
const id=/^[A-Za-z0-9][A-Za-z0-9._:-]{11,127}$/;
const actions=new Set(['move','click','double-click','scroll','type','tap','swipe']);
export function admitCursorEvent(event,execution,observation){
  const deny=reason=>({state:'HIDDEN',reason});
  if(!event||!execution||!observation)return deny('EVIDENCE_REQUIRED');
  if(event.agentId!=='agent-lee'||event.authority!=='4citeB4U/LEEWAY-DEVICE-BRIDGE')return deny('AUTHORITY_MISMATCH');
  if(!id.test(event.requestId||'')||!id.test(event.actionId||''))return deny('IDENTITY_INVALID');
  if(!actions.has(event.action)||!['pc','android'].includes(event.device))return deny('ACTION_INVALID');
  if(event.ownerApproved!==true||event.cancelled===true)return deny('OWNER_APPROVAL_OR_CANCELLATION');
  if(execution.requestId!==event.requestId||execution.actionId!==event.actionId||execution.device!==event.device)return deny('EXECUTION_CORRELATION_INVALID');
  if(execution.state!=='EXECUTED'||execution.provider!=='LEEWAY_DEVICE_BRIDGE'||typeof execution.receiptHash!=='string'||!/^[a-f0-9]{64}$/i.test(execution.receiptHash))return deny('ACTUATOR_NOT_VERIFIED');
  if(observation.requestId!==event.requestId||observation.actionId!==event.actionId||observation.postStateVerified!==true||observation.receiptHash!==execution.receiptHash)return deny('POST_STATE_UNVERIFIED');
  if(['move','click','double-click','tap','swipe'].includes(event.action)&&(!Number.isFinite(event.x)||!Number.isFinite(event.y)||event.x<0||event.y<0||event.x>32768||event.y>32768))return deny('COORDINATES_INVALID');
  if(!Number.isFinite(event.timestamp)||Math.abs(Date.now()-event.timestamp)>5000)return deny('EVENT_EXPIRED');
  return {state:'SHOW',agentId:'agent-lee',device:event.device,requestId:event.requestId,actionId:event.actionId,action:event.action,x:event.x??null,y:event.y??null,receiptHash:execution.receiptHash,observed:true};
}
