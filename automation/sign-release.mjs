import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {canonical} from './updater.mjs';
const root=process.cwd();const args=process.argv.slice(2);const version=args[0];const base=args[1]??null;
if(!/^\d+\.\d+\.\d+$/.test(version??''))throw new Error('需要明确语义版本');
const privateDir=path.resolve(root,'../../work/release-signing');mkdirSync(privateDir,{recursive:true});const privateFile=path.join(privateDir,'update-private.pem');
if(!existsSync(privateFile)){const pair=generateKeyPairSync('ed25519');writeFileSync(privateFile,pair.privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});writeFileSync(path.join(root,'config/update-public.pem'),pair.publicKey.export({type:'spki',format:'pem'}));}
const digest=b=>createHash('sha256').update(b).digest('hex');
function files(relative){return readdirSync(path.join(root,relative),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(relative+'/'+e.name):[{path:relative+'/'+e.name,sha256:digest(readFileSync(path.join(root,relative,e.name)))}]);}
const zip=path.join(root,'release',`CalculusWorkbench-v${version}-Patch.zip`);if(!existsSync(zip)){console.log('签名公钥已准备。生成补丁ZIP后再次运行。');process.exit(0);}
const manifest={version,baseVersion:base,type:base&&version.split('.').slice(0,2).join('.')===base.split('.').slice(0,2).join('.')?'Patch':'Minor',schema:1,url:`https://github.com/Felix1451991535/calculus-workbench-v7/releases/download/v${version}/CalculusWorkbench-v${version}-Patch.zip`,sha256:digest(readFileSync(zip)),files:[...files('app/build'),...files('app/dist')],changes:['V7 独立重做的候选版本：教材核验、学习界面、记录与诊断、签名更新及回滚',version.startsWith('1.2.')?'独立Windows桌面窗口、可分享EXE安装包与桌面ZIP、持久任务动态及Word笔记导入':version==='1.1.0'?'同书多来源对照、批量视觉识别与续做、知识框架及单次限量学习建议':base?'全局搜索快捷键与更新提醒体验补丁':'首版内置运行时与本机维护任务'],risk:'候选预览版；真实DeepSeek样本已验收，整本教材与长期维护效果尚待验证，联网研究与期末导出后续完成。',databaseImpact:'schema=1，无结构变更；更新前完整备份。',tests:['TypeScript 编译与类型检查','离线单元与 HTTP 测试','Chrome 亮暗、窄屏及教材核验流程','签名、基础版本、数据保留与失败回滚','真实DeepSeek知识页、视觉、多轮Tutor、独立出题验题','真实Candidate回归修复，原Stable样本未修改'],published:new Date().toISOString()};
if(version==='1.3.0'){
 manifest.changes=['教材复习首页：按章节组织AI知识卡片，解释符号、条件、推导、例题、易错点与自测','扫描教材自动识别、联网书目及概念资料检索、独立审查、最多三轮修订与暂停续做','明确AI问答入口与选中内容追问；保留Word笔记、教材事实版本和学习数据'];
 manifest.tests=['21项自动测试','8项Chrome原有功能流程及3项新增复习问答流程','真实用户教材一节7张知识卡片及问答经独立模型审查；非全书验证','签名更新、独立桌面运行、Word原始笔记保留'];
 manifest.risk='Candidate候选版。整本扫描教材及长期教学效果未验证。网上资料不保证匹配教材版本或补齐缺页；期末Word/PDF导出待完成。';
}
const fullZip=path.join(root,'release',`CalculusWorkbench-v${version}-Windows-x64.zip`);
if(!existsSync(fullZip))throw new Error('缺少完整发行包，拒绝发布不能跨版本升级的清单');
const eligible=p=>/^(app\/(build|dist)\/|node_modules\/|runtime\/|automation\/)[a-zA-Z0-9_./@+-]+$/.test(p)||['package.json','package-lock.json','ACCEPTANCE_REPORT.md','README_使用说明.txt'].includes(p);
const stageRoot=path.join(root,'release/staging');const stages=readdirSync(stageRoot,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>path.join(stageRoot,x.name,`CalculusWorkbench-v${version}-Windows-x64`)).filter(existsSync).sort();const stage=stages.at(-1);if(!stage)throw new Error('缺少对应版本生产暂存目录');
function inventory(dir,relative=''){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=relative?relative+'/'+e.name:e.name;return e.isDirectory()?inventory(path.join(dir,e.name),p):eligible(p)?[{path:p,sha256:digest(readFileSync(path.join(dir,e.name)))}]:[];});}
const full={...manifest,delivery:'full',baseVersion:null,url:`https://github.com/Felix1451991535/calculus-workbench-v7/releases/download/v${version}/CalculusWorkbench-v${version}-Windows-x64.zip`,sha256:digest(readFileSync(fullZip)),files:inventory(stage)};
manifest.delivery='patch';manifest.full={...full,signature:sign(null,Buffer.from(canonical(full)),readFileSync(privateFile)).toString('base64')};
const publishedManifest=args.includes('--full-only')?full:manifest;
const signature=sign(null,Buffer.from(canonical(publishedManifest)),readFileSync(privateFile)).toString('base64');
mkdirSync(path.join(root,'channels'),{recursive:true});writeFileSync(path.join(root,'channels/candidate.json'),JSON.stringify({...publishedManifest,signature},null,2));writeFileSync(path.join(root,'release',`update-v${version}.json`),JSON.stringify({...publishedManifest,signature},null,2));console.log('已签名候选清单 '+version+'；私钥保留于独立发布工作目录。');
