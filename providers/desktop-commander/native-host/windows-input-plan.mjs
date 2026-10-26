/* REGION LEEWAY.DEVICE.BRIDGE — bounded Windows cursor observation/plan only.
   No SendInput/SetCursorPos, no OS mutation. Execution must be separately admitted. */
import {execFileSync} from 'node:child_process';
const actionSet=new Set(['move','click','double-click','scroll','type']);
export function planWindowsInput(value, bounds){
 const deny=reason=>({admitted:false,reason});
 if(!value||typeof value!=='object'||!actionSet.has(value.action))return deny('ACTION_NOT_ALLOWED');
 if(value.ownerApproved!==true||value.cancelled===true)return deny('OWNER_APPROVAL_REQUIRED');
 if(typeof value.requestId!=='string'||!/^[-a-zA-Z0-9:_.]{12,128}$/.test(value.requestId))return deny('REQUEST_ID_REQUIRED');
 if(!bounds||!Number.isInteger(bounds.width)||!Number.isInteger(bounds.height)||bounds.width<1||bounds.height<1)return deny('BOUNDS_UNAVAILABLE');
 if(['move','click','double-click'].includes(value.action)&&(!Number.isInteger(value.x)||!Number.isInteger(value.y)||value.x<0||value.y<0||value.x>=bounds.width||value.y>=bounds.height))return deny('POINT_OUT_OF_BOUNDS');
 if(value.action==='scroll'&&(!Number.isInteger(value.delta)||Math.abs(value.delta)>720))return deny('SCROLL_DELTA_INVALID');
 if(value.action==='type'&&(typeof value.text!=='string'||!value.text||value.text.length>256))return deny('TEXT_INVALID');
 return {admitted:true,executionState:'PLAN_ONLY_NOT_EXECUTED',device:'pc',requestId:value.requestId,action:value.action,point:['move','click','double-click'].includes(value.action)?{x:value.x,y:value.y}:null};
}
