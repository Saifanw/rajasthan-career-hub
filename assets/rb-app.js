/* Rajasthan Job Resume Builder - Phase 1. Vanilla ES module, no build step. */
const KEY='rb_resume_v1', V=1;
const $=s=>document.querySelector(s);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SCHEMA={
 personal:{t:'Personal details',one:1,hint:'Name aur contact sahi likhein. Recruiter yahin se call karta hai.',f:[['name','Full name'],['headline','Headline or target role'],['city','City, State'],['phone','Phone (10 digits)'],['email','Email'],['linkedin','LinkedIn URL'],['github','GitHub URL'],['portfolio','Portfolio URL']]},
 summary:{t:'Summary',one:1,hint:'2-3 lines: who you are, key skills, what you want. Sirf sach likhein.',f:[['text','Summary','ta']]},
 skills:{t:'Skills',add:'Add skill group',hint:'Group them, e.g. "Tools: Excel, SQL, Tally". Add only skills you really have.',f:[['label','Group name'],['list','Skills (comma separated)']]},
 experience:{t:'Experience',add:'Add experience',hint:'Start each bullet with a verb (Built, Led, Reduced). Pattern: did X using Y, result Z. Add numbers where true.',f:[['role','Job title'],['company','Company'],['city','City'],['start','Start (e.g. Jan 2023)'],['end','End (or Present)'],['bullets','Bullets, one per line','ta']]},
 projects:{t:'Projects',add:'Add project',hint:'Freshers: 1-3 real projects work like experience.',f:[['name','Project name'],['link','Link (optional)'],['tech','Tech stack / tools'],['desc','What you did and the result','ta']]},
 education:{t:'Education',add:'Add education',hint:'Latest first.',f:[['degree','Degree / course'],['school','College / board'],['year','Year (e.g. 2022-2025)'],['score','Score (CGPA / %)']]},
 certs:{t:'Certifications',add:'Add certification',hint:'Only certificates you hold.',f:[['name','Certification'],['issuer','Issuer, year']]}
};
Object.assign(SCHEMA,{
 achievements:{t:'Achievements',add:'Add achievement',hint:'Real awards, ranks, results. One line each.',f:[['text','Achievement']]},
 languages:{t:'Languages',add:'Add language',hint:'e.g. Hindi (Native), English (Fluent).',f:[['name','Language'],['level','Level']]},
 custom:{t:'Custom section',one:1,hint:'Any extra section, e.g. Internships or Hobbies. Add a title and lines.',f:[['title','Section title'],['text','Lines, one per line','ta']]}});
const ORDER=['personal','summary','skills','experience','projects','education','certs','achievements','languages','custom'];
const HEAD={summary:'Summary',skills:'Skills',experience:'Experience',projects:'Projects',education:'Education',certs:'Certifications',achievements:'Achievements',languages:'Languages'};
const blank=()=>({v:V,meta:{template:'classic'},theme:{accent:'#1450d6',font:'plex',size:'10.5',gap:'1'},sections:ORDER.map(id=>({id,show:true})),
 items:{personal:{},summary:{text:''},skills:[],experience:[],projects:[],education:[],certs:[],achievements:[],languages:[],custom:{title:'',text:''}}});
const sample=()=>{const d=blank();d.items={
 personal:{name:'Sample Candidate',headline:'Junior Data Analyst',city:'Jaipur, Rajasthan',phone:'9000000000',email:'sample.candidate@example.com',linkedin:'https://linkedin.com/in/sample-candidate',github:'',portfolio:''},
 summary:{text:'Data-minded B.Com graduate with hands-on Excel and SQL practice. Looking for a junior analyst role where I can turn raw sales data into clear weekly reports.'},
 skills:[{label:'Tools',list:'Excel, SQL, Power BI, Google Sheets'},{label:'Soft skills',list:'Reporting, Communication, Attention to detail'}],
 experience:[{role:'Data Entry Intern',company:'Sample Traders Pvt Ltd',city:'Jaipur',start:'Jun 2024',end:'Dec 2024',bullets:'Cleaned and updated 1,200+ customer records in Excel using lookup formulas\nBuilt a weekly sales summary that cut report time from 3 hours to 1 hour\nCoordinated with 4 team members to fix duplicate entries'}],
 projects:[{name:'Retail Sales Dashboard',link:'',tech:'Excel, Power BI',desc:'Built a dashboard of 12 months of sample sales data showing top products and monthly trend.'}],
 education:[{degree:'B.Com',school:'Sample College, Rajasthan University',year:'2021-2024',score:'68%'}],
 certs:[{name:'Advanced Excel',issuer:'Sample Institute, 2024'}]};return d};
const migrate=d=>{if(!d||typeof d!=='object')return null;const b=blank();d.v=d.v||0;
 const m={...b,...d,meta:{...b.meta,...d.meta},theme:{...b.theme,...d.theme},items:{...b.items,...d.items}};
 const have=new Set((d.sections||[]).map(s=>s.id));m.sections=[...(d.sections||[]),...ORDER.filter(i=>!have.has(i)).map(id=>({id,show:true}))].filter(s=>ORDER.includes(s.id));m.v=V;return m};
let D=(()=>{try{return migrate(JSON.parse(localStorage.getItem(KEY)))}catch(e){return null}})()||sample();
let hist=[JSON.stringify(D)],hi=0,tH=0;

/* ---------- validation + helpers ---------- */
const okPhone=p=>/^[6-9]\d{9}$/.test(String(p).replace(/[\s+\-]/g,'').replace(/^(91|0)(?=\d{10}$)/,''));
const okMail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const okUrl=u=>{try{const x=new URL(/^https?:/i.test(u)?u:'https://'+u);return /\./.test(x.hostname)}catch(e){return false}};
const href=u=>/^https?:/i.test(u)?u:'https://'+u;
const show=u=>String(u).replace(/^https?:\/\/(www\.)?/i,'').replace(/\/$/,'');
const lines=t=>String(t||'').split('\n').map(s=>s.replace(/^[\s\-•*]+/,'').trim()).filter(Boolean);
const dates=(a,b)=>[a,b].filter(Boolean).join(' - ');
const FIELDERR={phone:v=>v&&!okPhone(v)?'Enter a 10-digit Indian mobile number':'',email:v=>v&&!okMail(v)?'Enter a valid email, like name@gmail.com':'',linkedin:v=>v&&!okUrl(v)?'Enter a full link, like linkedin.com/in/yourname':'',github:v=>v&&!okUrl(v)?'Enter a full link':'',portfolio:v=>v&&!okUrl(v)?'Enter a full link':''};

/* ---------- form ---------- */
function fieldHTML(sid,idx,[k,label,type],val){const id=`f-${sid}-${idx}-${k}`,p=`${sid}.${idx}.${k}`;
 const bad=(FIELDERR[k]&&sid==='personal')?FIELDERR[k](val):'';
 const inp=type==='ta'?`<textarea id="${id}" data-p="${p}">${esc(val)}</textarea>`:`<input id="${id}" data-p="${p}" value="${esc(val)}" ${bad?'aria-invalid="true"':''} ${k==='phone'?'inputmode="numeric" maxlength="14" autocomplete="tel"':k==='email'?'inputmode="email" autocomplete="email"':''}>`;
 return `<label for="${id}">${esc(label)}${inp}<small class="hint" data-err="${p}" style="color:var(--red)">${esc(bad)}</small></label>`}
const photoCtl=()=>`<label for="photo">Photo (optional, passport size)<input type="file" id="photo" accept="image/*"></label>${D.items.personal.photo?'<div class="rbRow"><button type="button" class="rbB" id="rmPhoto">Remove photo</button></div>':''}<p class="hint">Photo shows on Government Form, Navy, Serif, Mono, Data and Sidebar templates. ATS templates hide it.</p>`;
function renderForm(){const open=new Set([...document.querySelectorAll('#form details[open]')].map(e=>e.dataset.s));
 $('#form').innerHTML=D.sections.map(({id})=>{const S=SCHEMA[id],it=D.items[id];let body=`<p class="hint">${esc(S.hint)}</p>`;
  if(S.one){let F=S.f;if(id==='personal'&&D.meta.template==='govt')F=F.concat([['dob','Date of birth'],['gender','Gender'],['father',"Father's name"]]);body+=F.map(f=>fieldHTML(id,0,f,it[f[0]]||'')).join('');if(id==='personal')body+=photoCtl()}
  else{body+=it.length?it.map((o,i)=>`<div class="rbItem">${S.f.map(f=>fieldHTML(id,i,f,o[f[0]]||'')).join('')}<div class="rbRow"><button type="button" class="rbB" data-a="up" data-s="${id}" data-i="${i}" ${i?'':'disabled'}>Move up</button><button type="button" class="rbB" data-a="dn" data-s="${id}" data-i="${i}" ${i<it.length-1?'':'disabled'}>Move down</button><button type="button" class="rbB" data-a="rm" data-s="${id}" data-i="${i}">Remove</button></div></div>`).join(''):`<p class="rbEmpty">Nothing here yet. Tap "${esc(S.add)}" to start.</p>`;
   body+=`<div class="rbRow"><button type="button" class="rbB pri" data-a="add" data-s="${id}">${esc(S.add)}</button></div>`}
  return `<details class="rbSec" data-s="${id}" ${open.has(id)||(!open.size&&id==='personal')?'open':''}><summary>${esc(S.t)}</summary><div class="rbBody">${body}</div></details>`}).join('');
 $('#order').innerHTML=D.sections.map(({id,show},i)=>`<div class="rbRow"><label style="flex:1;display:flex;gap:8px;align-items:center"><input type="checkbox" data-sh="${id}" ${show?'checked':''} style="width:auto"> ${esc(SCHEMA[id].t)}</label><button type="button" class="rbB" data-o="${i}" data-d="-1" ${i>1?'':'disabled'} aria-label="Move ${esc(SCHEMA[id].t)} up">Up</button><button type="button" class="rbB" data-o="${i}" data-d="1" ${i&&i<D.sections.length-1?'':'disabled'} aria-label="Move ${esc(SCHEMA[id].t)} down">Down</button></div>`).join('')}

/* ---------- resume HTML (real text, no tables, no images) ---------- */
function resumeHTML(){const I=D.items,P=I.personal,name=P.name||'';
 const contact=[P.city,P.phone,P.email,P.linkedin&&show(P.linkedin),P.github&&show(P.github),P.portfolio&&show(P.portfolio)].filter(Boolean);
 const link=(v)=>okUrl(v)?`<a href="${esc(href(v))}">${esc(show(v))}</a>`:esc(show(v));
 const ct=[P.city,P.phone,P.email].filter(Boolean).map(esc).concat([P.linkedin,P.github,P.portfolio].filter(Boolean).map(link)).join(' | ');
 const tpl=D.meta.template;let h=`<h1>${esc(name)||'Your Name'}</h1>${P.headline?`<div class="hl">${esc(P.headline)}</div>`:''}<div class="ct">${ct}</div>`;if(tpl==='govt'){const pd=[['Date of birth',P.dob],['Gender',P.gender],["Father's name",P.father]].filter(x=>x[1]);if(pd.length)h+=`<div class="pd">${pd.map(x=>`<span><b>${x[0]}:</b> ${esc(x[1])}</span>`).join('')}</div>`}if(P.photo&&!['classic','compact'].includes(tpl))h=`<img class="pho" alt="Candidate photo" src="${esc(P.photo)}">`+h;
 const parts={};let secs=D.sections.slice();if(tpl==='data')secs.sort((a,b)=>(b.id==='skills')-(a.id==='skills'));secs.forEach(({id,show:on})=>{if(!on||id==='personal')return;const it=I[id];let b='';
  if(id==='summary'&&it.text)b=`<p>${esc(it.text)}</p>`;
  if(id==='skills')b=it.filter(s=>s.list).map(s=>`<p>${s.label?`<b>${esc(s.label)}:</b> `:''}${esc(s.list)}</p>`).join('');
  if(id==='experience')b=it.map(e=>`<div class="en"><div class="r1"><span><b>${esc(e.role)}</b>${e.company?', '+esc(e.company):''}${e.city?', '+esc(e.city):''}</span><span class="dt">${esc(dates(e.start,e.end))}</span></div>${lines(e.bullets).length?`<ul>${lines(e.bullets).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`).join('');
  if(id==='projects')b=it.map(p=>`<div class="en"><div class="r1"><span><b>${esc(p.name)}</b>${p.link?' | '+link(p.link):''}</span></div>${p.tech?`<div><i>Tech: ${esc(p.tech)}</i></div>`:''}${p.desc?`<ul>${lines(p.desc).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`).join('');
  if(id==='education')b=it.map(e=>`<div class="en"><div class="r1"><span><b>${esc(e.degree)}</b>${e.school?', '+esc(e.school):''}${e.score?' | '+esc(e.score):''}</span><span class="dt">${esc(e.year)}</span></div></div>`).join('');
  if(id==='certs')b=it.filter(c=>c.name).map(c=>`<p>${esc(c.name)}${c.issuer?' - '+esc(c.issuer):''}</p>`).join('');
  if(id==='achievements'&&it.some(x=>x.text))b=`<ul>${it.filter(x=>x.text).map(x=>`<li>${esc(x.text)}</li>`).join('')}</ul>`;
  if(id==='languages'&&it.some(x=>x.name))b=`<p>${it.filter(x=>x.name).map(x=>esc(x.name)+(x.level?' ('+esc(x.level)+')':'')).join(', ')}</p>`;
  if(id==='custom'&&lines(it.text).length)b=`<ul>${lines(it.text).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
  if(b)parts[id]=`<section><h2>${esc(id==='custom'?(it.title||'Additional'):HEAD[id])}</h2>${b}</section>`});
 const SIDE=['skills','education','certs','languages'],ids=secs.map(s=>s.id).filter(i=>parts[i]);
 if(tpl==='side')h=`<div class="hd">${h}</div><div class="two"><div class="mn">${ids.filter(i=>!SIDE.includes(i)).map(i=>parts[i]).join('')}</div><aside class="sd">${ids.filter(i=>SIDE.includes(i)).map(i=>parts[i]).join('')}</aside></div>`;else h+=ids.map(i=>parts[i]).join('');
 if(!contact.length&&!name)h+=`<p>Start filling the form on the left. Your resume appears here.</p>`;
 return h+`<div class="ft">Made with Rajasthan Job Resume Builder</div>`}
const FONTS={plex:"'IBM Plex Sans',Arial,sans-serif",arial:'Arial,Helvetica,sans-serif',georgia:"Georgia,'Times New Roman',serif"};
function renderPaper(){const p=$('#paper'),T=D.theme;p.className='paper t-'+D.meta.template;
 p.style.setProperty('--ac',T.accent);p.style.setProperty('--fs',T.size+'pt');p.style.setProperty('--g',T.gap);
 if(D.meta.template!=='serif')p.style.setProperty('--ff',FONTS[T.font]);else p.style.removeProperty('--ff');
 p.innerHTML=resumeHTML();fit()}
function fit(){const pane=$('#pg').parentElement,w=pane.clientWidth-(innerWidth<=900?16:32),pw=210*96/25.4,s=Math.min(1,w/pw),p=$('#paper');
 $('#scale').style.transform=`scale(${s})`;const ph=297*96/25.4,pages=Math.max(1,Math.ceil(p.scrollHeight/ph-.02));
 const wr=$('#wrap');wr.style.width=pw*s+'px';wr.style.height=Math.max(p.scrollHeight,ph)*s+'px';
 $('#pg').textContent=pages+(pages>1?' pages':' page')+' (A4)';$('#pg').dataset.pages=pages;health()}

/* ---------- health check ---------- */
const WEAK=/\b(responsible for|worked on|duties included|helped with|various tasks|hard[- ]working|team player)\b/i;
const SPELL={recieve:'receive',managment:'management',experiance:'experience',responsibilty:'responsibility',sucessful:'successful',knowlege:'knowledge',teh:'the',adress:'address',definately:'definitely'};
function check(){const I=D.items,P=I.personal,out=[];const add=(pts,msg,s)=>out.push({pts,msg,s});
 if(!P.name)add(8,'Add your full name.','personal');
 if(!P.phone)add(8,'Add your phone number.','personal');else if(!okPhone(P.phone))add(6,'Phone should be 10 digits.','personal');
 if(!P.email)add(8,'Add your email.','personal');else if(!okMail(P.email))add(6,'Email looks invalid.','personal');
 else if(/(cool|sexy|king|boss|hot|baby|dude|lover)/i.test(P.email.split('@')[0])||/\d{5,}/.test(P.email))add(4,'Email looks informal. Use a name-based email like firstname.lastname@gmail.com.','personal');
 if(P.photo&&['classic','compact'].includes(D.meta.template))add(3,'Photo is hidden on ATS templates. Pick Government Form or Modern Navy if you need a photo.','personal');
 if(!P.city)add(3,'Add your city.','personal');
 [['linkedin'],['github'],['portfolio']].forEach(([k])=>{if(P[k]&&!okUrl(P[k]))add(3,`Fix the ${k} link.`,'personal')});
 const n=(I.summary.text||'').trim().split(/\s+/).filter(Boolean).length;
 if(!n)add(6,'Add a 2-3 line summary.','summary');else if(n<20)add(3,'Summary is short. Aim for 25-60 words.','summary');else if(n>80)add(4,'Summary is long. Keep it under 60 words.','summary');
 if(!I.skills.some(s=>s.list))add(8,'Add your skills. Recruiters search by skill.','skills');
 const all=I.skills.flatMap(s=>s.list.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)),dup=all.filter((x,i)=>all.indexOf(x)!==i);
 if(dup.length)add(3,`Duplicate skill: ${[...new Set(dup)].join(', ')}.`,'skills');
 const bl=[...I.experience.flatMap(e=>lines(e.bullets)),...I.projects.flatMap(p=>lines(p.desc))];
 if(!I.experience.length&&!I.projects.length)add(10,'Add experience or at least one project.','experience');
 if(bl.length&&!bl.some(b=>/\d/.test(b)))add(6,'No numbers in your bullets. Add real figures (count, %, time saved).','experience');
 bl.forEach(b=>{if(WEAK.test(b)&&!out.some(o=>o.weak))out.push({pts:4,weak:1,msg:`Weak phrase "${b.match(WEAK)[0]}". Start with a strong verb and state the result.`,s:'experience'})});
 if(new Set(bl.map(b=>b.toLowerCase())).size<bl.length)add(3,'Two bullets are identical. Remove the duplicate.','experience');
 I.experience.forEach(e=>{const past=e.end&&!/present|current|now/i.test(e.end),lead=lines(e.bullets).map(b=>b.split(' ')[0]);
  if(past&&lead.some(w=>/^(manage|handle|lead|build|create|maintain|coordinate|prepare|analyse|analyze|develop)s?$/i.test(w))&&!out.some(o=>o.tense))out.push({pts:3,tense:1,msg:`"${e.role||'A job'}" has ended, but bullets use present tense. Use Managed, Built, Led.`,s:'experience'});
  if(!e.end&&e.start)add(2,`Add an end date or "Present" for "${e.role||'a job'}".`,'experience')});
 const ds=[...I.experience.flatMap(e=>[e.start,e.end]),...I.education.map(e=>e.year)].filter(d=>d&&!/present/i.test(d)),kind=d=>/^[A-Za-z]{3,9}\.? \d{4}$/.test(d)?'M YYYY':/^\d{1,2}[\/-]\d{4}$/.test(d)?'MM/YYYY':/^\d{4}(\s*-\s*\d{4})?$/.test(d)?'YYYY':'other';
 if(new Set(I.experience.flatMap(e=>[e.start,e.end]).filter(d=>d&&!/present/i.test(d)).map(kind)).size>1)add(3,'Dates use different formats. Use one style, like "Jun 2024".','experience');
 const txt=JSON.stringify(I).toLowerCase();Object.keys(SPELL).forEach(w=>{if(new RegExp('\\b'+w+'\\b').test(txt)&&!out.some(o=>o.sp))out.push({pts:2,sp:1,msg:`Spelling: "${w}" should be "${SPELL[w]}".`,s:'summary'})});
 if(!I.experience.length&&+$('#pg').dataset.pages>1)add(5,'Freshers should keep the resume to 1 page. Shorten bullets or use ATS Compact.','experience');
 return out}
function health(){const o=check(),sc=Math.max(0,100-o.reduce((a,x)=>a+x.pts,0));
 $('#health').innerHTML=`<div class="rbScore"><b>${sc}</b><div style="flex:1"><div style="font-weight:600;color:var(--navy)">Resume health</div><div class="rbMeter"><i style="width:${sc}%"></i></div></div></div>`+(o.length?`<ul>${o.map(x=>`<li><button type="button" data-fix="${x.s}"><b>-${x.pts}</b> ${esc(x.msg)}</button></li>`).join('')}</ul>`:'<p class="rbEmpty" style="margin-top:8px">No issues found. Review once for truth and spelling before you apply.</p>')}

/* ---------- state, history, autosave ---------- */
function save(){try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){}}
function push(){clearTimeout(tH);tH=setTimeout(()=>{const s=JSON.stringify(D);if(s===hist[hi])return;hist=hist.slice(0,hi+1);hist.push(s);if(hist.length>60)hist.shift();hi=hist.length-1;btns()},500)}
function btns(){$('#undo').disabled=hi<1;$('#redo').disabled=hi>=hist.length-1}
let tR=0;const draw=()=>{clearTimeout(tR);tR=setTimeout(()=>{renderPaper();save();push()},100)};
function load(d,keepOpen){D=d;syncTools();renderForm();renderPaper();save()}
function syncTools(){$('#tpl').value=D.meta.template;$('#acc').value=D.theme.accent;$('#ff').value=D.theme.font;$('#fs').value=D.theme.size;$('#gap').value=D.theme.gap}
const setP=(p,v)=>{const[s,i,k]=p.split('.');if(SCHEMA[s].one)D.items[s][k]=v;else D.items[s][+i][k]=v};
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.p){setP(t.dataset.p,t.value);const k=t.dataset.p.split('.')[2],er=document.querySelector(`[data-err="${t.dataset.p}"]`);
  if(er&&FIELDERR[k]&&t.dataset.p.startsWith('personal')){const m=FIELDERR[k](t.value);er.textContent=m;t.toggleAttribute('aria-invalid',!!m)}draw()}});
[['tpl',v=>D.meta.template=v],['acc',v=>D.theme.accent=v],['ff',v=>D.theme.font=v],['fs',v=>D.theme.size=v],['gap',v=>D.theme.gap=v]].forEach(([id,f])=>$('#'+id).addEventListener('input',e=>{f(e.target.value);if(id==='tpl')renderForm();draw()}));
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const{a,s,i,o,d,fix,v}=t.dataset;
 if(a){const L=D.items[s],n=+i;if(a==='add')L.push({});if(a==='rm')L.splice(n,1);if(a==='up'||a==='dn'){const m=n+(a==='up'?-1:1);[L[n],L[m]]=[L[m],L[n]]}renderForm();if(a==='add'){const ds=$(`details[data-s="${s}"]`);ds.open=true;ds.querySelector('.rbItem:last-of-type input,.rbItem:last-of-type textarea')?.focus()}draw()}
 if(o!==undefined){const n=+o,m=n+ +d;[D.sections[n],D.sections[m]]=[D.sections[m],D.sections[n]];renderForm();draw()}
 if(fix){document.querySelectorAll('#form details').forEach(x=>x.open=x.dataset.s===fix);const ds=$(`details[data-s="${fix}"]`);ds.scrollIntoView({block:'start'});setViewForm();ds.querySelector('input,textarea')?.focus()}
 if(v){$('.rb').dataset.view=v;document.querySelectorAll('.rbSeg button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===v));scrollTo(0,0);fit()}});
const setViewForm=()=>{if(innerWidth<=900)document.querySelector('.rbSeg [data-v=edit]').click()};
document.addEventListener('change',e=>{if(e.target.dataset.sh){D.sections.find(x=>x.id===e.target.dataset.sh).show=e.target.checked;draw()}});
$('#undo').onclick=()=>{if(hi>0){hi--;load(migrate(JSON.parse(hist[hi])));btns()}};
$('#redo').onclick=()=>{if(hi<hist.length-1){hi++;load(migrate(JSON.parse(hist[hi])));btns()}};
$('#clear').onclick=()=>{if(confirm('Clear the sample and start with an empty resume?')){load(blank());push()}};
$('#exp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,2)],{type:'application/json'}));a.download='resume-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$('#imp').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const m=migrate(JSON.parse(r.result));if(!m)throw 0;load(m);push()}catch(x){alert('This file could not be read. Please choose a JSON file exported from this builder.')}};r.readAsText(f);e.target.value=''};
function fname(){const P=D.items.personal,[f='',...l]=(P.name||'My').trim().split(/\s+/),c=s=>s.replace(/[^\p{L}\p{N}]+/g,'');
 return [c(f)||'My',c(l.join(''))||'Name',c((P.headline||'').split(/[|,\-]/)[0].replace(/\s+/g,''))||'Role','Resume'].join('_')}
function dl(){const old=document.title;document.title=fname();renderPaper();const w=()=>{document.title=old;removeEventListener('afterprint',w)};addEventListener('afterprint',w);print()}
$('#dl').onclick=$('#dl2').onclick=dl;
document.addEventListener('change',e=>{if(e.target.id!=='photo')return;const f=e.target.files[0];if(!f)return;if(f.size>6e6)return alert('Photo is too large. Choose an image under 6 MB.');const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=240;c.height=300;const x=c.getContext('2d'),r=Math.max(240/im.width,300/im.height),w=im.width*r,h=im.height*r;x.drawImage(im,(240-w)/2,(300-h)/2,w,h);D.items.personal.photo=c.toDataURL('image/jpeg',.85);URL.revokeObjectURL(im.src);renderForm();draw()};im.onerror=()=>alert('This image could not be read. Try a JPG or PNG.');im.src=URL.createObjectURL(f)});
document.addEventListener('click',e=>{if(e.target.id==='rmPhoto'){delete D.items.personal.photo;renderForm();draw()}});
window.RB={get:()=>D,set:d=>{const m=migrate(d);if(m){load(m);push()}},fname,
 addSkill:t=>{let g=D.items.skills.find(s=>s.label==='Other skills');if(!g){g={label:'Other skills',list:''};D.items.skills.push(g)}const cur=g.list.split(',').map(x=>x.trim()).filter(Boolean);if(!cur.some(x=>x.toLowerCase()===t.toLowerCase()))cur.push(t);g.list=cur.join(', ');renderForm();draw()}};
addEventListener('resize',fit);
syncTools();renderForm();renderPaper();btns();
