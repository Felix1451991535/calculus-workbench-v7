import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createCanvas} from '@napi-rs/canvas';
import {readFileSync,writeFileSync,existsSync,renameSync} from 'node:fs';
import path from 'node:path';
import {Store,contained,now} from './store.js';
import {ready,vision} from './ai.js';
import {bookSource} from './sources.js';

function checkpoint(store:Store,workspace:string,reference=''){bookSource(store,workspace,reference);return contained(store.root,`data/workspaces/${workspace}/raw/vision-batch${reference?'-'+reference:''}.json`);}
export function batchState(store:Store,workspace:string,reference=''){const file=checkpoint(store,workspace,reference);return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{pages:{},cancelRequested:false};}
function save(store:Store,workspace:string,state:any,reference=''){const file=checkpoint(store,workspace,reference);writeFileSync(file+'.tmp',JSON.stringify(state,null,2));renameSync(file+'.tmp',file);}
export function pauseBatch(store:Store,workspace:string,reference=''){const state=batchState(store,workspace,reference);save(store,workspace,{...state,cancelRequested:true},reference);return {status:'PAUSE_REQUESTED',message:'当前页完成后暂停；已完成页不会丢失。'};}
export async function visionBatch(store:Store,workspace:string,from:number,to:number,progress:(value:number)=>void,reference=''){
 ready(true);const book=bookSource(store,workspace,reference);if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>book.pages)throw new Error('页范围不正确');
 const initial=batchState(store,workspace,reference);save(store,workspace,{...initial,from,to,cancelRequested:false,status:'RUNNING',updated:now()},reference);
 const loading=getDocument({data:new Uint8Array(readFileSync(contained(store.root,book.pdf))),useSystemFonts:true});
 let completed=0;let failed=0;let skipped=0;let paused=false;let crashed=false;let consecutiveFailures=0;
 try{const pdf=await loading.promise;for(let n=from;n<=to;n++){
   let state=batchState(store,workspace,reference);if(state.cancelRequested){paused=true;break;}
   const prior=state.pages[n];if(prior?.status==='DONE'&&prior.ids.every((id:string)=>store.one('SELECT id FROM facts WHERE id=? AND workspace=?',id,workspace))){skipped++;progress(Math.round((n-from+1)/(to-from+1)*95));continue;}
   save(store,workspace,{...state,currentPage:n,updated:now(),pages:{...state.pages,[n]:{status:'RUNNING'}}},reference);
   let result:any;
   try{const page=await pdf.getPage(n);try{const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(2.7,1800/base.width,2600/base.height)});const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvas:canvas as any,canvasContext:canvas.getContext('2d') as any,viewport}).promise;result=await vision(store,workspace,n,'data:image/png;base64,'+canvas.toBuffer('image/png').toString('base64'),reference);completed++;consecutiveFailures=0;}finally{page.cleanup();}
    state=batchState(store,workspace,reference);save(store,workspace,{...state,pages:{...state.pages,[n]:{status:'DONE',ids:result.ids,conflicts:result.conflicts,updated:now()}},updated:now()},reference);
   }catch(e){failed++;consecutiveFailures++;state=batchState(store,workspace,reference);save(store,workspace,{...state,pages:{...state.pages,[n]:{status:'FAILED',error:e instanceof Error?e.message:'本页识别失败',updated:now()}},updated:now()},reference);}
   progress(Math.round((n-from+1)/(to-from+1)*95));if(consecutiveFailures>=3){paused=true;break;}
  }
 }catch(e){crashed=true;throw e;}finally{await loading.destroy();const state=batchState(store,workspace,reference);save(store,workspace,{...state,status:crashed?'FAILED':paused?'PAUSED':failed?'PARTIAL':'DONE',updated:now()},reference);}
 const result={status:paused?'PAUSED':failed?'PARTIAL':'DONE',from,to,completed,failed,skipped,trust:'NEEDS_VERIFY'};store.notify('verification','批量视觉识别报告',{workspace,...result});return result;
}
