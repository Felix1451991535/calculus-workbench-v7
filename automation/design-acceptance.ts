import {chromium,expect} from '@playwright/test';
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import path from 'node:path';
process.env.NODE_ENV='test';
const {createApp}=await import(new URL('../app/build/server/index.js',import.meta.url).href);
const evidenceBase='D:/CalcDevTools/design-evidence';mkdirSync(evidenceBase,{recursive:true});
const root=mkdtempSync(path.join(evidenceBase,'run-'));const {app,store}=createApp(root);
store.run('INSERT INTO workspaces VALUES(?,?,?,?,?,?)','w','自编设计验收教材','AUTHORED','data/test.pdf','TEST',1);
store.run('INSERT INTO pages VALUES(?,?,?,?,?,?,?)','w',1,'第一章 函数\n1.1 定义域\n自编例子：每个输入只有一个输出。',600,800,'[]','EXTRACTED');
const block={id:'b1',kind:'定义',title:'函数的定义',status:'ACCEPTED',formatted:'每个允许的输入恰好对应一个输出。例：$f(x)=x^2$，当 $x=2$ 时，$f(2)=4$。',content:'每个允许输入恰好对应一个输出。',mathIssues:[],source:{pdfIndex:1}};
const lesson={status:'CANDIDATE_REVIEWED',summary:'先确认哪些输入允许代入，再理解输出。',concepts:[{title:'允许的输入与符号',focus:'definition',body:'$x$ 表示输入，$f(x)$ 表示输出。代入 $x=2$ 得到 $f(2)=4$。本内容为自编 UI 验收示例。',symbols:[{symbol:'x',meaning:'允许代入的输入'}],relations:[],webIds:[]}],mistakes:[],checks:['当输入为 3 时，输出为 9。'],gaps:[],warnings:[],sources:[]};
const units=[{id:'u1',number:'1.1',chapter:'第一章 函数',title:'函数与定义域',blocks:[block],lesson,sourcePage:1},{id:'u2',number:'1.2',chapter:'第一章 函数',title:'另一节：尚未整理',blocks:[{...block,id:'b2'}],sourcePage:1}];
const fixture={units,build:{phase:'独立审核',coverage:{accepted:2,localExceptions:0},teachingCoverage:{teachingNodes:1}},conversion:{pages:1,capturedLines:3,textLines:3,entries:2,complete:true},completed:1,total:2,active:false};
const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
let browser:any;const results:any[]=[];const errors:string[]=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:960}});await page.addInitScript('window.__name = (value) => value');page.on('pageerror',e=>errors.push(e.message));
 let fail=false,requests=0;
 await page.route('**/api/workspaces/w/study',async route=>{requests++;if(requests===1)await new Promise(r=>setTimeout(r,450));await route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{error:'自编离线重试测试'}:fixture)});});
 const started=performance.now();await page.goto(`http://127.0.0.1:${(server.address() as any).port}`);
 await expect(page.getByText('正在读取整本教材知识框架')).toBeVisible();await expect(page.getByRole('heading',{name:'允许的输入与符号'})).toBeVisible();const loadMs=performance.now()-started;expect(loadMs).toBeLessThan(3000);
 await expect(page.locator('.conversion-status')).toHaveAttribute('aria-live','polite');await expect(page.getByRole('button',{name:'重新整理本节'})).toBeDisabled();
 const contrast=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);const rgb=(c:string)=>{const el=document.createElement('span');el.style.color=c;document.body.append(el);const v=getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0,3).map(Number);el.remove();return v;};const lum=(c:string)=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const a=lum(style.getPropertyValue('--muted'));return ['--paper','--side','--soft'].map(k=>{const b=lum(style.getPropertyValue(k));return {surface:k,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});contrast.forEach(x=>expect(x.ratio).toBeGreaterThanOrEqual(4.5));
 for(const theme of ['light','dark']){
  if(theme==='dark')await page.getByRole('button',{name:'切换暗色'}).click();const themeContrast=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);const rgb=(c:string)=>{const el=document.createElement('span');el.style.color=c;document.body.append(el);const v=getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0,3).map(Number);el.remove();return v;};const lum=(c:string)=>rgb(c).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const a=lum(style.getPropertyValue('--muted'));return ['--paper','--side','--soft'].map(k=>{const b=lum(style.getPropertyValue(k));return {surface:k,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});themeContrast.forEach(x=>expect(x.ratio).toBeGreaterThanOrEqual(4.5));
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:960});await expect(page.locator('.review-lesson')).toBeVisible();
   const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth>innerWidth,panels:[...document.querySelectorAll('.content-area,.review-workbench,.review-lesson,.textbook-block')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.className)}));expect(overflow).toEqual({document:false,panels:[]});
   await page.screenshot({path:path.join(root,`${theme}-${width}.png`),fullPage:true});await page.locator('.textbook-block').first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,`${theme}-${width}-reading.png`),fullPage:true});results.push({theme,width,overflow,themeContrast,status:'PASS'});
  }
 }
 const darkSurface=await page.locator('.textbook-block').evaluate(el=>getComputedStyle(el).backgroundColor);expect(darkSurface).not.toBe('rgb(255, 255, 255)');
 await page.getByLabel('搜索复习章节').focus();await page.keyboard.press('Tab');expect(await page.evaluate(()=>getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none');
 const t=performance.now();await page.getByLabel('搜索复习章节').fill('无匹配内容');await expect(page.getByText('未找到匹配章节，试试更短的关键词。')).toBeVisible();const interactionMs=performance.now()-t;expect(interactionMs).toBeLessThan(500);await page.getByLabel('搜索复习章节').fill('');
 await page.getByRole('button',{name:'1.2 另一节：尚未整理 待整理'}).click();await expect(page.getByRole('button',{name:'生成本节详解'})).toBeDisabled();await page.getByLabel('同意发送教材片段给模型，承担识别与整理费用').check();await expect(page.getByRole('button',{name:'生成本节详解'})).toBeEnabled();
 fail=true;await expect(page.getByText(/进度暂时无法更新/)).toBeVisible({timeout:5000});fail=false;await page.getByRole('button',{name:'重试更新'}).click();await expect(page.getByText(/进度暂时无法更新/)).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'reduce'});const motion=await page.evaluate(()=>{const el=document.createElement('span');el.className='spin';document.body.append(el);const animation=getComputedStyle(el).animationName;el.remove();return {animation,scroll:getComputedStyle(document.querySelector('.content-area')!).scrollBehavior,navTransition:getComputedStyle(document.querySelector('.nav-item')!).transitionDuration};});expect(motion).toEqual({animation:'none',scroll:'auto',navTransition:'0s'});expect(errors).toEqual([]);
 results.push({name:'加载、同意/禁用、空搜索、键盘焦点、错误重试、reduced-motion与无前端异常',status:'PASS',loadMs,interactionMs,contrast,darkSurface,motion});
}finally{await browser?.close();await new Promise<void>(r=>server.close(()=>r()));store.close();writeFileSync(path.join(root,'results.json'),JSON.stringify({fixture:'AUTHORED UI ONLY: no real model acceptance, no user textbook/key',results,errors},null,2));console.log(JSON.stringify({evidenceRoot:root,results,errors}));}
