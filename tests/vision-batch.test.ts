import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
import path from 'node:path';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {Store} from '../app/server/store.js';
import {importPDF} from '../app/server/pdf.js';
import {configure} from '../app/server/ai.js';
import {visionBatch,batchState,pauseBatch} from '../app/server/vision-batch.js';
async function fixture(count=2){mkdirSync('work/tests',{recursive:true});const root=mkdtempSync(path.resolve('work/tests/batch-'));const store=new Store(root);const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);for(let i=1;i<=count;i++)pdf.addPage().drawText('AUTHORED BATCH TEST ONLY: page '+i,{font,x:40,y:740,size:15});const book=await importPDF(store,await pdf.save(),'AUTHORED BATCH TEST',()=>{});configure({baseUrl:'http://localhost:1111',textModel:'TEST',visionModel:'TEST',apiKey:'TEST',timeout:5000,retries:0});return {store,root,workspace:book.workspace};}
const answer=()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({chapter:'TEST',blocks:[{kind:'公式',title:'AUTHORED CANDIDATE',content:'TEST ONLY $x^2$',latex:'x^2'}],conflicts:[]})}}]}));
test('批量真实PDF渲染、逐页失败保存、重启续做跳过已完成页',async()=>{const x=await fixture();const original=globalThis.fetch;let calls=0;globalThis.fetch=(async(_url:any,init:any)=>{calls++;const body=JSON.parse(init.body);const image=body.messages[1].content[1].image_url.url;assert.ok(image.startsWith('data:image/png;base64,iVBOR'));return calls===2?new Response('{}',{status:401}):answer();}) as typeof fetch;
 try{const a=await visionBatch(x.store,x.workspace,1,2,()=>{});assert.equal(a.status,'PARTIAL');assert.equal(a.completed,1);assert.equal(a.failed,1);const ids=batchState(x.store,x.workspace).pages[1].ids;x.store.close();x.store=new Store(x.root);const b=await visionBatch(x.store,x.workspace,1,2,()=>{});assert.equal(b.completed,1);assert.equal(b.skipped,1);assert.equal(calls,3);assert.deepEqual(batchState(x.store,x.workspace).pages[1].ids,ids);assert.ok(x.store.facts(x.workspace).every(f=>f.status==='NEEDS_VERIFY'));}finally{globalThis.fetch=original;x.store.close();}});
test('暂停在当前页完成后生效，续做不重复；连续三页失败自动暂停',async()=>{const x=await fixture(4);const original=globalThis.fetch;let calls=0;globalThis.fetch=(async()=>{calls++;if(calls===1)pauseBatch(x.store,x.workspace);return answer();}) as typeof fetch;
 try{const a=await visionBatch(x.store,x.workspace,1,4,()=>{});assert.equal(a.status,'PAUSED');assert.equal(calls,1);globalThis.fetch=(async()=>{calls++;return new Response('{}',{status:401});}) as typeof fetch;const b=await visionBatch(x.store,x.workspace,1,4,()=>{});assert.equal(b.status,'PAUSED');assert.equal(b.skipped,1);assert.equal(b.failed,3);assert.equal(calls,4);assert.equal(batchState(x.store,x.workspace).pages[1].status,'DONE');}finally{globalThis.fetch=original;x.store.close();}});
