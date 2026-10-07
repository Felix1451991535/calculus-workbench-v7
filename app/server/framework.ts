import {writeFileSync,renameSync} from 'node:fs';
import {Store,contained,now,hash} from './store.js';
import {textbookHeading} from './pdf.js';
import {textbookQuality} from './textbook-quality.js';

const cache=new WeakMap<Store,Map<string,{key:string;value:any}>>();
export function localFramework(store:Store,workspace:string){
 const book=store.workspace(workspace);const facts=store.facts(workspace);const pages=store.all('SELECT idx,text,status FROM pages WHERE workspace=? ORDER BY idx',workspace);
 const key=hash(JSON.stringify([pages,facts.map(f=>[f.id,f.kp])]));const existing=cache.get(store)?.get(workspace);if(existing?.key===key)return existing.value;
 const chapters:any[]=[];const introduction:any={title:'引言与教材整理说明',entries:[]};let chapter:any=null,section:any=null,topic:any=null,entry:any=null;let textLines=0,capturedLines=0;
 const chinese:Record<string,number>={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
 const entries=()=>topic?.entries??section?.entries??chapter?.entries??introduction.entries;
 function append(line:string,page:number,index:number){
  const clean=line.trim();const label=clean.match(/^(定义|定理|推论|例)\s*(\d+(?:\.\d+)*)/);const other=clean.match(/^(证明|习题|练习|解|注)(?=[:：\s]|$)/);const numbered=clean.match(/^\d+[.．、]\s*[^。？；]+$/);
  const begin=label||other||(numbered&&clean.length<=45&&!/[\$\\]/.test(clean));
  if(!entry||begin){const kind=label?(label[1]==='例'?'例题':label[1]):other?other[1]:begin?'条目':'正文';const title=label?label[1]+' '+label[2]:other?clean.slice(0,60):begin?clean:'教材正文';const anchor=facts.find(f=>!f.source.referenceId&&f.source.pdfIndex===page&&f.content.includes(clean));entry={id:`p${page}-l${index}`,kind,title,body:'',sourcePages:[],kp:anchor?.kp??null};entries().push(entry);}
  entry.body+=(entry.body?'\n':'')+line;if(!entry.sourcePages.includes(page))entry.sourcePages.push(page);capturedLines++;
 }
 for(const page of pages){const lines=page.text.split('\n');for(let index=0;index<lines.length;index++){
  const line=lines[index];textLines++;const clean=line.trim();const heading=textbookHeading(clean);const root=heading?.match(/^第([^章节]+)[章节]\s+(.+)$/);
  if(root){const number=chinese[root[1]]??Number(root[1]);if(Number.isInteger(number)){chapter={number,title:root[2],sourceHeading:line,sourcePage:page.idx,sections:[],entries:[],status:'NEEDS_VERIFY'};chapters.push(chapter);section=null;topic=null;entry=null;capturedLines++;continue;}}
  const match=heading?.match(/^(\d+\.\d+(?:\.\d+)?)\s+(.+)$/);
  if(match&&chapter&&Number(match[1].split('.')[0])===chapter.number){const parts=match[1].split('.');if(parts.length===2){section={number:match[1],title:match[2],sourceHeading:line,sourcePage:page.idx,topics:[],entries:[],kp:null};chapter.sections.push(section);topic=null;entry=null;capturedLines++;continue;}if(section&&parts.slice(0,2).join('.')===section.number){topic={number:match[1],title:match[2],sourceHeading:line,sourcePage:page.idx,entries:[]};section.topics.push(topic);entry=null;capturedLines++;continue;}}
  append(line,page.idx,index);
 }}
 let totalEntries=introduction.entries.length;for(const c of chapters){totalEntries+=c.entries.length;for(const s of c.sections){totalEntries+=s.entries.length;for(const t of s.topics)totalEntries+=t.entries.length;s.kp=s.entries.find((e:any)=>e.kp)?.kp??s.topics.flatMap((t:any)=>t.entries).find((e:any)=>e.kp)?.kp??null;}}
 const allEntries=[...introduction.entries,...chapters.flatMap(c=>[...c.entries,...c.sections.flatMap((s:any)=>[...s.entries,...s.topics.flatMap((t:any)=>t.entries)])])];
 for(const e of allEntries){const conflicts:string[]=[];const indices=e.sourcePages as number[];if(indices.some((p,i)=>i>0&&p!==indices[i-1]+1))conflicts.push('跨页原文之间存在未处理的页面，不能确认拼接边界。');const quality=textbookQuality(e.body,{pageStatus:indices.some(p=>pages.find(row=>row.idx===p)?.status!=='EXTRACTED')?'NEEDS_VERIFY':'EXTRACTED',conflicts});e.status=quality.status;e.issues=quality.issues;}
 const pending=allEntries.filter(e=>e.body.trim()&&e.status==='NEEDS_VERIFY').length;
 for(const c of chapters)c.status='TEXTBOOK_STRUCTURE';
 const result={format:2,workspace,title:book.title,status:pending?'TEXTBOOK_WITH_LOCAL_EXCEPTIONS':'TEXTBOOK_ACCEPTED',created:now(),orderSource:'textbook',source:'primary-pdf-text',sourceHash:book.hash,studyOrder:chapters.map(c=>c.number),chapters,introduction,originalText:pages.map(p=>p.text).join('\n'),coverage:{pages:pages.length,textLines,capturedLines,entries:totalEntries,accepted:allEntries.filter(e=>e.body.trim()&&e.status==='TEXTBOOK_ACCEPTED').length,localExceptions:pending,complete:textLines===capturedLines},notice:'全文按教材顺序保存。识别检查通过的内容自动进入教材知识层；仅局部解析疑点待核对。自动纳入不等于人工核验或AI教学审核通过。'};
 if(!cache.has(store))cache.set(store,new Map());cache.get(store)!.set(workspace,{key,value:result});return result;
}
export function getFramework(store:Store,workspace:string){return localFramework(store,workspace);}
export async function explainFramework(store:Store,workspace:string){
 const result=localFramework(store,workspace);const file=contained(store.root,`data/workspaces/${workspace}/knowledge/framework-source.json`);writeFileSync(file+'.tmp',JSON.stringify(result,null,2));renameSync(file+'.tmp',file);return result;
}
