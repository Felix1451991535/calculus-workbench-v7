import mammoth from 'mammoth';
import JSZip from 'jszip';
import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {Store,hash} from './store.js';

export async function importNotes(store:Store,workspace:string,bytes:Buffer,name:string){
 store.workspace(workspace);const ext=path.extname(name).toLowerCase();const warnings:string[]=[];let text='';
 if(!['.txt','.docx'].includes(ext))throw new Error('支持 Word .docx 和 TXT；旧版 .doc 请另存为 .docx。');
 if(bytes.length>20*1024*1024)throw new Error('笔记文件不能超过20 MB');
 if(ext==='.txt'){
  const utf16=bytes[0]===255&&bytes[1]===254;text=new TextDecoder(utf16?'utf-16le':'utf-8',{fatal:true}).decode(bytes);
 }else{
  // Bound decompressed sizes before letting the DOCX parser allocate document contents.
  const end=bytes.lastIndexOf(Buffer.from([80,75,5,6]));if(end<0||end+22>bytes.length)throw new Error('Word文件不完整，请重新保存为.docx');
  const count=bytes.readUInt16LE(end+10);let offset=bytes.readUInt32LE(end+16),total=0;
  if(count>2000||count===65535)throw new Error('Word文件过于复杂');
  for(let i=0;i<count;i++){
   if(offset+46>bytes.length||bytes.readUInt32LE(offset)!==0x02014b50)throw new Error('Word压缩结构损坏');
   total+=bytes.readUInt32LE(offset+24);if(total>80*1024*1024)throw new Error('Word解压内容过大');
   offset+=46+bytes.readUInt16LE(offset+28)+bytes.readUInt16LE(offset+30)+bytes.readUInt16LE(offset+32);
  }
  const zip=await JSZip.loadAsync(bytes);const doc=zip.file('word/document.xml');if(!doc)throw new Error('这不是有效的.docx文档');
  const xml=await doc.async('string');if(/<(?:m:)?oMath\b|<m:oMathPara\b/.test(xml))warnings.push('包含Word数学公式：文字提取可能遗漏公式，请对照保存的Word原件补充。');
  if(/<w:drawing\b|<w:pict\b/.test(xml))warnings.push('包含图片或手写扫描内容：没有自动转写图片，请对照原件补充文字。');
  text=(await mammoth.extractRawText({buffer:bytes})).value;
 }
 if(!text.trim())throw new Error('未提取到可用文字；图片或手写笔记需要先转写。');
 if(text.length>2_000_000)throw new Error('文字过多，请按章节拆分导入');
 const digest=hash(bytes);const relative=`data/workspaces/${workspace}/raw/notes/${digest}${ext}`;const target=path.join(store.root,relative);mkdirSync(path.dirname(target),{recursive:true});if(!existsSync(target))writeFileSync(target,bytes,{flag:'wx'});
 return {text,warnings,source:{name:path.basename(name),path:relative,sha256:digest,format:ext.slice(1)}};
}
