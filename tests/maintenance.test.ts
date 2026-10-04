import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,symlinkSync} from 'node:fs';
import path from 'node:path';
import {Store,id,now} from '../app/server/store.js';
import {configure} from '../app/server/ai.js';
import {repairCandidate} from '../app/server/maintenance.js';
test('非法Agent补丁同样计入三次熔断，后续不再调用模型',async()=>{
 mkdirSync('work/tests',{recursive:true});const root=mkdtempSync(path.resolve('work/tests/maintenance-'));mkdirSync(path.join(root,'app/server'),{recursive:true});writeFileSync(path.join(root,'app/server/index.ts'),'// TEST FIXTURE');symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'junction');const store=new Store(root);store.run('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)',id(),null,'TEST_FAILURE','FAILED',0,'{}',now(),now());const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({summary:'TEST forbidden edit',edits:[{path:'data/workbench.sqlite',before:'TEST',after:'WRONG'}]})}}]}));}) as typeof fetch;
 try{configure({baseUrl:'http://localhost:1111',textModel:'TEST',apiKey:'TEST',timeout:5000,retries:0});const first=await repairCandidate(store);assert.equal(first.state,'NEEDS_RESEARCH');assert.equal(calls,3);const next=await repairCandidate(store);assert.equal(next.state,'NEEDS_RESEARCH');assert.equal(calls,3);assert.equal(store.all('SELECT * FROM tasks').length,1);}finally{globalThis.fetch=original;store.close();}
});
