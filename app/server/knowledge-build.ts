import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {Store,contained,hash,now} from './store.js';
import {localFramework} from './framework.js';
import {textbookQuality} from './textbook-quality.js';

export const relationKinds=['belongs_to','prerequisite','next','defines','uses','proves','example_of','exercise_of','confusable_with','derived_from'] as const;
export const learningFocus=['concept','definition','symbol','condition','formula','property','theorem','proof_goal','proof_strategy','proof_step','hidden_step','example','method','exercise','diagram','remark','connection'] as const;
const phases=['全文解析','内容归属与跨页合并','教材知识层','教学粒度与符号上下文','知识关联','孤立内容检查','深度教学与独立审核','发布检查'];
function target(store:Store,workspace:string){store.workspace(workspace);return contained(store.root,`data/workspaces/${workspace}/knowledge/full-book-build.json`);}
export function readBuild(store:Store,workspace:string){const p=target(store,workspace);return existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;}
export function saveBuild(store:Store,workspace:string,state:any){const p=target(store,workspace);mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p+'.tmp',JSON.stringify({...state,updated:now()},null,2));renameSync(p+'.tmp',p);}
export function buildSourceKnowledge(store:Store,workspace:string){
 const pages=store.all('SELECT idx,status,text FROM pages WHERE workspace=? ORDER BY idx',workspace);
 const visionFacts=store.facts(workspace).filter(f=>f.source.method==='vision'&&!f.source.referenceId&&(f.source.origin!=='user'||f.status==='VERIFIED'));
 const sourceHash=hash(JSON.stringify({pages,vision:visionFacts.map(f=>({id:f.id,status:f.status,content:f.content,latex:f.latex,source:f.source}))}));const prior=readBuild(store,workspace);
 if(prior?.sourceHash===sourceHash&&prior.policy==='V7.1-r3')return prior;
 const framework=localFramework(store,workspace);
 const nodes:any[]=[];const edges:any[]=[];const exceptions:any[]=[];const entryIds:string[]=[];
 const nodeId=(anchor:string)=>'kb-'+hash(workspace+':'+anchor).slice(0,24);
 const addEntries=(entries:any[],parent:string,chapter:string)=>{let previous:string|null=null;let statement:string|null=null;
  for(const entry of entries.filter(e=>e.body?.trim())){
   entryIds.push(entry.id);const quality=textbookQuality(entry.body,{pageStatus:entry.sourcePages.some((p:number)=>pages.find(row=>row.idx===p)?.status!=='EXTRACTED')?'NEEDS_VERIFY':'EXTRACTED',conflicts:entry.issues??[]});
   const id=nodeId(entry.id);const symbols=[...new Set(quality.formatted.match(/\\(?:varepsilon|epsilon|delta|forall|exists|in|mathbb\{[A-Z]\})\b|\b[A-Za-z](?:_[A-Za-z]|_\{[^}]+\})?/g)??[])];
   nodes.push({id,layer:'textbook',kind:entry.kind,title:entry.title,chapter,content:quality.formatted,status:quality.status,issues:quality.issues,symbols:symbols.map(symbol=>({symbol,meaning:null,status:'CONTEXT_REQUIRED'})),source:{textbook:workspace,entryId:entry.id,quote:entry.body,before:entries[entries.indexOf(entry)-1]?.body.slice(-160)??'',after:entries[entries.indexOf(entry)+1]?.body.slice(0,160)??'',internalPdfIndices:entry.sourcePages},crossPage:entry.sourcePages.length>1});
   edges.push({from:id,to:parent,kind:'belongs_to',layer:'textbook'});if(previous)edges.push({from:previous,to:id,kind:'next',layer:'textbook'});
   if(['定义','定理','推论','公理'].includes(entry.kind))statement=id;
   // Adjacent explicit proof is the only proof link inferred locally; semantic links come from reviewed AI structure.
   if(entry.kind==='证明'&&statement)edges.push({from:id,to:statement,kind:'proves',layer:'ai_structure',basis:'相邻教材命题与显式证明',status:'STRUCTURE_CANDIDATE'});
   for(const issue of quality.issues)exceptions.push({node:id,entryId:entry.id,reason:issue,status:'NEEDS_VERIFY'});previous=id;
  }
 };
 const group=(anchor:string,title:string,parent:string|null,entries:any[],chapter:string)=>{const id=nodeId(anchor);nodes.push({id,layer:'navigation',kind:'目录',title,chapter,status:'TEXTBOOK_STRUCTURE'});if(parent)edges.push({from:id,to:parent,kind:'belongs_to',layer:'textbook'});addEntries(entries,id,chapter);return id;};
 group('introduction',framework.introduction.title,null,framework.introduction.entries,'教材导言');
 for(const c of framework.chapters){const chapter=`第${c.number}章 ${c.title}`;const cid=group('chapter:'+c.number,c.title,null,c.entries,chapter);for(const s of c.sections){const sid=group('section:'+s.number,s.title,cid,s.entries,chapter);for(const t of s.topics)group('topic:'+t.number,t.title,sid,t.entries,chapter);}}
 for(const fact of visionFacts){const content=fact.content+(fact.latex&&!fact.content.includes(fact.latex)?'\n\n$$'+fact.latex+'$$':'');const quality=textbookQuality(content,{conflicts:fact.source.conflicts??[]});const id=nodeId(fact.id);nodes.push({id,layer:'textbook',kind:fact.kind,title:fact.title,chapter:fact.chapter,content:quality.formatted,status:fact.status==='VERIFIED'?'VERIFIED':quality.status,issues:quality.issues,symbols:[],source:{textbook:workspace,entryId:fact.id,quote:fact.content,internalPdfIndices:[fact.source.pdfIndex],method:'vision'},crossPage:false});entryIds.push(fact.id);for(const reason of quality.issues)exceptions.push({node:id,entryId:fact.id,reason,status:'NEEDS_VERIFY'});}
 const sourceNodes=nodes.filter(n=>n.layer==='textbook');const represented=new Set(sourceNodes.map(n=>n.source.entryId));const orphanIds=entryIds.filter(id=>!represented.has(id));
 const missingPages=Array.from({length:store.workspace(workspace).pages},(_,i)=>i+1).filter(idx=>!pages.some(p=>p.idx===idx));
 const unreadablePages=pages.filter(p=>(!p.text.trim()||p.status!=='EXTRACTED')&&!visionFacts.some(f=>f.source.pdfIndex===p.idx&&(f.status==='VERIFIED'||(!(f.source.conflicts??[]).length&&sourceNodes.find(n=>n.source.entryId===f.id)?.status!=='NEEDS_VERIFY')))).map(p=>p.idx);
 for(const page of [...new Set([...missingPages,...unreadablePages])])exceptions.push({internalPdfIndex:page,reason:'页面正文尚未可靠识别，需要视觉通道补全。',status:'NEEDS_VERIFY'});
 const coverage={pages:pages.length,expectedPages:store.workspace(workspace).pages,textLines:framework.coverage.textLines,capturedLines:framework.coverage.capturedLines,sourceBlocks:sourceNodes.length,accepted:sourceNodes.filter(n=>n.status==='TEXTBOOK_ACCEPTED').length,localExceptions:sourceNodes.filter(n=>n.status==='NEEDS_VERIFY').length,orphanIds,missingPages,unreadablePages,crossPageBlocks:sourceNodes.filter(n=>n.crossPage).length,complete:framework.coverage.complete&&!orphanIds.length&&!missingPages.length&&!unreadablePages.length};
 const state={format:1,policy:'V7.1-r3',workspace,target:'FULL_BOOK',sourceHash,created:prior?.created??now(),status:coverage.complete?'AWAITING_TEACHING':'SOURCE_PARTIAL',phase:'教材知识层',phases:phases.map((name,i)=>({name,status:i<3?'DONE':i<6?'SOURCE_ONLY':'PENDING'})),nodes,edges,exceptions,coverage,notice:'自动纳入教材知识层表示识别检查通过，不代表人工核验。正文、AI结构与教学、个人记录、外部研究分别保存。提取覆盖率不能代替教学质量验收。'};
 // Local materialization is independent of provider credentials and never edits original facts or personal records.
 saveBuild(store,workspace,state);return state;
}
export function teachingNodeId(workspace:string,sourceIds:string[],focus:string,occurrence:number){return 'teach-'+hash(workspace+':'+[...sourceIds].sort().join(',')+':'+focus+':'+occurrence).slice(0,24);}
export function attachTeachingGraph(store:Store,workspace:string,sourceGraph:any,units:any[],lessons:any){
 const nodes=[...sourceGraph.nodes];const edges=[...sourceGraph.edges];const required=new Set<string>();const taught=new Set<string>();let reviewedUnits=0;
 for(const unit of units){unit.source.forEach((s:any)=>required.add(s.id));const lesson=lessons[unit.id];if(lesson?.format!==2||lesson.policy!=='V7.1'||lesson.sourceHash!==unit.sourceHash||lesson.status!=='CANDIDATE_REVIEWED')continue;reviewedUnits++;
  const occurrences=new Map<string,number>();let previous:string|null=null;
  for(const concept of lesson.concepts){const focus=concept.focus??'concept';const key=[...concept.sourceIds].sort().join(',')+':'+focus;const occurrence=occurrences.get(key)??0;occurrences.set(key,occurrence+1);const id=teachingNodeId(workspace,concept.sourceIds,focus,occurrence);
   nodes.push({id,layer:'ai_teaching',kind:focus,title:concept.title,unitId:unit.id,content:concept.body,status:'CANDIDATE_REVIEWED',sourceIds:concept.sourceIds,symbols:concept.symbols??[]});
   for(const sourceId of concept.sourceIds){taught.add(sourceId);const source=sourceGraph.nodes.find((n:any)=>n.source?.entryId===sourceId);if(source)edges.push({from:id,to:source.id,kind:'derived_from',layer:'ai_structure',status:'REVIEWED'});}
   for(const relation of concept.relations??[]){const dest=sourceGraph.nodes.find((n:any)=>n.source?.entryId===relation.targetSourceId);if(dest)edges.push({from:id,to:dest.id,kind:relation.kind,layer:'ai_structure',status:'REVIEWED',reason:relation.reason});}
   if(previous)edges.push({from:previous,to:id,kind:'next',layer:'ai_structure',status:'REVIEWED'});previous=id;
  }
 }
 const uncoveredSourceIds=[...required].filter(id=>!taught.has(id));return {...sourceGraph,nodes,edges,teachingCoverage:{reviewedUnits,totalUnits:units.length,teachingNodes:nodes.filter(n=>n.layer==='ai_teaching').length,sourceBlocks:required.size,coveredSourceBlocks:taught.size,uncoveredSourceIds,complete:reviewedUnits===units.length&&required.size>0&&!uncoveredSourceIds.length},relationKinds};
}
