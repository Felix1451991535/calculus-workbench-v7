import {readFileSync,writeFileSync,existsSync,mkdirSync,cpSync,renameSync,rmSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {createHash,createPublicKey,verify} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

export function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
export const digest=b=>createHash('sha256').update(b).digest('hex');
export function safe(root,relative){const p=path.resolve(root,relative);const rel=path.relative(root,p);if(rel.startsWith('..')||path.isAbsolute(rel)||relative.includes('\0'))throw new Error('路径越界');return p;}
export function checkManifest(m,key,current){
 const {signature,...payload}=m;
 if(!/^\d+\.\d+\.\d+$/.test(m.version)||m.schema!==1||!Array.isArray(m.files)||!m.files.length)throw new Error('更新清单格式不正确');
 if(m.baseVersion&&m.baseVersion!==current)throw new Error('基础版本不匹配');
 if(!verify(null,Buffer.from(canonical(payload)),createPublicKey(key),Buffer.from(signature,'base64')))throw new Error('签名校验失败');
 const unique=new Set();for(const f of m.files){const full=m.delivery==='full';const allowed=full?/^(app\/(build|dist)\/|node_modules\/|runtime\/|automation\/)[a-zA-Z0-9_./@+-]+$/.test(f.path)||['package.json','package-lock.json','ACCEPTANCE_REPORT.md','README_使用说明.txt'].includes(f.path):/^app\/(build|dist)\/[a-zA-Z0-9_./@-]+$/.test(f.path);if(!allowed||f.path.includes('..')||! /^[a-f0-9]{64}$/.test(f.sha256)||unique.has(f.path))throw new Error('非法或重复的补丁路径');unique.add(f.path);}
 return m;
}
function atomicJSON(file,value){const tmp=file+'.tmp';writeFileSync(tmp,JSON.stringify(value,null,2));renameSync(tmp,file);}
export function installPrepared(root,stage,m,{selfTest=true,injectFailure=false}={}){
 root=path.resolve(root);const currentFile=path.join(root,'config/current-version.json');const old=existsSync(currentFile)?JSON.parse(readFileSync(currentFile,'utf8')):{version:'1.0.0',directory:'.'};
 const key=readFileSync(path.join(root,'config/update-public.pem'),'utf8');checkManifest(m,key,old.version);
 for(const f of m.files){if(digest(readFileSync(safe(stage,f.path)))!==f.sha256)throw new Error('文件哈希校验失败：'+f.path);}
 const journal=path.join(root,'updates/transaction.json');mkdirSync(path.join(root,'updates'),{recursive:true});
 if(existsSync(journal)&&!['STABLE','ROLLED_BACK'].includes(JSON.parse(readFileSync(journal,'utf8')).state))throw new Error('存在未恢复的更新事务');
 const backup=path.join(root,'backups','update-'+m.version+'-'+Date.now());mkdirSync(backup,{recursive:true});
 const database=path.join(root,'data/workbench.sqlite');if(existsSync(database)){const db=new DatabaseSync(database);db.exec('PRAGMA wal_checkpoint(TRUNCATE)');const row=db.prepare("SELECT value FROM meta WHERE key='schema'").get();db.close();if(!row||Number(row.value)!==m.schema)throw new Error('数据库迁移路径未验证');}
 if(existsSync(path.join(root,'data')))cpSync(path.join(root,'data'),path.join(backup,'data'),{recursive:true});
 atomicJSON(path.join(backup,'previous.json'),old);
 const target=path.join(root,'app/versions',m.version);if(existsSync(target))throw new Error('目标版本已存在，拒绝覆盖');
 atomicJSON(journal,{state:'CANDIDATE',version:m.version,previous:old,backup,candidate:path.relative(root,target)});
 try{
  mkdirSync(target,{recursive:true});const oldBase=safe(root,old.directory??'.');
  for(const sub of m.delivery==='full'?[]:['app/build','app/dist','node_modules','runtime','automation','package.json'])if(existsSync(path.join(oldBase,sub)))cpSync(path.join(oldBase,sub),path.join(target,sub),{recursive:true});
  for(const f of m.files){const dest=safe(target,f.path);mkdirSync(path.dirname(dest),{recursive:true});cpSync(safe(stage,f.path),dest);}
  atomicJSON(journal,{state:'TESTING',version:m.version,previous:old,backup,candidate:path.relative(root,target)});
  if(injectFailure)throw new Error('模拟启动测试失败');
  if(selfTest){const isolated=path.join(root,'updates','selftest-'+Date.now());mkdirSync(isolated,{recursive:true});if(existsSync(path.join(backup,'data')))cpSync(path.join(backup,'data'),path.join(isolated,'data'),{recursive:true});
   const candidateRuntime=existsSync(path.join(target,'runtime/node.exe'))?path.join(target,'runtime/node.exe'):process.execPath;
   execFileSync(candidateRuntime,[path.join(target,'app/build/server/index.js'),'--self-test'],{cwd:root,env:{...process.env,APP_ROOT:isolated},timeout:60000,windowsHide:true,stdio:'pipe'});
  }
  // Version pointer is the commit point. User data is never replaced by patch files.
  atomicJSON(currentFile,{version:m.version,directory:path.relative(root,target).replaceAll('\\','/')});
  atomicJSON(path.join(root,'config/last-known-good.json'),old);
  atomicJSON(journal,{state:'STABLE',version:m.version,previous:old,backup});return {state:'STABLE',version:m.version};
 }catch(error){
  atomicJSON(currentFile,old);atomicJSON(journal,{state:'ROLLED_BACK',version:m.version,previous:old,backup,error:String(error.message)});throw error;
 }
}
export function recover(root){const file=path.join(root,'updates/transaction.json');if(!existsSync(file))return null;const j=JSON.parse(readFileSync(file,'utf8'));if(['STABLE','ROLLED_BACK'].includes(j.state))return j.state;atomicJSON(path.join(root,'config/current-version.json'),j.previous);atomicJSON(file,{...j,state:'ROLLED_BACK',error:'检测到中断事务，已恢复版本指针；迁移尚未修改原数据库。'});return 'ROLLED_BACK';}
async function run(){const args=process.argv.slice(2);const root=path.resolve(args.includes('--root')?args[args.indexOf('--root')+1]:process.cwd());const pid=args.includes('--wait-pid')?Number(args[args.indexOf('--wait-pid')+1]):0;
 if(pid){for(let i=0;i<120;i++){try{process.kill(pid,0);}catch{break;}await new Promise(r=>setTimeout(r,500));if(i===119)throw new Error('服务未停止，取消更新');}}
 let serviceRunning=false;try{const response=await fetch(`http://127.0.0.1:${process.env.PORT??4317}/api/health`,{signal:AbortSignal.timeout(1200)});if(response.ok)serviceRunning=(await response.json()).instance===digest(path.resolve(root).toLowerCase());}catch{}if(serviceRunning)throw new Error('请先关闭工作台服务，或从软件内执行立即更新。');
 const recovered=recover(root);if(recovered==='ROLLED_BACK'){console.log('已检查并恢复中断事务');}
 const manifest=JSON.parse(readFileSync(path.join(root,'updates/pending.json'),'utf8'));const pointer=path.join(root,'config/current-version.json');const version=existsSync(pointer)?JSON.parse(readFileSync(pointer,'utf8')).version:'1.0.0';checkManifest(manifest,readFileSync(path.join(root,'config/update-public.pem'),'utf8'),version);const zip=path.join(root,'updates/pending.zip');if(digest(readFileSync(zip))!==manifest.sha256)throw new Error('ZIP 完整性校验失败');
 const stage=path.join(root,'updates','extracted-'+Date.now());mkdirSync(stage,{recursive:true});
 execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(path.dirname(fileURLToPath(import.meta.url)),'Extract-SafeZip.ps1'),'-Archive',zip,'-Destination',stage,...(manifest.delivery==='full'?['-Full']:[])],{windowsHide:true,timeout:120000,stdio:'pipe'});
 try{console.log(installPrepared(root,stage,manifest));}catch(e){console.error('更新失败，稳定版本已保留：',e.message);}
 const desktop=path.join(root,'config/desktop.json');
 if(existsSync(desktop))atomicJSON(path.join(root,'updates/desktop-install.json'),{status:'FINISHED',finished:Date.now()});
 if(existsSync(desktop)&&process.env.CALCULUS_DESKTOP_RUNNING==='1')return;
 const child=spawn(process.execPath,[path.join(root,'automation/launch.mjs')],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});child.unref();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))run().catch(e=>{console.error(e.message);process.exitCode=1;});
