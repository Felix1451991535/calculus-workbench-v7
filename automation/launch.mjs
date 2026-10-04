import {existsSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {recover} from './updater.mjs';
import {createHash} from 'node:crypto';
const root=process.cwd();
const port=4317;
const url=`http://127.0.0.1:${port}`;
const instance=createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex');
let anotherInstallation=false;
async function openBrowser(){if(process.platform==='win32')spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});}
try{const res=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1200)});if(res.ok){const data=await res.json();if(data.product==='calculus-workbench-v7'&&data.instance===instance){await openBrowser();process.exit(0);}anotherInstallation=true;}}catch{}
if(anotherInstallation)throw new Error('端口已被另一份软件占用，请关闭另一份工作台后再启动。');
recover(root);
let version=null;
const current=path.join(root,'config/current-version.json');
if(existsSync(current))version=JSON.parse(readFileSync(current,'utf8'));
if(version&&!/^\d+\.\d+\.\d+$/.test(version.version))throw new Error('版本配置错误');
const base=version?.directory?path.resolve(root,version.directory):root;
if(path.relative(root,base).startsWith('..'))throw new Error('版本目录越界');
const server=path.join(base,'app/build/server/index.js');
if(!existsSync(server))throw new Error('程序文件缺失，请获取完整发行包。');
const runtime=existsSync(path.join(base,'runtime/node.exe'))?path.join(base,'runtime/node.exe'):process.execPath;
const child=spawn(runtime,[server],{cwd:root,env:{...process.env,APP_ROOT:root,PORT:String(port)},windowsHide:true,stdio:'inherit'});
mkdirSync(path.join(root,'logs'),{recursive:true});writeFileSync(path.join(root,'logs/service.pid'),String(child.pid));
child.on('exit',code=>process.exit(code??0));
for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,500));try{const res=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)});if(res.ok&&(await res.json()).instance===instance){await openBrowser();break;}}catch{}}
