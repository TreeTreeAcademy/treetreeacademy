/* 树儿读读乐 — 整本书批量上传 (batch photo upload -> ONE private multi-page book in the reader's own account).
   Flow: pick many photos -> order / rotate / remove -> 生成绘本 -> each photo is downscaled in the browser, sent through the normal
   per-photo parse endpoint (one Gemini call, paced), its page image is stored privately, and the finished pages are saved as one book.
   Progress is kept on this device (IndexedDB), so a failed page can be retried and a day-limit stop can be continued later. */
(()=>{
'use strict';
const T=window.TT_API;if(!T)return;
const {$,esc,toast,CFG}=T;
const MAX_PAGES=40, GAP_MS=4500, PARSE_EDGE=1800, STORE_EDGE=1400, STORE_CAP=480*1024, PARSE_CAP=3.2*1048576, THUMB=320;
const ID_ALPHA='abcdefghijklmnopqrstuvwxyz0123456789';
const newId=()=>'up-'+Array.from({length:10},()=>ID_ALPHA[Math.random()*36|0]).join('');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- IndexedDB draft (meta + one record per page) ---------- */
const D={
  async tx(mode,fn){const db=await T.idbOpen();return new Promise((ok,no)=>{const t=db.transaction('drafts',mode),st=t.objectStore('drafts'),r=fn(st);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)})},
  all(){return this.tx('readonly',s=>s.getAll())},put(o){return this.tx('readwrite',s=>s.put(o))},clear(){return this.tx('readwrite',s=>s.clear())}};

/* ---------- images ---------- */
async function decode(file){
  if(window.createImageBitmap){
    try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){}
    try{return await createImageBitmap(file)}catch(e){}}
  return new Promise((ok,no)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error('decode'))};im.src=u})}
const dims=b=>({w:b.naturalWidth||b.width,h:b.naturalHeight||b.height});
const closeBmp=b=>{try{b.close&&b.close()}catch(e){}};
function drawn(src,rot,edge){const {w,h}=dims(src),sw=rot%180?h:w,sh=rot%180?w:h,s=Math.min(1,edge/Math.max(sw,sh));
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw*s));c.height=Math.max(1,Math.round(sh*s));
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.translate(c.width/2,c.height/2);x.rotate(rot*Math.PI/180);x.drawImage(src,-w*s/2,-h*s/2,w*s,h*s);return c}
const toBlob=(c,q)=>new Promise(ok=>c.toBlob(ok,'image/jpeg',q));
/** JPEG no bigger than cap: lower quality first, then the edge. */
async function jpeg(src,rot,edge,q,cap){let e=edge,b;
  for(let i=0;i<8;i++){const c=drawn(src,rot,e);b=await toBlob(c,q);if(!b)throw new Error('encode');
    if(b.size<=cap)return{blob:b,w:c.width,h:c.height};if(q>.5)q-=.1;else e=Math.round(e*.85)}
  const c=drawn(src,rot,e);return{blob:b,w:c.width,h:c.height}}
/** small EXIF-corrected canvas used for the grid; rotating a thumb is just a re-draw of this canvas */
async function baseThumb(file){const bmp=await decode(file);try{return drawn(bmp,0,THUMB)}finally{closeBmp(bmp)}}
const thumbURL=(canvas,rot)=>drawn(canvas,rot,THUMB).toDataURL('image/jpeg',.7);

/* ---------- state ---------- */
const P={items:[],run:null,box:null,loaded:false,busyPick:false};
let ver=0;
const detached=()=>!P.box||!document.body.contains(P.box);
const fmtSize=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
const natural=(a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});

/* ---------- picker ---------- */
function orderDefault(){const it=P.items,t=it.map(x=>x.lastModified||0);
  const useTime=t.some(v=>v)&&new Set(t).size>1;
  it.sort((a,b)=>useTime?(a.lastModified-b.lastModified||natural(a.name,b.name)):natural(a.name,b.name))}
async function addFiles(files){
  files=[...files].filter(f=>f&&(/^image\//.test(f.type)||/\.(jpe?g|png|webp|heic|heif|gif)$/i.test(f.name)));
  if(!files.length){toast('没有选到照片');return}
  const have=new Set(P.items.map(x=>x.sig));let skipped=0,over=0;
  P.busyPick=true;paint();
  const fresh=[];
  for(const f of files){const sig=[f.name,f.size,f.lastModified].join('|');
    if(have.has(sig)){skipped++;continue}
    if(P.items.length+fresh.length>=MAX_PAGES){over++;continue}
    have.add(sig);fresh.push({key:sig+'|'+Math.random().toString(36).slice(2,6),sig,file:f,name:f.name,lastModified:f.lastModified||0,rot:0,canvas:null,thumb:'',err:''})}
  const ver0=++ver;
  for(let k=0;k<fresh.length;k++){const it=fresh[k];
    try{it.canvas=await baseThumb(it.file);it.thumb=thumbURL(it.canvas,0)}
    catch(e){it.err=/hei[cf]/i.test(it.name+it.file.type)?'这张是 HEIC 格式，这个浏览器读不了。请在相册里导出成 JPEG，或用 Safari 打开。':'这张照片读不了。'}
    if(ver0!==ver)return;
    if(k%4===3)paint()}
  P.items.push(...fresh);orderDefault();P.busyPick=false;paint();
  const msg=[];if(skipped)msg.push(`${skipped} 张重复的已忽略`);if(over)msg.push(`最多一次 ${MAX_PAGES} 页，多出的 ${over} 张没有加入`);
  if(msg.length)toast(msg.join('；'),4000)}
function rotate(i){const it=P.items[i];if(!it||!it.canvas)return;it.rot=(it.rot+90)%360;it.thumb=thumbURL(it.canvas,it.rot);paint()}
function move(from,to){if(from===to||to<0||to>=P.items.length)return;const [x]=P.items.splice(from,1);P.items.splice(to,0,x);paint()}
function remove(i){P.items.splice(i,1);paint()}

/* drag by the ⠿ handle (pointer events; works with mouse and touch). The page does not move while dragging: a ghost follows the
   finger and the drop position is committed on release, so the pointer capture is never lost. */
function dragStart(e,i){
  const grid=$('#bgrid',P.box);if(!grid)return;const el=grid.children[i];if(!el)return;
  e.preventDefault();
  const rect=el.getBoundingClientRect(),ghost=el.cloneNode(true);
  ghost.className='bt ghost';ghost.style.cssText=`position:fixed;left:0;top:0;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:80;transform:translate(${rect.left}px,${rect.top}px) scale(1.06);opacity:.92`;
  document.body.appendChild(ghost);el.classList.add('lifted');
  const off={x:e.clientX-rect.left,y:e.clientY-rect.top};let target=null,raf=0,py=e.clientY;
  const clear=()=>$('#bgrid',P.box)&&[...$('#bgrid',P.box).children].forEach(c=>c.classList.remove('ins-b','ins-a'));
  const hit=(x,y)=>{const t=document.elementFromPoint(x,y),bt=t&&t.closest&&t.closest('#bgrid > .bt');
    clear();target=null;if(!bt)return;const j=[...bt.parentNode.children].indexOf(bt);if(j===i)return;
    const r=bt.getBoundingClientRect(),after=x>r.left+r.width/2;bt.classList.add(after?'ins-a':'ins-b');target=after?j+1:j};
  const mv=ev=>{py=ev.clientY;ghost.style.transform=`translate(${ev.clientX-off.x}px,${ev.clientY-off.y}px) scale(1.06)`;hit(ev.clientX,ev.clientY)};
  const auto=()=>{const h=innerHeight;if(py<90)scrollBy(0,-Math.ceil((90-py)/6));else if(py>h-110)scrollBy(0,Math.ceil((py-(h-110))/6));raf=requestAnimationFrame(auto)};
  const end=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',end);removeEventListener('pointercancel',end);cancelAnimationFrame(raf);
    ghost.remove();el.classList.remove('lifted');clear();
    if(ev.type==='pointerup'&&target!=null){const to=target>i?target-1:target;move(i,to)}};
  addEventListener('pointermove',mv);addEventListener('pointerup',end);addEventListener('pointercancel',end);raf=requestAnimationFrame(auto)}

/* ---------- run (generate) ---------- */
const R=()=>P.run;
const doneN=()=>R().pages.filter(p=>p.status==='done').length;
const failN=()=>R().pages.filter(p=>p.status==='fail').length;
function savePage(p){const o={k:'p'+String(p.i).padStart(3,'0'),i:p.i,thumb:p.thumb,status:p.status==='run'?'wait':p.status,err:p.err||'',src:p.src||null,noText:!!p.noText,parsed:!!p.parsed,imgDone:!!p.imgDone,w:p.w||0,h:p.h||0,parseBuf:p.parseBuf||null,storeBuf:p.storeBuf||null};return D.put(o).catch(()=>{})}
function saveMeta(){const r=R();return D.put({k:'meta',id:r.id,title:r.title,n:r.pages.length,imgBytes:r.imgBytes||0,imgStore:r.imgStore||'kv',created:r.created}).catch(()=>{})}
async function loadDraft(){
  try{const all=await D.all();const meta=all.find(x=>x.k==='meta');if(!meta)return null;
    const pages=all.filter(x=>/^p\d+$/.test(x.k)).sort((a,b)=>a.i-b.i).map(x=>({...x,status:x.status==='run'?'wait':x.status}));
    if(!pages.length)return null;
    return{id:meta.id,title:meta.title,created:meta.created,imgBytes:meta.imgBytes||0,imgStore:meta.imgStore||'kv',pages,status:'paused',msg:'',cur:0,pause:false}}catch(e){return null}}
async function dropDraft(serverToo){const r=R();
  if(serverToo&&r&&r.id){try{await fetch(CFG.mybooksEndpoint+'/'+encodeURIComponent(r.id),{method:'DELETE',credentials:'same-origin'})}catch(e){}}
  await D.clear().catch(()=>{});P.run=null;window.removeEventListener('beforeunload',warnLeave)}
const warnLeave=e=>{e.preventDefault();e.returnValue=''};

async function budgetCheck(n){
  try{const r=await fetch(CFG.mybooksEndpoint+'?budget=1',{credentials:'same-origin'});if(!r.ok)return null;const j=await r.json();
    const need=Math.ceil(n*0.65);if(j.freeMB!=null&&j.freeMB<need+4)return`网站的图片存储空间只剩约 ${j.freeMB} MB，这本书大约需要 ${need} MB。请先告诉管理员扩容，或删掉一些旧书。`;return null}catch(e){return null}}

async function generate(){
  const ok=P.items.filter(x=>x.canvas&&!x.err);
  if(!ok.length){toast('没有可用的照片');return}
  if(ok.length<P.items.length&&!confirm(`有 ${P.items.length-ok.length} 张照片读不了，会被跳过。继续吗？`))return;
  const msg=await budgetCheck(ok.length);if(msg){alert(msg);return}
  await T.refreshMe();const l=T.getME().limits&&T.getME().limits.uploads;
  if(l&&ok.length>Math.max(0,l.max-l.used)&&!confirm(`今天还能识别 ${Math.max(0,l.max-l.used)} 页，这本书有 ${ok.length} 页。\n会先做今天能做的页，剩下的明天点「继续」接着做。继续吗？`))return;
  const title=($('#btitle',P.box)||{}).value?$('#btitle',P.box).value.trim().slice(0,80):'';
  await D.clear().catch(()=>{});
  P.run={id:newId(),title,created:Date.now(),imgBytes:0,imgStore:'kv',status:'prep',msg:'',cur:0,pause:false,
    pages:ok.map((it,k)=>({i:k+1,status:'wait',err:'',thumb:it.thumb,src:null,noText:false,parsed:false,imgDone:false,w:0,h:0,parseBuf:null,storeBuf:null,_file:it.file,_rot:it.rot}))};
  P.items=[];paint();
  // 1) prepare: decode (EXIF), rotate, downscale — local only, nothing sent yet
  const r=R();window.addEventListener('beforeunload',warnLeave);
  for(const p of r.pages){r.msg=`正在整理照片 ${p.i} / ${r.pages.length}…`;paintRun();
    try{const bmp=await decode(p._file);try{const a=await jpeg(bmp,p._rot,PARSE_EDGE,.82,PARSE_CAP),b=await jpeg(bmp,p._rot,STORE_EDGE,.74,STORE_CAP);
      p.parseBuf=await a.blob.arrayBuffer();p.storeBuf=await b.blob.arrayBuffer();p.w=b.w;p.h=b.h}finally{closeBmp(bmp)}}
    catch(e){p.status='fail';p.err='照片读不了'}
    delete p._file;delete p._rot;await savePage(p)}
  await saveMeta();
  await loop();
}

const waitFor=async ms=>{const end=Date.now()+ms;while(Date.now()<end){if(R().pause)return false;R().wait=Math.ceil((end-Date.now())/1000);paintRun();await sleep(Math.min(250,end-Date.now()))}R().wait=0;return !R().pause};
let lastStart=0;
async function pace(){const w=lastStart+GAP_MS-Date.now();if(w>0)await waitFor(w);lastStart=Date.now()}

async function callParse(buf){
  const fd=new FormData();fd.append('file',new Blob([buf],{type:'image/jpeg'}),'page.jpg');fd.append('title','');
  let r;try{r=await fetch(CFG.parseEndpoint,{method:'POST',body:fd,credentials:'same-origin'})}catch(e){return{kind:'net',msg:'网络不通'}}
  if(r.ok)return{kind:'ok',src:await r.json()};
  const j=await r.json().catch(()=>({}));const code=j.error||'',detail=j.detail||('HTTP '+r.status);
  if(r.status===401)return{kind:'auth',msg:'登录过期了，请重新登录后点「继续」。'};
  if(code==='no_english')return{kind:'noenglish'};
  if(code==='daily_quota'||code==='daily_limit')return{kind:'daily',msg:detail};
  if(code==='model_unavailable')return{kind:'daily',msg:'AI 暂时用不了（今天的免费额度可能已经用完）。已完成的页面都保存好了，稍后点「继续」就行。'};
  if(code==='bad_key'||code==='ai_not_configured')return{kind:'daily',msg:detail};
  if(r.status===429)return{kind:'rate',msg:detail};
  if(r.status===413)return{kind:'fail',msg:'这一页文字太多，AI 一次读不完'};
  if(r.status===422)return{kind:'fail',msg:detail};
  return{kind:'net',msg:detail}}
async function putImage(p){
  const url=CFG.mybooksEndpoint+'/'+encodeURIComponent(R().id)+'/img/'+p.i;
  for(let a=0;a<3;a++){let r;try{r=await fetch(url,{method:'PUT',body:new Blob([p.storeBuf],{type:'image/jpeg'}),credentials:'same-origin'})}catch(e){await sleep(1500);continue}
    if(r.ok){const j=await r.json();R().imgStore=j.store||'kv';R().imgBytes+=p.storeBuf.byteLength;return{ok:true}}
    const j=await r.json().catch(()=>({}));if(r.status===507)return{fatal:true,msg:j.detail||'图片存储空间不足'};if(r.status===401)return{auth:true};
    if(r.status<500&&r.status!==408)return{msg:j.detail||('HTTP '+r.status)};await sleep(1500)}
  return{msg:'图片没有传上去'}}

/** returns 'ok' | 'fail' (this page only) | 'stop' (whole run must stop; R().status set) */
async function doPage(p){
  p.status='run';p.err='';R().cur=p.i;paintRun();
  const imgP=p.imgDone?Promise.resolve({ok:true}):putImage(p);
  let netTries=0,rateTries=0;
  while(!p.parsed){
    if(R().pause){await imgP;return'stop'}
    await pace();if(R().pause){await imgP;return'stop'}
    R().msg=`正在识别第 ${p.i} / ${R().pages.length} 页的文字…`;paintRun();
    const x=await callParse(p.parseBuf);
    if(x.kind==='ok'){p.src=x.src;p.parsed=true;break}
    if(x.kind==='noenglish'){p.noText=true;p.parsed=true;break}
    if(x.kind==='daily'){R().status='quota';R().msg=x.msg;await imgP;p.status='wait';return'stop'}
    if(x.kind==='auth'){R().status='auth';R().msg=x.msg;await imgP;p.status='wait';return'stop'}
    if(x.kind==='fail'){p.status='fail';p.err=x.msg;await imgP;return'fail'}
    if(x.kind==='rate'){rateTries++;
      if(rateTries>4){R().status='busy';R().msg='AI 现在太忙了（免费额度每分钟有限速）。已完成的页面都保存好了，过几分钟点「继续」就行。';await imgP;p.status='wait';return'stop'}
      const s=[15,30,60,60][rateTries-1];R().msg=`AI 有点忙，${s} 秒后自动重试第 ${p.i} 页…`;if(!await waitFor(s*1000)){await imgP;p.status='wait';return'stop'}continue}
    netTries++;if(netTries>2){p.status='fail';p.err=x.msg||'识别失败';await imgP;return'fail'}
    R().msg=`第 ${p.i} 页出了点问题，${5*netTries} 秒后重试…`;if(!await waitFor(5000*netTries)){await imgP;p.status='wait';return'stop'}}
  const im=await imgP;
  if(im.fatal){R().status='full';R().msg=im.msg;await savePage(p);return'stop'}
  if(im.auth){R().status='auth';R().msg='登录过期了，请重新登录后点「继续」。';await savePage(p);return'stop'}
  if(!im.ok&&!p.imgDone){p.status='fail';p.err=im.msg||'图片没有存上';await savePage(p);return'fail'}
  p.imgDone=true;p.status='done';p.parseBuf=null;p.storeBuf=null;await savePage(p);await saveMeta();paintRun();return'ok'}

async function loop(){
  const r=R();r.pause=false;r.status='running';window.addEventListener('beforeunload',warnLeave);
  for(const p of r.pages){if(p.status==='done'||p.status==='skip')continue;
    if(!p.parseBuf&&!p.parsed&&!p.storeBuf){p.status='fail';p.err='这页的照片没有保存下来，请放弃后重新选择';continue}
    const x=await doPage(p);
    if(x==='stop'){if(r.status==='running')r.status='paused';await saveMeta();await Promise.all(r.pages.map(savePage));window.removeEventListener('beforeunload',warnLeave);paint();return}
    paintRun()}
  r.msg='';
  if(failN()){r.status='partial';window.removeEventListener('beforeunload',warnLeave);paint();return}
  await finish()}

async function finish(skipFailed){
  const r=R();r.status='saving';r.msg='正在保存这本书…';paint();
  try{
    const pages=r.pages.filter(p=>p.status==='done');
    if(!pages.length)throw new Error('没有成功的页面');
    const parts=pages.map(p=>p.src?p.src:{id:'x',title:'',pages:[{n:1,img:null,w:0,h:0,s:[]}],sentences:[],words:[]});
    const found=parts.map(x=>x.title).find(t=>t&&t!=='我的照片');
    const title=r.title||found||('我的绘本 '+new Date().toLocaleDateString('zh-CN'));
    const out=T.mergeSources(parts,title);delete out._ai;out.id=r.id;out.kind='book';
    pages.forEach((p,k)=>{const pg=out.pages[k];pg.img=CFG.mybooksEndpoint+'/'+r.id+'/img/'+p.i;pg.w=p.w;pg.h=p.h});
    // page numbers in the saved book are 1..n in order; the stored images are keyed by the original index -> renumber if pages were skipped
    if(pages.some((p,k)=>p.i!==k+1)){for(let k=0;k<pages.length;k++){const p=pages[k];if(p.i!==k+1){const u=await fetch(CFG.mybooksEndpoint+'/'+r.id+'/img/'+p.i,{credentials:'same-origin'});if(!u.ok)throw new Error('图片读取失败');
      const rr=await fetch(CFG.mybooksEndpoint+'/'+r.id+'/img/'+(k+1),{method:'PUT',body:await u.blob(),credentials:'same-origin'});if(!rr.ok)throw new Error('图片重排失败')}}
      out.pages.forEach((pg,k)=>{pg.img=CFG.mybooksEndpoint+'/'+r.id+'/img/'+(k+1)})}
    const body=JSON.stringify({source:out,imgStore:r.imgStore,imgBytes:r.imgBytes});
    if(body.length>3_900_000)throw new Error('这本书的文字太多了，请分成两本');
    const res=await fetch(CFG.mybooksEndpoint,{method:'POST',headers:{'content-type':'application/json'},body,credentials:'same-origin'});
    if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.detail||j.error||('HTTP '+res.status))}
    const j=await res.json();
    r.result={id:r.id,title,pages:out.pages.length,sentences:out.sentences.length,words:out.words.length,noText:parts.filter(x=>!x.sentences.length).length,cover:out.pages[0]&&out.pages[0].img,skipped:r.pages.length-pages.length,images:j.images};
    r.status='done';r.msg='';T.resetMine();await D.clear().catch(()=>{});
  }catch(e){r.status='partial';r.msg='保存失败：'+(e.message||e)+'。已完成的页面还在，点「重试」再保存一次。';r.saveFailed=true}
  window.removeEventListener('beforeunload',warnLeave);paint()}

/* ---------- rendering ---------- */
const STAT={wait:'',run:'⏳',done:'✓',fail:'⚠️',skip:'—'};
function gridHTML(){
  if(R()){return R().pages.map(p=>`<div class="bt s-${p.status}${p.noText?' notext':''}" data-i="${p.i-1}"><img src="${p.thumb}" alt=""><span class="bn">${p.i}</span><span class="bs">${STAT[p.status]||''}</span>${p.status==='fail'?`<div class="be">${esc(p.err||'失败')}</div>`:''}${p.noText&&p.status==='done'?'<div class="be ok">没有文字</div>':''}</div>`).join('')}
  return P.items.map((it,i)=>`<div class="bt${it.err?' bad':''}" data-i="${i}">${it.thumb?`<img src="${it.thumb}" alt="" data-b="rot">`:`<div class="be" style="position:static;padding:30px 6px">${esc(it.err||'读取中…')}</div>`}<span class="bn">${i+1}</span>${it.thumb?'<span class="rt">↻</span>':''}<button class="bx" data-b="rm" aria-label="删除这张">×</button>
    <div class="bb"><button data-b="prev" aria-label="前移">‹</button><span class="bh" data-b="drag" title="按住拖动排序">⠿</span><button data-b="next" aria-label="后移">›</button></div></div>`).join('')}
function paintGrid(){const g=$('#bgrid',P.box);if(g)g.innerHTML=gridHTML()}
function paintRun(){if(detached()||!R())return;const r=R();
  const n=r.pages.length,d=doneN(),f=failN();
  const bar=$('#bbar',P.box);if(bar)bar.style.width=Math.round(d/n*100)+'%';
  const m=$('#bmsg',P.box);if(m)m.textContent=(r.wait&&r.status==='running'?`${r.msg}（${r.wait} 秒）`:r.msg)||'';
  const c=$('#bcnt',P.box);if(c)c.textContent=`已完成 ${d} / ${n} 页${f?` · 失败 ${f} 页`:''}`;
  r.pages.forEach(p=>{const el=$('#bgrid',P.box)&&$('#bgrid',P.box).children[p.i-1];if(!el)return;el.className=`bt s-${p.status}${p.noText?' notext':''}${p.i===r.cur&&r.status==='running'?' cur':''}`;
    const s=el.querySelector('.bs');if(s)s.textContent=STAT[p.status]||'';
    let e=el.querySelector('.be');if(p.status==='fail'){if(!e){e=document.createElement('div');e.className='be';el.appendChild(e)}e.textContent=p.err||'失败'}else if(e&&!p.noText)e.remove()})}
function runHead(){const r=R(),n=r.pages.length,d=doneN(),f=failN(),title=esc(r.title||'');
  const bar=`<div class="bprog"><i id="bbar" style="width:${Math.round(d/n*100)}%"></i></div><p class="muted" id="bcnt" style="margin:6px 0">已完成 ${d} / ${n} 页${f?` · 失败 ${f} 页`:''}</p>`;
  if(r.status==='done'){const x=r.result;return`<div class="card"><h2 style="margin-top:0">✅ 已生成绘本：${esc(x.title)}</h2>
    <p class="muted">${x.pages} 页、${x.sentences} 个句子、${x.words} 个单词${x.noText?`（其中 ${x.noText} 页没有文字，只有插图）`:''}${x.skipped?`；跳过了 ${x.skipped} 页失败的页`:''}。已保存到你的账号，只有你自己能看到。</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start">${x.cover?`<img src="${esc(x.cover)}" alt="" style="width:150px;border-radius:12px;border:1px solid var(--border)">`:''}
    <div class="actions" style="margin:0"><a class="btn" href="#/src/m:${esc(x.id)}">📖 打开这本书 →</a><a class="btn sec" href="#/">📚 回到学习来源</a><button class="btn sec" data-b="again">再传一本</button></div></div></div>`}
  const note={quota:'今天的 AI 额度用完了。',busy:'',auth:'',full:''}[r.status]||'';
  if(r.status==='running'||r.status==='prep'||r.status==='saving')return`<div class="card"><h2 style="margin-top:0"><span class="spin"></span> 正在生成绘本${title?`「${title}」`:''}</h2>${bar}
    <p id="bmsg" style="margin:6px 0;font-weight:700">${esc(r.msg)}</p>
    <p class="muted" style="margin:6px 0">请保持这个页面打开（可以切到别的标签看书，但别关浏览器）。每页大约 6–10 秒。</p>
    ${r.status==='running'?'<div class="actions"><button class="btn sec" data-b="pause">⏸ 暂停</button></div>':''}</div>`;
  const stopped=r.status==='quota'||r.status==='busy'||r.status==='auth'||r.status==='full';
  return`<div class="card"><h2 style="margin-top:0">${r.status==='partial'?'⚠️ 有页面没有成功':stopped?'⏸ 先停在这里':'📚 还有没做完的绘本'}${title?`「${title}」`:''}</h2>${bar}
    <p id="bmsg" style="margin:6px 0;font-weight:700">${esc(r.msg||(r.status==='paused'?'已暂停。':''))}</p>
    <p class="muted" style="margin:6px 0">${r.status==='quota'?`已完成的 ${d} 页保存在这台设备上。<b>明天回到「上传」页，点「继续」</b>就能接着做（会从第 ${(r.pages.find(p=>p.status!=='done')||{i:n}).i} 页开始）。`:'已完成的页面都保存好了，不会重做。'}</p>
    <div class="actions">${r.status==='partial'&&r.saveFailed?'<button class="btn" data-b="resave">🔁 重试保存</button>':`<button class="btn" data-b="resume">${f&&!stopped?'🔁 重试失败的页':'▶ 继续'}</button>`}
    ${r.status==='partial'&&d&&!r.saveFailed?'<button class="btn sec" data-b="skipsave">跳过失败的页，保存已完成的</button>':''}<button class="btn sec" data-b="discard">🗑 放弃这本</button></div></div>`}
function pickHTML(){const n=P.items.length,ok=P.items.filter(x=>x.canvas&&!x.err).length;
  const mins=Math.max(1,Math.round(ok*9/60));
  return`<div class="card"><h2 style="margin-top:0">📚 整本书批量上传</h2>
   ${n?'':`<p style="margin-top:0">一次选很多张照片（最多 ${MAX_PAGES} 张），排好顺序，点一下就合成<b>一本书</b>：每页自动识别英文、配中文，页面图片一起存进你的账号（只有你自己能看到）。</p>`}
   <label class="btn" style="display:inline-block;cursor:pointer">🖼 ${n?'再添加照片':'选择多张照片'}<input type="file" accept="image/*,.heic,.heif" multiple id="bfiles" hidden></label>
   ${P.busyPick?' <span class="spin"></span> <span class="muted">正在读取照片…</span>':''}
   ${n?`<div class="bsort"><span class="muted">已选 <b>${n}</b> 张 · 点照片旋转，拖 ⠿ 或点 ‹ › 调整顺序，× 删除</span>
     <span><button class="btn sec sm" data-b="sortname">按文件名</button> <button class="btn sec sm" data-b="sorttime">按时间</button> <button class="btn sec sm" data-b="rev">倒序</button></span></div>
     <input type="text" id="btitle" placeholder="书名（可选，不填就用 AI 认出的书名）" maxlength="80" style="margin-top:8px" value="${esc(P.title||'')}">
     <div class="actions"><button class="btn" data-b="go" ${ok&&!P.busyPick?'':'disabled'}>🚀 生成绘本（${ok} 页）</button><button class="btn sec" data-b="clear">清空</button></div>
     <p class="muted" style="margin:6px 0 0">预计约 ${mins} 分钟（免费 AI 每页 6–10 秒，自动限速）。中途出错不会丢进度。</p>`:''}</div>`}
function paint(){if(detached())return;
  const r=R(),title=$('#btitle',P.box);if(title)P.title=title.value;
  const head=r?runHead():pickHTML();
  P.box.innerHTML=`<div id="bhead">${head}</div>${(r&&r.status==='done')||(!r&&!P.items.length)?'':'<div class="bgrid" id="bgrid"></div>'}`;
  paintGrid();if(r)paintRun()}

/* ---------- events ---------- */
function onClick(e){const b=e.target.closest('[data-b]');if(!b)return;const a=b.dataset.b,bt=b.closest('.bt'),i=bt?+bt.dataset.i:-1;
  if(a==='rot')rotate(i);else if(a==='rm')remove(i);else if(a==='prev')move(i,i-1);else if(a==='next')move(i,i+1);
  else if(a==='sortname'){P.items.sort((x,y)=>natural(x.name,y.name));paint()}
  else if(a==='sorttime'){P.items.sort((x,y)=>(x.lastModified-y.lastModified)||natural(x.name,y.name));paint()}
  else if(a==='rev'){P.items.reverse();paint()}
  else if(a==='clear'){if(confirm('清空已选的照片？')){P.items=[];ver++;paint()}}
  else if(a==='go')generate();
  else if(a==='pause'){R().pause=true;R().msg='正在暂停…';paintRun()}
  else if(a==='resume'){loop()}
  else if(a==='resave'){finish()}
  else if(a==='skipsave'){R().pages.forEach(p=>{if(p.status==='fail')p.status='skip'});finish(true)}
  else if(a==='discard'){if(confirm('放弃这本书？已识别的内容和上传的页面图片都会删除。'))dropDraft(true).then(paint)}
  else if(a==='again'){dropDraft(false).then(paint)}}
function onPointerDown(e){const h=e.target.closest('[data-b=drag]');if(!h||R())return;const bt=h.closest('.bt');dragStart(e,+bt.dataset.i)}
function onChange(e){if(e.target.id==='bfiles'){const f=e.target.files;if(f&&f.length){if(R()&&R().status!=='done'){e.target.value='';toast('上一本还没做完，请先继续或放弃');return}if(R())dropDraft(false);addFiles(f)}e.target.value=''}}

async function mount(box){
  P.box=box;box.className='batch';
  if(!box._bound){box._bound=1;box.addEventListener('click',onClick);box.addEventListener('pointerdown',onPointerDown);box.addEventListener('change',onChange)}
  if(!P.run&&!P.loaded){P.loaded=true;const d=await loadDraft();if(d)P.run=d}
  paint()}
window.TTBatch={mount};
})();
