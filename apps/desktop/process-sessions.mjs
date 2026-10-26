/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.DESKTOP_COMMANDER_PARITY_INTERACTIVE_SESSIONS_V1
WHO: LeeWay Industries, creator-authorized maintainer.
WHAT: Bounded interactive subprocess lifecycle, paged output, input and stop.
WHEN: 2026-10-24; WHERE: apps/desktop/process-sessions.mjs.
WHY: The existing job API cannot support interactive Desktop Commander sessions.
HOW: Existing allowed executables, workspace CWD, opaque IDs, fixed output ring, timed STOP.
AUTHORITY: Adapter only; every MCP operation still requires governed Bridge admission.
LICENSE: MIT
*/
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const MAX_ACTIVE=8,MAX_RETAINED=262144,MAX_INPUT=32768,RETAIN_MS=300000;
const STATES=new Set(['RUNNING','STARTING','STOPPING']);
export class DesktopSessions{
  constructor(adapter){this.adapter=adapter;this.sessions=new Map();}
  prune(){
    const now=Date.now();
    for(const [id,s] of this.sessions){
      if(!STATES.has(s.state)&&s.endedAt&&now-s.endedAt>RETAIN_MS)this.sessions.delete(id);
    }
  }
  find(id){this.prune();const s=this.sessions.get(id);if(!s)throw Error('UNKNOWN_SESSION');return s;}
  view(s){return {sessionId:s.id,pid:s.pid,state:s.state,startedAt:s.startedAt,
    endedAt:s.endedAt||null,exitCode:s.exitCode,signal:s.signal||null,
    stdoutProduced:s.stdoutProduced,stderrProduced:s.stderrProduced};}
  collect(s,stream,chunk){
    const key=stream+'Buffer';
    const next=Buffer.concat([s[key],chunk]);
    s[key]=next.length>MAX_RETAINED?next.subarray(next.length-MAX_RETAINED):next;
    s[stream+'Produced']+=chunk.length;
  }
  async start(args){
    this.prune();
    if([...this.sessions.values()].filter(s=>STATES.has(s.state)).length>=MAX_ACTIVE)
      throw Error('SESSION_CAPACITY_REACHED');
    const cwd=await this.adapter.safeDirectory(args.cwd);
    const child=spawn(this.adapter.executableName(args.executable),args.arguments,
      {cwd,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    const s={id:randomUUID(),child,pid:child.pid||null,state:'STARTING',
      startedAt:new Date().toISOString(),endedAt:null,exitCode:null,signal:null,
      stdoutBuffer:Buffer.alloc(0),stderrBuffer:Buffer.alloc(0),
      stdoutProduced:0,stderrProduced:0,timer:null};
    this.sessions.set(s.id,s);
    child.stdout.on('data',chunk=>this.collect(s,'stdout',chunk));
    child.stderr.on('data',chunk=>this.collect(s,'stderr',chunk));
    child.on('close',(code,signal)=>{
      clearTimeout(s.timer);
      if(s.state!=='TIMED_OUT')s.state='EXITED';
      s.exitCode=Number.isInteger(code)?code:null;
      s.signal=signal||null;s.endedAt=Date.now();
      s.child=null;
    });
    child.on('error',()=>{
      s.state='SPAWN_FAILED';s.endedAt=Date.now();clearTimeout(s.timer);
    });
    try{
      await new Promise((resolve,reject)=>{
        child.once('spawn',resolve);
        child.once('error',()=>reject(Error('SESSION_SPAWN_FAILED')));
      });
    }catch{
      this.sessions.delete(s.id);
      throw Error('SESSION_SPAWN_FAILED');
    }
    s.state='RUNNING';
    s.timer=setTimeout(()=>{
      if(!s.child)return;
      s.state='TIMED_OUT';s.child.kill();
    },args.timeoutMs);
    s.timer.unref?.();
    return this.view(s);
  }
  read(args){
    const s=this.find(args.sessionId);
    const page=(stream,offset)=>{
      const retained=s[stream+'Buffer'],produced=s[stream+'Produced'];
      const first=produced-retained.length;
      if(!Number.isSafeInteger(offset)||offset<first||offset>produced)
        throw Error('SESSION_OUTPUT_CURSOR_EXPIRED');
      const from=offset-first;
      const bytes=retained.subarray(from,from+args.maxBytes);
      return {base64:bytes.toString('base64'),text:bytes.toString('utf8'),
        fromOffset:offset,nextOffset:offset+bytes.length,produced,retainedFrom:first,
        moreAvailable:offset+bytes.length<produced};
    };
    return {...this.view(s),stdout:page('stdout',args.stdoutOffset),
      stderr:page('stderr',args.stderrOffset)};
  }
  async input(args){
    const s=this.find(args.sessionId);
    if(s.state!=='RUNNING'||!s.child||s.child.stdin.destroyed)
      throw Error('SESSION_NOT_WRITABLE');
    const content=args.text+(args.appendNewline?'\n':'');
    const payload=Buffer.from(content,'utf8');
    if(payload.length<1||payload.length>MAX_INPUT)throw Error('SESSION_INPUT_OUT_OF_BOUNDS');
    if(s.child.stdin.writableLength>MAX_INPUT)throw Error('SESSION_BACKPRESSURE');
    await new Promise((resolve,reject)=>{
      s.child.stdin.write(payload,error=>error?reject(Error('SESSION_INPUT_FAILED')):resolve());
    });
    if(args.closeInput)s.child.stdin.end();
    return {...this.view(s),acceptedBytes:payload.length,inputClosed:Boolean(args.closeInput)};
  }
  stop(args){
    const s=this.find(args.sessionId);
    if(s.child&&STATES.has(s.state)){
      s.state='STOPPING';s.child.kill();
    }
    return this.view(s);
  }
  list(args){
    this.prune();
    return {sessions:[...this.sessions.values()].slice(0,args.limit).map(s=>this.view(s)),
      total:this.sessions.size,truncated:this.sessions.size>args.limit};
  }
}
