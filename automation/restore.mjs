import {existsSync,readFileSync,cpSync,mkdirSync,renameSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();const name=process.argv[2];const serviceConfig=path.join(root,'config/service.json');const port=process.env.PORT??(existsSync(serviceConfig)?JSON.parse(readFileSync(serviceConfig,'utf8')).port:4317);
if(!name||!/^[a-zA-Z0-9_.-]+$/.test(name))throw new Error('请输入备份名称，不包含路径。');
try{const response=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1000)});if(response.ok){const data=await response.json();const instance=createHash('sha256').update(path.resolve(root).toLowerCase()).digest('hex');if(data.instance===instance)throw new Error('请先关闭工作台，再恢复数据。');}}catch(e){if(e.message==='请先关闭工作台，再恢复数据。')throw e;}
const folder=path.join(root,'backups',name);if(!existsSync(path.join(folder,'backup.json')))throw new Error('不是完整备份');
const manifest=JSON.parse(readFileSync(path.join(folder,'backup.json'),'utf8'));if(manifest.schema!==1)throw new Error('不支持该备份的数据版本');
const db=new DatabaseSync(path.join(folder,'data/workbench.sqlite'),{readOnly:true});const row=db.prepare('PRAGMA integrity_check').get();db.close();if(Object.values(row)[0]!=='ok')throw new Error('备份数据库损坏');
const current=path.join(root,'data');const saved=path.join(root,'backups','before-restore-'+Date.now());mkdirSync(saved,{recursive:true});
if(existsSync(current))renameSync(current,path.join(saved,'data'));
try{cpSync(path.join(folder,'data'),current,{recursive:true});console.log('恢复完成，原数据另存于 '+path.basename(saved));}catch(e){if(existsSync(current))renameSync(current,path.join(saved,'partial-restore'));if(existsSync(path.join(saved,'data')))renameSync(path.join(saved,'data'),current);throw e;}
