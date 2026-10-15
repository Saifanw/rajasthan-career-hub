/* DOCX export: reads the rendered resume so Word matches the preview. Real text, no tables. */
const $=s=>document.querySelector(s);
const lib=()=>window.docx?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
$('#dlx').onclick=async()=>{
 try{await lib()}catch(e){alert('Could not load the DOCX library. Check your internet and try again.');return}
 const{Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,TabStopType,BorderStyle}=window.docx,p=$('#paper'),ac=(getComputedStyle(p).getPropertyValue('--ac').trim()||'#1450d6').replace('#',''),K=[];
 const run=(t,o={})=>new TextRun({text:t,font:'Calibri',size:21,...o}),T=e=>e.textContent.trim();
 const kids=el=>[...el.childNodes].map(c=>run(c.textContent,{bold:c.tagName==='B',italics:c.tagName==='I'}));
 K.push(new Paragraph({children:[run(T(p.querySelector('h1')),{bold:true,size:40})]}));
 const hl=p.querySelector('.hl'),ct=p.querySelector('.ct'),pd=p.querySelector('.pd');
 if(hl)K.push(new Paragraph({children:[run(T(hl),{size:24})]}));
 if(ct)K.push(new Paragraph({children:[run(T(ct),{size:19})],spacing:{after:pd?40:120}}));
 if(pd)K.push(new Paragraph({children:kids(pd).length?[...pd.children].flatMap((s,i)=>[...kids(s),run(i<pd.children.length-1?'   |   ':'')]):[],spacing:{after:120}}));
 const walk=n=>{
  if(n.tagName==='P')K.push(new Paragraph({children:kids(n),spacing:{after:60}}));
  else if(n.tagName==='UL')n.querySelectorAll('li').forEach(li=>K.push(new Paragraph({bullet:{level:0},children:[run(T(li))]})));
  else if(n.classList.contains('en')){const sp=n.querySelector('.r1').children;K.push(new Paragraph({tabStops:[{type:TabStopType.RIGHT,position:10100}],keepNext:true,spacing:{before:80},children:[...kids(sp[0]),...(sp[1]?[run('\t'),run(T(sp[1]))]:[])]}));[...n.children].slice(1).forEach(walk)}
  else if(n.tagName==='DIV')K.push(new Paragraph({children:kids(n)}))};
 p.querySelectorAll('section').forEach(s=>{
  K.push(new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:200,after:80},border:{bottom:{style:BorderStyle.SINGLE,size:6,color:ac}},children:[run(T(s.querySelector('h2')).toUpperCase(),{bold:true,color:ac,size:22})]}));
  [...s.children].slice(1).forEach(walk)});
 K.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:300},children:[run('Made with Rajasthan Job Resume Builder',{size:16,color:'777777'})]}));
 const doc=new Document({sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:800,bottom:800,left:900,right:900}}},children:K}]});
 const blob=await Packer.toBlob(doc),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=window.RB.fname()+'.docx';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
