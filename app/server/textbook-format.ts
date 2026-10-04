// Only repair PDF line wrapping and punctuation in math spans. Original text remains immutable.
export function formatTextbook(text:string){
 const commands=new Set(['frac','dfrac','tfrac','mathrm','mathbf','mathbb','mathcal','cdot','cos','sin','tan','cot','sec','csc','left','right','sqrt','varepsilon','epsilon','delta','Delta','infty','lim','sum','int','quad','qquad','leqslant','geqslant','text','begin','end','underbrace','overbrace','underset','overset','limits','ln','log','arctan','arcsin','arccos','partial']);
 const plain=text.replace(/(\\text\{[^{}]*?)\$([^$]+)\$([^{}]*\})/g,'$1$2$3');
 return plain.replace(/\$\$([\s\S]*?)\$\$|(?<!\$)\$([^$]+)\$(?!\$)/g,(whole,display,inline)=>{
  const body=(display??inline).replace(/\\([A-Za-z]*)\r?\n\s*([A-Za-z]+)/g,(match:string,a:string,b:string)=>commands.has(a+b)?'\\'+a+b:match).replace(/\s*\r?\n\s*/g,' ').replace(/[，；。：（）［］]/g,(c:string)=>({'，':',','；':';','。':'.','：':':','（':'(','）':')','［':'[','］':']'}[c]!));
  const delimiter=display!==undefined?'$$':'$';return delimiter+body+delimiter;
 });
}
