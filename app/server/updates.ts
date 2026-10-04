import { createPublicKey, verify } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Store, hash, now, contained } from './store.js';

const manifestBase=z.object({version:z.string().regex(/^\d+\.\d+\.\d+$/),baseVersion:z.string().nullable(),type:z.enum(['Patch','Minor','Major']),schema:z.literal(1),url:z.string().url(),sha256:z.string().regex(/^[a-f0-9]{64}$/),files:z.array(z.object({path:z.string(),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).min(1),changes:z.array(z.string()),risk:z.string(),databaseImpact:z.string(),tests:z.array(z.string()),signature:z.string(),published:z.string(),delivery:z.enum(['patch','full']).optional()});
export const updateSchema=manifestBase.extend({full:manifestBase.optional()});
export function programPath(value:string,full=false){if(value.includes('..')||value.includes('\\'))return false;return full?/^(app\/(build|dist)\/|node_modules\/|runtime\/|automation\/)[a-zA-Z0-9_./@+-]+$/.test(value)||['package.json','package-lock.json','ACCEPTANCE_REPORT.md','README_使用说明.txt'].includes(value):/^app\/(build|dist)\/[a-zA-Z0-9_./@-]+$/.test(value);}
export function canonical(value:any):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export function newer(a:string,b:string){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
export function releaseVersion(root:string){const p=path.join(root,'config/current-version.json');return existsSync(p)?JSON.parse(readFileSync(p,'utf8')).version:'1.0.0';}
export function verifyManifest(raw:any,publicKey:string){const manifest=updateSchema.parse(raw);const {signature,...payload}=manifest;
  if(!verify(null,Buffer.from(canonical(payload)),createPublicKey(publicKey),Buffer.from(signature,'base64')))throw new Error('更新签名校验失败');
  const paths=new Set<string>();for(const file of manifest.files){if(!programPath(file.path,manifest.delivery==='full')||paths.has(file.path))throw new Error('补丁包含禁止修改或重复的路径');paths.add(file.path);}
  if(!manifest.url.startsWith('https://github.com/Felix1451991535/calculus-workbench-v7/releases/download/'))throw new Error('更新下载地址不在发行渠道内');
  return manifest;
}
export function selectUpdate(raw:any,publicKey:string,current:string){const main=verifyManifest(raw,publicKey);if(!main.baseVersion||main.baseVersion===current)return main;if(main.full){const full=verifyManifest(main.full,publicKey);if(full.version!==main.version||full.delivery!=='full'||full.baseVersion!==null)throw new Error('完整更新替代清单不匹配');return full;}throw new Error('增量补丁基础版本不匹配，且发行方未提供已签名的完整更新。');}
export async function checkUpdates(store:Store){
  const local=releaseVersion(store.root);const keyPath=path.join(store.root,'config/update-public.pem');
  if(!existsSync(keyPath))return {status:'UNVERIFIED',current:local,message:'发行签名公钥尚未配置；不能验证在线更新。'};
  const distribution=path.join(store.root,'config/distribution.json');
  const channel=existsSync(distribution)?JSON.parse(readFileSync(distribution,'utf8')).channel:'stable';
  const url=channel==='candidate'?'https://raw.githubusercontent.com/Felix1451991535/calculus-workbench-v7/main/channels/candidate.json':'https://github.com/Felix1451991535/calculus-workbench-v7/releases/latest/download/update.json';
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(response.status===404)return {status:'UNVERIFIED',current:local,message:'在线渠道尚无正式发行清单。'};
  if(!response.ok)throw new Error(`更新检查失败 HTTP ${response.status}`);
  const raw=await response.json();const publicKey=readFileSync(keyPath,'utf8');const verified=verifyManifest(raw,publicKey);
  if(!newer(verified.version,local))return {status:'CURRENT',current:local};
  const manifest=selectUpdate(raw,publicKey,local);
  if(!newer(manifest.version,local))return {status:'CURRENT',current:local};
  writeFileSync(path.join(store.root,'updates/pending.json'),JSON.stringify(manifest,null,2));
  store.notify('update',`新版本 ${manifest.version}`,manifest);return {status:'AVAILABLE',current:local,manifest};
}
export async function downloadUpdate(store:Store){
  const manifest=verifyManifest(JSON.parse(readFileSync(path.join(store.root,'updates/pending.json'),'utf8')),readFileSync(path.join(store.root,'config/update-public.pem'),'utf8'));
  if(manifest.baseVersion&&manifest.baseVersion!==releaseVersion(store.root))throw new Error('补丁基础版本不匹配');
  const response=await fetch(manifest.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error('补丁下载失败');
  if(Number(response.headers.get('content-length')??0)>512*1024*1024)throw new Error('补丁体积超限');
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>512*1024*1024||hash(bytes)!==manifest.sha256)throw new Error('补丁完整性校验失败');
  writeFileSync(path.join(store.root,'updates/pending.zip'),bytes);return {status:'DOWNLOADED',manifest};
}
