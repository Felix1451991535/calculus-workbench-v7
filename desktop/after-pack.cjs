const fs=require('node:fs');const path=require('node:path');
module.exports=async context=>{
 const source=path.resolve(__dirname,'../work/desktop-payload/node_modules');
 const dest=path.join(context.appOutDir,'resources/workbench/node_modules');
 fs.cpSync(source,dest,{recursive:true});
 const root=path.resolve(__dirname,'..');
 for(const name of ['恢复学习数据.bat','注册长期维护.bat'])fs.copyFileSync(path.join(root,name),path.join(context.appOutDir,'resources/workbench',name));
 for(const name of ['express','mammoth','jszip','pdfjs-dist','@napi-rs/canvas']){
  if(!fs.existsSync(path.join(dest,name,'package.json')))throw new Error('桌面发行包缺少运行依赖：'+name);
 }
};
