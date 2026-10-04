import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

export type Status = 'EXTRACTED' | 'NEEDS_VERIFY' | 'VERIFIED';
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
export function contained(root: string, relative: string) {
  const resolved = path.resolve(root, relative);
  const rel = path.relative(path.resolve(root), resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel) || relative.includes('\0')) throw new Error('路径越界');
  return resolved;
}
export class Store {
  db: DatabaseSync;
  constructor(public root: string) {
    for (const dir of ['data/workspaces','logs','backups','exports','updates','config']) mkdirSync(path.join(root,dir), {recursive:true});
    this.db = new DatabaseSync(path.join(root,'data','workbench.sqlite'));
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,title TEXT NOT NULL,hash TEXT UNIQUE NOT NULL,pdf TEXT NOT NULL,created TEXT NOT NULL,pages INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS pages(workspace TEXT NOT NULL,idx INTEGER NOT NULL,text TEXT NOT NULL,width REAL,height REAL,items TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(workspace,idx),FOREIGN KEY(workspace) REFERENCES workspaces(id));
      CREATE TABLE IF NOT EXISTS facts(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,kp TEXT NOT NULL,chapter TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,content TEXT NOT NULL,latex TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL,version INTEGER NOT NULL,previous TEXT,created TEXT NOT NULL,FOREIGN KEY(workspace) REFERENCES workspaces(id));
      CREATE TABLE IF NOT EXISTS knowledge(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,kp TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,refs TEXT NOT NULL,status TEXT NOT NULL,review TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,kind TEXT NOT NULL,kp TEXT NOT NULL,raw TEXT NOT NULL,derived TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,kp TEXT NOT NULL,role TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,workspace TEXT,kind TEXT NOT NULL,status TEXT NOT NULL,progress INTEGER NOT NULL,result TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS inbox(id TEXT PRIMARY KEY,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS questions(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,kp TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,review TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS research(id TEXT PRIMARY KEY,workspace TEXT NOT NULL,kp TEXT NOT NULL,url TEXT NOT NULL,title TEXT NOT NULL,excerpt TEXT NOT NULL,status TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS edges(workspace TEXT NOT NULL,from_kp TEXT NOT NULL,to_kp TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(workspace,from_kp,to_kp,kind));
      CREATE TABLE IF NOT EXISTS symbols(workspace TEXT NOT NULL,chapter TEXT NOT NULL,symbol TEXT NOT NULL,meaning TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(workspace,chapter,symbol));
      INSERT OR IGNORE INTO meta VALUES('schema','1');`);
    this.db.prepare("UPDATE tasks SET status='FAILED',result=?,updated=? WHERE status IN ('RUNNING','QUEUED')").run(JSON.stringify({error:'服务重启，任务已中断。可重新执行；原始资料已保留。'}),now());
  }
  all(sql: string, ...args: (string | number | null)[]) { return this.db.prepare(sql).all(...args) as any[]; }
  one(sql: string, ...args: (string | number | null)[]) { return this.db.prepare(sql).get(...args) as any; }
  run(sql: string, ...args: (string | number | null)[]) { return this.db.prepare(sql).run(...args); }
  workspace(workspace: string) { const row = this.one('SELECT * FROM workspaces WHERE id=?',workspace); if (!row) throw new Error('教材不存在'); return row; }
  facts(workspace: string, verified=false) {
    return this.all(`SELECT f.* FROM facts f WHERE workspace=? AND NOT EXISTS(SELECT 1 FROM facts n WHERE n.previous=f.id) ${verified ? "AND status='VERIFIED'" : ''} ORDER BY chapter,created`,workspace).map(f=>({...f,source:JSON.parse(f.source)}));
  }
  fact(input: any, status: Status='NEEDS_VERIFY', previous?: string) {
    this.workspace(input.workspace);
    const factId=id(); const prev=previous ? this.one('SELECT * FROM facts WHERE id=? AND workspace=?',previous,input.workspace) : null;
    if (previous && !prev) throw new Error('事实版本不存在');
    this.run('INSERT INTO facts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',factId,input.workspace,prev?.kp ?? input.kp ?? id(),input.chapter ?? '待整理',input.kind ?? '片段',input.title,input.content,input.latex ?? '',JSON.stringify(input.source),status,(prev?.version??0)+1,previous??null,now());
    return factId;
  }
  async task(workspace: string | null, kind: string, action: (progress: (value:number)=>void)=>Promise<any>) {
    const taskId=id();
    this.run('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)',taskId,workspace,kind,'QUEUED',0,'{}',now(),now());
    setImmediate(async()=>{
      this.run('UPDATE tasks SET status=?,updated=? WHERE id=?','RUNNING',now(),taskId);
      try { const result=await action(p=>this.run('UPDATE tasks SET progress=?,updated=? WHERE id=?',p,now(),taskId));
        this.run('UPDATE tasks SET status=?,progress=100,result=?,updated=? WHERE id=?','DONE',JSON.stringify(result),now(),taskId);
      } catch (e) { this.run('UPDATE tasks SET status=?,result=?,updated=? WHERE id=?','FAILED',JSON.stringify({error:e instanceof Error?e.message:'任务失败'}),now(),taskId); }
    });
    return taskId;
  }
  audit(workspace: string) {
    const book=this.workspace(workspace); const pages=this.all('SELECT idx,status,text FROM pages WHERE workspace=?',workspace); const facts=this.facts(workspace);
    const unresolved=pages.filter(p=>p.status!=='EXTRACTED').map(p=>({type:'页面',page:p.idx,reason:p.status}));
    const pending=facts.filter(f=>f.status!=='VERIFIED'); const counts:Record<string,number>={}; facts.forEach(f=>counts[f.kind]=(counts[f.kind]??0)+1);
    return {pages:book.pages,processedPages:pages.length,pageProcessing:book.pages?pages.length/book.pages:0,verified:facts.length-pending.length,totalCandidates:facts.length,verifiedRatio:facts.length?(facts.length-pending.length)/facts.length:0,counts,unresolved,pending:pending.map(f=>({id:f.id,title:f.title,chapter:f.chapter})),trust:pending.length===0 && unresolved.length===0 && facts.length>0 ? 'VERIFIED_REVIEWED_SCOPE' : 'NEEDS_VERIFY',notice:'已核验比例仅以已发现候选为分母，不代表全部教材事实已识别。章节结构及完整性仍需对照目录核验。'};
  }
  snapshot(label='manual') {
    this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    const name=`${new Date().toISOString().replace(/[:.]/g,'-')}-${label}.sqlite`;
    copyFileSync(path.join(this.root,'data/workbench.sqlite'),path.join(this.root,'backups',name)); return name;
  }
  notify(kind:string,title:string,body:any) {this.run('INSERT INTO inbox VALUES(?,?,?,?,?)',id(),kind,title,JSON.stringify(body),now());}
  close(){this.db.close();}
}
