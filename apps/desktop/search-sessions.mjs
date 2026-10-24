/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.DESKTOP
TAG: LEEWAY.DESKTOP_COMMANDER_PARITY_PAGED_SEARCH_V1
WHO: LeeWay Industries, authorized Device Bridge maintainer.
WHAT: Start, page, stop, and enumerate bounded filename/content searches.
WHEN: 2026-10-24; WHERE: apps/desktop/search-sessions.mjs.
WHY: Immediate search limits are not equivalent to Desktop Commander search sessions.
HOW: Opaque IDs, cooperative cancellation, workspace realpath, no symlink traversal.
AUTHORITY: Adapter review source only; every MCP call still traverses guarded Bridge.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const LIMITS={results:512,entries:5000,contentBytes:8*1024*1024,depth:8,milliseconds:15000,active:4,all:16};
const TERMINAL=new Set(['COMPLETE','LIMIT_REACHED','CANCELLED','FAILED']);
export class DesktopSearchSessions{
  constructor(adapter){this.adapter=adapter;this.searches=new Map();}
  prune(){
    const now=Date.now();
    for(const [id,s] of this.searches){
      if(TERMINAL.has(s.state)&&s.endedAt&&now-s.endedAt>300000)this.searches.delete(id);
    }
  }
  find(id){this.prune();const s=this.searches.get(id);if(!s)throw Error('UNKNOWN_SEARCH');return s;}
  view(s){return {searchId:s.id,state:s.state,mode:s.mode,path:s.relative,
    query:s.query,createdAt:s.createdAt,matched:s.matches.length,
    scannedEntries:s.scannedEntries,scannedBytes:s.scannedBytes,
    truncated:s.state==='LIMIT_REACHED',error:s.error||null};}
  async start(args){
    this.prune();
    if(this.searches.size>=LIMITS.all||[...this.searches.values()].filter(x=>x.state==='RUNNING').length>=LIMITS.active)
      throw Error('SEARCH_SESSION_CAPACITY_REACHED');
    const base=await this.adapter.safeDirectory(args.path);
    const s={id:randomUUID(),state:'RUNNING',mode:args.mode,query:args.query,
      queryLower:args.query.toLowerCase(),relative:args.path,base,matches:[],
      scannedEntries:0,scannedBytes:0,createdAt:new Date().toISOString(),
      startedAt:Date.now(),endedAt:null,error:null,cancelled:false};
    this.searches.set(s.id,s);
    Promise.resolve().then(()=>this.scan(s)).catch(()=>{
      s.error='SEARCH_SCAN_FAILED';s.state='FAILED';s.endedAt=Date.now();
    });
    return this.view(s);
  }
  async scan(s){
    const walk=async(dir,depth)=>{
      if(s.cancelled)return;
      if(depth>LIMITS.depth){s.state='LIMIT_REACHED';return;}
      const entries=await fs.readdir(dir,{withFileTypes:true});
      entries.sort((a,b)=>a.name.localeCompare(b.name));
      for(const entry of entries){
        if(s.cancelled||s.state==='LIMIT_REACHED')return;
        if(Date.now()-s.startedAt>LIMITS.milliseconds||
           s.scannedEntries>=LIMITS.entries||s.matches.length>=LIMITS.results){
          s.state='LIMIT_REACHED';return;
        }
        s.scannedEntries++;
        const full=path.join(dir,entry.name);
        const stat=await fs.lstat(full).catch(()=>null);
        if(!stat||stat.isSymbolicLink())continue;
        const relative=path.relative(s.base,full);
        if(relative.startsWith('..')||path.isAbsolute(relative))continue;
        if(s.mode==='name'&&entry.name.toLowerCase().includes(s.queryLower)){
          s.matches.push({path:relative,type:stat.isDirectory()?'directory':stat.isFile()?'file':'other'});
        }
        if(stat.isDirectory()){await walk(full,depth+1);continue;}
        if(s.mode!=='content'||!stat.isFile()||stat.nlink!==1||stat.size>65536)continue;
        if(s.scannedBytes+stat.size>LIMITS.contentBytes){s.state='LIMIT_REACHED';return;}
        s.scannedBytes+=stat.size;
        const buffer=await fs.readFile(full);
        if(buffer.includes(0))continue;
        const contents=buffer.toString('utf8');
        const rows=contents.split(/\r?\n/);
        for(let index=0;index<rows.length;index++){
          if(s.cancelled||s.matches.length>=LIMITS.results){s.state='LIMIT_REACHED';return;}
          if(rows[index].toLowerCase().includes(s.queryLower))
            s.matches.push({path:relative,line:index+1,excerpt:rows[index].slice(0,200)});
        }
      }
    };
    await walk(s.base,0);
    if(s.cancelled)s.state='CANCELLED';
    else if(s.state==='RUNNING')s.state='COMPLETE';
    s.endedAt=Date.now();
  }
  next(args){
    const s=this.find(args.searchId);
    if(args.offset>s.matches.length)throw Error('SEARCH_PAGE_OUTSIDE_RESULT');
    const items=s.matches.slice(args.offset,args.offset+args.limit);
    const nextOffset=args.offset+items.length;
    return {...this.view(s),results:items,nextOffset,
      moreAvailable:nextOffset<s.matches.length,
      waiting:s.state==='RUNNING'&&nextOffset>=s.matches.length};
  }
  stop(args){
    const s=this.find(args.searchId);
    if(s.state==='RUNNING'){s.cancelled=true;s.state='CANCELLED';s.endedAt=Date.now();}
    return this.view(s);
  }
  list(args){
    this.prune();
    const all=[...this.searches.values()];
    return {searches:all.slice(0,args.limit).map(s=>this.view(s)),
      total:all.length,truncated:all.length>args.limit};
  }
}

