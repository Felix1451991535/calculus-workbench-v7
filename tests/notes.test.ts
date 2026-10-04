import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,readFileSync} from 'node:fs';import path from 'node:path';import JSZip from 'jszip';
import {Store} from '../app/server/store.js';import {importNotes} from '../app/server/notes.js';
test('Word笔记提取、原件保留、公式警示及损坏文件拒绝',async()=>{
 mkdirSync('work/tests',{recursive:true});const store=new Store(mkdtempSync(path.resolve('work/tests/notes-')));store.run('INSERT INTO workspaces VALUES(?,?,?,?,?,?)','w','AUTHORED NOTES TEST','h','test.pdf',new Date().toISOString(),1);
 try{
  const zip=new JSZip();zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');zip.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:body><w:p><w:r><w:t>自编测试笔记：导数定义必须保留极限条件。</w:t></w:r></w:p><w:p><m:oMath><m:r><m:t>x</m:t></m:r></m:oMath></w:p></w:body></w:document>');const bytes=await zip.generateAsync({type:'nodebuffer'});
  const result=await importNotes(store,'w',bytes,'notes.docx');assert.match(result.text,/导数定义/);assert.equal(result.warnings.length,1);assert.deepEqual(readFileSync(path.join(store.root,result.source.path)),bytes);assert.equal((await importNotes(store,'w',bytes,'again.docx')).source.sha256,result.source.sha256);
  assert.equal((await importNotes(store,'w',Buffer.from('纯文字测试'),'notes.txt')).text,'纯文字测试');await assert.rejects(importNotes(store,'w',bytes,'old.doc'),/另存/);await assert.rejects(importNotes(store,'w',Buffer.from('invalid'),'broken.docx'),/不完整/);
 }finally{store.close();}
});
