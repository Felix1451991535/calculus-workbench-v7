import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {configure,structured,review} from '../app/server/ai.js';

test('DeepSeek截断输出提高一次预算并保持教材输入完整，完整结果才可返回',async()=>{
 const original=globalThis.fetch;const requests:any[]=[];
 try{configure({baseUrl:'https://api.deepseek.com',textModel:'TEST',apiKey:'TEST',retries:0});globalThis.fetch=async(_url,init)=>{requests.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({choices:[{finish_reason:requests.length===1?'length':'stop',message:{content:requests.length===1?'{"body":"truncated':JSON.stringify({body:'Complete'})}}]}));};
 const input=[{role:'user',content:'AUTHORED TEXTBOOK SOURCE'}];assert.equal((await structured(z.object({body:z.string()}),input,false,12000)).body,'Complete');assert.deepEqual(requests.map(r=>r.max_tokens),[12000,24000]);assert.ok(requests.every(r=>r.messages.some((m:any)=>m.content==='AUTHORED TEXTBOOK SOURCE')));
 }finally{globalThis.fetch=original;}
});
test('未知Provider截断返回明确错误，不能把部分JSON发布或机械重试',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{configure({baseUrl:'http://127.0.0.1:9',textModel:'TEST',apiKey:'TEST',retries:0});globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"body":"partial"}'}}]}));};await assert.rejects(structured(z.object({body:z.string()}),[{role:'user',content:'SOURCE'}],false,12000),/长度上限/);assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
test('Reviewer同时说通过和列出问题时不得发布，审核字段必须一致',async()=>{
 const original=globalThis.fetch;
 try{configure({baseUrl:'http://127.0.0.1:9',textModel:'TEST',apiKey:'TEST',retries:0});globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({pass:true,issues:['An unresolved mathematical objection'],beginnerCanSolve:true,mathConsistent:true})}}]}));const result=await review({body:'AUTHORED explanation with source support.',refs:['s']},{facts:[{id:'s',content:'AUTHORED SOURCE'}],symbols:[]});assert.equal(result.pass,false);assert.equal(result.issues.length,1);
 }finally{globalThis.fetch=original;}
});
test('DeepSeek数学审核开启推理并预留思考预算，不能沿用短非推理审核',async()=>{
 const original=globalThis.fetch;let request:any;
 try{configure({baseUrl:'https://api.deepseek.com',textModel:'TEST',apiKey:'TEST',retries:0});globalThis.fetch=async(_url,init)=>{request=JSON.parse(String(init?.body));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({pass:true,issues:[],beginnerCanSolve:true,mathConsistent:true})}}]}));};assert.equal((await review({body:'AUTHORED valid explanation.',refs:['s']},{facts:[{id:'s',content:'AUTHORED SOURCE'}],symbols:[],scope:'mathematical-lesson'},1500)).pass,true);assert.equal(request.thinking.type,'enabled');assert.equal(request.reasoning_effort,'low');assert.equal(request.max_tokens,24000);
 }finally{globalThis.fetch=original;}
});
