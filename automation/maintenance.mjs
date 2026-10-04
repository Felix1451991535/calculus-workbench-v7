import {mkdirSync,readFileSync,writeFileSync,existsSync,readdirSync,cpSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import katex from 'katex';
const root=process.env.APP_ROOT??process.cwd();const weekly=process.argv.includes('--weekly');
const checks=[];const created=new Date().toISOString();
function check(name,fn){try{const detail=fn();checks.push({name,status:'PASS',detail});}catch(e){checks.push({name,status:'FAIL',detail:e.message});}}
let db;const database=path.join(root,'data/workbench.sqlite');
const events=path.join(root,'logs/events.jsonl');if(existsSync(events)){const recent=readFileSync(events,'utf8').split('\n').filter(Boolean).slice(-200).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});checks.push({name:'异常与慢请求',status:recent.some(e=>e.status>=500)?'UNVERIFIED':'PASS',detail:{slowRequests:recent.filter(e=>e.ms>1000).length,serverErrors:recent.filter(e=>e.status>=500).length}});}
if(existsSync(database)){
 db=new DatabaseSync(database);check('数据库完整性',()=>{const result=db.prepare('PRAGMA integrity_check').get();if(Object.values(result)[0]!=='ok')throw new Error('数据库完整性异常');return 'ok';});
 check('教材文件与相对路径',()=>{const books=db.prepare('SELECT id,pdf FROM workspaces').all();for(const b of books){const target=path.resolve(root,b.pdf);if(path.relative(root,target).startsWith('..')||!existsSync(target))throw new Error('教材缺失或路径越界：'+b.id);}return `${books.length} 个 Workspace`;});
 const failures=db.prepare("SELECT kind,COUNT(*) count FROM tasks WHERE status='FAILED' GROUP BY kind").all();checks.push({name:'失败任务检查',status:failures.length?'UNVERIFIED':'PASS',detail:failures});
 check('已发布内容公式检查',()=>{const rows=db.prepare("SELECT id,body FROM knowledge WHERE status='PUBLISHED'").all();for(const row of rows)for(const m of row.body.matchAll(/\$\$([\s\S]*?)\$\$|(?<!\$)\$([^$\n]+)\$(?!\$)/g))katex.renderToString(m[1]??m[2],{throwOnError:true,strict:'error',trust:false});return `${rows.length} 个知识页`;});
 if(weekly){
  check('数据库备份恢复测试',()=>{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');const testRoot=path.join(root,'updates','maintenance-tests',String(Date.now()));mkdirSync(testRoot,{recursive:true});const copy=path.join(testRoot,'restore.sqlite');cpSync(database,copy);const restored=new DatabaseSync(copy);const result=restored.prepare('PRAGMA integrity_check').get();const count=restored.prepare('SELECT COUNT(*) n FROM workspaces').get().n;restored.close();if(Object.values(result)[0]!=='ok')throw new Error('备份恢复失败');return {restoredWorkspaces:count};});
  check('数学渲染压力',()=>{for(const math of [String.raw`\lim_{x\to0}\frac{\sin x}{x}`,String.raw`\int_0^1x^2dx`,String.raw`\sum_{n=1}^{\infty}\frac1{n^2}`,String.raw`\sqrt{1+\sqrt{x}}`,String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`,String.raw`\begin{cases}x&x>0\\0&x\le0\end{cases}`,String.raw`\forall\epsilon>0\exists\delta>0`,String.raw`\{x\in\mathbb R:x\ne0\}`])katex.renderToString(math,{throwOnError:true,trust:false});return '8 类数学表达式';});
  checks.push({name:'真实教材/视觉/模型/性能回归',status:'UNVERIFIED',detail:'需真实样本与模型凭据；不以离线压力检查替代。'});
 }
}else checks.push({name:'数据库检查',status:'UNVERIFIED',detail:'首次运行尚未初始化数据'});
const serviceConfig=path.join(root,'config/service.json');const servicePort=existsSync(serviceConfig)?Number(JSON.parse(readFileSync(serviceConfig,'utf8')).port):4317;if(!Number.isInteger(servicePort)||servicePort<1||servicePort>65535)throw new Error('服务端口配置错误');const serviceURL=`http://127.0.0.1:${servicePort}`;
let live=false;
try{const health=await (await fetch(serviceURL+'/api/health',{signal:AbortSignal.timeout(5000)})).json();if(health.instance!==createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex'))throw new Error('运行中的服务属于另一个安装目录');const session=await (await fetch(serviceURL+'/api/session',{signal:AbortSignal.timeout(5000)})).json();const response=await fetch(serviceURL+'/api/maintenance',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':session.token},body:'{}',signal:AbortSignal.timeout(20000)});live=response.ok;
 if(live&&process.argv.includes('--repair')){const repair=await fetch(serviceURL+'/api/maintenance/repair',{method:'POST',headers:{'Content-Type':'application/json','X-Session-Token':session.token},body:JSON.stringify({consent:true}),signal:AbortSignal.timeout(30000)});let detail=await repair.json();let status=repair.ok?'UNVERIFIED':'BLOCKED';if(detail.task){for(let i=0;i<900;i++){const task=await (await fetch(serviceURL+'/api/tasks/'+detail.task,{signal:AbortSignal.timeout(5000)})).json();if(['DONE','FAILED'].includes(task.status)){detail=task.result;status=task.status==='FAILED'?'BLOCKED':detail.state==='NO_ACTION'?'PASS':detail.state==='NEEDS_RESEARCH'?'FAIL':'UNVERIFIED';break;}await new Promise(r=>setTimeout(r,1000));}}checks.push({name:'Candidate 修复 Agent',status,detail});}
}catch{checks.push({name:'运行服务检查',status:'BLOCKED',detail:'服务未运行；本地数据库检查仍执行。'});}
const report={created,frequency:weekly?'weekly':'daily',checks,status:checks.some(c=>c.status==='FAIL')?'FAIL':checks.some(c=>c.status==='BLOCKED')?'BLOCKED':checks.some(c=>c.status==='UNVERIFIED')?'UNVERIFIED':'PASS',aiRepair:live?'通过内存服务请求 Candidate 修复；无凭据时 BLOCKED':'BLOCKED：服务或内存凭据不可用'};
mkdirSync(path.join(root,'logs/maintenance'),{recursive:true});writeFileSync(path.join(root,'logs/maintenance',created.replace(/[:.]/g,'-')+'.json'),JSON.stringify(report,null,2));
if(db){db.prepare('INSERT INTO inbox VALUES(?,?,?,?,?)').run(crypto.randomUUID(),'maintenance',weekly?'每周维护报告':'每日维护报告',JSON.stringify(report),created);db.close();}
console.log(JSON.stringify(report,null,2));if(report.status==='FAIL')process.exitCode=1;
