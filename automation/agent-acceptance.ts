import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,symlinkSync} from 'node:fs';import path from 'node:path';
import {Store,id,now,hash} from '../app/server/store.js';import {configure} from '../app/server/ai.js';import {repairCandidate} from '../app/server/maintenance.js';
const root=process.cwd();mkdirSync('work/agent',{recursive:true});const sample=mkdtempSync(path.resolve('work/agent/TEST-FIXTURE-'));const key=process.env.LIVE_TEST_KEY;delete process.env.LIVE_TEST_KEY;if(!key)throw new Error('需要内存模型凭据');
for(const d of ['app/server','app/client','tests','automation'])mkdirSync(path.join(sample,d),{recursive:true});
symlinkSync(path.join(root,'node_modules'),path.join(sample,'node_modules'),'junction');
writeFileSync(path.join(sample,'package.json'),JSON.stringify({name:'authored-maintenance-test-fixture',version:'0.0.0',type:'module'}));
writeFileSync(path.join(sample,'index.html'),'<html><body><script type="module" src="/app/client/main.ts"></script></body></html>');
writeFileSync(path.join(sample,'vite.config.ts'),"import {defineConfig} from 'vite'; export default defineConfig({build:{outDir:'app/dist'}});");
writeFileSync(path.join(sample,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',strict:true},include:['app/client']}));
writeFileSync(path.join(sample,'tsconfig.server.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',strict:true,outDir:'app/build/server'},include:['app/server']}));
const original='// AUTHORED TEST FIXTURE ONLY. Regression: add(2,3) must equal 5, not -1.\nexport function add(a:number,b:number){return a-b;}\n';
writeFileSync(path.join(sample,'app/server/index.ts'),original);writeFileSync(path.join(sample,'app/client/main.ts'),"document.body.textContent='AUTHORED MAINTENANCE TEST ONLY';");
writeFileSync(path.join(sample,'tests/add.test.ts'),"import test from 'node:test';import assert from 'node:assert/strict';import {add} from '../app/server/index.ts';test('AUTHORED REGRESSION: addition',()=>{assert.equal(add(2,3),5);assert.equal(add(-2,4),2);});");
const store=new Store(sample);store.run('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)',id(),null,'AUTHORED_TEST_ADD_2_3_EXPECT_5_ACTUAL_MINUS_1','FAILED',0,JSON.stringify({error:'TEST ONLY arithmetic regression'}),now(),now());
configure({provider:'DeepSeek',baseUrl:'https://api.deepseek.com',textModel:'deepseek-flash',visionModel:'deepseek-flash',apiKey:key,timeout:240000,retries:1});
let report:any;
try{const before=hash(readFileSync(path.join(sample,'app/server/index.ts')));const result=await repairCandidate(store);const after=hash(readFileSync(path.join(sample,'app/server/index.ts')));if(before!==after)throw new Error('Agent 修改了原始Stable样本');report={created:now(),status:result.state==='TESTING'?'PASS':result.state==='NEEDS_RESEARCH'?'FAIL':'UNVERIFIED',scope:'仅自编加法回归样本；不代表真实产品所有故障均可自动修复。',stableUnchanged:true,result};console.log(JSON.stringify(report,null,2));}catch(e:any){report={created:now(),status:'FAIL',detail:String(e.message).replaceAll(key,'[REDACTED]')};console.log(JSON.stringify(report));}finally{store.close();writeFileSync(path.join(root,'work/agent/AGENT_ACCEPTANCE.json'),JSON.stringify(report,null,2));}
