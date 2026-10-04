import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync,appendFileSync,statSync,renameSync } from 'node:fs';
import { spawn,execFile } from 'node:child_process';
import path from 'node:path';
import { Store,id,now,contained,hash } from './store.js';
import { importPDF } from './pdf.js';
import { configure,publicSettings,generateKnowledge,tutor,vision,context,completion,mathErrors } from './ai.js';
import { checkUpdates,downloadUpdate,releaseVersion } from './updates.js';
import { repairCandidate } from './maintenance.js';
import { organizeRecord,makeQuestion,structureBook } from './learning.js';
import {visionBatch,batchState,pauseBatch} from './vision-batch.js';
import {getFramework,explainFramework} from './framework.js';
import {bookSources,bookSource,attachReference} from './sources.js';
import {importNotes} from './notes.js';

export function createApp(root:string){
 const store=new Store(root);const app=express();app.disable('x-powered-by');app.use(express.json({limit:'25mb'}));
 const token=randomBytes(32).toString('hex');
 app.use((req,res,next)=>{const started=Date.now();res.on('finish',()=>{const ms=Date.now()-started;if(ms>1000||res.statusCode>=500){const log=path.join(root,'logs/events.jsonl');try{if(existsSync(log)&&statSync(log).size>2_000_000)renameSync(log,path.join(root,'logs',`events-${Date.now()}.jsonl`));appendFileSync(log,JSON.stringify({created:now(),method:req.method,route:req.route?.path??'unmatched',status:res.statusCode,ms})+'\n');}catch{/* logging failure must not break offline reading */}}});next();});
 app.use((req,res,next)=>{
  const host=req.headers.host??'';
  if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))return res.status(403).json({error:'仅允许本机访问'});
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; frame-src 'self' blob:");
  if(req.path.startsWith('/api'))res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){
   const origin=req.headers.origin;
   if(origin&&origin!==`http://${host}`)return res.status(403).json({error:'请求来源不匹配'});
   const supplied=String(req.headers['x-session-token']??'');
   if(supplied.length!==token.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token)))return res.status(403).json({error:'会话令牌无效'});
  }
  next();
 });
 const wrap=(fn:(req:any,res:any)=>any)=>(req:any,res:any,next:any)=>Promise.resolve().then(()=>fn(req,res)).catch(next);
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:150*1024*1024,files:1}});
 app.get('/api/session',(_req,res)=>res.json({token,version:releaseVersion(root),name:'知微',spec:'V7',channel:existsSync(path.join(root,'config/distribution.json'))?JSON.parse(readFileSync(path.join(root,'config/distribution.json'),'utf8')).channel:'candidate'}));
 app.get('/api/health',(_req,res)=>res.json({status:'ok',product:'calculus-workbench-v7',instance:hash(path.resolve(root).toLowerCase()),schema:store.one("SELECT value FROM meta WHERE key='schema'").value,version:releaseVersion(root)}));
 app.get('/api/settings',(_req,res)=>res.json(publicSettings()));
 app.post('/api/settings',wrap((req,res)=>{const result=configure(req.body);const {hasKey,...saved}=result;writeFileSync(path.join(root,'config/provider.json'),JSON.stringify(saved,null,2));res.json(result);}));
 if(existsSync(path.join(root,'config/provider.json'))){try{configure(JSON.parse(readFileSync(path.join(root,'config/provider.json'),'utf8')));}catch{/* invalid settings do not prevent offline reading */}}
 app.get('/api/workspaces',(_req,res)=>res.json(store.all('SELECT * FROM workspaces ORDER BY created DESC')));
 app.post('/api/import',upload.single('pdf'),wrap(async(req,res)=>{
  if(!req.file||!req.file.buffer.subarray(0,5).equals(Buffer.from('%PDF-')))throw new Error('请选择有效 PDF 文件');
  const title=z.string().min(1).max(180).parse(req.body.title||req.file.originalname.replace(/\.pdf$/i,''));
  const bytes=new Uint8Array(req.file.buffer);res.json({task:await store.task(null,'IMPORT',p=>importPDF(store,bytes,title,p))});
 }));
 app.get('/api/tasks',(_req,res)=>res.json(store.all('SELECT t.id,t.kind,t.status,t.progress,t.created,t.updated,w.title AS textbook,t.result FROM tasks t LEFT JOIN workspaces w ON w.id=t.workspace ORDER BY t.created DESC LIMIT 50').map(t=>{const result=JSON.parse(t.result);const {result:raw,...summary}=t;return {...summary,error:t.status==='FAILED'?String(result.error??'任务失败'):null};})));
 app.post('/api/workspaces/:id/notes-file',upload.single('notes'),wrap(async(req,res)=>{if(!req.file)throw new Error('请选择Word或TXT笔记文件');res.json(await importNotes(store,req.params.id,req.file.buffer,req.file.originalname));}));
 app.get('/api/tasks/:id',wrap((req,res)=>{const task=store.one('SELECT * FROM tasks WHERE id=?',req.params.id);if(!task)return res.status(404).json({error:'任务不存在'});res.json({...task,result:JSON.parse(task.result)});}));
 app.get('/api/workspaces/:id/pdf',wrap((req,res)=>res.sendFile(contained(root,bookSource(store,req.params.id,String(req.query.reference??'')).pdf))));
 app.get('/api/workspaces/:id/sources',wrap((req,res)=>res.json(bookSources(store,req.params.id))));
 app.post('/api/workspaces/:id/references',upload.single('pdf'),wrap(async(req,res)=>{if(!req.file||req.file.buffer.subarray(0,5).toString()!=='%PDF-')throw new Error('请选择有效PDF对照资料');const title=z.string().min(1).max(180).parse(req.body.title??req.file.originalname);res.json(await attachReference(store,req.params.id,new Uint8Array(req.file.buffer),title));}));
 app.get('/api/workspaces/:id/pages/:page',wrap((req,res)=>{const p=store.one('SELECT * FROM pages WHERE workspace=? AND idx=?',req.params.id,Number(req.params.page));if(!p)return res.status(404).json({error:'页面不存在'});res.json({...p,items:JSON.parse(p.items)});}));
 app.get('/api/workspaces/:id/facts',wrap((req,res)=>res.json(store.facts(req.params.id))));
 const factSchema=z.object({chapter:z.string().min(1).max(200),kind:z.string().min(1).max(50),title:z.string().min(1).max(200),content:z.string().min(1).max(50000),latex:z.string().max(20000).default(''),source:z.object({quote:z.string().min(1),pdfIndex:z.number().int().positive().optional(),before:z.string().optional(),after:z.string().optional(),precision:z.string().optional()}).passthrough(),verified:z.boolean()});
 app.post('/api/workspaces/:id/facts',wrap((req,res)=>{const input=factSchema.parse(req.body);store.workspace(req.params.id);if(input.source.pdfIndex&&(input.source.pdfIndex>bookSource(store,req.params.id,String(input.source.referenceId??'')).pages))throw new Error('PDF 页索引不存在');if(input.verified&&(mathErrors(input.content).length||mathErrors(input.latex?`$${input.latex}$`:'').length))throw new Error('公式未通过解析，不能核验');res.json({id:store.fact({...input,workspace:req.params.id,source:{...input.source,textbook:req.params.id}},input.verified?'VERIFIED':'NEEDS_VERIFY')});}));
 app.post('/api/workspaces/:id/facts/:fact/verify',wrap((req,res)=>{
  const input=factSchema.parse(req.body);const previous=store.one('SELECT * FROM facts WHERE id=? AND workspace=?',req.params.fact,req.params.id);if(!previous)throw new Error('事实不存在');
  if(store.one('SELECT id FROM facts WHERE previous=?',previous.id))throw new Error('版本已更新，请刷新后再核验');
  if(input.source.pdfIndex&&(input.source.pdfIndex>bookSource(store,req.params.id,String(input.source.referenceId??'')).pages))throw new Error('PDF 页索引不存在');
  if(input.verified&&(mathErrors(input.content).length||mathErrors(input.latex?`$${input.latex}$`:'').length))throw new Error('公式未通过解析，不能核验');
  res.json({id:store.fact({...input,workspace:req.params.id,source:{...input.source,textbook:req.params.id}},input.verified?'VERIFIED':'NEEDS_VERIFY',previous.id)});
 }));
 app.get('/api/workspaces/:id/audit',wrap((req,res)=>res.json(store.audit(req.params.id))));
 app.get('/api/workspaces/:id/framework',wrap((req,res)=>res.json(getFramework(store,req.params.id))));
 app.post('/api/workspaces/:id/framework',wrap(async(req,res)=>res.json({task:await store.task(req.params.id,'FRAMEWORK',async()=>explainFramework(store,req.params.id))})));
 app.post('/api/workspaces/:id/structure',wrap(async(req,res)=>{if(req.body.consent!==true)throw new Error('请确认发送教材结构候选给配置模型');res.json({task:await store.task(req.params.id,'STRUCTURE',async()=>structureBook(store,req.params.id))});}));
 app.get('/api/workspaces/:id/structure',wrap((req,res)=>res.json({edges:store.all('SELECT * FROM edges WHERE workspace=?',req.params.id),symbols:store.all('SELECT * FROM symbols WHERE workspace=?',req.params.id)})));
 app.post('/api/workspaces/:id/structure/verify',wrap((req,res)=>{const input=z.object({kind:z.enum(['edge','symbol']),from:z.string().optional(),to:z.string().optional(),relation:z.string().optional(),chapter:z.string().optional(),symbol:z.string().optional()}).parse(req.body);if(input.kind==='edge')store.run("UPDATE edges SET status='VERIFIED' WHERE workspace=? AND from_kp=? AND to_kp=? AND kind=?",req.params.id,input.from??'',input.to??'',input.relation??'');else store.run("UPDATE symbols SET status='VERIFIED' WHERE workspace=? AND chapter=? AND symbol=?",req.params.id,input.chapter??'',input.symbol??'');res.json({ok:true});}));
 app.get('/api/workspaces/:id/history/:kp',wrap((req,res)=>res.json(store.all('SELECT * FROM facts WHERE workspace=? AND kp=? ORDER BY version DESC',req.params.id,req.params.kp))));
 app.get('/api/workspaces/:id/knowledge',wrap((req,res)=>res.json(store.all('SELECT * FROM knowledge WHERE workspace=? ORDER BY created DESC',req.params.id).map(k=>({...k,refs:JSON.parse(k.refs),review:JSON.parse(k.review)})))));
 const kpBody=z.object({kp:z.string().min(1)});
 app.post('/api/workspaces/:id/generate',wrap(async(req,res)=>{const {kp}=kpBody.parse(req.body);context(store,req.params.id,kp);if(req.body.consent!==true)throw new Error('请确认发送相关教材片段与个人记录给配置的模型服务');res.json({task:await store.task(req.params.id,'KNOWLEDGE',async()=>generateKnowledge(store,req.params.id,kp))});}));
 app.get('/api/workspaces/:id/messages/:kp',wrap((req,res)=>res.json(store.all('SELECT * FROM messages WHERE workspace=? AND kp=? ORDER BY created',req.params.id,req.params.kp))));
 app.post('/api/workspaces/:id/tutor',wrap(async(req,res)=>{const input=z.object({kp:z.string(),question:z.string().min(1).max(10000),selection:z.string().max(10000).default(''),consent:z.literal(true)}).parse(req.body);res.json({task:await store.task(req.params.id,'TUTOR',async()=>tutor(store,req.params.id,input.kp,input.question,input.selection))});}));
 app.post('/api/workspaces/:id/vision',wrap(async(req,res)=>{const input=z.object({page:z.number().int().positive(),image:z.string(),reference:z.string().default(''),consent:z.literal(true)}).parse(req.body);res.json({task:await store.task(req.params.id,'VISION',async()=>vision(store,req.params.id,input.page,input.image,input.reference))});}));
 app.get('/api/workspaces/:id/vision-batch',wrap((req,res)=>res.json({...batchState(store,req.params.id,String(req.query.reference??'')),active:store.one("SELECT id,status,progress FROM tasks WHERE workspace=? AND kind='VISION_BATCH' AND status IN ('QUEUED','RUNNING') ORDER BY created DESC LIMIT 1",req.params.id)??null})));
 app.post('/api/workspaces/:id/vision-batch',wrap(async(req,res)=>{const input=z.object({from:z.number().int().positive(),to:z.number().int().positive(),reference:z.string().default(''),consent:z.literal(true)}).parse(req.body);const book=bookSource(store,req.params.id,input.reference);if(input.to<input.from||input.to>book.pages)throw new Error('页范围超出教材');if(store.one("SELECT id FROM tasks WHERE workspace=? AND kind='VISION_BATCH' AND status IN ('QUEUED','RUNNING')",req.params.id))throw new Error('此教材已有批量识别任务，请等待或暂停');res.json({task:await store.task(req.params.id,'VISION_BATCH',p=>visionBatch(store,req.params.id,input.from,input.to,p,input.reference))});}));
 app.post('/api/workspaces/:id/vision-batch/cancel',wrap((req,res)=>res.json(pauseBatch(store,req.params.id,String(req.body.reference??'')))));
 app.get('/api/workspaces/:id/records',wrap((req,res)=>res.json(store.all('SELECT * FROM records WHERE workspace=? ORDER BY created DESC',req.params.id).map(r=>({...r,raw:JSON.parse(r.raw),derived:JSON.parse(r.derived)})))));
 app.post('/api/workspaces/:id/records',wrap((req,res)=>{
  const input=z.object({kind:z.enum(['mistake','transcript','evidence','reflection']),kp:z.string().default(''),raw:z.record(z.string(),z.unknown()),derived:z.record(z.string(),z.unknown()).default({})}).parse(req.body);store.workspace(req.params.id);
  const key=id();store.run('INSERT INTO records VALUES(?,?,?,?,?,?,?)',key,req.params.id,input.kind,input.kp,JSON.stringify(input.raw),JSON.stringify(input.derived),now());
  res.json({id:key});
 }));
 app.post('/api/workspaces/:id/records/:record/analyze',wrap(async(req,res)=>{if(req.body.consent!==true)throw new Error('请确认发送此学习记录及相关已核验事实');res.json({task:await store.task(req.params.id,'ORGANIZE_RECORD',async()=>organizeRecord(store,req.params.id,req.params.record))});}));
 app.get('/api/workspaces/:id/questions',wrap((req,res)=>res.json(store.all('SELECT * FROM questions WHERE workspace=? ORDER BY created DESC',req.params.id).map(q=>({...q,payload:JSON.parse(q.payload),review:JSON.parse(q.review)})))));
 app.post('/api/workspaces/:id/questions',wrap(async(req,res)=>{const {kp}=kpBody.parse(req.body);if(req.body.consent!==true)throw new Error('请确认发送相关事实及弱点给出题与独立验题模型');res.json({task:await store.task(req.params.id,'QUESTION',async()=>makeQuestion(store,req.params.id,kp))});}));
 app.get('/api/workspaces/:id/diagnosis',wrap((req,res)=>{
  const records=store.all("SELECT * FROM records WHERE workspace=? AND kind IN ('mistake','evidence')",req.params.id).map(r=>({...r,raw:JSON.parse(r.raw),derived:JSON.parse(r.derived)}));
  const dimensions=['概念','符号/定义','定理条件','计算','方法选择','证明/推理','综合应用','稳定性','长期保持'];
  res.json(dimensions.map(d=>{const evidence=records.filter(r=>r.raw.dimension===d);const wrong=evidence.filter(r=>r.raw.outcome!=='pass');const kps=[...new Set(wrong.map(r=>r.kp).filter(Boolean))];return {dimension:d,status:evidence.length===0?'待评估':wrong.length?'需要复习':'已有通过证据',evidence,weakKps:kps,plan:wrong.length?{kp:kps,type:d==='计算'?'逐步计算与复算':'定义条件与逐步解释',difficulty:'基础',count:3,retestHours:24,passCriteria:'3 道已核验基础题独立完成，并解释所用条件；7 天后再次复测'}:null};}));
 }));
 app.get('/api/workspaces/:id/search',wrap((req,res)=>{const q=String(req.query.q??'').slice(0,100);res.json(store.facts(req.params.id).filter(f=>[f.title,f.content,f.chapter].some(s=>s.includes(q))).slice(0,50));}));
 app.get('/api/inbox',(_req,res)=>res.json(store.all('SELECT * FROM inbox ORDER BY created DESC LIMIT 100').map(n=>({...n,body:JSON.parse(n.body)}))));
 app.post('/api/updates/check',wrap(async(_req,res)=>res.json(await checkUpdates(store))));
 app.post('/api/updates/download',wrap(async(_req,res)=>res.json({task:await store.task(null,'UPDATE_DOWNLOAD',p=>downloadUpdate(store,p))})));
 app.post('/api/updates/remind',wrap((_req,res)=>{store.notify('reminder','稍后安装更新',{next:new Date(Date.now()+86400000).toISOString()});res.json({ok:true});}));
 app.post('/api/updates/install',wrap((req,res)=>{
  if(req.body.confirm!==true)throw new Error('需要确认停止服务并安装更新');
  if(!existsSync(path.join(root,'updates/pending.zip')))throw new Error('请先下载并校验补丁');
  if(existsSync(path.join(root,'config/desktop.json')))writeFileSync(path.join(root,'updates/desktop-install.json'),JSON.stringify({started:Date.now(),status:'INSTALLING'}));
  const child=spawn(process.execPath,[path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../automation/updater.mjs'),'--root',root,'--wait-pid',String(process.pid)],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});child.unref();res.json({status:'RESTARTING'});
  setTimeout(()=>{store.close();process.exit(0);},500);
 }));
 app.post('/api/backups',wrap((_req,res)=>{
  const name=store.snapshot();const folder=path.join(root,'backups',name.replace('.sqlite',''));mkdirSync(folder,{recursive:true});cpSync(path.join(root,'data'),path.join(folder,'data'),{recursive:true});writeFileSync(path.join(folder,'backup.json'),JSON.stringify({schema:1,created:now(),version:releaseVersion(root)}));
  res.json({name:folder.split(path.sep).at(-1),message:'完整备份已保存，可使用恢复脚本；恢复前会再次备份现有数据。'});
 }));
 app.get('/api/backups',(_req,res)=>{import('node:fs').then(fs=>res.json(fs.readdirSync(path.join(root,'backups')).filter(n=>existsSync(path.join(root,'backups',n,'backup.json')))));});
 app.post('/api/maintenance/register',wrap(async(req,res)=>{
  if(req.body.confirm!==true)throw new Error('需要确认启用本机每日和每周维护');
  if(process.platform!=='win32')throw new Error('定时维护注册需要Windows');
  res.json({task:await store.task(null,'MAINTENANCE_REGISTER',()=>new Promise((resolve,reject)=>execFile('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'automation/Register-MaintenanceTasks.ps1'),'-AppRoot',root],{windowsHide:true,timeout:30000},error=>{if(error)reject(new Error('维护任务注册失败，请检查当前用户的任务计划权限。'));else{store.notify('maintenance','已启用长期维护',{daily:'每日20:00及登录',weekly:'每周六10:00',scope:'当前用户，电脑关闭期间暂停，启动后补跑；维护报告在消息箱查看'});resolve({status:'REGISTERED'});}})))});
 }));
 app.post('/api/maintenance',wrap(async(_req,res)=>{
  const integrity=store.one('PRAGMA integrity_check');const report={status:Object.values(integrity)[0]==='ok'?'PASS':'FAIL',created:now(),checks:{database:integrity,failedTasks:store.all("SELECT id,kind,updated FROM tasks WHERE status='FAILED'"),formula:store.all("SELECT id,body FROM knowledge WHERE status='PUBLISHED'").flatMap(k=>mathErrors(k.body).map(error=>({id:k.id,error})))},aiRepair:'BLOCKED — 修复需要独立 Candidate、模型凭据与发布闸门，不能直接修改 Stable。'};
  store.notify('maintenance','本机维护检查',report);res.json(report);
 }));
 app.post('/api/maintenance/repair',wrap(async(req,res)=>{if(req.body.consent!==true)throw new Error('维护修复将发送应用源码与脱敏故障类别到配置模型，需同意。');res.json({task:await store.task(null,'MAINTENANCE_REPAIR',async()=>repairCandidate(store))});}));
 const here=path.dirname(fileURLToPath(import.meta.url));const dist=path.resolve(here,'../../dist');
 app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
 app.use((error:any,_req:any,res:any,_next:any)=>res.status(error instanceof z.ZodError?400:500).json({error:error instanceof z.ZodError?'输入格式不正确':String(error.message??'操作失败').replace(/Bearer\s+\S+/gi,'[已隐藏]')}));
 return {app,store};
}
if(process.env.NODE_ENV!=='test'){
 const root=process.env.APP_ROOT??process.cwd();
 if(process.argv.includes('--self-test')){const store=new Store(root);const result=store.one('PRAGMA integrity_check');store.close();if(Object.values(result)[0]!=='ok')process.exit(1);const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../dist/index.html');if(!existsSync(dist))throw new Error('候选学习界面缺失');if(mathErrors(String.raw`$$\lim_{x\to0}\frac{\sin x}{x}=1$$`).length)throw new Error('候选数学渲染失败');console.log('SELF_TEST_PASS');}
 else {const {app,store}=createApp(root);const port=Number(process.env.PORT??4317);const server=app.listen(port,'127.0.0.1',(error?:Error)=>{if(error){console.error(`无法启动：本机端口 ${port} 已被占用或不可用。请关闭其他实例再启动。`);store.close();process.exitCode=1;return;}console.log(`知微工作台 http://127.0.0.1:${(server.address() as any).port}`);});process.on('SIGTERM',()=>server.close(()=>{store.close();process.exit(0);}));}
}
