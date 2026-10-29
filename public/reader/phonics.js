/* 树儿读读乐 · 自然拼读 helpers for 学习区「拼写补全」and「句子重组」. Pure functions, no DOM (testable in node). */
(function(root){
'use strict';
const isV=(w,i)=>{const c=w[i];return 'aeiou'.includes(c)||(c==='y'&&i>0)};
const LONG=['tion','sion'];                       // ending chunks
const TRI=['igh','tch','dge'];
const VT=['ee','ea','ai','ay','oa','ow','ou','oo','ie','ei','oi','oy','au','aw','ew','ue','ui','eu'];
const RC=['ar','er','ir','or','ur'];
const CD=['sh','ch','th','ph','wh','ck','ng','kn','wr','qu','ll','ss','ff','zz'];
/* -> [{t, k}] k: vt vowel team · rc r-controlled · cd consonant digraph · end -tion/-sion · le -le ending · se silent e · v vowel · c consonant */
function chunk(word){const w=String(word).toLowerCase().replace(/[^a-z]/g,'');const n=w.length,out=[];let i=0;
  while(i<n){const rest=w.slice(i);let m=null;
    for(const e of LONG)if(i>0&&rest.startsWith(e)){m=[e,'end'];break}
    if(!m&&rest.startsWith('igh'))m=['igh','vt'];
    if(!m){for(const e of ['tch','dge'])if(rest.startsWith(e)&&i>0){m=[e,'cd'];break}}
    if(!m&&i>0&&rest==='le'&&!isV(w,i-1))m=['le','le'];
    if(!m){const two=rest.slice(0,2);
      if(VT.includes(two))m=[two,'vt'];
      else if(RC.includes(two))m=[two,'rc'];
      else if(CD.includes(two))m=[two,'cd']}
    if(!m&&i===n-1&&w[i]==='e'&&n>=3&&i>=2&&!isV(w,i-1)&&isV(w,i-2))m=['e','se'];
    if(!m)m=[w[i],isV(w,i)?'v':'c'];
    out.push({t:m[0],k:m[1]});i+=m[0].length}
  return out}
const PRI={vt:1,rc:1,end:1,cd:2,le:3,v:4,se:5,c:6};
/* Decide what to blank. -> {word, pieces:[{t,blank}], blanks:[{idx,t}], letters:[...missing letters in order]} or null */
function plan(word){const w=String(word||'').toLowerCase();if(!/^[a-z]{2,}$/.test(w))return null;
  const ch=chunk(w),n=w.length;
  // how many chunks to blank: very short -> 1 letter; short -> 1 chunk; longer -> 2 chunks
  let picks=[];
  if(n<=3){const vi=ch.findIndex((c,i)=>i>0&&(c.k==='v'||c.k==='vt'));const mid=Math.min(ch.length-1,Math.max(1,Math.floor(ch.length/2)));
    const i=vi>=0?vi:mid;picks=[i]}
  else{const k=n>=6?2:1;
    const cand=ch.map((c,i)=>({i,c,p:PRI[c.k]+(i===0?10:0)})).sort((a,b)=>a.p-b.p||a.i-b.i);
    const take=[];for(const x of cand){if(take.length>=k)break;
      if(take.some(y=>Math.abs(y.i-x.i)===1)&&cand.some(z=>!take.includes(z)&&!take.some(y=>Math.abs(y.i-z.i)<=1)&&z.p<20&&z!==x&&z.c.k!=='c'))continue; // prefer non-adjacent
      take.push(x)}
    for(const x of cand){if(take.length>=k)break;if(!take.includes(x))take.push(x)}
    picks=take.map(x=>x.i).sort((a,b)=>a-b)}
  // never blank (almost) everything
  const cnt=p=>p.reduce((s,i)=>s+ch[i].t.length,0);
  while(picks.length>1&&cnt(picks)>Math.ceil(n*0.6))picks.pop();
  if(cnt(picks)>=n)return null;
  // a 1-chunk blank that is a single consonant of a 2+ letter word is fine; but avoid blanking the only first letter of a 2-letter word
  const pieces=ch.map((c,i)=>({t:c.t,k:c.k,blank:picks.includes(i)}));
  const letters=pieces.filter(p=>p.blank).flatMap(p=>p.t.split(''));
  return{word:w,pieces,letters}}
const CONF={a:'eou',e:'ai',i:'ey',o:'ua',u:'oa',y:'ie',b:'dp',d:'bt',p:'bq',t:'dk',k:'c',c:'ks',s:'zc',z:'s',f:'vph',v:'fw',g:'j',j:'g',m:'nw',n:'mh',l:'r',r:'lw',w:'mv',h:'n',q:'k',x:'ks'};
function perms(arr,k,cb,cur=[],used=[]){if(cur.length===k)return cb(cur);const seen={};for(let i=0;i<arr.length;i++){if(used[i]||seen[arr[i]])continue;seen[arr[i]]=1;used[i]=1;cur.push(arr[i]);perms(arr,k,cb,cur,used);cur.pop();used[i]=0}}
/* does some arrangement of these tiles make a DIFFERENT real word? (dict = Set of lowercase words) */
function altWord(pl,tiles,dict){if(!dict||!dict.size)return null;const L=pl.letters.length;let hit=null;
  perms(tiles,L,seq=>{if(hit)return;let j=0,s='';for(const p of pl.pieces){if(p.blank){s+=seq.slice(j,j+p.t.length).join('');j+=p.t.length}else s+=p.t}
    if(s!==pl.word&&dict.has(s))hit=s});return hit}
/* 1-2 extra letters that are plausible (look/sound-alikes) but do not make another valid word */
function distractors(pl,dict,rnd){rnd=rnd||Math.random;const need=pl.letters,k=need.length<=2?1:2;
  const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
  const inNeed=new Set(need);
  const vis=[...new Set(pl.pieces.filter(p=>!p.blank).flatMap(p=>p.t.split('')))];
  const near=[...new Set(shuf(need).flatMap(c=>(CONF[c]||'').split('')))];
  const pool=[...shuf(near),...shuf(vis),...shuf('rstlnmdfbpgkhcw'.split(''))].filter((c,i,a)=>!inNeed.has(c)&&a.indexOf(c)===i);
  const out=[];for(const c of pool){if(out.length>=k)break;if(altWord(pl,[...need,...out,c],dict))continue;out.push(c)}
  for(const c of pool)if(out.length<k&&!out.includes(c))out.push(c); // dictionary too strict: still give the extra tile
  return out}
/* ---- sentence builder ---- */
const wordsOf=s=>(s.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)||[]);
/* Pick a sub-span of a long clause that holds the target word and ends/starts at a natural phrase boundary,
   so the reorder tiles never stop mid-phrase (e.g. "...and to each" without "other"). */
const STARTERS=new Set('and but or so because when where which who that while if then with for to as after before until since though'.split(' '));
const DANGLE=new Set('a an the to of and or but each every some any my your his her its our their this that these those in on at for with by from as is are was were be very so than'.split(' '));
function bestWindow(c,at,max){const lw=t=>(String(t).toLowerCase().match(/[a-z']+/g)||[''])[0];let best=null;
  for(let s=0;s<=at;s++)for(let e=at+1;e<=c.length;e++){const n=e-s;if(n<5||n>max)continue;
    let sc=0;const endTok=c[e-1];
    if(e===c.length||/[,;:.!?…]["”’)]*$/.test(endTok))sc+=6;else if(STARTERS.has(lw(c[e])))sc+=4;
    if(DANGLE.has(lw(endTok))&&e!==c.length)sc-=8;
    if(s===0||/[,;:.!?…]["”’)]*$/.test(c[s-1]))sc+=3;else if(STARTERS.has(lw(c[s])))sc+=2;
    sc+=n*.3;if(!best||sc>best.sc)best={sc,s,e}}
  return best?c.slice(best.s,best.e):c.slice(Math.max(0,Math.min(at-4,c.length-10)),Math.max(0,Math.min(at-4,c.length-10))+10)}
function sentencePlan(en,target,hi,max){max=max||12;en=String(en||'').replace(/\s*(?:\.\s*){3,}/g,'… ').replace(/\s+/g,' ').trim();if(!en)return null;
  let toks=en.split(' ').filter(Boolean);
  // glue stray punctuation tokens (". . .") to the previous word
  const t2=[];for(const t of toks){if(!/[A-Za-z0-9]/.test(t)&&t2.length)t2[t2.length-1]+=' '+t;else t2.push(t)}toks=t2;
  let partial=false;
  if(toks.length>max){
    // split into clauses at , ; : and sentence ends; keep the one holding the word
    const cl=[];let cur=[];for(const t of toks){cur.push(t);if(/[,;:.!?…]["”’)]*$/.test(t)){cl.push(cur);cur=[]}}if(cur.length)cl.push(cur);
    let idx=cl.findIndex(c=>c.some(t=>hi&&wordsOf(t).some(x=>hi(x))));if(idx<0)idx=0;
    let c=cl[idx];
    for(let d=1;c.length<4&&(idx-d>=0||idx+d<cl.length)&&c.length<max;d++){if(idx-d>=0&&cl[idx-d].length+c.length<=max)c=cl[idx-d].concat(c);if(c.length<4&&idx+d<cl.length&&cl[idx+d].length+c.length<=max)c=c.concat(cl[idx+d])}
    if(c.length>max)c=bestWindow(c,Math.max(0,c.findIndex(t=>hi&&wordsOf(t).some(x=>hi(x)))),max);
    toks=c;partial=true}
  let end='';
  const last=toks[toks.length-1];
  if(partial){toks[toks.length-1]=last.replace(/[,;:]+["”’)]*$/,'')}
  else{const m=last.match(/^(.*?[A-Za-z0-9])([.!?…]+["”’)]*|["”’)]+)$/);if(m){toks[toks.length-1]=m[1];end=m[2]}}
  if(toks.length<3)return null;
  const order=toks.map((_,i)=>i);let mix=order;
  const key=a=>a.map(i=>toks[i]).join(' ');
  for(let tries=0;tries<30;tries++){mix=order.map(i=>[Math.random(),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);if(key(mix)!==key(order))break}
  if(key(mix)===key(order))mix=order.slice(1).concat(order[0]);
  return{tokens:toks,end,partial,mix}}
const API={chunk,plan,distractors,altWord,sentencePlan,wordsOf};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.TT_PH=API;
})(typeof window!=='undefined'?window:globalThis);
