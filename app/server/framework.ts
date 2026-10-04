import {writeFileSync,renameSync} from 'node:fs';
import {Store,contained,now} from './store.js';
import {textbookHeading} from './pdf.js';

export function localFramework(store:Store,workspace:string){
 const book=store.workspace(workspace);const facts=store.facts(workspace);const pages=store.all('SELECT idx,text FROM pages WHERE workspace=? ORDER BY idx',workspace);
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
 return {format:2,workspace,title:book.title,status:'NEEDS_VERIFY',created:now(),orderSource:'textbook',source:'primary-pdf-text',sourceHash:book.hash,studyOrder:chapters.map(c=>c.number),chapters,introduction,originalText:pages.map(p=>p.text).join('\n'),coverage:{pages:pages.length,textLines,capturedLines,entries:totalEntries,complete:textLines===capturedLines},notice:'目录和全部正文直接来自这份纯文字PDF，按原书顺序保存，不调用模型、不改写教材。数学公式与图形仍可对照扫描原件核验。'};
}
export function getFramework(store:Store,workspace:string){return localFramework(store,workspace);}
export async function explainFramework(store:Store,workspace:string){
 const result=localFramework(store,workspace);const file=contained(store.root,`data/workspaces/${workspace}/knowledge/framework-source.json`);writeFileSync(file+'.tmp',JSON.stringify(result,null,2));renameSync(file+'.tmp',file);return result;
}
