/*
LEEWAY HEADER — DO NOT REMOVE
REGION: LEEWAY.DEVICE.BRIDGE.AGENT_SKILLS
TAG: LEEWAY.SKILLS_CANONICAL_READONLY_ADAPTER_V1
WHO: LeeWay Industries; sovereign Agent Lee skills from LeeWay-Agent-Skills.
WHAT: Read-only catalog/index of existing portable SKILL.md instructions.
WHEN: 2026-10-24; WHERE: apps/desktop/skills-catalog.mjs.
WHY: Reuse canonical Agent Skills, never fork skill execution or create shadow skill authority.
HOW: Path-constrained discovery of SKILL.md, symlink denial, SHA-256 provenance,
     expected-digest readback, exact skill-id namespace and bounded metadata.
AUTHORITY: REFERENCE_ONLY. Executing skill workflows requires separately governed runtime.
LICENSE: MIT
*/
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const MAX_DEPTH=10,MAX_FILES=40000,MAX_SKILL_BYTES=131072;
const isSlug=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9._\/-]*$/.test(x)&&
  x.length<=240&&!x.split('/').some(part=>part==='.'||part==='..'||!part);
function meta(bytes,fallback){
  const content=bytes.toString('utf8');
  const lines=content.replace(/\r\n/g,'\n').split('\n');
  const result={name:fallback,description:''};
  if(lines[0]?.trim()==='---'){
    const end=lines.findIndex((line,index)=>index>0&&line.trim()==='---');
    if(end>0 && end<120){
      for(const line of lines.slice(1,end)){
        const match=line.match(/^(name|description):\s*(.+)$/i);
        if(match){
          const val=match[2].trim().replace(/^['"]|['"]$/g,'').slice(0,350);
          if(match[1].toLowerCase()==='name')result.name=val;
          else result.description=val;
        }
      }
    }
  }
  return result;
}
export class LeeWaySkillsCatalog{
  constructor(skillsRoot){
    if(!skillsRoot||!path.isAbsolute(skillsRoot))throw Error('SKILLS_ROOT_ABSOLUTE_REQUIRED');
    this.root=path.resolve(skillsRoot);
  }
  async rootCheck(){
    const st=await fs.lstat(this.root);
    if(!st.isDirectory()||st.isSymbolicLink())throw Error('SKILLS_ROOT_UNTRUSTED');
    return this.root;
  }
  async scan(){
    await this.rootCheck();
    const found=[];
    let visited=0;
    const walk=async(dir,segments)=>{
      if(segments.length>MAX_DEPTH)throw Error('SKILLS_DEPTH_LIMIT');
      const entries=await fs.readdir(dir,{withFileTypes:true});
      for(const entry of entries){
        if(entry.isSymbolicLink())continue;
        if(entry.name==='node_modules'||entry.name==='.git')continue;
        const next=path.join(dir,entry.name);
        visited++;
        if(visited>MAX_FILES)throw Error('SKILLS_SCAN_LIMIT');
        if(entry.isDirectory()){await walk(next,[...segments,entry.name]);continue;}
        if(entry.name!=='SKILL.md'||!entry.isFile()||segments.length<1)continue;
        const id=segments.join('/').toLowerCase();
        if(!isSlug(id))continue;
        const st=await fs.lstat(next);
        if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>MAX_SKILL_BYTES)continue;
        const data=await fs.readFile(next);
        const details=meta(data,segments.at(-1));
        found.push({skillId:id,...details,sha256:sha(data),bytes:data.length,source:'LEEWAY_AGENT_SKILLS_SKILL_MD',executionAuthorized:false});
      }
    };
    await walk(this.root,[]);
    return found.sort((a,b)=>a.skillId.localeCompare(b.skillId));
  }
  async list(args){
    const all=await this.scan();
    const query=(args.query||'').toLowerCase();
    const hits=query?all.filter(e=>(e.skillId+' '+e.name+' '+e.description).toLowerCase().includes(query)):all;
    return {source:'LEEWAY_AGENT_SKILLS_EXISTING_REPOSITORY',catalogOnly:true,
      total:hits.length,skills:hits.slice(args.offset,args.offset+args.limit),
      nextOffset:Math.min(hits.length,args.offset+args.limit),
      moreAvailable:args.offset+args.limit<hits.length};
  }
  async read(args){
    if(!isSlug(args.skillId))throw Error('SKILL_ID_INVALID');
    await this.rootCheck();
    const parts=args.skillId.split('/');
    let dir=this.root;
    for(const segment of parts){
      dir=path.join(dir,segment);
      const st=await fs.lstat(dir);
      if(!st.isDirectory()||st.isSymbolicLink())throw Error('SKILL_PATH_UNTRUSTED');
    }
    const file=path.join(dir,'SKILL.md');
    const st=await fs.lstat(file);
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>MAX_SKILL_BYTES)
      throw Error('SKILL_FILE_UNTRUSTED');
    const bytes=await fs.readFile(file),hash=sha(bytes);
    if(args.expectedSha256!==hash)throw Error('SKILL_SOURCE_CHANGED');
    return {skillId:args.skillId,sha256:hash,bytes:bytes.length,
      referenceOnly:true,workflowExecuted:false,content:bytes.toString('utf8')};
  }
}
