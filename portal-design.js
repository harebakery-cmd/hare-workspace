/* Shared portal appearance controls. Stored with the root-only moduleConfig rules. */
(() => {
 'use strict';
 const BASE='hareharePortal/shared/moduleConfig/design';
 const ROOT_UID='2gGRDUrXlyNwMpw1xpLA3iH35Fd2';
 const defaults={accent:'#111111',background:'#f5f5f5',surface:'#ffffff',heading:'#171717',body:'#171717',muted:'#666666',border:'#d4d4d4',font:'Pretendard',fontSize:100,webFontUrl:'',webFontFamily:''};
 const fonts={Pretendard:null,'Noto Sans KR':'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap','Nanum Gothic':'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap'};
 const $=id=>document.getElementById(id);
 const root=()=>window.HareFirebase?.auth?.currentUser?.uid===ROOT_UID&&window.HareAdmin?.currentAccount?.()?.id==='hare01';
 const safeColor=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
 let design={...defaults},configured=false;
 const colorFields=[['accent','버튼 · 선택 · 체크'],['background','페이지 배경'],['surface','카드 · 패널'],['heading','제목 · 메뉴'],['body','본문'],['muted','보조 글씨'],['border','선 · 그림자']];
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function apply(){
  if(!configured){$('hare-portal-design-style')?.remove();$('hare-custom-font')?.remove();delete document.documentElement.dataset.hareDesigned;return;}
  const d={...defaults,...design},font=d.font==='custom'?d.webFontFamily:d.font,link=d.font==='custom'?d.webFontUrl:fonts[d.font];
  let fontLink=$('hare-custom-font');
  if(link){fontLink.remove();fontLink=null;}
  if(typeof d.font==='string'&&d.font!=='Pretendard'&&typeof (d.font==='custom'?d.webFontUrl:fonts[d.font])==='string'&&/^https:\/\/fonts\.googleapis\.com\/css2\?/.test(d.font==='custom'?d.webFontUrl:fonts[d.font])){
   fontLink=document.createElement('link');fontLink.id='hare-custom-font';fontLink.rel='stylesheet';fontLink.href=d.font==='custom'?d.webFontUrl:fonts[d.font];document.head.append(fontLink);
  }
  const size=Math.max(85,Math.min(125,Number(d.fontSize)||100))/100;
  const style=$('hare-portal-design-style')||document.head.appendChild(Object.assign(document.createElement('style'),{id:'hare-portal-design-style'}));
  const body=safeColor(d.body,defaults.body),heading=safeColor(d.heading,defaults.heading),muted=safeColor(d.muted,defaults.muted),accent=safeColor(d.accent,defaults.accent),bg=safeColor(d.background,defaults.background),surface=safeColor(d.surface,defaults.surface),border=safeColor(d.border,defaults.border);
  style.textContent=`html[data-hare-designed]{--hare-primary:${accent}!important;--hare-earth:${accent}!important;--hare-sub:${muted}!important;--ink:${body}!important;--muted:${muted}!important;--surface:${surface}!important;--edge:${border}!important;--canvas:${bg}!important;--shade:color-mix(in srgb,${border} 58%,transparent)!important;--hare-font-scale:${size}}
html[data-hare-designed] body{background:${bg}!important;color:${body}!important}
html[data-hare-designed] .bg-shapes{background:linear-gradient(145deg,${bg},${surface})!important}
html[data-hare-designed] body,html[data-hare-designed] body *,html[data-hare-designed] body *::before,html[data-hare-designed] body *::after{font-family:${JSON.stringify(font||'Pretendard')},'Pretendard',sans-serif!important}
html[data-hare-designed] :is(h1,h2,h3,h4,.hd-page-head h2,.lm-head h2,.u-heading h2){color:${heading}!important}
html[data-hare-designed] :is(#sidebar button,#sidebar a,#page-title,.u-product-name){color:${heading}!important}
html[data-hare-designed] :is(.hd-muted,.u-muted,.lm-row small,small){color:${muted}!important}
html[data-hare-designed] :is(.glass-panel,.hd-panel,.lm-card,.u-panel,#sidebar,main>header){border-color:${border}!important;box-shadow:0 12px 32px -24px color-mix(in srgb,${border} 90%,transparent)!important}
html[data-hare-designed] :is(.u-btn.primary,.u-btn[aria-pressed="true"],.u-btn[aria-selected="true"],.hd-primary,.lm-primary,.lm-tabs button.active,#theme-switcher button[aria-pressed="true"]){background:${accent}!important;border-color:${accent}!important;color:#fff!important;box-shadow:0 0 0 2px color-mix(in srgb,${accent} 18%,transparent)!important}
html[data-hare-designed] input[type=checkbox],html[data-hare-designed] input[type=radio]{accent-color:${accent}!important}
html[data-hare-designed] :is(input,select,textarea){border-color:${border}!important}
html[data-hare-designed] body{font-size:calc(14px * var(--hare-font-scale))!important}
html[data-hare-designed] :is(button,input,select,textarea,label,p,td,th){font-size:calc(13px * var(--hare-font-scale))!important}
html[data-hare-designed] :is(h2,.hd-page-head h2){font-size:calc(28px * var(--hare-font-scale))!important}
html[data-hare-designed] h3{font-size:calc(18px * var(--hare-font-scale))!important}`;
  document.documentElement.dataset.hareDesigned='true';
 }
 function render(){
  const host=$('view-menu-admin');if(!host?.classList.contains('active')||!window.HareAdmin?.canView?.('view-menu-admin'))return;
  if($('hare-design-panel'))return;
  const panel=document.createElement('section');panel.id='hare-design-panel';panel.className='hd-panel';
  const d={...defaults,...design};
  panel.innerHTML=`<details open><summary>포털 디자인</summary><p class="hd-muted">같은 역할의 색상은 한 번에 바뀝니다. 버튼·선택·체크, 카드·그림자, 제목·메뉴를 각각 묶었습니다.</p><div class="hare-design-grid">${colorFields.map(([key,label])=>`<label>${label}<input type="color" data-design="${key}" value="${safeColor(d[key],defaults[key])}" ${root()?'':'disabled'}></label>`).join('')}<label>웹 글꼴<select data-design="font" ${root()?'':'disabled'}><option value="Pretendard" ${d.font==='Pretendard'?'selected':''}>Pretendard</option><option value="Noto Sans KR" ${d.font==='Noto Sans KR'?'selected':''}>Noto Sans KR</option><option value="Nanum Gothic" ${d.font==='Nanum Gothic'?'selected':''}>Nanum Gothic</option><option value="custom" ${d.font==='custom'?'selected':''}>웹 글꼴 직접 추가</option></select></label><label>글씨 크기 <output data-design-size>${Number(d.fontSize)||100}%</output><input type="range" min="85" max="125" step="5" data-design="fontSize" value="${Number(d.fontSize)||100}" ${root()?'':'disabled'}></label><label>웹 글꼴 CSS 주소<input type="url" data-design="webFontUrl" placeholder="https://fonts.googleapis.com/css2?family=..." value="${esc(d.webFontUrl)}" ${root()?'':'disabled'}></label><label>글꼴 이름<input type="text" data-design="webFontFamily" placeholder="예: Gowun Dodum" maxlength="60" value="${esc(d.webFontFamily)}" ${root()?'':'disabled'}></label></div><div class="lm-actions">${root()?'<button type="button" class="hd-primary" data-save-design>디자인 저장</button>':'<span class="hd-muted">디자인 저장은 hare01 계정에서 가능합니다.</span>'}<span id="hare-design-status" role="status"></span></div></details>`;
  host.querySelector('.hd-page-head')?.after(panel);if(!panel.isConnected)host.prepend(panel);
 }
 const css=document.createElement('style');css.textContent='#hare-design-panel summary{cursor:pointer;font-weight:750;font-size:17px}#hare-design-panel .hare-design-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:18px 0}#hare-design-panel label{display:grid;gap:6px;font-size:12px;font-weight:650}#hare-design-panel input,#hare-design-panel select{min-height:38px;padding:6px;border:1px solid var(--edge);border-radius:9px;background:var(--surface);color:var(--ink)}#hare-design-panel input[type=color]{width:100%;padding:3px}#hare-design-panel input[type=range]{padding:0}#hare-design-panel .lm-actions{align-items:center}';document.head.append(css);
 let pending=false;const schedule=()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;render();});};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('input',event=>{const key=event.target.dataset?.design;if(!key||!root())return;design[key]=event.target.value;configured=true;if(key==='fontSize')document.querySelector('[data-design-size]').textContent=event.target.value+'%';apply();});
 document.addEventListener('change',event=>{if(event.target.dataset?.design&&root())apply();});
 document.addEventListener('click',async event=>{if(!event.target.closest('[data-save-design]'))return;const status=$('hare-design-status');try{if(!root())throw Error('hare01 로그인이 필요합니다.');const value={...defaults,...design};for(const [key] of colorFields)value[key]=safeColor(value[key],defaults[key]);value.fontSize=Math.max(85,Math.min(125,Number(value.fontSize)||100));if(![...Object.keys(fonts),'custom'].includes(value.font))throw Error('글꼴을 확인하세요.');if(value.font==='custom'&&(!/^https:\/\/fonts\.googleapis\.com\/css2\?/.test(value.webFontUrl)||!/^[\p{L}\p{N} ._-]{2,60}$/u.test(value.webFontFamily)))throw Error('Google Fonts CSS 주소와 글꼴 이름을 확인하세요.');await window.HareFirebase.database.ref(BASE).set(value);status.textContent='Firebase에 디자인을 저장했습니다.';}catch(err){status.textContent='저장 실패: '+err.message;}});
 window.HareFirebase?.database?.ref(BASE).on('value',snap=>{design={...defaults,...(snap.val()||{})};configured=snap.exists();apply();const panel=$('hare-design-panel');if(panel)panel.remove();render();},err=>{const status=$('hare-design-status');if(status)status.textContent='디자인 불러오기 실패: '+err.message;});
 window.addEventListener('hare-admin-change',()=>{const panel=$('hare-design-panel');if(panel)panel.remove();schedule();});
 apply();schedule();
})();