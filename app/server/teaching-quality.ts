// These checks guard structural omissions; the independent model still judges the mathematics and usefulness.
export function teachingGranularityIssues(source:any[],concepts:any[]){
 const issues:string[]=[];
 for(const block of source){
  if(block.status==='NEEDS_VERIFY')continue;
  const linked=concepts.filter(c=>c.sourceIds.includes(block.id));
  if(block.kind==='定义'&&!linked.some(c=>c.focus==='definition'))issues.push(`${block.id} 缺少独立的严格定义节点。`);
  const proof=block.kind==='证明'||/证明[：:\s]/.test(block.content);
  if(proof){for(const focus of ['proof_goal','proof_strategy','proof_step'])if(!linked.some(c=>c.focus===focus))issues.push(`${block.id} 缺少证明教学节点：${focus}。`);
   if(/显然|易得|同理|即可|\\max|\\min|有限|中点/.test(block.content)&&!linked.some(c=>c.focus==='hidden_step'))issues.push(`${block.id} 教材证明存在跳步或构造，缺少隐藏步骤讲解。`);
  }
  // A symbol entry must actually explain the symbol, not merely repeat a formula.
  for(const c of linked.filter(c=>c.focus==='symbol'))if(!c.symbols?.length)issues.push(`${block.id} 符号节点未保存任何符号含义。`);
 }
 return [...new Set(issues)];
}
