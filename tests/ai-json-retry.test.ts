import test from 'node:test';import assert from 'node:assert/strict';import {z} from 'zod';
import {configure,structured} from '../app/server/ai.js';
test('模型 JSON 转义错误会重试，教材输入保持完整，三次仍错误则拒绝',async()=>{
 const original=globalThis.fetch;let calls=0;let alwaysInvalid=false;const source='AUTHORED SOURCE: every input has one output.';
 globalThis.fetch=(async(_url:any,init:any)=>{calls++;const request=JSON.parse(init.body);assert.ok(request.messages.some((m:any)=>m.content===source));const content=alwaysInvalid||calls===1?'{"body":"\\invalid"}':JSON.stringify({body:'Correct JSON with $\\frac{1}{2}$.'});return new Response(JSON.stringify({choices:[{message:{content}}]}));}) as typeof fetch;
 try{configure({baseUrl:'http://localhost:1111',textModel:'TEST',apiKey:'TEST',timeout:5000,retries:0});const result=await structured(z.object({body:z.string()}),[{role:'user',content:source}]);assert.ok(result.body.includes('\\frac'));assert.equal(calls,2);calls=0;alwaysInvalid=true;await assert.rejects(structured(z.object({body:z.string()}),[{role:'user',content:source}]),/结构约/);assert.equal(calls,3);}finally{globalThis.fetch=original;}
});
