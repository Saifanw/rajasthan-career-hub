/* Optional login + saved resumes (Firebase Auth Google + Firestore). Saves only when the user taps Save. */
import{initializeApp,getApps,getApp}from'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import{getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut}from'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import{getFirestore,collection,doc,getDocs,getDoc,setDoc,deleteDoc,serverTimestamp}from'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const cfg={apiKey:"AIzaSyDO75-iuVlRP9emqnR-d1T4g66akuQS328",authDomain:"rajasthan-job.firebaseapp.com",projectId:"rajasthan-job",storageBucket:"rajasthan-job.firebasestorage.app",messagingSenderId:"894888753938",appId:"1:894888753938:web:92e66d7a7237be1fd9d1cb"};
const FREE_LIMIT=1; // Phase 3: replace with canUse('multiResume') from rb-entitlements.js
const $=s=>document.querySelector(s),esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const box=$('#acct');let auth,db,user=null,list=[],note='';
const cur=()=>{try{return localStorage.getItem('rb_cur')||''}catch(e){return''}},setCur=v=>{try{localStorage.setItem('rb_cur',v)}catch(e){}};
function view(){if(!auth){box.innerHTML='<p class="hint">Login is not available right now. Your resume is still saved on this device.</p>';return}
 const msg=`<p class="hint" role="status" aria-live="polite">${esc(note)}</p>`;
 if(!user){box.innerHTML=`<p class="hint">Sign in to save your resume to your account and open it on another phone. Optional. Without sign-in your resume stays on this device.</p><div class="rbRow"><button type="button" class="rbB pri" data-ac="in">Sign in with Google</button></div>${msg}`;return}
 box.innerHTML=`<p class="hint">Signed in as ${esc(user.email)}. Free plan: ${FREE_LIMIT} saved resume.</p><div class="rbRow"><button type="button" class="rbB pri" data-ac="save">Save to my account</button><button type="button" class="rbB" data-ac="out">Sign out</button></div>${msg}`+
  (list.length?list.map(r=>`<div class="rbItem"><b>${esc(r.title)}</b><div class="rbRow"><button type="button" class="rbB" data-ac="open" data-id="${esc(r.id)}">Open</button><button type="button" class="rbB" data-ac="del" data-id="${esc(r.id)}">Delete</button></div></div>`).join(''):'<p class="rbEmpty">No saved resume yet. Tap "Save to my account".</p>')}
async function refresh(){if(!user){list=[];return view()}try{const s=await getDocs(collection(db,'users',user.uid,'resumes'));list=s.docs.map(d=>({id:d.id,...d.data()}))}catch(e){note='Could not load saved resumes. Check your internet, and that the Firestore rules are published.'}view()}
try{const app=getApps().find(a=>a.name==='rb')||initializeApp(cfg,'rb');auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,u=>{user=u;refresh()})}catch(e){auth=null}
view();
box.addEventListener('click',async e=>{const b=e.target.closest('[data-ac]');if(!b)return;const a=b.dataset.ac,id=b.dataset.id;note='';
 try{
  if(a==='in')await signInWithPopup(auth,new GoogleAuthProvider());
  if(a==='out')await signOut(auth);
  if(a==='save'){const d=window.RB.get(),P=d.items.personal;let rid=cur();const exists=list.some(r=>r.id===rid);
   if(!exists&&list.length>=FREE_LIMIT){note=`Free plan allows ${FREE_LIMIT} saved resume. Open or delete your saved one first.`;return view()}
   if(!exists)rid=(crypto.randomUUID?crypto.randomUUID():String(Date.now())).slice(0,20);
   await setDoc(doc(db,'users',user.uid,'resumes',rid),{title:((P.name||'My resume')+(P.headline?' - '+P.headline:'')).slice(0,120),data:JSON.stringify(d),updatedAt:serverTimestamp()});setCur(rid);note='Saved to your account.';await refresh()}
  if(a==='open'){const s=await getDoc(doc(db,'users',user.uid,'resumes',id));if(s.exists()){window.RB.set(JSON.parse(s.data().data));setCur(id);note='Opened. Your current resume was replaced.'}view()}
  if(a==='del'&&confirm('Delete this saved resume? This cannot be undone.')){await deleteDoc(doc(db,'users',user.uid,'resumes',id));if(cur()===id)setCur('');note='Deleted.';await refresh()}
 }catch(err){note=a==='in'?'Sign-in failed. In Firebase console enable Google sign-in and add saifanw.github.io to Authorized domains.':'Could not complete this. Please try again.';view()}});
