/* Job description match: rule-based keywords, no AI API. */
const $=s=>document.querySelector(s),esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SK='excel,sql,python,power bi,tableau,tally,gst,sap,erp,crm,java,javascript,html,css,react,node,php,wordpress,seo,sales,marketing,accounting,mis,reporting,data entry,vlookup,pivot,powerpoint,autocad,git,aws,django,flutter,android,figma,photoshop,typing,customer service,negotiation,lead generation,recruitment,payroll,inventory,logistics,communication,analytics,dashboard,mongodb,mysql,c++,laravel,digital marketing,mis reporting,google sheets,canva,social media'.split(',');
const STOP=new Set('the and for with are you our your will have has this that their they can must should job role candidate required requirements responsibilities experience years year work working team ability strong good knowledge skills skill preferred plus etc including such using use also who what about all any more into per may well new able looking seeking company hiring location salary apply benefits full time part office jaipur'.split(' '));
const cap=w=>w.replace(/\b\w/g,c=>c.toUpperCase());
function kws(jd){const t=jd.toLowerCase(),f=new Set();
 SK.forEach(k=>{if(new RegExp('(^|[^a-z0-9])'+k.replace(/[+.]/g,'\\$&')+'($|[^a-z0-9+])').test(t))f.add(k)});
 const c={};(t.match(/[a-z][a-z+#]{2,}/g)||[]).forEach(w=>{if(!STOP.has(w))c[w]=(c[w]||0)+1});
 Object.entries(c).filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([w])=>{if(![...f].some(k=>k.includes(w)))f.add(w)});return[...f]}
function run(){const jd=$('#jd').value.trim(),out=$('#jdOut');
 if(!jd){out.innerHTML='<p class="rbEmpty">Paste a job description above to see matches.</p>';return}
 const txt=$('#paper').innerText.toLowerCase(),k=kws(jd),has=w=>new RegExp('(^|[^a-z0-9])'+w.replace(/[+.#]/g,'\\$&')+'($|[^a-z0-9])').test(txt),m=k.filter(has),x=k.filter(w=>!has(w));
 out.innerHTML=`<p><b>${m.length} of ${k.length}</b> keywords matched.</p><div>${m.map(w=>`<span class="jdc">${esc(cap(w))}</span>`).join('')||'<p class="rbEmpty">None yet.</p>'}</div>`+
  (x.length?`<p style="margin-top:10px"><b>Missing keywords</b></p><p class="hint">Add a skill only if you really have it. Never copy skills you do not have.</p>${x.map(w=>`<div class="jdm"><span>${esc(cap(w))}</span><button type="button" class="rbB" data-jd="${esc(w)}">Add to skills</button></div>`).join('')}`:'<p class="rbEmpty">Nothing important is missing.</p>')}
let t=0;$('#jd').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(run,300)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-jd]');if(b){window.RB.addSkill(cap(b.dataset.jd));setTimeout(run,200)}});
run();
