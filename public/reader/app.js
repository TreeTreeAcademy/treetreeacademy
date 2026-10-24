/* 树儿学院 Tree Tree Reader v2 — Source → 学习区 → 复习区 → 成就仓 */
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
let USER='demo';
const KEY=()=>'tt2.'+USER+'.state';
let S;
function blank(){return{v:2,words:{},log:{},session:{},enrich:{},updatedAt:0}}
function load(){try{S=JSON.parse(localStorage.getItem(KEY()))||blank()}catch(e){S=blank()}S.words=S.words||{};S.log=S.log||{};S.session=S.session||{};S.enrich=S.enrich||{}}
let syncT;
function save(){S.updatedAt=Date.now();localStorage.setItem(KEY(),JSON.stringify(S));badges();
  if(CFG.progressEndpoint&&CFG.syncProgress!==false&&SYNC_OK){clearTimeout(syncT);syncT=setTimeout(()=>fetch(CFG.progressEndpoint,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(S)}).catch(()=>{}),1500)}}
let SYNC_OK=false;
async function pullServer(){if(!CFG.progressEndpoint)return;try{const r=await fetch(CFG.progressEndpoint);if(!r.ok)return;SYNC_OK=true;const j=await r.json();
  if(j&&j.updatedAt>(S.updatedAt||0)){S=Object.assign(blank(),j);localStorage.setItem(KEY(),JSON.stringify(S))}}catch(e){}}
function mark(){const d=today();S.log[d]=(S.log[d]||0)+1}

/* uploaded sources live in IndexedDB (photos can be large) */
const IDB={db:null,open(){return this.db||(this.db=new Promise((ok,no)=>{const r=indexedDB.open('tt2-'+USER,1);r.onupgradeneeded=()=>r.result.createObjectStore('src',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
  async tx(mode,fn){const db=await this.open();return new Promise((ok,no)=>{const t=db.transaction('src',mode),st=t.objectStore('src'),r=fn(st);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})},
  all(){return this.tx('readonly',s=>s.getAll())},get(id){return this.tx('readonly',s=>s.get(id))},put(o){return this.tx('readwrite',s=>s.put(o))},del(id){return this.tx('readwrite',s=>s.delete(id))}};

/* ---------- sources ---------- */
let CATALOG=null;const BOOKS={};
async function catalog(){if(CATALOG)return CATALOG;try{const r=await fetch(CFG.booksBase+'catalog.json',{credentials:'same-origin'});if(r.status===401)return goLogin();CATALOG=r.ok?await r.json():[]}catch(e){CATALOG=[]}return CATALOG}
async function getSource(id){if(BOOKS[id])return BOOKS[id];let b;
  if(id.startsWith('u:')){b=await IDB.get(id.slice(2));if(!b)return null;b.uid='u:'+b.id}
  else{const r=await fetch(CFG.booksBase+id+'/book.json',{credentials:'same-origin'});if(r.status===401)return goLogin();if(!r.ok)return null;b=await r.json();b.uid=id;
    b.pages.forEach(p=>{if(p.img&&!/^(data:|https?:|\/)/.test(p.img))p.img=CFG.booksBase+id+'/'+p.img})}
  b.wmap={};b.words.forEach(w=>b.wmap[w.w]=w);return BOOKS[id]=b}
function goLogin(){if(CFG.loginUrl)location.href=CFG.loginUrl;return null}

/* ---------- word content ---------- */
const shortZh=z=>{z=String(z||'').replace(/^[a-z]+\.\s*/,'').split(/[；;，,]/)[0].replace(/（.*?）|\(.*?\)/g,'').trim();return z.length>9?z.slice(0,9)+'…':z};
function content(w){const rec=S.words[w]||{};const L=LEX[w]||S.enrich[w];
  return{w,zh:(L&&L.zh)||rec.zh||'',us:(LEX[w]&&LEX[w].us)||rec.us||'',phrases:(L&&L.phrases)||[],scene:L&&L.scene,dlg:L&&L.dlg,curated:!!LEX[w],ai:!LEX[w]&&!!S.enrich[w]}}
async function enrichMissing(list){const need=list.filter(w=>!LEX[w]&&!S.enrich[w]);if(!need.length||!CFG.enrichEndpoint)return;
  try{const r=await fetch(CFG.enrichEndpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({words:need.map(w=>({w,sentence:(S.words[w]||{}).en||''}))})});
    if(!r.ok)return;const j=await r.json();for(const [k,v] of Object.entries(j.entries||{}))if(v&&v.dlg&&v.dlg.length>=3){if(v.scene)v.scene[0]='ai';S.enrich[k]=v}save()}catch(e){}}

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
async function viewHome(){nav('src');const cat=await catalog();if(cat===null)return;const ups=(await IDB.all().catch(()=>[])).sort((a,b)=>b.createdAt-a.createdAt);
  const W=Object.values(S.words),cnt=st=>W.filter(x=>x.st===st).length;
  const bySrc={};W.forEach(x=>bySrc[x.src]=(bySrc[x.src]||0)+1);
  const kindIco={photo:'📷',audio:'🎙',text:'📝'};
  app.innerHTML=`<section class="hero"><img src="assets/logo.png" alt=""><div><h1>欢迎来到树儿学院学习中心</h1>
    <p>打开一个学习来源，读原文，点一下你想学的单词 ⭐ → 学习区 → 复习区 → 成就仓</p></div>
    <div class="stats"><a class="pill" href="#/learn" style="text-decoration:none"><b>${cnt('queued')}</b>待学习</a><a class="pill" href="#/review" style="text-decoration:none"><b>${cnt('learned')}</b>待复习</a><a class="pill" href="#/vault" style="text-decoration:none"><b>${cnt('mastered')}</b>成就仓</a></div></section>
  <h2>📚 学习来源</h2><div class="shelf">
  ${cat.map(b=>`<a class="src" href="#/src/${b.id}"><img class="cv" src="${esc(CFG.booksBase+b.cover)}" alt="" loading="lazy"><span class="kind">绘本</span><div class="t"><b class="en">${esc(b.title)}</b><small>${esc(b.titleZh)} · ${b.pages} 页 · ${b.sentences} 句</small><small>⭐ 已收藏 ${bySrc[b.id]||0} 词</small></div></a>`).join('')}
  ${ups.map(u=>`<a class="src" href="#/src/u:${u.id}">${u.pages[0]&&u.pages[0].img?`<img class="cv" src="${u.pages[0].img}" alt="">`:`<div class="cv">${kindIco[u.kind]||'📝'}</div>`}<span class="kind">${u.kind==='audio'?'录音':u.kind==='photo'?'照片':'文字'}</span><div class="t"><b>${esc(u.title)}</b><small>${new Date(u.createdAt).toLocaleDateString('zh-CN')} · ${u.sentences.length} 句</small><small>⭐ 已收藏 ${bySrc['u:'+u.id]||0} 词</small></div></a>`).join('')}
  <a class="src add" href="#/upload"><span style="font-size:2.6rem">📥</span>上传照片 / 截屏 / 录音<small>自动变成可点击的学习来源</small></a></div>`}

/* ================= SOURCE: full original text ================= */
const PREF={img:localStorage.getItem('tt2.img')!=='0',zh:localStorage.getItem('tt2.zh')==='1'};
async function viewSource(id,pg){if(cleanup){cleanup();cleanup=null}nav('src');app.innerHTML='<p class="center"><span class="spin"></span> 正在打开原文…</p>';
  const b=await getSource(id);if(!b){app.innerHTML='<div class="empty"><div class="e">🔍</div>找不到这个学习来源 <a href="#/">返回</a></div>';return}
  const P=b.pages.length;pg=Math.min(Math.max(1,pg),P);const page=b.pages[pg-1];
  const collectedPages=new Set(Object.values(S.words).filter(x=>x.src===b.uid).map(x=>x.p));
  const sents=page.s.map(i=>b.sentences[i]);
  // group into headings + paragraphs
  const blocks=[];let cur=null;
  for(const s of sents){const head=s.head||(!/[.!?…"”)]$/.test(s.en.trim())&&s.en.split(' ').length<=8);
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
  <div class="tools"><button class="toggle${PREF.img?' on':''}" data-act="timg">🖼 原图</button><button class="toggle${PREF.zh?' on':''}" data-act="tzh">中 中文对照</button>
   <button class="toggle" data-act="pall">▶ 朗读本页</button><span class="muted" style="font-size:.85rem">点任意单词 = 美音朗读 + ⭐收藏（再点取消）</span></div>
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
      if(k==='tzh'){PREF.zh=!PREF.zh;localStorage.setItem('tt2.zh',PREF.zh?'1':'0');return viewSource(id,pg)}
      if(k==='pall'){let i=0;const next=()=>{if(i<sents.length){const s=sents[i++];playSent(b,s.id,next)}};next();return}
      if(k==='learn'){location.hash='#/learn';return}}
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
const STEP_NAMES=['① 单词卡','② 搭配选择','③ 用法场景'];
function viewLearn(){nav('learn');let L=S.session.learn;
  if(!L||!L.list||!L.list.length){const q=Object.values(S.words).filter(x=>x.st==='queued').sort((a,b)=>a.added-b.added).map(x=>x.w);
    if(!q.length){app.innerHTML=`<div class="zone-h"><span class="tag">🎓 学习区</span></div><div class="empty"><div class="e">🌱</div>学习区还是空的。<br>去 <a href="#/">学习来源</a> 的原文里点选想学的单词吧！<br><br><a class="btn sec" href="#/vault">🏆 去成就仓选词</a></div>`;return}
    L=S.session.learn={list:q,i:0,step:0};save()}
  enrichMissing(L.list);
  renderLearn()}
function renderLearn(){const L=S.session.learn;if(L.i>=L.list.length)return finishLearn();
  const w=L.list[L.i],c=content(w),rec=S.words[w]||{};const tot=L.list.length*3,done=L.i*3+L.step;
  const head=`<div class="zone-h"><span class="tag">🎓 学习区</span><b class="en" style="font-size:1.1rem">${L.i+1} / ${L.list.length}</b><div class="bar"><b style="width:${done/tot*100}%"></b></div></div>
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
    let q;
    if(c.phrases.length){const ph=c.phrases[L.i%c.phrases.length];const pool=shuffle(Object.entries(LEX).filter(([k])=>k!==w).flatMap(([,e])=>e.phrases.map(p=>p[1]))).filter(z=>z!==ph[1]).slice(0,3);
      q={prompt:`<div class="muted">这个短语 / 习语是什么意思？</div><div class="phr">${speakable(ph[0])}</div><button class="ico" data-say="${esc(ph[0])}">🔊</button>`,ok:ph[1],opts:shuffle([ph[1],...pool]),say:ph[0]}}
    else{const pool=shuffle(Object.values(LEX).map(e=>shortZh(e.zh)).filter(z=>z&&z!==shortZh(c.zh))).slice(0,3);const ok=shortZh(c.zh)||'（暂无释义）';
      q={prompt:`<div class="muted">这个词在原文里的意思是？</div><div class="phr">${esc(w)}</div><button class="ico" data-say="${esc(w)}">🔊</button><div class="note">这个词还没有收录固定搭配；接入 AI 后台后可自动生成短语题。</div>`,ok,opts:shuffle([ok,...pool]),say:w}}
    app.innerHTML=head+`<div class="qbox"><div class="prompt">${q.prompt}</div><div class="opts">${q.opts.map((o,i)=>`<button class="opt" data-act="mcq" data-v="${esc(o)}"><span class="L">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>
     <div id="after" class="hidden">${c.phrases.length?`<div class="phlist"><b>📌 常见搭配</b>${c.phrases.map(p=>`<div><button class="ico" data-say="${esc(p[0])}">🔊</button><span class="en">${esc(p[0])}</span><span class="muted">${esc(p[1])}</span></div>`).join('')}</div>`:''}
      <div class="actions"><button class="btn" data-act="next">下一步：用法场景 →</button></div></div></div>`;
    setTimeout(()=>say(q.say),250);
    app.dataset.ok=q.ok;
  }else{
    const sc=c.scene;let body;
    const TYPES={song:'🎵 歌词',movie:'🎬 电影台词',book:'📖 名著经典',poem:'📜 诗歌',speech:'🗣 名人演讲',proverb:'💬 英语谚语',ai:'🤖 故事由 AI 创作'};
    if(sc){const [t,en,zh,label,url]=sc;
      const links=t==='ai'?'':url?`<a href="${esc(url)}" target="_blank" rel="noopener">查看出处 ↗</a>${(t==='song'||t==='movie')?` · <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((label||'').replace(/[\u4e00-\u9fff（）《》，·]+/g,' ')+' '+en)}" target="_blank" rel="noopener">▶ YouTube 搜索</a>`:''}`:'';
      body=`<span class="badge${t==='ai'?' ai':''}">${TYPES[t]||t}</span><blockquote lang="en">${speakable(en,w)}</blockquote><div class="szh2">${esc(zh)}</div>
       <div class="srcl"><button class="ico" data-say="${esc(en)}">▶</button>${t==='ai'?'<span>故事由 AI 创作（树儿学院原创，非引用）</span>':`<span>出处：${esc(label||'')}</span>${links}`}</div>`}
    else{const rec2=S.words[w]||{};body=`<span class="badge">📖 出自原文</span><blockquote lang="en">${speakable(rec2.en||w,w)}</blockquote><div class="szh2">${esc(rec2.szh||'')}</div>
      <div class="srcl"><button class="ico" data-say="${esc(rec2.en||w)}">▶</button><span>出处：${esc(rec2.srcTitle||'')}</span></div><div class="note">这个词暂无预置的歌曲 / 电影 / 名著场景。配置 AI 后台（/api/reader/enrich）后会自动生成一个标注「故事由 AI 创作」的小故事。</div>`}
    app.innerHTML=head+`<div class="scene">${body}</div><div class="actions"><button class="btn" data-act="next">${L.i+1<L.list.length?'学下一个单词 →':'完成学习，进入复习区 →'}</button></div>`;
  }
  const onClick=e=>{const a=e.target.closest('[data-act]');const sp=e.target.closest('[data-say]');
    if(sp){say(sp.dataset.say);return}
    if(e.target.closest('#flip')&&!a){$('#flip').classList.toggle('back');return}
    if(!a)return;const k=a.dataset.act;
    if(k==='flip'){$('#flip').classList.toggle('back');return}
    if(k==='mcq'){if($('#after').classList.contains('hidden')===false)return;const ok=a.dataset.v===app.dataset.ok;
      if(ok){a.classList.add('ok');$('#after').classList.remove('hidden');say('Great job!');}
      else{a.classList.add('bad');$$('.opt').forEach(o=>{if(o.dataset.v===app.dataset.ok)o.classList.add('ok')});$('#after').classList.remove('hidden');const r=S.words[w];if(r){r.miss=(r.miss||0)+1;save()}}
      return}
    if(k==='next'){L.step++;if(L.step>2){const r=S.words[w];if(r&&r.st==='queued'){r.st='learned';r.learnedAt=Date.now();mark()}L.step=0;L.i++}save();cleanup&&cleanup();cleanup=null;renderLearn();window.scrollTo(0,0)}};
  if(cleanup)cleanup();app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function finishLearn(){const list=S.session.learn.list;S.session.learn=null;S.session.review={list,phase:'match',round:0,missed:[],queue:[]};save();
  app.innerHTML=`<div class="empty"><div class="e">🎉</div><h2>学习完成！${list.length} 个单词</h2>马上进入复习区…</div>`;
  setTimeout(()=>{location.hash='#/review'},1300)}

/* ================= REVIEW ZONE ================= */
function viewReview(){nav('review');let R=S.session.review;
  if(!R||!R.list||!R.list.length){const l=Object.values(S.words).filter(x=>x.st==='learned').map(x=>x.w);
    if(!l.length){app.innerHTML=`<div class="zone-h"><span class="tag rv">🔁 复习区</span></div><div class="empty"><div class="e">🍃</div>现在没有需要复习的单词。<br><a href="#/learn">去学习区</a> 或 <a href="#/vault">成就仓</a></div>`;return}
    R=S.session.review={list:l,phase:'match',round:0,missed:[],queue:[]};save()}
  R.phase==='match'?renderMatch():renderDialog()}
function rounds(list){const n=Math.ceil(list.length/5),out=[];const size=Math.ceil(list.length/n);for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return out}
function renderMatch(){const R=S.session.review;const rs=rounds(R.list);if(R.round>=rs.length){return afterMatch()}
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
function afterMatch(){const R=S.session.review;if(!R.missed.length)return finishReview(true);R.phase='dlg';R.queue=[...R.missed];save();
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
  ${flag==='new'&&last?`<div class="banner">🎉 太棒了！刚刚有 ${last.n} 个单词${last.perfect?'一次通关':'通过情景对话通关'}，停进了成就仓。</div>`:''}
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
      if(k==='tolearn'){S.session.learn={list:sel,i:0,step:0};VSEL.clear();save();location.hash='#/learn';return}
      if(k==='toreview'){S.session.review={list:sel,phase:'match',round:0,missed:[],queue:[]};VSEL.clear();save();location.hash='#/review';return}}
    const v=e.target.closest('.vcard');if(!v)return;const w=v.dataset.v;VSEL.has(w)?VSEL.delete(w):VSEL.add(w);v.classList.toggle('sel');$('.ck',v).textContent=VSEL.has(w)?'✓':'';vdock()};
  app.addEventListener('click',onClick);cleanup=()=>app.removeEventListener('click',onClick)}
function vdock(){const d=$('#vdock');if(!d)return;const n=VSEL.size;
  d.innerHTML=`<button class="btn sec sm" data-act="all">☑️ 全选</button><span class="cnt">已选 <b>${n}</b></span>
   <button class="btn sm" data-act="tolearn" ${n?'':'disabled'}>🎓 进入学习区</button><button class="btn sm gold" data-act="toreview" ${n?'':'disabled'}>🔁 进入复习区</button><button class="btn sec sm" data-act="stay">🏆 留在成就仓</button>`}

/* ================= UPLOAD ================= */
function viewUpload(){nav('upload');
  app.innerHTML=`<div class="zone-h"><span class="tag">📥 上传学习来源</span></div>
  <div class="card"><p style="margin-top:0">拍一张英文绘本/作业的照片、截一张屏，或者录一段英文，系统会自动识别成 <b>可以点击学习的原文</b>。</p>
  <input type="text" id="utitle" placeholder="给它起个名字（可选），例如：Unit 3 课文 / 睡前故事录音">
  <div class="upgrid">
   <label class="upbtn"><span>📷</span>拍照 / 选择照片<small>绘本、课本、作业单</small><input type="file" accept="image/*" capture="environment" id="fPhoto" hidden></label>
   <label class="upbtn"><span>🖼</span>上传截屏图片<small>PNG / JPG 截图</small><input type="file" accept="image/*" id="fShot" hidden></label>
   <label class="upbtn"><span>🎧</span>上传录音文件<small>m4a / mp3 / wav</small><input type="file" accept="audio/*,.m4a,.mp3,.wav,.webm" id="fAudio" hidden></label>
   <button class="upbtn rec" id="recBtn" type="button"><span>🎙</span><b id="recL">现场录音</b><small>点一下开始，再点结束</small></button>
  </div>
  <details><summary class="muted">✏️ 或者直接粘贴英文文字</summary><textarea id="utext" placeholder="Paste English text here…"></textarea><div class="actions"><button class="btn" id="textGo">生成学习来源</button></div></details></div>
  <div id="ures" style="margin-top:14px"></div>`;
  const go=async(blob,name,kind)=>{const res=$('#ures');
    if(!CFG.parseEndpoint){res.innerHTML='<div class="card">⚠️ 未配置解析服务（parseEndpoint）。</div>';return}
    if(blob&&blob.size>(CFG.maxUploadMB||4.2)*1048576){res.innerHTML=`<div class="card">⚠️ 文件太大（${(blob.size/1048576).toFixed(1)} MB）。网站上传上限约 ${CFG.maxUploadMB||4.2} MB，请剪短录音或压缩后再试。</div>`;return}
    res.innerHTML=`<div class="card center"><span class="spin"></span> 正在${kind==='audio'?'识别语音':kind==='text'?'整理文字':'识别图片文字'}…（可能需要十几秒）</div>`;
    const fd=new FormData();if(blob)fd.append('file',blob,name);else{fd.append('text',$('#utext').value);fd.append('kind','text')}fd.append('title',$('#utitle').value.trim());
    try{const r=await fetch(CFG.parseEndpoint,{method:'POST',body:fd,credentials:'same-origin'});if(r.status===401)return goLogin();
      const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||j.error||('HTTP '+r.status));
      await IDB.put(j);delete BOOKS['u:'+j.id];showResult(j)}
    catch(e){res.innerHTML=`<div class="card">😵 解析失败：${esc(e.message)}<p class="muted">请确认照片清晰、文字是英文；录音尽量安静。</p></div>`}};
  const img=async f=>{if(!f)return;const b=await shrink(f);go(b,'photo.jpg','photo')};
  $('#fPhoto').onchange=e=>img(e.target.files[0]);$('#fShot').onchange=e=>img(e.target.files[0]);
  $('#fAudio').onchange=e=>{const f=e.target.files[0];if(f)go(f,f.name,'audio')};
  $('#textGo').onclick=()=>{if($('#utext').value.trim())go(null,null,'text')};
  let rec=null,chunks=[];
  $('#recBtn').onclick=async()=>{if(rec){rec.stop();return}
    try{const st=await navigator.mediaDevices.getUserMedia({audio:true});rec=new MediaRecorder(st);chunks=[];rec.ondataavailable=e=>chunks.push(e.data);
      rec.onstop=()=>{st.getTracks().forEach(t=>t.stop());const type=rec.mimeType||'audio/webm';rec=null;$('#recBtn').classList.remove('on');$('#recL').textContent='现场录音';
        go(new Blob(chunks,{type}),'record.'+(type.includes('mp4')?'m4a':'webm'),'audio')};
      rec.start();$('#recBtn').classList.add('on');$('#recL').textContent='● 录音中…点击结束'}catch(e){toast('无法使用麦克风：'+e.message)}};
  cleanup=()=>{if(rec)rec.stop()}}
function shrink(f){return new Promise(ok=>{const im=new Image();im.onload=()=>{const M=2000,s=Math.min(1,M/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=im.width*s|0;c.height=im.height*s|0;
  c.getContext('2d').drawImage(im,0,0,c.width,c.height);c.toBlob(b=>ok(b||f),'image/jpeg',.85);URL.revokeObjectURL(im.src)};im.onerror=()=>ok(f);im.src=URL.createObjectURL(f)})}
function showResult(j){const res=$('#ures');
  res.innerHTML=`<div class="card"><h2 style="margin-top:0">✅ 已生成学习来源：${esc(j.title)}</h2>
   <p class="muted">识别出 ${j.sentences.length} 个句子、${j.words.length} 个单词。点击下面任意单词可以听美音。</p>
   <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">${j.pages[0]&&j.pages[0].img?`<img src="${j.pages[0].img}" alt="" style="width:180px;border-radius:12px;border:1px solid var(--border)">`:''}
   <div class="text" style="flex:1;min-width:240px" lang="en">${j.sentences.map(s=>`<span class="sent"><button class="sp" data-say="${esc(s.en)}">▶</button>${speakable(s.en)}</span>${s.zh?`<span class="szh">${esc(s.zh)}</span>`:' '}`).join('')}</div></div>
   <div class="actions"><a class="btn" href="#/src/u:${j.id}">📖 打开原文，开始点词学习 →</a><button class="btn sec" id="fix">✏️ 校对文字</button><button class="btn sec" id="delsrc">🗑 删除</button></div>
   <div id="fixbox" class="hidden"><textarea id="fixt">${esc(groupText(j))}</textarea><div class="actions"><button class="btn" id="fixgo">用校对后的文字重新生成</button></div></div></div>`;
  $('#fix').onclick=()=>$('#fixbox').classList.toggle('hidden');
  $('#delsrc').onclick=async()=>{await IDB.del(j.id);res.innerHTML='<div class="card">已删除。</div>'};
  $('#fixgo').onclick=async()=>{const fd=new FormData();fd.append('text',$('#fixt').value);fd.append('title',j.title);fd.append('kind',j.kind);
    res.insertAdjacentHTML('afterbegin','<p class="center"><span class="spin"></span></p>');
    const r=await fetch(CFG.parseEndpoint,{method:'POST',body:fd,credentials:'same-origin'});const n=await r.json();if(!r.ok){toast('失败：'+(n.detail||r.status));return}
    n.id=j.id;n.createdAt=j.createdAt;if(j.pages[0]&&j.pages[0].img)n.pages[0].img=j.pages[0].img,n.pages[0].w=j.pages[0].w,n.pages[0].h=j.pages[0].h;await IDB.put(n);delete BOOKS['u:'+j.id];showResult(n)}}
function groupText(j){let out=[];j.sentences.forEach(s=>{if(s.para&&out.length)out.push('\n\n');else if(out.length)out.push(' ');out.push(s.en)});return out.join('')}

/* ================= boot ================= */
async function boot(){
  if(CFG.meEndpoint){try{const r=await fetch(CFG.meEndpoint,{credentials:'same-origin'});if(r.status===401)return goLogin();if(r.ok){const j=await r.json();USER=j.user||USER}}catch(e){}}
  load();await pullServer();badges();
  $('#user').innerHTML=`<span>👤 ${esc(USER)}</span>${CFG.logoutUrl?`<button id="logout">退出</button>`:''}`;
  if(CFG.logoutUrl)$('#logout').onclick=async()=>{await fetch(CFG.logoutUrl,{method:'POST'}).catch(()=>{});location.href=CFG.loginUrl||'/'};
  route()}
boot();
window.TT_DEBUG={get S(){return S},save,route};
})();
