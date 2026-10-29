/* 树儿读读乐 TreeTree Read & Grow (树儿学院) — Source → 学习区 → 复习区 → 成就仓 */
(()=>{
'use strict';
const CFG=window.TT_CONFIG||{}, LEX=window.TT_LEX||{};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const TOK=/[A-Za-z]+(?:['’][A-Za-z]+)?/g;
let toastT;function toast(h,ms=1800){const t=$('#toast');t.innerHTML=h;t.classList.remove('hidden');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.add('hidden'),ms)}

/* ---------- US-English speech only ---------- */
const TTS={ok:'speechSynthesis' in window,v:null,rate:.9,
  pick(){if(!this.ok)return null;const vs=speechSynthesis.getVoices().filter(x=>/^en[-_]US$/i.test(x.lang));
    const pref=['Samantha','Google US English','Microsoft Aria','Microsoft Jenny','Microsoft Guy','Alex','Allison','Ava','Nicky'];
    for(const p of pref){const f=vs.find(x=>x.name.includes(p));if(f)return this.v=f}return this.v=vs[0]||null},
  speak(t,rate,onend){if(!this.ok){toast('这个浏览器不支持朗读');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);
    const v=this.v||this.pick();if(v)u.voice=v;u.lang='en-US';u.rate=rate||this.rate;if(onend)u.onend=onend;speechSynthesis.speak(u);return u}};
if(TTS.ok){TTS.pick();speechSynthesis.onvoiceschanged=()=>TTS.pick()}
const say=(t,r,cb)=>TTS.speak(t,r,cb);

/* ---------- user + storage ---------- */
let USER='demo',ME={};
const KEY=()=>'tt2.'+USER+'.state';
let S;
function blank(){return{v:2,words:{},log:{},session:{},enrich:{},sq:{},updatedAt:0}}
function load(){try{S=JSON.parse(localStorage.getItem(KEY()))||blank()}catch(e){S=blank()}S.words=S.words||{};S.log=S.log||{};S.session=S.session||{};S.enrich=S.enrich||{};S.sq=S.sq||{};S.talk=S.talk||{}}
let syncT;
function save(){S.updatedAt=Date.now();localStorage.setItem(KEY(),JSON.stringify(S));badges();
  if(CFG.progressEndpoint&&CFG.syncProgress!==false&&SYNC_OK){clearTimeout(syncT);syncT=setTimeout(()=>fetch(CFG.progressEndpoint,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(S)}).catch(()=>{}),1500)}}
let SYNC_OK=false;
async function pullServer(){if(!CFG.progressEndpoint)return;try{const r=await fetch(CFG.progressEndpoint);if(!r.ok)return;SYNC_OK=true;const j=await r.json();
  if(j&&j.updatedAt>(S.updatedAt||0)){S=Object.assign(blank(),j);localStorage.setItem(KEY(),JSON.stringify(S))}}catch(e){}}
function mark(){const d=today();S.log[d]=(S.log[d]||0)+1}

/* uploaded sources live in IndexedDB (photos can be large) */
const IDB={db:null,open(){return this.db||(this.db=new Promise((ok,no)=>{const r=indexedDB.open('tt2-'+USER,2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('src'))d.createObjectStore('src',{keyPath:'id'});if(!d.objectStoreNames.contains('drafts'))d.createObjectStore('drafts',{keyPath:'k'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
  async tx(mode,fn){const db=await this.open();return new Promise((ok,no)=>{const t=db.transaction('src',mode),st=t.objectStore('src'),r=fn(st);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})},
  all(){return this.tx('readonly',s=>s.getAll())},get(id){return this.tx('readonly',s=>s.get(id))},put(o){return this.tx('readwrite',s=>s.put(o))},del(id){return this.tx('readwrite',s=>s.delete(id))}};

/* ---------- sources ---------- */
let CATALOG=null,SHARED=null,MINE=null;const BOOKS={};
async function myBooks(){if(MINE)return MINE;if(!CFG.mybooksEndpoint)return MINE=[];try{const r=await fetch(CFG.mybooksEndpoint,{credentials:'same-origin'});MINE=r.ok?await r.json():[]}catch(e){MINE=[]}return MINE}
async function sharedList(){if(SHARED)return SHARED;if(!CFG.sharedEndpoint)return SHARED=[];try{const r=await fetch(CFG.sharedEndpoint,{credentials:'same-origin'});SHARED=r.ok?await r.json():[]}catch(e){SHARED=[]}return SHARED}
async function catalog(){if(CATALOG)return CATALOG;try{const r=await fetch(CFG.booksBase+'catalog.json',{credentials:'same-origin'});if(r.status===401)return goLogin();CATALOG=r.ok?await r.json():[]}catch(e){CATALOG=[]}return CATALOG}
async function getSource(id){if(BOOKS[id])return BOOKS[id];let b;
  if(id.startsWith('u:')){b=await IDB.get(id.slice(2));if(!b)return null;b.uid='u:'+b.id}
  else if(id.startsWith('m:')){const r=await fetch(CFG.mybooksEndpoint+'/'+encodeURIComponent(id.slice(2)),{credentials:'same-origin'});if(r.status===401)return goLogin();if(!r.ok)return null;b=await r.json();b.uid=id}
  else if(id.startsWith('g:')){const r=await fetch(CFG.sharedEndpoint+'/'+encodeURIComponent(id.slice(2)),{credentials:'same-origin'});if(r.status===401)return goLogin();if(!r.ok)return null;b=await r.json();b.uid=id}
  else{const r=await fetch(CFG.booksBase+id+'/book.json',{credentials:'same-origin'});if(r.status===401)return goLogin();if(!r.ok)return null;b=await r.json();b.uid=id;
    b.pages.forEach(p=>{if(p.img&&!/^(data:|https?:|\/)/.test(p.img))p.img=CFG.booksBase+id+'/'+p.img})}
  b.wmap={};b.words.forEach(w=>b.wmap[w.w]=w);return BOOKS[id]=b}
function goLogin(){if(CFG.loginUrl)location.href=CFG.loginUrl;return null}

/* ---------- word content ---------- */
const shortZh=z=>{z=String(z||'').replace(/^[a-z]+\.\s*/,'').split(/[；;，,]/)[0].replace(/（.*?）|\(.*?\)/g,'').trim();return z.length>9?z.slice(0,9)+'…':z};
function content(w){const rec=S.words[w]||{};const L=LEX[w]||S.enrich[w];
  return{w,zh:(L&&L.zh)||rec.zh||'',us:(LEX[w]&&LEX[w].us)||rec.us||'',phrases:(L&&L.phrases)||[],scene:L&&L.scene,dlg:L&&L.dlg,curated:!!LEX[w],ai:!LEX[w]&&!!S.enrich[w]}}
let ENRICH_WARNED=0;
async function enrichMissing(list){const need=list.filter(w=>!LEX[w]&&!S.enrich[w]);if(!need.length||!CFG.enrichEndpoint)return;
  for(let i=0;i<need.length;i+=10){const part=need.slice(i,i+10);
    try{const r=await fetch(CFG.enrichEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({words:part.map(w=>({w,sentence:(S.words[w]||{}).en||''}))})});
      const j=await r.json().catch(()=>({}));
      for(const [k,v] of Object.entries(j.entries||{}))if(v&&v.dlg&&v.dlg.length>=3){if(v.scene)v.scene[0]='ai';S.enrich[k]=v}save();
      if((!r.ok||j.partial)&&j.detail&&Date.now()-ENRICH_WARNED>60000){ENRICH_WARNED=Date.now();toast('🤖 '+esc(j.detail),4500)}
      if(!r.ok)return}catch(e){return}}}

/* clickable English: every word speaks */
function speakable(en,hi){let out='',last=0;en.replace(TOK,(m,i)=>{out+=esc(en.slice(last,i));const h=hi&&hiMatch(m,hi);out+=`<span class="w${h?' hl':''}" data-say="${esc(m)}">${esc(m)}</span>`;last=i+m.length;return m});return out+esc(en.slice(last))}
function hiMatch(tok,w){const t=tok.toLowerCase(),l=w.toLowerCase();if(t===l)return true;const rec=S.words[w];if(rec&&rec.forms&&rec.forms.includes(t))return true;
  return t.startsWith(l.slice(0,Math.max(3,l.length-1)))&&t.length<=l.length+3}

/* ---------- header ---------- */
function badges(){const q=Object.values(S.words).filter(x=>x.st==='queued').length,l=Object.values(S.words).filter(x=>x.st==='learned').length;
  const bL=$('#bL'),bR=$('#bR');bL.textContent=q;bL.classList.toggle('hidden',!q);bR.textContent=l;bR.classList.toggle('hidden',!l)}
function nav(k){$$('.nav a').forEach(a=>a.classList.toggle('on',a.dataset.nav===k))}

/* ---------- router ---------- */
let cleanup=null;
async function route(){if(cleanup){cleanup();cleanup=null}if(TTS.ok)speechSynthesis.cancel();
  const h=location.hash.replace(/^#\/?/,'').split('/');window.scrollTo(0,0);
  try{
    if(h[0]==='src')return await viewSource(decodeURIComponent(h[1]),+h[2]||1);
    if(h[0]==='upload')return viewUpload();
    if(h[0]==='learn')return viewLearn();
    if(h[0]==='review')return viewReview();
    if(h[0]==='vault')return viewVault(h[1]);
    return await viewHome();
  }catch(e){console.error(e);app.innerHTML=`<div class="empty"><div class="e">😵</div>出错了：${esc(e.message)}</div>`}}
window.addEventListener('hashchange',route);

/* global click delegation: anything with data-say speaks */
document.addEventListener('click',e=>{const s=e.target.closest('[data-say]');if(s&&!s.closest('[data-act]')){e.stopPropagation();say(s.dataset.say)}},true);

/* ================= HOME: learning sources ================= */
async function viewHome(){nav('src');const cat=await catalog();if(cat===null)return;const shared=await sharedList();const mine=await myBooks();const ups=(await IDB.all().catch(()=>[])).sort((a,b)=>b.createdAt-a.createdAt);
  const W=Object.values(S.words),cnt=st=>W.filter(x=>x.st===st).length;
  const bySrc={};W.forEach(x=>bySrc[x.src]=(bySrc[x.src]||0)+1);
  const kindIco={photo:'📷',audio:'🎙',text:'📝'};
  app.innerHTML=`<section class="hero"><img src="assets/logo.png" alt=""><div><h1>欢迎来到树儿读读乐</h1>
    <p>打开一个学习来源，读原文，点一下你想学的单词 ⭐ → 学习区 → 复习区 → 成就仓</p></div>
    <div class="stats"><a class="pill" href="#/learn" style="text-decoration:none"><b>${cnt('queued')}</b>待学习</a><a class="pill" href="#/review" style="text-decoration:none"><b>${cnt('learned')}</b>待复习</a><a class="pill" href="#/vault" style="text-decoration:none"><b>${cnt('mastered')}</b>成就仓</a></div></section>
  <h2>📚 学习来源</h2><div class="shelf">
  ${cat.map(b=>`<a class="src" href="#/src/${b.id}"><img class="cv" src="${esc(CFG.booksBase+b.cover)}" alt="" loading="lazy"><span class="kind">绘本</span><div class="t"><b class="en">${esc(b.title)}</b><small>${esc(b.titleZh)} · ${b.pages} 页 · ${b.sentences} 句</small><small>⭐ 已收藏 ${bySrc[b.id]||0} 词</small></div></a>`).join('')}
  ${mine.map(m=>`<a class="src" href="#/src/m:${esc(m.id)}">${m.cover?`<img class="cv" src="${esc(m.cover)}" alt="" loading="lazy">`:'<div class="cv">📘</div>'}<span class="kind">我的书</span><div class="t"><b class="en">${esc(m.title)}</b><small>${m.titleZh?esc(m.titleZh)+' · ':''}${m.pages} 页 · ${m.sentences} 句</small><small>⭐ 已收藏 ${bySrc['m:'+m.id]||0} 词</small></div></a>`).join('')}
  ${shared.map(g=>`<a class="src" href="#/src/g:${esc(g.id)}">${g.cover?`<img class="cv" src="${esc(g.cover)}" alt="" loading="lazy">`:`<div class="cv">${kindIco[g.kind]||'📝'}</div>`}<span class="kind">共享</span><div class="t"><b class="en">${esc(g.title)}</b><small>${g.pages} 页 · ${g.sentences} 句</small><small>⭐ 已收藏 ${bySrc['g:'+g.id]||0} 词</small></div></a>`).join('')}
  ${ups.map(u=>`<a class="src" href="#/src/u:${u.id}">${u.pages[0]&&u.pages[0].img?`<img class="cv" src="${u.pages[0].img}" alt="">`:`<div class="cv">${kindIco[u.kind]||'📝'}</div>`}<span class="kind">${u.kind==='audio'?'录音':u.kind==='photo'?'照片':'文字'}</span><div class="t"><b>${esc(u.title)}</b><small>${new Date(u.createdAt).toLocaleDateString('zh-CN')} · ${u.sentences.length} 句</small><small>⭐ 已收藏 ${bySrc['u:'+u.id]||0} 词</small></div></a>`).join('')}
  <a class="src add" href="#/upload"><span style="font-size:2.6rem">📥</span>上传照片 / 截屏 / 录音<small>自动变成可点击的学习来源</small></a></div>`}

/* ================= SOURCE: full original text ================= */
const PREF={img:localStorage.getItem('tt2.img')!=='0',zh:localStorage.getItem('tt3.zh')!=='0'}; // Chinese under each sentence: on by default
async function viewSource(id,pg){if(cleanup){cleanup();cleanup=null}nav('src');app.innerHTML='<p class="center"><span class="spin"></span> 正在打开原文…</p>';
  const b=await getSource(id);if(!b){app.innerHTML='<div class="empty"><div class="e">🔍</div>找不到这个学习来源 <a href="#/">返回</a></div>';return}
  const P=b.pages.length;pg=Math.min(Math.max(1,pg),P);const page=b.pages[pg-1];
  const collectedPages=new Set(Object.values(S.words).filter(x=>x.src===b.uid).map(x=>x.p));
  const sents=page.s.map(i=>b.sentences[i]);
  // group into headings + paragraphs
  const blocks=[];let cur=null;
  for(const s of sents){const head=typeof s.head==='boolean'?s.head:(!/[.!?…"”)]$/.test(s.en.trim())&&s.en.split(' ').length<=8);
    if(head){blocks.push({h:true,s:[s]});cur=null}else{if(!cur||s.para||(s.zhBlock||'')!==(cur.s[0].zhBlock||'')){cur={h:false,s:[]};blocks.push(cur)}cur.s.push(s)}}
  const blockZh=bl=>{if(!PREF.zh||bl.s.some(s=>s.zh))return '';const z=bl.s[0].zhBlock;return z?`<span class="szh" style="margin-left:0">${esc(z.replace(/^[^：]{1,14}：/,''))}</span>`:''};
  const sentHTML=s=>{let o='',last=0;const en=s.en;
    for(const [a,z,lm] of s.t){o+=esc(en.slice(last,a));const rec=S.words[lm];const c=rec&&rec.src===b.uid?{queued:' q',learned:' l',mastered:' m'}[rec.st]||'':rec?({queued:' q',learned:' l',mastered:' m'}[rec.st]||''):'';
      o+=`<span class="w${c}" data-w="${esc(lm)}" data-sid="${s.id}">${esc(en.slice(a,z))}</span>`;last=z}
    o+=esc(en.slice(last));
    return `<span class="sent" id="s${s.id}"><button class="sp" data-act="ps" data-sid="${s.id}" title="朗读这句" aria-label="朗读">▶</button>${o}</span>${PREF.zh&&s.zh?`<span class="szh">${esc(s.zh)}</span>`:' '}`};
  const text=blocks.length?blocks.map(bl=>bl.h?`<h3>${sentHTML(bl.s[0])}</h3>`:`<p>${bl.s.map(sentHTML).join('')}${blockZh(bl)}</p>`).join(''):'<p class="muted">（这一页没有英文正文）</p>';
  const pw=[...new Set(sents.flatMap(s=>s.t.map(t=>t[2])))].filter(w=>w.length>2||w==='I');
  const hasImg=PREF.img&&page.img;
  app.innerHTML=`<div class="shead"><a class="btn sec sm" href="#/">← 来源</a><h1 class="en">${esc(b.title)}</h1>${b.titleZh?`<span class="zh">${esc(b.titleZh)}</span>`:''}</div>
  <div class="tools"><button class="toggle${PREF.img?' on':''}" data-act="timg">🖼 原图</button><button class="toggle${PREF.zh?' on':''}" data-act="tzh" aria-pressed="${PREF.zh}" title="${PREF.zh?'隐藏中文翻译':'显示中文翻译'}">中 ${PREF.zh?'中文对照':'显示中文'}</button>
   <button class="toggle" data-act="pall">▶ 朗读本页</button>${ME.admin&&(b.uid.startsWith('u:')||b.uid.startsWith('m:'))?'<button class="toggle" data-act="pub">📢 发布给所有家庭</button>':''}${b.uid.startsWith('m:')?'<button class="toggle" data-act="delbook">🗑 删除这本书</button>':''}${ME.admin&&b.uid.startsWith('g:')?'<button class="toggle" data-act="unpub">🗑 取消发布</button>':''}<span class="muted" style="font-size:.85rem">点任意单词 = 美音朗读 + ⭐收藏（再点取消）</span></div>
  ${P>1?`<div class="pager">${b.pages.map(p=>`<a href="#/src/${encodeURIComponent(b.uid)}/${p.n}" class="${p.n===pg?'on':''}${collectedPages.has(p.n)?' has':''}">${p.n}</a>`).join('')}</div>`:''}
  <div class="readwrap${hasImg?'':' noimg'}"><div><div class="text" lang="en">${text}</div>
   <div class="legend"><span><i style="background:var(--gold)"></i>已收藏·待学习</span><span><i style="background:var(--accent-soft)"></i>已学·待复习</span><span><i style="border-bottom:3px solid var(--forest)"></i>已进成就仓</span></div>
   <div class="actions">${pg>1?`<a class="btn sec" href="#/src/${encodeURIComponent(b.uid)}/${pg-1}">← 上一页</a>`:''}${pg<P?`<a class="btn sec" href="#/src/${encodeURIComponent(b.uid)}/${pg+1}">下一页 →</a>`:''}</div>
   <details class="wl"><summary>📋 本页单词表（${pw.length}）— 也可以在这里点选</summary><div class="chips">${pw.map(w=>`<span class="chip${S.words[w]&&S.words[w].st==='queued'?' q':''}" data-w="${esc(w)}">${esc(w)}</span>`).join('')}</div></details></div>
   ${hasImg?`<div class="pimg"><img src="${esc(page.img)}" alt="原书第 ${pg} 页"></div>`:''}</div>
  <div class="dock" id="dock"></div>`;
  dock();
  const on=$('.pager a.on');if(on)on.parentNode.scrollLeft=on.offsetLeft-on.parentNode.clientWidth/2;
  const onClick=e=>{const a=e.target.closest('[data-act]');
    if(a){const k=a.dataset.act;
      if(k==='ps'){playSent(b,+a.dataset.sid);return}
      if(k==='timg'){PREF.img=!PREF.img;localStorage.setItem('tt2.img',PREF.img?'1':'0');return viewSource(id,pg)}
      if(k==='tzh'){PREF.zh=!PREF.zh;localStorage.setItem('tt3.zh',PREF.zh?'1':'0');return viewSource(id,pg)}
      if(k==='pall'){let i=0;const next=()=>{if(i<sents.length){const s=sents[i++];playSent(b,s.id,next)}};next();return}
      if(k==='learn'){location.hash='#/learn';return}
      if(k==='pub'){publish(b);return}
      if(k==='unpub'){unpublish(b.uid.slice(2));return}
      if(k==='delbook'){delBook(b);return}}
    const w=e.target.closest('[data-w]');if(!w)return;
    const lm=w.dataset.w;const sid=w.dataset.sid!=null?+w.dataset.sid:(b.wmap[lm]?b.wmap[lm].ex:page.s[0]);
    say(w.dataset.sid!=null?w.textContent:lm);toggleCollect(b,lm,sid,pg);
    $$(`[data-w="${CSS.escape(lm)}"]`).forEach(x=>{x.classList.remove('q','l','m');const r=S.words[lm];if(r)x.classList.add({queued:'q',learned:'l',mastered:'m'}[r.st])});dock()};
  app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function playSent(b,sid,cb){$$('.sent.playing').forEach(x=>x.classList.remove('playing'));const el=$('#s'+sid);if(el)el.classList.add('playing');
  say(b.sentences[sid].en,null,()=>{if(el)el.classList.remove('playing');cb&&cb()})}
function toggleCollect(b,lm,sid,pg){const r=S.words[lm];const info=b.wmap[lm]||{};const L=LEX[lm];
  if(r&&r.st==='queued'){delete S.words[lm];toast(`已取消收藏 <span class="en">${esc(lm)}</span>`);save();return}
  if(r){toast(`<span class="en">${esc(lm)}</span> ${r.st==='mastered'?'已在成就仓 🏆':'已学过，等待复习 🔁'}`);return}
  const s=b.sentences[sid];
  S.words[lm]={w:lm,zh:(L&&L.zh)||info.zh||'',us:(L&&L.us)||info.us||'',forms:info.forms||[],src:b.uid,srcTitle:b.title,p:pg,sid,en:s.en,szh:s.zh||(s.zhBlock||'').replace(/^[^：]{1,14}：/,''),st:'queued',added:Date.now(),miss:0};
  mark();save();toast(`⭐ <span class="en">${esc(lm)}</span> ${esc(shortZh((L&&L.zh)||info.zh||''))} 已加入学习区`)}
function dock(){const d=$('#dock');if(!d)return;const q=Object.values(S.words).filter(x=>x.st==='queued');
  d.innerHTML=q.length?`<span class="cnt">⭐ 已收藏<b>${q.length}</b>个单词</span><span class="mini en">${q.slice(-5).map(x=>esc(x.w)).join(' · ')}</span><button class="btn" data-act="learn">开始学习 →</button>`
   :`<span class="muted">点击原文中的单词，把它收藏进学习区 ⭐</span>`}

/* ================= LEARN ZONE ================= */
const STEP_NAMES=['① 单词卡','② 拼写补全','③ 搭配选择','④ 句子重组','⑤ 用法场景'];
const NSTEP=STEP_NAMES.length;
/* The queue is learned in rounds of ~10 (a round of up to 13 is not split), each followed by the review flow.
   S.session.learn = {kind:'queue'|'vault', list, i, step}. 'vault' = words picked in 成就仓 to re-learn. */
const ROUND=10;
const queuedWords=()=>Object.values(S.words).filter(x=>x.st==='queued').sort((a,b)=>a.added-b.added).map(x=>x.w);
function newRound(){const q=queuedWords();if(!q.length)return S.session.learn=null;
  return S.session.learn={kind:'queue',v:2,list:q.slice(0,q.length<=ROUND+3?q.length:ROUND),i:0,step:0}}
function checkLearn(){let L=S.session.learn;if(!L||!L.list)return S.session.learn=null;
  // drop words that were un-starred/deleted since the session was saved, keeping the position
  const keep=L.list.filter(w=>S.words[w]);if(keep.length!==L.list.length){L.i=L.list.slice(0,L.i).filter(w=>S.words[w]).length;L.list=keep}
  if(!L.list.length)return S.session.learn=null;
  // sessions saved before rounds existed: a list that isn't all 待学 words came from 成就仓
  if(!L.kind)L.kind=L.list.every(w=>S.words[w].st==='queued')?'queue':'vault';
  // sessions saved with the old 3-step flow: 搭配选择 1→2, 用法场景 2→4
  if(L.v!==2){if(L.step===1)L.step=2;else if(L.step===2)L.step=4;L.v=2}
  const fresh=L.i===0&&L.step===0;
  if(fresh&&L.kind==='queue')return newRound(); // not started yet → rebuild so newly starred words count
  if(fresh&&L.kind==='vault'&&!L.picked&&queuedWords().length)return newRound(); // stale untouched 成就仓 pick shouldn't hide the queue
  return L}
function viewLearn(){nav('learn');const before=JSON.stringify(S.session.learn||null);let L=checkLearn();
  if(!L||!L.list||!L.list.length){const q=queuedWords();
    if(!q.length){app.innerHTML=`<div class="zone-h"><span class="tag">🎓 学习区</span></div><div class="empty"><div class="e">🌱</div>学习区还是空的。<br>去 <a href="#/">学习来源</a> 的原文里点选想学的单词吧！<br><br><a class="btn sec" href="#/vault">🏆 去成就仓选词</a></div>`;return}
    L=newRound()}
  if(JSON.stringify(S.session.learn||null)!==before)save();kickPrep(L.list);loadDict();
  renderLearn()}
function renderLearn(){const L=S.session.learn;if(L.i>=L.list.length)return finishLearn();
  const w=L.list[L.i],c=content(w),rec=S.words[w]||{};const tot=L.list.length*NSTEP;
  // skip steps that don't apply to this word (e.g. no usable sentence)
  while(L.step<NSTEP&&!stepOK(L.step,w))L.step++;
  const done=L.i*NSTEP+L.step;
  const Q=queuedWords().length;
  const prog=L.kind==='vault'?`成就仓重学 ${L.i+1} / ${L.list.length}`:`本组 ${L.i+1} / ${L.list.length} · 待学共 ${Q} 个`;
  const head=`<div class="zone-h"><span class="tag">🎓 学习区</span><b style="font-size:1.05rem">${prog}</b>${L.kind==='vault'&&Q?`<button class="btn sec sm" data-act="toqueue">去学待学的 ${Q} 个 →</button>`:''}<div class="bar"><b style="width:${done/tot*100}%"></b></div></div>
   <div class="steps">${STEP_NAMES.map((n,i)=>`<span class="${i===L.step?'on':i<L.step?'done':''}">${n}</span>`).join('')}</div>`;
  if(L.step===0){
    app.innerHTML=head+`<div class="flip" id="flip"><div class="in">
     <div class="face f"><div class="big">${esc(w)}</div><div class="ipa">${esc(c.us||'')} <span class="faint" style="font-size:.75rem">美</span></div><button class="ico" data-say="${esc(w)}" style="width:48px;height:48px;font-size:1.3rem">🔊</button><div class="hint">👆 点击卡片翻面</div></div>
     <div class="face b"><div class="big" style="font-size:2rem">${esc(w)} <button class="ico" data-say="${esc(w)}">🔊</button></div><div class="zhbig">${esc(c.zh||'（暂无释义）')}</div>
      ${rec.en?`<div class="ex">${speakable(rec.en,w)} <button class="ico" data-say="${esc(rec.en)}">▶</button>${rec.szh?`<small>${esc(rec.szh)}</small>`:''}<div class="from">原文 · ${esc(rec.srcTitle||'')}${rec.p?' p.'+rec.p:''}</div></div>`:''}
      <div class="hint">👆 再点翻回正面</div></div></div></div>
     <div class="actions"><button class="btn sec" data-act="flip">🔄 翻面</button><button class="btn" data-act="next">记住了，下一步 →</button></div>`;
    setTimeout(()=>say(w),250);
  }else if(L.step===1){
    return renderSpell(w,head,c)
  }else if(L.step===3){
    return renderSent(w,head,c)
  }else if(L.step===2){
    let q;
    if(c.phrases.length){const ph=c.phrases[L.i%c.phrases.length];const pool=shuffle(Object.entries(LEX).filter(([k])=>k!==w).flatMap(([,e])=>e.phrases.map(p=>p[1]))).filter(z=>z!==ph[1]).slice(0,3);
      q={prompt:`<div class="muted">这个短语 / 习语是什么意思？</div><div class="phr">${speakable(ph[0])}</div><button class="ico" data-say="${esc(ph[0])}">🔊</button>`,ok:ph[1],opts:shuffle([ph[1],...pool]),say:ph[0]}}
    else{const pool=shuffle(Object.values(LEX).map(e=>shortZh(e.zh)).filter(z=>z&&z!==shortZh(c.zh))).slice(0,3);const ok=shortZh(c.zh)||'（暂无释义）';
      q={prompt:`<div class="muted">这个词在原文里的意思是？</div><div class="phr">${esc(w)}</div><button class="ico" data-say="${esc(w)}">🔊</button><div class="note">这个词还没有收录固定搭配；接入 AI 后台后可自动生成短语题。</div>`,ok,opts:shuffle([ok,...pool]),say:w}}
    app.innerHTML=head+`<div class="qbox"><div class="prompt">${q.prompt}</div><div class="opts">${q.opts.map((o,i)=>`<button class="opt" data-act="mcq" data-v="${esc(o)}"><span class="L">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
     <div id="after" class="hidden">${c.phrases.length?`<div class="phlist"><b>📌 常见搭配</b>${c.phrases.map(p=>`<div><button class="ico" data-say="${esc(p[0])}">🔊</button><span class="en">${esc(p[0])}</span><span class="muted">${esc(p[1])}</span></div>`).join('')}</div>`:''}
      <div class="actions"><button class="btn" data-act="next">下一步：句子重组 →</button></div></div></div>`;
    setTimeout(()=>say(q.say),250);
    app.dataset.ok=q.ok;
  }else{
    return renderScene(w,head,c)
  }
  bindLearn(w);
}
function bindLearn(w,extra){const L=S.session.learn;
  const onClick=e=>{const a=e.target.closest('[data-act]');const sp=e.target.closest('[data-say]');
    if(sp){say(sp.dataset.say);return}
    if(e.target.closest('#flip')&&!a){$('#flip').classList.toggle('back');return}
    if(!a)return;const k=a.dataset.act;
    if(k==='flip'){$('#flip').classList.toggle('back');return}
    if(k==='toqueue'){newRound();save();kickPrep(S.session.learn.list);cleanup&&cleanup();cleanup=null;renderLearn();window.scrollTo(0,0);return}
    if(k==='mcq'){if($('#after').classList.contains('hidden')===false)return;const ok=a.dataset.v===app.dataset.ok;
      if(ok){a.classList.add('ok');$('#after').classList.remove('hidden');say('Great job!');}
      else{a.classList.add('bad');$$('.opt').forEach(o=>{if(o.dataset.v===app.dataset.ok)o.classList.add('ok')});$('#after').classList.remove('hidden');const r=S.words[w];if(r){r.miss=(r.miss||0)+1;save()}}
      return}
    if(k==='next'){L.step++;if(L.step>=NSTEP){const r=S.words[w];if(r&&r.st==='queued'){r.st='learned';r.learnedAt=Date.now();mark()}L.step=0;L.i++}save();cleanup&&cleanup();cleanup=null;renderLearn();window.scrollTo(0,0)}};
  if(cleanup)cleanup();app.addEventListener('click',onClick);cleanup=()=>{app.removeEventListener('click',onClick);extra&&extra()}}
function renderSceneStatic(w,head,c){const L=S.session.learn;
  const sc=c.scene;let body;
    const TYPES={song:'🎵 歌词',movie:'🎬 电影台词',book:'📖 名著经典',poem:'📜 诗歌',speech:'🗣 名人演讲',proverb:'💬 英语谚语',ai:'🤖 故事由 AI 创作'};
    if(sc){const [t,en,zh,label,url]=sc;
      const links=t==='ai'?'':url?`<a href="${esc(url)}" target="_blank" rel="noopener">查看出处 ↗</a>${(t==='song'||t==='movie')?` · <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((label||'').replace(/[\u4e00-\u9fff（）《》，·]+/g,' ')+' '+en)}" target="_blank" rel="noopener">▶ YouTube 搜索</a>`:''}`:'';
      body=`<span class="badge${t==='ai'?' ai':''}">${TYPES[t]||t}</span><blockquote lang="en">${speakable(en,w)}</blockquote><div class="szh2">${esc(zh)}</div>
       <div class="srcl"><button class="ico" data-say="${esc(en)}">▶</button>${t==='ai'?'<span>故事由 AI 创作（树儿学院原创，非引用）</span>':`<span>出处：${esc(label||'')}</span>${links}`}</div>`}
    else{const rec2=S.words[w]||{};body=`<span class="badge">📖 出自原文</span><blockquote lang="en">${speakable(rec2.en||w,w)}</blockquote><div class="szh2">${esc(rec2.szh||'')}</div>
      <div class="srcl"><button class="ico" data-say="${esc(rec2.en||w)}">▶</button><span>出处：${esc(rec2.srcTitle||'')}</span></div><div class="note">这个词暂无预置的歌曲 / 电影 / 名著场景。配置 AI 后台（/api/reader/enrich）后会自动生成一个标注「故事由 AI 创作」的小故事。</div>`}
    app.innerHTML=head+`<div class="scene">${body}</div><div class="actions"><button class="btn" data-act="next">${L.i+1<L.list.length?'学下一个单词 →':'完成本组，进入复习区 →'}</button></div>`;
  bindLearn(w)}

/* ---------- ⑤ 用法场景 = 译文选择题 (read the English, pick the right Chinese) ---------- */
const QZ={p:null,busy:{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function sceneOf(w,c){const sc=c.scene;if(sc&&sc[1]&&sc[2])return{t:sc[0],en:sc[1],zh:sc[2],label:sc[3],url:sc[4]};
  const rec=S.words[w]||{};return rec.en&&rec.szh?{t:'book',en:rec.en,zh:rec.szh,label:rec.srcTitle}:null}
const zkey=z=>String(z||'').replace(/\s+/g,'');
function quizOpts(w,s){const e=!LEX[w]&&S.enrich[w];let o=null;
  if(e&&e.scene&&e.scene[1]===s.en&&e.sd&&e.sd.length>=2)o=e.sd;
  else{const q=S.sq&&S.sq[w];if(q&&q.en===s.en&&q.zh===s.zh&&q.o&&q.o.length>=2)o=q.o}
  if(!o)return null;o=[...new Set(o.map(x=>String(x).trim()).filter(x=>x&&zkey(x)!==zkey(s.zh)))].slice(0,3);return o.length>=2?o:null}
/* no-AI fallback: Chinese translations of OTHER sentences (same book first), closest in length */
function fallbackOpts(w,s){const rec=S.words[w]||{};const seen=new Set([zkey(s.zh)]);const cand=[];
  const add=(z,book)=>{z=String(z||'').trim();const k=zkey(z);if(!z||seen.has(k))return;seen.add(k);cand.push({z,book})};
  Object.entries(S.words).forEach(([k,r])=>{if(k!==w&&r&&r.szh&&r.en!==s.en)add(r.szh,r.src&&r.src===rec.src)});
  Object.entries(S.enrich).forEach(([k,e])=>{if(k!==w&&e&&e.scene&&e.scene[2])add(e.scene[2])});
  Object.entries(LEX).forEach(([k,e])=>{if(k!==w&&e&&e.scene&&e.scene[2])add(e.scene[2])});
  const L=zkey(s.zh).length;cand.sort((a,b)=>Math.abs(zkey(a.z).length-L)-Math.abs(zkey(b.z).length-L)-(a.book?4:0)+(b.book?4:0));
  const pick=shuffle(cand.slice(0,6)).slice(0,3).map(x=>x.z);return pick.length>=2?pick:null}
function kickPrep(list){QZ.p=Promise.resolve(enrichMissing(list)).then(()=>prefetchQuiz(list)).catch(()=>{})}
function prefetchQuiz(list){if(!CFG.quizEndpoint)return null;
  const items=[];(list||[]).forEach(w=>{const s=sceneOf(w,content(w));if(s&&!quizOpts(w,s)&&!QZ.busy[w+'|'+s.en])items.push({w,en:s.en,zh:s.zh})});
  if(!items.length)return null;items.forEach(x=>QZ.busy[x.w+'|'+x.en]=1);
  return fetch(CFG.quizEndpoint,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({items:items.slice(0,10)})})
    .then(r=>r.ok?r.json():{}).then(j=>{let n=0;for(const x of items){const o=j&&j.opts&&j.opts[x.w];if(Array.isArray(o)&&o.length>=2){S.sq[x.w]={en:x.en,zh:x.zh,o:o.slice(0,3)};n++}}if(n)save()})
    .catch(()=>{}).then(()=>{items.forEach(x=>delete QZ.busy[x.w+'|'+x.en])})}
function renderScene(w,head,c,waited){const L=S.session.learn;const s=sceneOf(w,c);
  if(!s)return renderSceneStatic(w,head,c);
  let dis=quizOpts(w,s);
  if(!dis&&QZ.p&&!waited){app.innerHTML=head+'<div class="empty">…</div>';
    Promise.race([QZ.p,sleep(3500)]).then(()=>{const l=S.session.learn;if(l&&l.list&&l.list[l.i]===w&&l.step===4&&location.hash.startsWith('#/learn'))renderScene(w,head,c,true)});return}
  if(!dis)dis=fallbackOpts(w,s);
  if(!dis)return renderSceneStatic(w,head,c);
  const TYPES={song:'🎵 歌词',movie:'🎬 电影台词',book:'📖 名著经典',poem:'📜 诗歌',speech:'🗣 名人演讲',proverb:'💬 英语谚语',ai:'🤖 故事由 AI 创作'};
  const opts=shuffle([s.zh,...dis]);
  const links=s.t==='ai'||s.t==='book'||!s.url?'':`<a href="${esc(s.url)}" target="_blank" rel="noopener">查看出处 ↗</a>${(s.t==='song'||s.t==='movie')?` · <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((s.label||'').replace(/[\u4e00-\u9fff（）《》，·]+/g,' ')+' '+s.en)}" target="_blank" rel="noopener">▶ YouTube 搜索</a>`:''}`;
  const lab=s.t==='ai'?'<span>故事由 AI 创作（树儿学院原创，非引用）</span>':s.t==='book'?`<span>出处：${esc(s.label||'')}</span>`:`<span>出处：${esc(s.label||'')}</span>${links}`;
  app.innerHTML=head+`<div class="scene qz"><span class="badge${s.t==='ai'?' ai':''}">${s.t==='book'?'📖 出自原文':TYPES[s.t]||s.t}</span>
    <blockquote lang="en">${speakable(s.en,w)}</blockquote>
    <div class="srcl"><button class="ico" data-say="${esc(s.en)}" aria-label="朗读">▶</button>${lab}</div>
    <div class="muted qz-q">👇 选一选，这句话的中文意思是？</div>
    <div class="opts" id="qz-opts">${opts.map((o,i)=>`<button class="opt" data-act="qz" data-v="${esc(o)}"><span class="L">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
    <div id="qz-msg" class="sp-msg" aria-live="polite"></div></div>
    <div id="qz-after" class="actions hidden"><button class="btn" data-act="next">${L.i+1<L.list.length?'学下一个单词 →':'完成本组，进入复习区 →'}</button></div>`;
  const onQz=e=>{const a=e.target.closest('[data-act="qz"]');if(!a||!$('#qz-after').classList.contains('hidden'))return;
    const ok=a.dataset.v===s.zh;const box=$('#qz-opts');box.classList.add('done');
    if(ok){a.classList.add('ok');$('#qz-msg').className='sp-msg good';$('#qz-msg').innerHTML=`${PRAISE[Math.random()*PRAISE.length|0]} 翻译对啦，听一听 🎧`}
    else{a.classList.add('bad');$$('#qz-opts .opt').forEach(o=>{if(o.dataset.v===s.zh)o.classList.add('ok')});$('#qz-msg').className='sp-msg bad';$('#qz-msg').innerHTML='差一点点～绿色的才是正确的翻译，读一读再继续 💪';missOnce(w)}
    $('#qz-after').classList.remove('hidden');say(s.en);setTimeout(()=>{try{$('#qz-after').scrollIntoView({block:'nearest',behavior:'smooth'})}catch(_){}},60)};
  app.addEventListener('click',onQz);
  bindLearn(w,()=>app.removeEventListener('click',onQz))}
/* ---------- 学习区 steps ②拼写补全 and ④句子重组 (drag or tap; pointer events, no page scroll while dragging) ---------- */
const PH=window.TT_PH;
const DICT={set:null,ready:false,p:null};
function loadDict(){if(DICT.p)return DICT.p;
  DICT.p=fetch((CFG.wordsUrl||'/reader/words.txt'),{credentials:'same-origin'}).then(r=>r.ok?r.text():'').then(t=>{DICT.set=new Set(t.split('\n').filter(Boolean))}).catch(()=>{}).then(()=>{DICT.ready=true});return DICT.p}
function sentenceFor(w){const rec=S.words[w]||{};return PH?PH.sentencePlan(rec.en,w,t=>hiMatch(t,w)):null}
function stepOK(step,w){if(step===1)return !!(PH&&PH.plan(w));if(step===3)return !!sentenceFor(w);return true}
/* Generic drag helper. root: element holding .tb tiles; hooks: {drop(id,fromEl,target,x,y), tap(id,fromEl)} */
function dragKit(root,hooks){let d=null;
  const clear=()=>{if(!d)return;d.ghost&&d.ghost.remove();$$('.hot').forEach(x=>x.classList.remove('hot'));d.el.classList.remove('dragging');d=null};
  const down=e=>{const t=e.target.closest('.tb');if(!t||!root.contains(t)||t.classList.contains('lock')||(e.button!=null&&e.button>0))return;
    d={el:t,id:t.dataset.id,x0:e.clientX,y0:e.clientY,on:false,pid:e.pointerId,ghost:null};try{t.setPointerCapture(e.pointerId)}catch(_){}};
  const move=e=>{if(!d||e.pointerId!==d.pid)return;const dx=e.clientX-d.x0,dy=e.clientY-d.y0;
    if(!d.on){if(dx*dx+dy*dy<64)return;d.on=true;const r=d.el.getBoundingClientRect();const g=d.el.cloneNode(true);g.classList.add('ghost');g.style.width=r.width+'px';g.style.height=r.height+'px';document.body.appendChild(g);d.ghost=g;d.ox=r.width/2;d.oy=r.height/2;d.el.classList.add('dragging')}
    e.preventDefault();d.ghost.style.left=(e.clientX-d.ox)+'px';d.ghost.style.top=(e.clientY-d.oy)+'px';
    $$('.hot').forEach(x=>x.classList.remove('hot'));const u=document.elementFromPoint(e.clientX,e.clientY);const tg=u&&u.closest('[data-drop]');if(tg&&root.contains(tg))tg.classList.add('hot')};
  const up=e=>{if(!d||e.pointerId!==d.pid)return;const was=d;const on=d.on;
    const u=on?document.elementFromPoint(e.clientX,e.clientY):null;const tg=u&&u.closest('[data-drop]');
    clear();if(!on){hooks.tap(was.id,was.el);return}
    hooks.drop(was.id,was.el,tg&&root.contains(tg)?tg:null,e.clientX,e.clientY)};
  const cancel=()=>clear();
  const noMenu=e=>{if(e.target.closest('.tb'))e.preventDefault()};
  root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move,{passive:false});root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);root.addEventListener('contextmenu',noMenu);
  return()=>{clear();root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel);root.removeEventListener('contextmenu',noMenu)}}
const missOnce=w=>{const r=S.words[w];if(r){r.miss=(r.miss||0)+1;save()}};
const PRAISE=['太棒了！🎉','答对啦！⭐','真厉害！👏','完美！🌟'];

/* ② 拼写补全 */
function renderSpell(w,head,c){const L=S.session.learn;
  if(!DICT.ready){loadDict().then(()=>{const l=S.session.learn;if(l&&l.list&&l.list[l.i]===w&&l.step===1&&location.hash.startsWith('#/learn'))renderLearn()});app.innerHTML=head+'<div class="empty">…</div>';return}
  const pl=PH.plan(w);const dis=PH.distractors(pl,DICT.set);
  const tiles=shuffle([...pl.letters.map(ch=>({ch})),...dis.map(ch=>({ch,x:1}))]).map((t,i)=>({id:'t'+i,ch:t.ch}));
  const blanks=pl.pieces.filter(p=>p.blank);const nSlots=pl.letters.length;
  const st={slots:Array(nSlots).fill(null),tries:0,done:false,locked:new Set(),wrong:new Set(),shownAnswer:false};
  const ch=id=>tiles.find(t=>t.id===id).ch;
  const ans=()=>{let k=0;return pl.pieces.map(p=>{if(!p.blank)return p.t;let s='';for(let j=0;j<p.t.length;j++)s+=ch(st.slots[k++]||'')||'';return s}).join('')};
  const size=(pl.word.length>9?44:pl.word.length>6?50:56);
  function paint(){const inSlot=new Set(st.slots.filter(Boolean));let k=0;
    const wordHTML=pl.pieces.map(p=>{if(!p.blank)return `<span class="vis">${esc(p.t)}</span>`;
      const boxes=[...p.t].map(()=>{const i=k++,id=st.slots[i];
        return `<span class="lt${st.wrong.has(i)?' bad':''}${st.done?' ok':''}${st.shownAnswer?' shown':''}" data-drop="s${i}">${id?`<button class="tb${st.locked.has(i)||st.done?' lock':''}" data-id="${id}" data-from="s${i}">${esc(ch(id))}</button>`:''}</span>`}).join('');
      return `<span class="bk"><span class="bx">${boxes}</span><small>${p.t.length}个字母</small></span>`}).join('');
    const pool=tiles.filter(t=>!inSlot.has(t.id));
    $('#sp-word').innerHTML=wordHTML;
    $('#sp-pool').innerHTML=pool.length?pool.map(t=>`<button class="tb" data-id="${t.id}" data-from="pool" aria-label="${esc(t.ch)}">${esc(t.ch)}</button>`).join(''):'<span class="faint" style="font-size:.9rem">字母都用完啦</span>';
    $('#sp-check').disabled=st.done||st.slots.some(x=>!x)}
  app.innerHTML=head+`<div class="qbox spq" style="--s:${size}px">
    <div class="prompt"><div class="muted" style="margin-bottom:6px">🎧 听发音，把缺的字母拖进空格里</div>
      <button class="btn sp-snd" data-say="${esc(w)}">🔊 听单词</button>
      <div class="zhhint">${esc(shortZh(c.zh)||'')}</div>
      <div id="sp-word" class="sp-word en" lang="en"></div></div>
    <div id="sp-msg" class="sp-msg" aria-live="polite">拖一拖，或者点一下字母放进空格；点空格里的字母可以拿回来</div>
    <div id="sp-pool" class="sp-pool" data-drop="pool"></div>
    <div class="actions"><button class="btn" id="sp-check" data-act="spcheck" disabled>✅ 检查答案</button></div>
    <div id="sp-after" class="actions hidden"><button class="btn" data-act="next">下一步：搭配选择 →</button></div></div>`;
  paint();setTimeout(()=>say(w),300);
  const msg=(h,cls)=>{const m=$('#sp-msg');m.className='sp-msg'+(cls?' '+cls:'');m.innerHTML=h};
  const place=(id,i)=>{const cur=st.slots[i];const from=st.slots.indexOf(id);if(from>=0)st.slots[from]=cur&&!st.locked.has(i)?cur:null;st.slots[i]=id;st.wrong.delete(i);st.wrong.delete(from)};
  const firstFree=()=>st.slots.findIndex((x,i)=>!x&&!st.locked.has(i));
  const kit=dragKit(app.querySelector('.spq'),{
    tap(id,el){if(st.done)return;const from=el.dataset.from;
      if(from==='pool'){const i=firstFree();if(i<0)return;place(id,i);say(ch(id),.8)}
      else{const i=+from.slice(1);if(st.locked.has(i))return;st.slots[i]=null;st.wrong.delete(i)}paint()},
    drop(id,el,tg){if(st.done)return;const from=el.dataset.from;
      if(!tg||tg.dataset.drop==='pool'){if(from!=='pool'){const i=+from.slice(1);if(!st.locked.has(i)){st.slots[i]=null;st.wrong.delete(i)}}paint();return}
      const i=+tg.dataset.drop.slice(1);if(st.locked.has(i)){paint();return}
      const cur=st.slots[i];if(from!=='pool'){const f=+from.slice(1);st.slots[f]=cur&&!st.locked.has(f)?cur:null}
      st.slots[i]=id;st.wrong.delete(i);paint()}});
  const spClick=e=>{const a=e.target.closest('[data-act="spcheck"]');if(!a||st.done)return;
    const target=[...pl.letters];const got=st.slots.map(id=>ch(id));
    const full=ans(),okExact=full===pl.word,alt=!okExact&&DICT.set&&DICT.set.has(full)&&got.slice().sort().join('')===target.slice().sort().join('');
    st.tries++;
    if(okExact||alt){st.done=true;st.wrong.clear();paint();$('#sp-word').classList.add('full');
      $('#sp-word').innerHTML=pl.pieces.map(p=>`<span class="${p.blank?'fill':'vis'}">${esc(p.t)}</span>`).join('');
      msg(`${PRAISE[Math.random()*PRAISE.length|0]} <b class="en">${esc(alt?full:pl.word)}</b>`,'good');$('#sp-check').classList.add('hidden');$('#sp-after').classList.remove('hidden');
      say('Great job! '+(alt?full:pl.word));return}
    if(st.tries===1)missOnce(w);
    // mark wrong letters (keep the right ones), send the wrong ones back
    const wrongIdx=[];let k=0;pl.pieces.forEach(p=>{if(p.blank)for(let j=0;j<p.t.length;j++){if(got[k]!==p.t[j])wrongIdx.push(k);k++}});
    if(st.tries>=3){st.shownAnswer=true;st.done=true;const letters=[...pl.letters];const used=new Set();
      st.slots=letters.map(chv=>{const t=tiles.find(t=>t.ch===chv&&!used.has(t.id));used.add(t.id);return t.id});st.wrong.clear();paint();
      $('#sp-word').innerHTML=pl.pieces.map(p=>`<span class="${p.blank?'fill shown':'vis'}">${esc(p.t)}</span>`).join('');
      msg(`没关系，我们一起看答案：<b class="en">${esc(pl.word)}</b>，多读几遍就记住啦 💪`,'hint');$('#sp-check').classList.add('hidden');$('#sp-after').classList.remove('hidden');say(w);return}
    st.wrong=new Set(wrongIdx);paint();
    const first=wrongIdx[0];
    setTimeout(()=>{if(st.done)return;wrongIdx.forEach(i=>{if(!(st.tries===2&&i===first))st.slots[i]=null;});
      if(st.tries===2){// hint: put the correct letter in the first wrong blank and lock it
        const need=pl.letters[first];const t=tiles.find(t=>t.ch===need&&!st.slots.includes(t.id));if(t){st.slots[first]=t.id;st.locked.add(first)}}
      st.wrong.clear();paint()},900);
    msg(st.tries===1?'差一点点！红色的字母放错了，听一听发音再试试 🎧':'再想想～我帮你放好了第一个错的空格 💡','bad');say(w,.8)};
  app.addEventListener('click',spClick);
  bindLearn(w,()=>{kit();app.removeEventListener('click',spClick)})}

/* ④ 句子重组 */
function renderSent(w,head,c){const L=S.session.learn;const rec=S.words[w]||{};const sp=sentenceFor(w);
  const tok=sp.tokens;const tiles=sp.mix.map(i=>({id:'w'+i,i,t:tok[i]}));
  const st={pool:tiles.map(t=>t.id),ans:[],tries:0,done:false,bad:new Set(),shown:false};
  const byId=id=>tiles.find(t=>t.id===id);
  const full=tok.join(' ')+sp.end;
  const hl=t=>PH.wordsOf(t).some(x=>hiMatch(x,w));
  const zhOf=(rec.szh||'').trim();
  function paint(){
    $('#sn-ans').innerHTML=(st.ans.length?st.ans.map((id,k)=>{const t=byId(id);return `<button class="tb wd${st.bad.has(id)?' bad':''}${st.done?' ok lock':''}${hl(t.t)&&st.done?' hl':''}" data-id="${id}" data-from="ans" data-k="${k}" lang="en">${esc(t.t)}</button>`}).join(''):'<span class="faint ph">把单词拖到这里 ↓</span>')+(sp.end?`<span class="endm">${esc(sp.end)}</span>`:'');
    $('#sn-pool').innerHTML=st.pool.length?st.pool.map(id=>`<button class="tb wd" data-id="${id}" data-from="pool" lang="en">${esc(byId(id).t)}</button>`).join(''):'<span class="faint" style="font-size:.9rem">单词都用完啦</span>';
    $('#sn-check').disabled=st.done||st.pool.length>0}
  app.innerHTML=head+`<div class="qbox snq">
    <div class="prompt"><div class="muted" style="margin-bottom:6px">🧩 把单词排成正确的句子（目标词 <b class="en">${esc(w)}</b>）</div>
      ${zhOf?`<div class="szh3">${esc(zhOf)}</div>`:`<div class="szh3">${esc(shortZh(c.zh)||'')}</div>`}
      ${sp.partial?'<div class="note" style="margin-top:2px">上面是整句的意思；这一步只排其中一小段英文</div>':''}
      <button class="btn sp-snd" data-say="${esc(full)}" style="margin-top:8px">🔊 听这句话</button></div>
    <div id="sn-ans" class="sn-ans" data-drop="ans"></div>
    <div id="sn-msg" class="sp-msg" aria-live="polite">拖一拖，或者依次点单词；点上面的单词可以放回去</div>
    <div id="sn-pool" class="sn-pool" data-drop="pool"></div>
    <div class="actions"><button class="btn" id="sn-check" data-act="sncheck" disabled>✅ 检查答案</button></div>
    <div id="sn-after" class="actions hidden"><button class="btn" data-act="next">${L.i+1<L.list.length?'下一步：用法场景 →':'下一步：用法场景 →'}</button></div></div>`;
  paint();
  const msg=(h,cls)=>{const m=$('#sn-msg');m.className='sp-msg'+(cls?' '+cls:'');m.innerHTML=h};
  const remove=id=>{st.pool=st.pool.filter(x=>x!==id);st.ans=st.ans.filter(x=>x!==id)};
  const insertAt=(x,y)=>{const els=$$('#sn-ans .tb');let n=0;for(const e of els){if(e.classList.contains('dragging'))continue;const r=e.getBoundingClientRect();
      if(y>r.bottom||(y>=r.top&&x>r.left+r.width/2))n++;}return n};
  const kit=dragKit(app.querySelector('.snq'),{
    tap(id,el){if(st.done)return;st.bad.delete(id);if(el.dataset.from==='pool'){remove(id);st.ans.push(id)}else{remove(id);st.pool.push(id)}paint()},
    drop(id,el,tg,x,y){if(st.done)return;st.bad.clear();
      if(tg&&tg.dataset.drop==='ans'){const wasIdx=st.ans.indexOf(id);let at=insertAt(x,y);remove(id);if(wasIdx>=0&&wasIdx<at)at--;st.ans.splice(Math.max(0,Math.min(at,st.ans.length)),0,id)}
      else if(el.dataset.from==='ans'){remove(id);st.pool.push(id)}
      paint()}});
  const onClick=e=>{const a=e.target.closest('[data-act="sncheck"]');if(!a||st.done)return;
    st.tries++;const mine=st.ans.map(id=>byId(id).t);
    if(mine.join(' ')===tok.join(' ')){st.done=true;st.bad.clear();paint();msg(`${PRAISE[Math.random()*PRAISE.length|0]} 句子排对啦，听一听：`,'good');
      $('#sn-check').classList.add('hidden');$('#sn-after').classList.remove('hidden');say(full);return}
    if(st.tries===1)missOnce(w);
    if(st.tries>=3){st.shown=true;st.done=true;st.ans=tok.map((t,i)=>tiles.find(x=>x.i===i).id);st.pool=[];st.bad.clear();paint();
      msg(`没关系，正确的句子是：<br><b class="en">${esc(full)}</b>`,'hint');$('#sn-check').classList.add('hidden');$('#sn-after').classList.remove('hidden');say(full);return}
    st.bad=new Set(st.ans.filter((id,k)=>byId(id).t!==tok[k]));paint();
    msg(st.tries===1?'快排好啦！红色的单词位置不对，换一换 🔁':`再试试～第一个单词是 <b class="en">${esc(tok[0])}</b> 💡`,'bad')};
  app.addEventListener('click',onClick);
  bindLearn(w,()=>{kit();app.removeEventListener('click',onClick)})}

function finishLearn(){const list=S.session.learn.list;S.session.learn=null;S.session.review={list,phase:'match',round:0,missed:[],queue:[]};save();
  const left=queuedWords().length;
  if(!left){app.innerHTML=`<div class="empty"><div class="e">🎉</div><h2>学习完成！${list.length} 个单词</h2>马上进入复习区…</div>`;
    setTimeout(()=>{if(location.hash.startsWith('#/learn'))location.hash='#/review'},1300);return}
  app.innerHTML=`<div class="empty"><div class="e">🎉</div><h2>本组学完！${list.length} 个单词</h2>还有 <b>${left}</b> 个单词待学。<br>建议先复习本组，通关后再学下一组。
   <div class="actions" style="justify-content:center;margin-top:16px"><button class="btn" data-act="rv">🔁 复习本组 ${list.length} 个</button><button class="btn sec" data-act="more">🎓 再学一组</button></div></div>`;
  const onClick=e=>{const a=e.target.closest('[data-act]');if(!a)return;
    if(a.dataset.act==='rv'){location.hash='#/review';return}
    // keep going: these words stay 「待复习」 and will be reviewed together with the next round
    if(a.dataset.act==='more'){S.session.review=null;newRound();save();cleanup&&cleanup();cleanup=null;viewLearn();window.scrollTo(0,0)}};
  if(cleanup)cleanup();app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}

/* ================= REVIEW ZONE ================= */
function viewReview(){nav('review');let R=S.session.review;
  if(!R||!R.list||!R.list.length){const l=Object.values(S.words).filter(x=>x.st==='learned').map(x=>x.w);
    if(!l.length){app.innerHTML=`<div class="zone-h"><span class="tag rv">🔁 复习区</span></div><div class="empty"><div class="e">🍃</div>现在没有需要复习的单词。<br><a href="#/learn">去学习区</a> 或 <a href="#/vault">成就仓</a></div>`;return}
    R=S.session.review={list:l,phase:'match',round:0,missed:[],queue:[]};save()}
  R.phase==='match'?renderMatch():R.phase==='talk'?renderTalk():renderDialog()}
function rounds(list){const n=Math.ceil(list.length/5),out=[];const size=Math.ceil(list.length/n);for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return out}
function renderMatch(){const R=S.session.review;const rs=rounds(R.list);if(!R.round&&!R.tpre){R.tpre=1;R.tg=talkGroups(R.list);fetchTalk(R.tg)}if(R.round>=rs.length){return afterMatch()}
  const set=rs[R.round];const left=shuffle(set),right=shuffle(set);let sel=null,left2=set.length;
  app.innerHTML=`<div class="zone-h"><span class="tag rv">🔁 复习区 · 连连看</span><b>第 ${R.round+1} / ${rs.length} 轮</b><div class="bar"><b style="width:${R.round/rs.length*100}%"></b></div></div>
   <p class="muted center">先点英文，再点对应的中文。配错的单词会进入「情景对话」继续练习。</p>
   <div class="match"><div class="col">${left.map(w=>`<button class="tile en" data-e="${esc(w)}">${esc(w)}</button>`).join('')}</div>
    <div class="col">${right.map(w=>`<button class="tile" data-z="${esc(w)}">${esc(shortZh(content(w).zh)||'？')}</button>`).join('')}</div></div>
   <p class="center faint" style="font-size:.85rem">本轮错配：<span id="mc">${R.missed.filter(m=>set.includes(m)).length}</span></p>`;
  const onClick=e=>{const t=e.target.closest('.tile');if(!t)return;
    if(t.dataset.e){$$('.tile.sel').forEach(x=>x.classList.remove('sel'));t.classList.add('sel');sel=t.dataset.e;say(sel);return}
    if(!sel){toast('先点左边的英文单词');return}
    const z=t.dataset.z,lt=$(`.tile[data-e="${CSS.escape(sel)}"]`);
    if(z===sel||shortZh(content(z).zh)===shortZh(content(sel).zh)){lt.classList.remove('sel');lt.classList.add('ok');const rt=$(`.tile[data-z="${CSS.escape(z)}"]:not(.ok)`);rt.classList.add('ok');
      if(z!==sel){rt.dataset.z=sel}
      sel=null;left2--;if(left2===0){R.round++;save();setTimeout(()=>{cleanup&&cleanup();cleanup=null;renderMatch()},650)}}
    else{t.classList.add('bad');lt.classList.add('bad');setTimeout(()=>{t.classList.remove('bad');lt.classList.remove('bad')},400);
      if(!R.missed.includes(sel)){R.missed.push(sel);const r=S.words[sel];if(r)r.miss=(r.miss||0)+1;save()}$('#mc').textContent=R.missed.filter(m=>set.includes(m)).length}};
  if(cleanup)cleanup();app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function afterMatch(){const R=S.session.review;R.phase='talk';R.tq=R.tg||talkGroups(R.list);R.tn=R.tq.length;R.tmiss=0;save();
  app.innerHTML=`<div class="empty"><div class="e">🎧</div><h2>连连看完成！</h2>下一关：听对话，选回答</div>`;setTimeout(()=>{if(location.hash.startsWith('#/review'))renderTalk()},1200)}
/* ===== 复习区 · 听对话选回答 (AI dialogues from the review words, 2 words per line) ===== */
function talkGroups(list){const l=shuffle(list),g=[];for(let i=0;i<l.length;i+=2)g.push(l.slice(i,i+2));
  if(g.length>1&&g[g.length-1].length===1)g[g.length-2].push(g.pop()[0]);return g.slice(0,12)}
const tId=ws=>ws.map(w=>w.trim().toLowerCase()).sort().join('|');
const TK={busy:{}};
function fetchTalk(groups){const ids=groups.map(tId);const wait=ids.filter(i=>TK.busy[i]).map(i=>TK.busy[i]);
  const need=groups.filter(g=>!S.talk[tId(g)]&&!TK.busy[tId(g)]).slice(0,8);
  if(!need.length||!CFG.talkEndpoint)return Promise.all(wait);
  const pr=fetch(CFG.talkEndpoint,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({groups:need.map(g=>({words:g,hint:g.map(w=>shortZh(content(w).zh)).join('；')}))})})
    .then(r=>r.ok?r.json():{}).then(j=>{TK.detail=j&&j.detail;let n=0;for(const[k,t]of Object.entries((j&&j.talks)||{})){S.talk[k]=t;n++}if(n)save()})
    .catch(()=>{}).then(()=>need.forEach(g=>delete TK.busy[tId(g)]));
  need.forEach(g=>TK.busy[tId(g)]=pr);return Promise.all([pr,...wait])}
function talkVoice(who){const vs=TTS.ok?speechSynthesis.getVoices().filter(x=>/^en[-_](US|GB|AU)$/i.test(x.lang)):[];if(!vs.length)return null;
  const a=TTS.v||TTS.pick();if(who==='a')return a;return vs.find(x=>x!==a&&/en[-_]US/i.test(x.lang))||vs.find(x=>x!==a)||a}
function sayAs(t,who,rate){if(!TTS.ok){toast('这个浏览器不支持朗读');return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);
  const v=talkVoice(who);if(v)u.voice=v;u.lang=(v&&v.lang)||'en-US';u.rate=rate||.88;u.pitch=who==='a'?1.3:.8;speechSynthesis.speak(u)}
function renderTalk(waited){const R=S.session.review;if(!R.tq||!R.tq.length){R.phase='dlg';R.queue=[...R.missed];save();return R.queue.length?renderDialog():finishReview(!R.tmiss)}
  const g=R.tq[0],id=tId(g),t=S.talk[id];const done=R.tn-R.tq.length;
  const head=`<div class="zone-h"><span class="tag rv">🔁 复习区 · 听对话选回答</span><b>第 ${done+1} / ${R.tn} 段</b><div class="bar"><b style="width:${done/R.tn*100}%"></b></div></div>`;
  if(!t){if(!waited){app.innerHTML=head+'<div class="empty"><div class="e">✍️</div>AI 正在编一段有趣的对话…</div>';
      fetchTalk(R.tq).then(()=>{const r2=S.session.review;if(location.hash.startsWith('#/review')&&r2&&r2.phase==='talk'&&r2.tq&&tId(r2.tq[0]||[])===id)renderTalk(true)});return}
    // AI unavailable (quota / offline): skip this group, words still reviewed in the other steps
    toast(TK.detail==='daily_limit'?'今天的 AI 对话额度用完了，先跳过这一段':'AI 对话暂时生成不了，先跳过这一段',2200);R.tq.shift();save();return renderTalk()}
  if(R.tq.length>1)fetchTalk(R.tq.slice(1));
  const opts=shuffle([t.ok,...t.wrong.slice(0,3)]);
  app.innerHTML=head+`<div class="tkq">
   <div class="center" style="margin-bottom:10px"><span class="target">🎯 ${g.map(w=>`<b class="en">${esc(w)}</b> ${esc(shortZh(content(w).zh))}`).join(' · ')}</span></div>
   <div class="tkq-bub"><div class="tkq-av">${esc(t.ae)}<small>${esc(t.an)}</small></div><div class="tkq-msg">
     <div class="tkq-wave"><button class="btn sm" data-tk="play">🔊 播放</button><button class="btn sm sec" data-tk="slow">🐢 慢速</button><span class="muted">听 ${esc(t.an)} 说了什么</span></div>
     <div id="tkq-line" class="tkq-line hidden"><div class="en">${speakable(t.a.en)}</div><div class="tkq-zh">${esc(t.a.zh)}</div></div></div></div>
   <div class="tkq-bub me"><div class="tkq-av">${esc(t.be)}<small>${esc(t.bn)}</small></div><div class="tkq-msg"><b>${esc(t.bn)} 应该怎么回答？</b></div></div>
   <div class="tkq-opts">${opts.map((o,i)=>`<div class="tkq-row"><button class="opt" data-tk="ans" data-i="${i}"><span class="L">${'ABCD'[i]}</span><span class="tkq-o"><span class="en">${esc(o.en)}</span><span class="tkq-zh hidden">${esc(o.zh)}</span></span></button><button class="ico" data-tk="hear" data-i="${i}" aria-label="听这个回答">🔈</button></div>`).join('')}</div>
   <div class="center"><button class="tkq-help" data-tk="help">💡 求助 / 看原句</button></div>
   <p class="tkq-ai">🤖 对话由 AI 创作（树儿学院原创，非引用）</p>
   <div id="tkq-res" class="actions hidden"></div></div>`;
  setTimeout(()=>sayAs(t.a.en,'a'),350);let answered=false;
  const onClick=e=>{const sp=e.target.closest('[data-say]');if(sp){say(sp.dataset.say);return}
    const a=e.target.closest('[data-tk]');if(!a)return;const k=a.dataset.tk;
    if(k==='play'){sayAs(t.a.en,'a');return}if(k==='slow'){sayAs(t.a.en,'a',.6);return}
    if(k==='hear'){sayAs(opts[+a.dataset.i].en,'b');return}
    if(k==='help'){const l=$('#tkq-line');l.classList.toggle('hidden');a.textContent=l.classList.contains('hidden')?'💡 求助 / 看原句':'🙈 收起原句';return}
    if(k==='ans'){if(answered)return;answered=true;const o=opts[+a.dataset.i],ok=o===t.ok;sayAs(t.ok.en,'b');
      $$('.tkq-opts .opt').forEach((b,i)=>{if(opts[i]===t.ok){b.classList.add('ok');b.querySelector('.tkq-zh').classList.remove('hidden')}});
      $('.tkq-opts').classList.add('done');
      if(!ok){a.classList.add('bad');R.tmiss=(R.tmiss||0)+1;g.forEach(w=>{const r=S.words[w];if(r)r.miss=(r.miss||0)+1;if(!R.missed.includes(w))R.missed.push(w)})}
      R.tq.shift();$('#tkq-line').classList.remove('hidden');
      $('#tkq-res').innerHTML=(ok?`<b style="color:var(--forest)">✅ 答对了！${esc(t.bn)} 就是这么说的</b>`:`<b style="color:var(--bad)">差一点～正确回答已标绿，这些单词稍后再练</b>`)+`<button class="btn" data-tk="go">继续 →</button>`;
      $('#tkq-res').classList.remove('hidden');save();return}
    if(k==='go'){cleanup&&cleanup();cleanup=null;renderTalk();window.scrollTo(0,0)}};
  if(cleanup)cleanup();app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function afterTalkLegacy(){const R=S.session.review;if(!R.missed.length)return finishReview(true);R.phase='dlg';R.queue=[...R.missed];save();
  app.innerHTML=`<div class="empty"><div class="e">💬</div><h2>连连看完成！</h2>${R.missed.length} 个单词需要再练一练 → 情景对话</div>`;setTimeout(()=>{renderDialog()},1300)}
function dialogFor(w){const c=content(w);
  if(c.dlg){const others=shuffle(Object.entries(LEX).filter(([k])=>k!==w).map(([,e])=>e.dlg[1])).slice(0,2);
    return{a:c.dlg[0],ok:c.dlg[1],opts:shuffle([c.dlg[1],c.dlg[2],...others])}}
  const zh=shortZh(c.zh)||w;const pool=shuffle([...Object.keys(S.words),...Object.keys(LEX)].filter(k=>k!==w&&k.length>2));const ds=[...new Set(pool)].slice(0,3);
  const ok=`It's "${w}".`;return{a:`How do you say "${zh}" in English?`,ok,opts:shuffle([ok,...ds.map(d=>`It's "${d}".`)]),tpl:true}}
let DQ=null;
function renderDialog(){const R=S.session.review;if(!R.queue.length)return finishReview(false);
  const w=R.queue[0];if(!DQ||DQ.w!==w)DQ=Object.assign({w},dialogFor(w));const q=DQ;const total=R.missed.length,passed=total-new Set(R.queue).size;
  app.innerHTML=`<div class="zone-h"><span class="tag rv">🔁 复习区 · 情景对话</span><b>通关 ${passed} / ${total}</b><div class="bar"><b style="width:${passed/total*100}%"></b></div></div>
   <div class="dlg"><div class="center" style="margin-bottom:10px"><span class="target">🎯 练习单词 <b class="en">${esc(w)}</b> ${esc(shortZh(content(w).zh))}</span></div>
   <div class="bub"><div class="av">🧒</div><div class="msg"><div class="wave"><button class="btn sm" data-act="replay">🔊 再听一遍</button><button class="btn sm sec" data-act="show">👀 显示文字</button><span id="hear">听一听，然后选择合适的回答</span></div>
    <div id="atext" class="en hidden" style="margin-top:8px">${speakable(q.a)}</div></div></div>
   <div class="bub" style="flex-direction:row-reverse"><div class="av">🦫</div><div class="msg" style="border-radius:18px 4px 18px 18px;background:var(--soft)"><b>你会怎么回答？</b></div></div>
   <div class="opts">${q.opts.map((o,i)=>`<button class="opt" data-act="ans" data-v="${esc(o)}"><span class="L">${'ABCD'[i]}</span><span class="en">${esc(o)}</span></button>`).join('')}</div>
   ${q.tpl?'<p class="note center">该词暂无预置对话，使用通用模板；接入 AI 后台后会生成真实情景对话。</p>':''}
   <div id="res" class="actions hidden"></div></div>`;
  setTimeout(()=>say(q.a,.85),300);
  let answered=false;
  const onClick=e=>{const sp=e.target.closest('[data-say]');if(sp){say(sp.dataset.say);return}
    const a=e.target.closest('[data-act]');if(!a)return;const k=a.dataset.act;
    if(k==='replay'){say(q.a,.85);return}
    if(k==='show'){$('#atext').classList.toggle('hidden');a.textContent=$('#atext').classList.contains('hidden')?'👀 显示文字':'🙈 隐藏文字';return}
    if(k==='ans'){if(answered)return;answered=true;const ok=a.dataset.v===q.ok;say(a.dataset.v);
      if(ok){a.classList.add('ok');R.queue.shift();DQ=null;$('#res').innerHTML=`<b style="color:var(--forest)">✅ 答对了！<span class="en">${esc(w)}</span> 通关</b><button class="btn" data-act="go">继续 →</button>`}
      else{a.classList.add('bad');$$('.opt').forEach(o=>{if(o.dataset.v===q.ok)o.classList.add('ok')});R.queue.push(R.queue.shift());DQ=null;const r=S.words[w];if(r)r.miss=(r.miss||0)+1;
        $('#res').innerHTML=`<b style="color:var(--bad)">再想想～这个单词稍后会再出现</b><button class="btn" data-act="go">继续 →</button>`}
      $('#atext').classList.remove('hidden');$('#res').classList.remove('hidden');save();return}
    if(k==='go'){cleanup&&cleanup();cleanup=null;renderDialog();window.scrollTo(0,0)}};
  if(cleanup)cleanup();app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function finishReview(perfect){const R=S.session.review;let n=0;
  for(const w of R.list){const r=S.words[w];if(r&&r.st!=='mastered'){r.st='mastered';r.masteredAt=Date.now();n++}if(r)r.reviewedAt=Date.now()}
  mark();S.session.review=null;S.session.last={n:R.list.length,perfect,at:Date.now()};save();
  app.innerHTML=`<div class="empty"><div class="e">🏆</div><h2>复习通关！</h2>${R.list.length} 个单词停进成就仓…</div>`;setTimeout(()=>{location.hash='#/vault/new'},1300)}

/* ================= ACHIEVEMENT VAULT ================= */
let VSEL=new Set();
function streak(){const days=new Set(Object.keys(S.log));let n=0;const d=new Date();if(!days.has(today()))d.setDate(d.getDate()-1);
  for(;;){const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(days.has(k)){n++;d.setDate(d.getDate()-1)}else break}return n}
function viewVault(flag){if(cleanup){cleanup();cleanup=null}nav('vault');const M=Object.values(S.words).filter(x=>x.st==='mastered').sort((a,b)=>(b.masteredAt||0)-(a.masteredAt||0));
  const sentences=new Set(M.map(x=>x.src+'#'+x.sid)).size,sources=new Set(M.map(x=>x.src)).size,days=Object.keys(S.log).sort();
  const inProg=Object.values(S.words).filter(x=>x.st!=='mastered').length;
  const last=S.session.last;
  app.innerHTML=`<div class="zone-h"><span class="tag va">🏆 成就仓</span><span class="muted">学会的单词都停在这里，像停车场一样排好队</span></div>
  ${flag==='new'&&last?`<div class="banner">🎉 太棒了！刚刚有 ${last.n} 个单词${last.perfect?'一次通关':'通过情景对话通关'}，停进了成就仓。${queuedWords().length?` 还有 ${queuedWords().length} 个单词待学 → <a class="btn sm" href="#/learn">🎓 再学一组</a>`:''}</div>`:''}
  <div class="vstats"><div class="pill"><b>${M.length}</b>累计单词</div><div class="pill"><b>${sentences}</b>原文句子</div><div class="pill"><b>${sources}</b>学习来源</div>
   <div class="pill"><b>🔥 ${streak()}</b>连续学习天数</div><div class="pill"><b>${days.length}</b>学习天数</div><div class="pill"><b>${inProg}</b>学习/复习中</div></div>
  <p class="faint" style="font-size:.8rem;margin:-4px 0 10px">${days.length?`首次学习 ${days[0]} · 最近学习 ${days[days.length-1]}`:''}</p>
  ${M.length?`<div class="lot">${M.map((x,i)=>{const c=content(x.w);const ph=c.phrases[0];return `<div class="slot"><div class="vcard${VSEL.has(x.w)?' sel':''}" data-v="${esc(x.w)}">
    <span class="ck">${VSEL.has(x.w)?'✓':''}</span><div class="vw${x.w.length>6?' long':''}" data-say="${esc(x.w)}">${esc(x.w)}</div><div class="vi">${esc(c.us||'')}</div><div class="vz">${esc(shortZh(c.zh))}</div>
    <div class="lite">${ph?`<div><span class="en">${esc(ph[0])}</span> · ${esc(ph[1])}</div>`:''}<div class="s en" data-say="${esc(x.en||'')}">“${esc(x.en||'')}”</div></div>
    <span class="badge2">${esc((x.srcTitle||'').slice(0,18))}</span></div><span class="no">P-${String(i+1).padStart(2,'0')}</span></div>`}).join('')}</div>`
   :`<div class="empty"><div class="e">🅿️</div>成就仓的停车位还空着。<br>收藏单词 → 学习 → 复习通关后，单词就会停进来！<br><br><a class="btn" href="#/">去学习来源</a></div>`}
  <div class="dock" id="vdock"></div>`;
  vdock();
  const onClick=e=>{const sp=e.target.closest('[data-say]');if(sp){say(sp.dataset.say);return}
    const a=e.target.closest('[data-act]');
    if(a){const k=a.dataset.act,sel=[...VSEL];
      if(k==='all'){if(VSEL.size===M.length)VSEL.clear();else M.forEach(x=>VSEL.add(x.w));return viewVault()}
      if(k==='stay'){VSEL.clear();toast('好的，继续留在成就仓 🏆');return viewVault()}
      if(k==='tolearn'){S.session.learn={kind:'vault',picked:Date.now(),list:sel,i:0,step:0};VSEL.clear();save();location.hash='#/learn';return}
      if(k==='toreview'){S.session.review={list:sel,phase:'match',round:0,missed:[],queue:[]};VSEL.clear();save();location.hash='#/review';return}}
    const v=e.target.closest('.vcard');if(!v)return;const w=v.dataset.v;VSEL.has(w)?VSEL.delete(w):VSEL.add(w);v.classList.toggle('sel');$('.ck',v).textContent=VSEL.has(w)?'✓':'';vdock()};
  app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function vdock(){const d=$('#vdock');if(!d)return;const n=VSEL.size;
  d.innerHTML=`<button class="btn sec sm" data-act="all">☑️ 全选</button><span class="cnt">已选 <b>${n}</b></span>
   <button class="btn sm" data-act="tolearn" ${n?'':'disabled'}>🎓 进入学习区</button><button class="btn sm gold" data-act="toreview" ${n?'':'disabled'}>🔁 进入复习区</button><button class="btn sec sm" data-act="stay">🏆 留在成就仓</button>`}

/* ================= UPLOAD ================= */
const BIG=()=>(CFG.maxUploadMB||4.2)*1048576;
const blobUser=()=>String(USER).toLowerCase().replace(/[^a-z0-9_-]/g,'_').slice(0,40)||'user';
function limitNote(){const l=ME.limits&&ME.limits.uploads;if(!l)return'';return `<p class="muted" id="limn" style="margin-bottom:0">今天还可以上传 <b>${Math.max(0,l.max-l.used)}</b> 次${ME.ai&&ME.ai.model?` · AI：${esc(ME.ai.model)}`:''}</p>`}
async function refreshMe(){if(!CFG.meEndpoint)return;try{const r=await fetch(CFG.meEndpoint,{credentials:'same-origin'});if(r.ok)ME=await r.json()}catch(e){}}
async function apiErr(r){const j=await r.json().catch(()=>({}));if(r.status===401){goLogin();return new Error('请重新登录')}return new Error(j.detail||j.error||('HTTP '+r.status))}
function loadScript(src){return new Promise((ok,no)=>{if(window.TTBlob)return ok();const el=document.createElement('script');el.src=src;el.onload=()=>ok();el.onerror=()=>no(new Error('无法加载上传组件'));document.head.appendChild(el)})}
async function parseFile(blob,name,title){
  if(!CFG.parseEndpoint)throw new Error('未配置解析服务（parseEndpoint）。');let r;
  if(blob.size>BIG()){
    if(!ME.blob||!CFG.blobUploadEndpoint)throw new Error(`文件太大（${(blob.size/1048576).toFixed(1)} MB）。网站直接上传上限约 ${CFG.maxUploadMB||4.2} MB，请剪短录音或压缩后再试。`);
    await loadScript(CFG.blobClientUrl);const safe=(name||'file').replace(/[^\w.\-]/g,'_').slice(-60);
    let up;try{up=await window.TTBlob.upload(`reader-uploads/${blobUser()}/${Date.now()}-${safe}`,blob,{access:'private',handleUploadUrl:CFG.blobUploadEndpoint,contentType:blob.type||undefined})}
    catch(e){throw new Error('大文件上传失败：'+(e.message||e))}
    r=await fetch(CFG.parseEndpoint,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({blobUrl:up.url,contentType:blob.type||up.contentType,name,title})});
  }else{const fd=new FormData();fd.append('file',blob,name);fd.append('title',title||'');r=await fetch(CFG.parseEndpoint,{method:'POST',body:fd,credentials:'same-origin'})}
  if(!r.ok)throw await apiErr(r);return r.json()}
async function parseTextApi(text,title,kind){const fd=new FormData();fd.append('text',text);fd.append('title',title||'');fd.append('kind',kind||'text');
  const r=await fetch(CFG.parseEndpoint,{method:'POST',body:fd,credentials:'same-origin'});if(!r.ok)throw await apiErr(r);return r.json()}
function thumb(blob){return new Promise(ok=>{const im=new Image();im.onload=()=>{const H=Math.min(1200,im.height),W=Math.round(im.width*H/im.height);const c=document.createElement('canvas');c.width=W;c.height=H;
  c.getContext('2d').drawImage(im,0,0,W,H);URL.revokeObjectURL(im.src);ok({img:c.toDataURL('image/jpeg',.72),w:W,h:H})};im.onerror=()=>ok(null);im.src=URL.createObjectURL(blob)})}
/* several photos -> one multi-page source */
function mergeSources(parts,title){const out={id:parts[0].id,title,kind:'photo',createdAt:Date.now(),pages:[],sentences:[],words:[]};const W={};
  parts.forEach(src=>{const off=out.sentences.length,pmap={};
    src.pages.forEach(pg=>{const n=out.pages.length+1;pmap[pg.n]=n;out.pages.push({n,img:pg.img||null,w:pg.w||0,h:pg.h||0,s:pg.s.map(i=>i+off)})});
    src.sentences.forEach(x=>out.sentences.push({...x,id:x.id+off,p:pmap[x.p]||x.p}));
    src.words.forEach(w=>{const pages=w.pages.map(p=>pmap[p]||p),x=W[w.w];
      if(!x)W[w.w]={...w,pages,ex:w.ex+off,forms:[...(w.forms||[])]};
      else{x.freq+=w.freq;pages.forEach(p=>{if(!x.pages.includes(p))x.pages.push(p)});(w.forms||[]).forEach(f=>{if(!x.forms.includes(f))x.forms.push(f)});if(!x.zh&&w.zh)x.zh=w.zh}})});
  out.words=Object.values(W).sort((a,b)=>b.freq-a.freq||a.w.localeCompare(b.w));
  const ai=parts.map(x=>x._ai).filter(Boolean);if(ai.length)out._ai={model:ai[ai.length-1].model,ms:ai.reduce((t,x)=>t+(x.ms||0),0)};return out}
function viewUpload(){nav('upload');
  app.innerHTML=`<div class="zone-h"><span class="tag">📥 上传学习来源</span></div>
  <div id="batch" class="batch"></div>
  <div class="card" style="margin-top:14px"><p style="margin-top:0">拍一张英文绘本/作业的照片、截一张屏，或者录一段英文，系统会自动识别成 <b>可以点击学习的原文</b>。</p>
  <input type="text" id="utitle" placeholder="给它起个名字（可选），例如：Unit 3 课文 / 睡前故事录音">
  <div class="upgrid">
   <label class="upbtn"><span>📷</span>拍照<small>绘本、课本、作业单</small><input type="file" accept="image/*" capture="environment" id="fPhoto" hidden></label>
   <label class="upbtn"><span>🖼</span>选择照片 / 截屏<small>一两张照片或截屏（整本书请用上面的批量上传）</small><input type="file" accept="image/*" id="fShot" multiple hidden></label>
   <label class="upbtn"><span>🎧</span>上传录音文件<small>m4a / mp3 / wav</small><input type="file" accept="audio/*,.m4a,.mp3,.wav,.webm" id="fAudio" hidden></label>
   <button class="upbtn rec" id="recBtn" type="button"><span>🎙</span><b id="recL">现场录音</b><small>点一下开始，再点结束</small></button>
  </div>
  <details><summary class="muted">✏️ 或者直接粘贴英文文字</summary><textarea id="utext" placeholder="Paste English text here…"></textarea><div class="actions"><button class="btn" id="textGo">生成学习来源</button></div></details>${limitNote()}</div>
  <div id="ures" style="margin-top:14px"></div>`;
  if(window.TTBatch)TTBatch.mount($('#batch'));
  const res=$('#ures'),title=()=>$('#utitle').value.trim();let busy=false;
  const run=async(fn,label)=>{if(busy)return;busy=true;res.innerHTML=`<div class="card center"><span class="spin"></span> <span id="prog">${label}</span>（可能需要十几秒）</div>`;
    try{const j=await fn();await IDB.put(j);delete BOOKS['u:'+j.id];showResult(j)}
    catch(e){res.innerHTML=`<div class="card">😵 解析失败：${esc(e.message)}<p class="muted">请确认照片清晰、文字是英文；录音尽量安静。</p></div>`}
    finally{busy=false;await refreshMe();const n=$('#limn');if(n)n.outerHTML=limitNote()}};
  const photo=async(f,t)=>{const b=await shrink(f);const j=await parseFile(b,'photo.jpg',t);const th=await thumb(b);if(th&&j.pages[0]&&!j.pages[0].img)Object.assign(j.pages[0],th);return j};
  const imgs=files=>{files=[...files].filter(Boolean);if(!files.length)return;
    run(async()=>{const parts=[];for(let i=0;i<files.length;i++){const p=$('#prog');if(p)p.textContent=files.length>1?`正在识别第 ${i+1} / ${files.length} 页…`:'正在识别图片文字…';
        parts.push(await photo(files[i],title()))}
      
      return parts.length>1?mergeSources(parts,title()||parts[0].title):parts[0]},'正在识别图片文字…')};
  $('#fPhoto').onchange=e=>imgs(e.target.files);$('#fShot').onchange=e=>imgs(e.target.files);
  $('#fAudio').onchange=e=>{const f=e.target.files[0];if(f)run(()=>parseFile(f,f.name,title()),'正在识别语音…')};
  $('#textGo').onclick=()=>{const t=$('#utext').value;if(t.trim())run(()=>parseTextApi(t,title(),'text'),'正在整理文字…')};
  let rec=null,chunks=[];
  $('#recBtn').onclick=async()=>{if(rec){rec.stop();return}
    try{const st=await navigator.mediaDevices.getUserMedia({audio:true});
      const mt=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t));
      rec=new MediaRecorder(st,mt?{mimeType:mt,audioBitsPerSecond:32000}:undefined);chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
      rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());const type=(rec.mimeType||'audio/webm').split(';')[0];rec=null;$('#recBtn').classList.remove('on');$('#recL').textContent='现场录音';
        const b=new Blob(chunks,{type});run(()=>parseFile(b,'record.'+(type.includes('mp4')?'m4a':'webm'),title()),'正在识别语音…')};
      rec.start();$('#recBtn').classList.add('on');$('#recL').textContent='● 录音中…点击结束'}catch(e){toast('无法使用麦克风：'+esc(e.message))}};
  cleanup=()=>{if(rec)rec.stop()}}
function shrink(f){return new Promise(ok=>{const im=new Image();im.onload=()=>{const M=2000,s=Math.min(1,M/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=im.width*s|0;c.height=im.height*s|0;
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>ok(b||f),'image/jpeg',.85);URL.revokeObjectURL(im.src)};im.onerror=()=>ok(f);im.src=URL.createObjectURL(f)})}
function showResult(j){const res=$('#ures');const ai=j._ai;delete j._ai;
  res.innerHTML=`<div class="card"><h2 style="margin-top:0">✅ 已生成学习来源：${esc(j.title)}</h2>
   <p class="muted">识别出 ${j.pages.length>1?j.pages.length+' 页、':''}${j.sentences.length} 个句子、${j.words.length} 个单词。点击下面任意单词可以听美音。${ai&&ai.model?`<br><small>AI：${esc(ai.model)} · ${(ai.ms/1000).toFixed(1)} 秒</small>`:''}</p>
   <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">${j.pages[0]&&j.pages[0].img?`<img src="${j.pages[0].img}" alt="" style="width:180px;border-radius:12px;border:1px solid var(--border)">`:''}
   <div class="text" style="flex:1;min-width:240px" lang="en">${j.sentences.slice(0,60).map(s=>`<span class="sent"><button class="sp" data-say="${esc(s.en)}">▶</button>${speakable(s.en)}</span>${s.zh?`<span class="szh">${esc(s.zh)}</span>`:' '}`).join('')}${j.sentences.length>60?'<p class="muted">……</p>':''}</div></div>
   <div class="actions"><a class="btn" href="#/src/u:${j.id}">📖 打开原文，开始点词学习 →</a>${j.pages.length===1?'<button class="btn sec" id="fix">✏️ 校对文字</button>':''}${ME.admin?'<button class="btn sec" id="pubsrc">📢 发布给所有家庭</button>':''}<button class="btn sec" id="delsrc">🗑 删除</button></div>
   <div id="fixbox" class="hidden"><textarea id="fixt">${esc(groupText(j))}</textarea><div class="actions"><button class="btn" id="fixgo">用校对后的文字重新生成</button></div></div></div>`;
  if($('#fix'))$('#fix').onclick=()=>$('#fixbox').classList.toggle('hidden');
  if($('#pubsrc'))$('#pubsrc').onclick=()=>publish(j);
  $('#delsrc').onclick=async()=>{await IDB.del(j.id);res.innerHTML='<div class="card">已删除。</div>'};
  $('#fixgo').onclick=async()=>{res.insertAdjacentHTML('afterbegin','<p class="center"><span class="spin"></span></p>');
    let n;try{n=await parseTextApi($('#fixt').value,j.title,j.kind)}catch(e){toast('失败：'+esc(e.message),4000);const sp=$('#ures > p.center');if(sp)sp.remove();return}
    n.id=j.id;n.createdAt=j.createdAt;if(j.pages[0]&&j.pages[0].img)n.pages[0].img=j.pages[0].img,n.pages[0].w=j.pages[0].w,n.pages[0].h=j.pages[0].h;await IDB.put(n);delete BOOKS['u:'+j.id];showResult(n)}}
function groupText(j){let out=[];j.sentences.forEach(s=>{if(s.para&&out.length)out.push('\n\n');else if(out.length)out.push(' ');out.push(s.en)});return out.join('')}

/* ================= PUBLISH (admins) ================= */
async function publish(b){
  if(!CFG.sharedEndpoint)return;
  if(!confirm(`把「${b.title}」发布给所有家庭？\n\n请确认你有权分享这些内容（书籍扫描件可能受版权保护）。`))return;
  const id=('u'+b.id).toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,40);
  try{toast('📢 正在发布…',60000);
    const pages=[];for(const p of b.pages){let img=p.img;if(img&&!img.startsWith('data:')){img=await toDataURL(img).catch(()=>null)}
      if(img){const r=await fetch(`${CFG.sharedEndpoint}/${id}/img/${p.n}`,{method:'PUT',body:img,credentials:'same-origin'});if(!r.ok)throw await apiErr(r)}pages.push({...p,img})}
    const {uid,wmap,...src}=b;src.pages=pages;const r=await fetch(CFG.sharedEndpoint,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({...src,id})});
    if(!r.ok)throw await apiErr(r);SHARED=null;toast('📢 已发布给所有家庭（首页「共享」）',3000)}catch(e){toast('发布失败：'+esc(e.message),4500)}}
function toDataURL(u){return fetch(u,{credentials:'same-origin'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.blob()}).then(bl=>new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=()=>no(f.error);f.readAsDataURL(bl)}))}
async function delBook(b){if(!confirm(`删除「${b.title}」？\n\n书本内容和页面图片都会从你的账号里删除（已收藏的单词会保留）。`))return;
  const r=await fetch(CFG.mybooksEndpoint+'/'+encodeURIComponent(b.uid.slice(2)),{method:'DELETE',credentials:'same-origin'});
  if(r.ok){MINE=null;delete BOOKS[b.uid];toast('已删除');location.hash='#/'}else toast('失败：'+esc((await apiErr(r)).message),4000)}
async function unpublish(id){if(!confirm('取消发布后，其他家庭将看不到它。确定吗？'))return;
  const r=await fetch(CFG.sharedEndpoint+'/'+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});
  if(r.ok){SHARED=null;delete BOOKS['g:'+id];toast('已取消发布');location.hash='#/'}else toast('失败：'+esc((await apiErr(r)).message),4000)}

/* ================= boot ================= */
async function boot(){
  if(CFG.meEndpoint){try{const r=await fetch(CFG.meEndpoint,{credentials:'same-origin'});if(r.status===401)return goLogin();if(r.ok){const j=await r.json();ME=j;USER=j.user||USER}}catch(e){}}
  load();await pullServer();badges();
  $('#user').innerHTML=`<span>👤 ${esc(USER)}</span>${CFG.logoutUrl?`<button id="logout">退出</button>`:''}`;
  if(CFG.logoutUrl)$('#logout').onclick=async()=>{await fetch(CFG.logoutUrl,{method:'POST'}).catch(()=>{});location.href=CFG.loginUrl||'/'};
  route()}
window.TT_API={$,$$,esc,toast,CFG,mergeSources,refreshMe,getME:()=>ME,resetMine:()=>{MINE=null},idbOpen:()=>IDB.open()};
boot();
window.TT_DEBUG={get S(){return S},save,route};
})();
