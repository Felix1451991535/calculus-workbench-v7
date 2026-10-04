const {app,BrowserWindow,dialog,Menu}=require('electron');
const {spawn}=require('node:child_process');
const {existsSync,readFileSync,writeFileSync,mkdirSync,cpSync,createWriteStream}=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {createHash}=require('node:crypto');
let win,child,root,port,quitting=false,starting=false,log;
const smoke=process.env.CALCULUS_DESKTOP_SMOKE==='1';
root=process.env.CALCULUS_DESKTOP_ROOT||path.join(path.dirname(process.execPath),'workspace');
mkdirSync(path.join(root,'.desktop-profile'),{recursive:true});
app.setPath('userData',path.join(root,'.desktop-profile'));
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
 app.whenReady().then(start).catch(fail);
 app.on('before-quit',()=>{quitting=true;if(child)child.kill();});
 app.on('window-all-closed',()=>app.quit());
}
function status(message){if(win&&!win.isDestroyed())win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<html><body style="background:#f5f4ee;color:#213d32;font-family:Segoe UI;padding:70px"><h1>知微 · 高数工作台</h1><p>'+message+'</p></body></html>'));}
function fail(error){if(log)log.write(String(error.stack||error)+'\n');if(smoke){console.error(error);app.exit(1);return;}dialog.showErrorBox('工作台启动失败',String(error.message||error)+'\n学习资料仍保留。');app.quit();}
async function choosePort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const value=server.address().port;await new Promise(resolve=>server.close(resolve));return value;}
async function start(){
 const payload=app.isPackaged?path.join(process.resourcesPath,'workbench'):path.resolve(__dirname,'../work/desktop-payload');
 mkdirSync(root,{recursive:true});mkdirSync(path.join(root,'logs'),{recursive:true});
 log=createWriteStream(path.join(root,'logs/desktop.log'),{flags:'a'});
 win=new BrowserWindow({width:1440,height:950,minWidth:850,minHeight:650,title:'知微 · 高数学习工作台',backgroundColor:'#f5f4ee',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 Menu.setApplicationMenu(null);win.once('ready-to-show',()=>win.show());
 status('正在准备本机工作区，首次启动需要复制程序文件…');
 if(!existsSync(path.join(root,'app/build/server/index.js'))){
  // Copy only the clean distributable payload. Existing user directories are never replaced.
  cpSync(payload,root,{recursive:true,errorOnExist:true,force:false});
 }
 writeFileSync(path.join(root,'config/desktop.json'),JSON.stringify({executable:path.relative(root,process.execPath),format:1}));
 const {recover}=await import(pathToURL(path.join(root,'automation/updater.mjs')));recover(root);
 await startService();
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(`http://127.0.0.1:${port}/`))event.preventDefault();});
 if(smoke){const ok=await win.webContents.executeJavaScript("!!document.querySelector('#root')&&document.body.innerText.includes('知微')");if(!ok)throw new Error('桌面页面没有加载');console.log('DESKTOP_WINDOW_PASS '+root);app.quit();}
}
function pathToURL(p){return require('node:url').pathToFileURL(p).href;}
async function startService(){
 if(starting||quitting)return;starting=true;
 try{
  port=await choosePort();writeFileSync(path.join(root,'config/service.json'),JSON.stringify({port}));
  const pointer=JSON.parse(readFileSync(path.join(root,'config/current-version.json'),'utf8'));
  const base=path.resolve(root,pointer.directory||'.');if(path.relative(root,base).startsWith('..'))throw new Error('版本目录越界');
  const runtime=existsSync(path.join(base,'runtime/node.exe'))?path.join(base,'runtime/node.exe'):path.join(root,'runtime/node.exe');
  status('正在启动学习服务…');
  child=spawn(runtime,[path.join(base,'app/build/server/index.js')],{cwd:root,env:{...process.env,APP_ROOT:root,PORT:String(port),CALCULUS_DESKTOP_RUNNING:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
  const own=child;let exited=false;own.once('exit',()=>{exited=true;if(child===own)child=null;if(!quitting&&!starting)serviceExit().catch(fail);});
  const instance=createHash('sha256').update(root.toLowerCase()).digest('hex');let ready=false;
  for(let i=0;i<120;i++){if(exited)throw new Error('学习服务未能启动，详见 workspace/logs/desktop.log');try{const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json()).instance===instance){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
  if(!ready)throw new Error('学习服务启动超时');
  await win.loadURL(`http://127.0.0.1:${port}/`);
  await new Promise(resolve=>setTimeout(resolve,1200));
 }finally{starting=false;}
}
async function serviceExit(){
 const pending=path.join(root,'updates/pending.json');if(!existsSync(pending))throw new Error('学习服务已停止，请重新启动工作台。');
 status('正在安装更新并保留学习资料，失败会自动回滚…');
 const journal=path.join(root,'updates/desktop-install.json');
 for(let i=0;i<600;i++){
  if(existsSync(journal)){const state=JSON.parse(readFileSync(journal,'utf8')).status;if(state==='FINISHED'){await startService();return;}}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw new Error('更新未完成，请重新启动软件以恢复稳定版本。');
}
