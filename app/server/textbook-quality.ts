import {mathErrors} from './ai.js';
import {formatTextbook} from './textbook-format.js';

// Acceptance concerns source extraction, never a claim of mathematical proof or human approval.
const cache=new Map<string,{formatted:string;issues:string[];status:string}>();
export function textbookQuality(content:string,options:{pageStatus?:string;conflicts?:string[]}={}){
 const key=JSON.stringify([content,options.pageStatus,options.conflicts]);const prior=cache.get(key);if(prior)return prior;
 const formatted=formatTextbook(content);const issues=[...mathErrors(formatted),...(options.conflicts??[])];
 if(!content.trim())issues.push('该位置尚未提取出正文。');
 if(options.pageStatus&&options.pageStatus!=='EXTRACTED')issues.push('页面文字提取不完整，需要视觉识别。');
 if(content.includes('\uFFFD'))issues.push('原文包含无法识别的字符。');
 const unique=[...new Set(issues)];const result={formatted,issues:unique,status:unique.length?'NEEDS_VERIFY':'TEXTBOOK_ACCEPTED'};
 if(cache.size>=5000)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}
