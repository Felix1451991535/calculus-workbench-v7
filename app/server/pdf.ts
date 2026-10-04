import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Store, id, now, hash, contained } from './store.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function textbookHeading(line:string){
 const clean=line.replace(/\s+-->\s*$/,'').trim();
 if(/^第\s*[一二三四五六七八九十\d]+\s*[章节]\s*\S/.test(clean)&&clean.length<=65&&!/[。；]/.test(clean))return clean.replace(/^第\s*([一二三四五六七八九十\d]+)\s*([章节])\s*/,'第$1$2 ');
 if(/^\d+(\.\d+){1,2}\s+\S/.test(clean)&&clean.length<=65&&!/[。；，]/.test(clean)&&!/(所示|看出|中的条件|那么|于是)/.test(clean))return clean;
 return null;
}

export async function importPDF(store:Store,bytes:Uint8Array,title:string,progress:(n:number)=>void) {
  const digest=hash(bytes); const existing=store.one('SELECT * FROM workspaces WHERE hash=?',digest);
  if(existing&&store.one('SELECT COUNT(*) n FROM pages WHERE workspace=?',existing.id).n===existing.pages) return {workspace:existing.id,duplicate:true};
  const loading=getDocument({data:new Uint8Array(bytes),useSystemFonts:true});const pdf=await loading.promise;
  const workspace=existing?.id??id(); const relative=existing?.pdf??`data/workspaces/${workspace}/textbook/original.pdf`;
  if(!existing){mkdirSync(path.dirname(contained(store.root,relative)),{recursive:true}); writeFileSync(contained(store.root,relative),bytes);}
  for (const dir of ['raw','ground_truth','knowledge','learning','mistakes','conversations','questions','research','database']) mkdirSync(path.join(store.root,'data/workspaces',workspace,dir),{recursive:true});
  if(!existing)store.run('INSERT INTO workspaces VALUES(?,?,?,?,?,?)',workspace,title,digest,relative,now(),pdf.numPages);
  let chapter='待核验目录';
  try {
    const outline=await pdf.getOutline();
    if(outline) writeFileSync(path.join(store.root,'data/workspaces',workspace,'ground_truth/outline.candidates.json'),JSON.stringify(outline,null,2));
    for(let p=1;p<=pdf.numPages;p++) {
      if(store.one('SELECT idx FROM pages WHERE workspace=? AND idx=?',workspace,p)){progress(Math.round(p/pdf.numPages*95));continue;}
      const page=await pdf.getPage(p); const viewport=page.getViewport({scale:1}); const content=await page.getTextContent();
      const items=content.items.filter((x:any)=>'str' in x).map((x:any)=>({text:x.str,transform:x.transform,width:x.width,height:x.height,eol:x.hasEOL}));
      const text=items.map(i=>i.text+(i.eol?'\n':' ')).join('');
      const status=text.trim().length<30?'NEEDS_VERIFY':'EXTRACTED';
      store.run('INSERT INTO pages VALUES(?,?,?,?,?,?,?)',workspace,p,text,viewport.width,viewport.height,JSON.stringify(items),status);
      // Never call linear PDF text a faithful reconstruction of a mathematical formula.
      const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);
      let chunk:string[]=[]; let kind='片段'; let heading='';
      const flush=()=>{if(!chunk.length)return; const value=chunk.join('\n'); store.fact({workspace,chapter,kind,title:heading||value.slice(0,38),content:value,source:{textbook:workspace,chapter,pdfIndex:p,quote:value.slice(0,600),before:text.slice(0,120),after:text.slice(-120),precision:'page'}});chunk=[];};
      for(const line of lines) {
        const section=textbookHeading(line);if(section){flush();chapter=section;}
        const matched=line.match(/^(定义|定理|推论|证明|例\s*\d+|习题|练习)/);
        if(matched || chunk.join('\n').length>1800){flush();heading=matched?line.slice(0,70):'';kind=matched?(matched[1].startsWith('例')?'例题':matched[1]):'片段';}
        chunk.push(line);
      }
      flush(); progress(Math.round(p/pdf.numPages*95));page.cleanup();
    }
    store.notify('import','教材已导入，等待核验',{workspace,title,pages:pdf.numPages});
    return {workspace,duplicate:false,audit:store.audit(workspace)};
  } finally {await loading.destroy();}
}
