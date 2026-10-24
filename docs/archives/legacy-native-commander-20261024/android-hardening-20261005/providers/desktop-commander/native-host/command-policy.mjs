/*
REGION: LEEWAY.DEVICES.DESKTOP_COMMANDER
TAG: NATIVE_COMMANDER_COMMAND_ARGUMENT_BOUNDARY
WHO: Creator-authorized Agent Lee / Device Bridge
WHAT: Parse the existing bounded terminal capability into direct executable arguments.
WHEN: Before host execution; WHERE: native Commander provider.
WHY: A command prefix is not a safe shell allowlist; never pass arbitrary trailing shell syntax.
HOW: Narrow grammar, exact command families and real-path confinement; no shell interpolation.
LICENSE: MIT
*/
import fs from 'node:fs';
import path from 'node:path';
export function confinedPath(root, value) {
  if(typeof root!=='string'||typeof value!=='string'||!value)throw Error('PATH_OUTSIDE_LEEWAY_ROOT');
  const base=fs.realpathSync(root),resolved=fs.realpathSync(path.resolve(base,value));
  const relative=path.relative(base,resolved);
  if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep))throw Error('PATH_OUTSIDE_LEEWAY_ROOT');
  return resolved;
}
function tokens(command){
 if(typeof command!=='string'||!command.trim()||command.length>4096||/[;|&`$<>\r\n\x00]/.test(command))throw Error('COMMAND_CHAIN_NOT_ALLOWED');
 const re=/'([^']*)'|"([^"]*)"|([^\s'"]+)/g,out=[];let end=0;
 for(const match of command.matchAll(re)){
  if(command.slice(end,match.index).trim())throw Error('COMMAND_QUOTING_INVALID');
  out.push(match[1]??match[2]??match[3]);end=match.index+match[0].length;
 }
 if(command.slice(end).trim())throw Error('COMMAND_QUOTING_INVALID');
 return out;
}
export function nativeCommandPlan({command,root,cwd=root,humanConfirmed=false}){
 const working=confinedPath(root,cwd),parts=tokens(command),exe=parts.shift()?.toLowerCase();
 if(exe==='git'){
  const sub=parts[0],args=parts.slice(1);
  if(sub==='status'&&args.every(a=>['--short','--branch','--porcelain','-sb'].includes(a)))return{exe:'git',args:parts,cwd:working};
  if(sub==='rev-parse'&&args.length===1&&['HEAD','--show-toplevel','--show-prefix','--is-inside-work-tree'].includes(args[0]))return{exe:'git',args:parts,cwd:working};
  if(sub==='log'&&args.length<=3&&args.every(a=>a==='--oneline'||/^-[1-9][0-9]?$/.test(a)))return{exe:'git',args:['log','-20',...args],cwd:working};
 }
 if(exe==='node'&&['--check','--test'].includes(parts[0])&&parts.length>=2&&parts.length<=33){
  if(parts[0]==='--test'&&humanConfirmed!==true)throw Error('COMMANDER_TEST_EXECUTION_APPROVAL_REQUIRED');
  const files=parts.slice(1).map(file=>{if(!/\.(mjs|cjs|js)$/.test(file)||file.includes('*'))throw Error('EXPLICIT_SCRIPT_PATH_REQUIRED');return confinedPath(root,path.resolve(working,file));});
  return{exe:process.execPath,args:[parts[0],...files],cwd:working};
 }
 throw Error('COMMAND_NOT_ALLOWLISTED_USE_TYPED_FILES_CAPABILITY');
}
