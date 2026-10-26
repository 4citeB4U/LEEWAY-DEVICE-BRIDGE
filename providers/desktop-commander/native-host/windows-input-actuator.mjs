/* LeeWay Device Bridge Windows actuator candidate.
   Fail closed unless explicitly enabled by trusted host with an approved request.
   No shell execution, no network listener, no direct UI invocation. */
import {planWindowsInput} from './windows-input-plan.mjs';
export async function executeWindowsInput(request,{bounds,armed=false,operator,observe}={}){
 const decision=planWindowsInput(request,bounds);
 if(!decision.admitted)return {state:'DENIED',reason:decision.reason};
 if(!armed)return {state:'NOT_EXECUTED',reason:'ACTUATOR_NOT_ARMED',plan:decision};
 if(!operator||typeof operator.execute!=='function'||typeof observe!=='function')return {state:'DENIED',reason:'TRUSTED_ADAPTER_UNBOUND'};
 if(request.cancelled)return {state:'DENIED',reason:'CANCELLED'};
 // Explicitly restrict the first real-actuator gate to pointer motion.
 if(request.action!=='move')return {state:'DENIED',reason:'ACTION_NOT_YET_QUALIFIED'};
 const before=await observe();
 if(!before||before.ok!==true)return {state:'DENIED',reason:'PRE_OBSERVATION_REQUIRED'};
 const result=await operator.execute({action:'move',x:request.x,y:request.y});
 if(!result||result.ok!==true)return {state:'FAILED',reason:'ACTUATOR_FAILED'};
 const after=await observe();
 const matched=after?.ok===true&&after.x===request.x&&after.y===request.y;
 return {state:matched?'EXECUTED_OBSERVED':'UNVERIFIED',requestId:request.requestId,action:'move',preState:before,postState:after,verified:matched};
}
