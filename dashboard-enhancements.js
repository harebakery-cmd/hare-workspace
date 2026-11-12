/* Dashboard calendar and centrally managed navigation. Firebase is the shared source. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const builtins = [
  ['view-bulletin','공지사항','today'],['view-calendar','일정표','today'],
  ['view-order','제품 발주표','today'],['view-newprod','신제품 등록','today'],
  ['view-recipe','배합표','today'],['view-production','생산 일지','today'],
  ['view-origin','원산지(원라벨관리)','today'],['view-schedule','스케줄 매니저','resources'],
  ['view-showcard','쇼카드','resources'],['view-docs','직원 연락처 및 서류','resources']
 ];
 const builtinIds = new Set(builtins.map(row => row[0]));

 const moduleDefaults = [
  {id:'showcard',label:'쇼카드',category:'디자인',mode:'internal',url:'https://harebakery-cmd.github.io/showcard/',access:'super',visible:true,items:[],fields:[]},
  {id:'allergen',label:'알레르기 정보',category:'상품·안전',mode:'internal',url:'https://harebakery-cmd.github.io/hare-allergen/',access:'staff',visible:true,items:[],fields:[]},
  {id:'cake-menu',label:'케이크 메뉴',category:'상품·안전',mode:'internal',url:'https://harebakery-cmd.github.io/cake-menu/',access:'super',visible:true,items:[],fields:[]},
  {id:'hare-order',label:'하레 발주',category:'발주',mode:'internal',url:'https://harebakery-cmd.github.io/hare-order/',access:'staff',visible:true,items:[],fields:[]},
  {id:'hare-new',label:'신제품 등록',category:'상품·안전',mode:'internal',url:'https://harebakery-cmd.github.io/hare-new/',access:'staff',visible:true,items:[],fields:[]},
  {id:'bread-order',label:'빵 발주',category:'발주',mode:'internal',url:'https://harebakery-cmd.github.io/bread-order/',access:'staff',visible:true,items:[],fields:[]},
  {id:'bread-order-dp',label:'빵 발주 · DP',category:'발주',mode:'internal',url:'https://harebakery-cmd.github.io/bread-order-dp/',access:'staff',visible:true,items:[],fields:[]},
  {id:'hare-manager',label:'직급자 관리',category:'관리',mode:'internal',url:'https://harebakery-cmd.github.io/hare-manager/',access:'manager',visible:true,items:[],fields:[]},
  {id:'pop-studio',label:'POP Studio',category:'디자인',mode:'external',url:'https://harehare-pop-studio.avionenpapier1.chatgpt.site/',access:'super',visible:true},
  {id:'request',label:'요청 관리',category:'관리',mode:'external',url:'https://do-rim.github.io/request/',access:'super',visible:true},
  {id:'member-manage',label:'멤버십 관리',category:'관리',mode:'external',url:'https://harehare-member.avionenpapier1.chatgpt.site/manage',access:'super',visible:true}
 ];
 const moduleRank = {all:0,staff:1,manager:2,admin:3,super:4};

 const boardDefaults = () => builtins.map(([id,label,group]) => ({id,label,group,visible:true,home:['view-order','view-newprod','view-recipe','view-production','view-origin'].includes(id)}));
 const sectionMap = {
  'view-calendar': [['calendar','달력'],['agenda','선택 날짜 일정']],
  'view-bulletin': [['list','공지 목록'],['compose','공지 작성']],
  'view-newprod': [['register','신제품 등록'],['list','등록된 신제품']],
  'view-recipe': [['list','배합표 게시판'],['register','배합표 등록']],
  'view-origin': [['products','제품 선택'],['edit','원산지 정보'],['queue','원라벨 목록']]
 };
 const orderStores = (() => {try{return JSON.parse($('unified-catalog')?.textContent||'{}').stores||[];}catch{return [];}})();
 sectionMap['view-order'] = [['all','전체 발주'],...orderStores.map(x=>['store:'+x.id,x.name])];
 const roleRank = {guest:0,staff:1,manager:2,admin:3,super:4};
 const accountRole = () => window.HareAdmin?.currentAccount?.()?.role || 'guest';
 function sections(boardId){
  const defaults=sectionMap[boardId]||[];
  const saved=boards().find(row=>row.id===boardId)?.sections||[];
  const byId=new Map((Array.isArray(saved)?saved:[]).filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
  const order=new Map((Array.isArray(saved)?saved:[]).map((x,i)=>[x?.id,i]));
  return defaults.map(([id,label],i)=>({id,label,visible:true,access:boardId==='view-bulletin'&&id==='compose'?'staff':'all',default:i===0,...byId.get(id)}))
   .sort((a,b)=>(order.get(a.id)??(defaults.length+defaults.findIndex(x=>x[0]===a.id)))-(order.get(b.id)??(defaults.length+defaults.findIndex(x=>x[0]===b.id))));
 }
 function canShowSection(row){
  const required=row.access==='all'?0:(roleRank[row.access]??0);
  return row.visible!==false && (roleRank[accountRole()]??0)>=required;
 }
 const sectionSelector = {
  'view-calendar': {calendar:'#hd-full-calendar',agenda:'#hd-agenda'},
  'view-bulletin': {list:'#dashboard-announcement-board',compose:'#dashboard-bulletin-form'},
  'view-newprod': {register:'#u-product',list:'.u-board-panel'},
  'view-recipe': {list:'.u-recipe-board',register:'.u-recipe-editor'},
  'view-origin': {products:'.origin-search-label',edit:'.origin-editor-panel form',queue:'.origin-queue-panel'}
 };
 const selectedSection={};
 function innerMenu(boardId){
  const host=$(boardId),items=sections(boardId).filter(canShowSection);
  if(!host||!host.classList.contains('active')||items.length<2){host?.querySelector('.hd-inner-nav')?.remove();return;}
  const pressed=boardId==='view-order'?host.querySelector('.u-store-tabs [aria-pressed="true"]')?.dataset.storeId:null;
  const current=pressed!==null&&pressed!==undefined?(pressed?'store:'+pressed:'all'):selectedSection[boardId];
  const selected=items.some(x=>x.id===current)?current:(items.find(x=>x.default)?.id||items[0].id);
  selectedSection[boardId]=selected;
  const html=`<span class="hd-inner-caption">내부 메뉴</span>${items.map(row=>`<button type="button" data-hd-inner="${esc(row.id)}" data-hd-inner-board="${boardId}" aria-current="${row.id===selected?'page':'false'}">${esc(row.label)}</button>`).join('')}`;
  let nav=host.querySelector(':scope > .hd-inner-nav');
  if(!nav){nav=document.createElement('nav');nav.className='hd-inner-nav';nav.setAttribute('aria-label','게시판 내부 메뉴');const heading=host.querySelector(':scope > .u-heading, :scope > .hd-page-head');if(heading)heading.after(nav);else host.prepend(nav);}
  if(nav.dataset.markup!==html){nav.innerHTML=html;nav.dataset.markup=html;}
 }
 function openSection(boardId,id){
  const row=sections(boardId).find(x=>x.id===id);
  if(!row||!canShowSection(row))return;
  const host=$(boardId);
  if(!host?.classList.contains('active')){if(!navigate?.(boardId))return;}
  selectedSection[boardId]=id;
  if(boardId==='view-order'){
   const storeId=id==='all'?'':id.startsWith('store:')?id.slice(6):null;
   if(storeId!==null){const button=[...host.querySelectorAll('.u-store-tabs [data-store-id]')].find(x=>x.dataset.storeId===storeId);if(button?.getAttribute('aria-pressed')!=='true')button?.click();}
  }else if(boardId==='view-recipe'&&id==='register'&&!host.querySelector('.u-recipe-editor')){
   host.querySelector('[data-action="open-recipe-register"]')?.click();
  }
  innerMenu(boardId);
  const selector=sectionSelector[boardId]?.[id];
  const target=selector&&host.querySelector(selector);
  if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 let menuObserver=null,menuScheduled=false;
 function watchInnerMenus(){
  if(menuObserver)return;
  menuObserver=new MutationObserver(records=>{
   if(records.every(record=>record.target.closest?.('.hd-inner-nav')))return;
   if(menuScheduled)return;menuScheduled=true;
   queueMicrotask(()=>{menuScheduled=false;const page=document.querySelector('.spa-page.active');if(page&&sectionMap[page.id])innerMenu(page.id);});
  });
  for(const id of Object.keys(sectionMap)){const host=$(id);if(host)menuObserver.observe(host,{childList:true,subtree:true});}
 }

 const base = 'hareharePortal/shared/';
 const db = () => window.HareFirebase?.database;
 const root = () => !!window.HareFirebase?.isRoot?.() && window.HareAdmin?.currentAccount?.()?.id === 'hare01';
 const menuManager = () => {const account=window.HareAdmin?.currentAccount?.(),uid=window.HareFirebase?.auth?.currentUser?.uid;if(account?.role==='super')return root();return account?.role==='admin'&&!!account.firebaseUid&&uid===account.firebaseUid;};
 const kstToday = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value+'T00:00:00Z').valueOf()) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const labelDate = value => value.replaceAll('-','.');
 let navigate = null, selected = kstToday(), month = selected.slice(0,7), events = {}, config = null, configRaw = null, moduleConfig = {}, moduleConfigRaw = null, readError = '', menuError = '', editEvent = '', subscribed = false;
 function boards(){
  const saved = Array.isArray(config?.boards) ? config.boards : [];
  const byId = new Map(saved.filter(row => builtinIds.has(row?.id)).map(row => [row.id,row]));
  return boardDefaults().map(row => ({...row,...byId.get(row.id),id:row.id})).sort((a,b) => {
   const ai=saved.findIndex(x=>x?.id===a.id),bi=saved.findIndex(x=>x?.id===b.id);
   return (ai<0?builtins.findIndex(x=>x[0]===a.id)+100:ai)-(bi<0?builtins.findIndex(x=>x[0]===b.id)+100:bi);
  });
 }
 function links(){return (Array.isArray(config?.links)?config.links:[]).filter(row=>row && /^https:\/\//i.test(row.url||'') && String(row.label||'').trim()).slice(0,30);}
 function modules(){const saved=Array.isArray(moduleConfig?.modules)?moduleConfig.modules:[];const byId=new Map(saved.filter(x=>moduleDefaults.some(d=>d.id===x?.id)).map(x=>[x.id,x]));return moduleDefaults.map(row=>({...row,...byId.get(row.id),id:row.id,mode:row.mode,url:row.url}));}
 function canOpenModule(row){const role=accountRole();if(row.access==='super')return root();return (roleRank[role]??0)>=(moduleRank[row.access]??1);}
 function moduleURL(row){const url=new URL(row.url);if(row.mode==='internal'&&url.origin!==location.origin)throw Error('내부 업무 링크는 harebakery-cmd.github.io 안에서만 열 수 있습니다.');if(row.mode==='external'&&!['harehare-pop-studio.avionenpapier1.chatgpt.site','do-rim.github.io','harehare-member.avionenpapier1.chatgpt.site'].includes(url.hostname))throw Error('등록된 외부 링크 주소가 아닙니다.');return url.href;}
 function renderModuleMenu(){
  const host=document.querySelector('[data-menu-group="resources"]');if(!host)return;
  host.querySelectorAll('.hd-app-menu-group').forEach(x=>x.remove());
  const rows=modules().filter(x=>x.visible!==false);
  for(const category of [...new Set(rows.map(x=>x.category||'업무 도구'))]){
   const group=document.createElement('div');group.className='hd-app-menu-group';group.innerHTML='<div class="hd-app-menu-caption">'+esc(category)+'</div>';
   rows.filter(x=>(x.category||'업무 도구')===category).forEach(row=>{
    const button=document.createElement('button');button.type='button';button.dataset.hdModule=row.id;button.className='hd-app-menu-button';button.textContent=(row.mode==='external'?'↗  ':'▣  ')+row.label;
    button.setAttribute('aria-label',row.label+(canOpenModule(row)?'':' · 권한 필요'));group.append(button);
   });
   host.append(group);
  }
 }
 function closeModule(){document.querySelector('.hd-app-overlay')?.remove();}
 function openModule(id){
  const row=modules().find(x=>x.id===id);if(!row)return;
  if(!canOpenModule(row)){alert('이 업무 메뉴를 열 권한이 없습니다. 필요한 권한은 '+({staff:'로그인 직원',manager:'직급자',admin:'관리자',super:'최고관리자'}[row.access]||'로그인 사용자')+'입니다.');return;}
  const url=moduleURL(row);
  if(row.mode==='external'){window.open(url,'_blank','noopener,noreferrer');return;}
  closeModule();
  const layer=document.createElement('div');layer.className='hd-app-overlay';layer.innerHTML='<div class="hd-app-dialog" role="dialog" aria-modal="true" aria-label="'+esc(row.label)+'"><header class="hd-app-toolbar"><strong>'+esc(row.label)+'</strong><button type="button" data-hd-module-close aria-label="업무 화면 닫기">닫기</button></header><iframe class="hd-app-frame" title="'+esc(row.label)+'" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  layer.querySelector('iframe').src=url;
  layer.addEventListener('click',event=>{if(event.target===layer)closeModule();});
  document.body.append(layer);
 }
 function moduleSettingsMarkup(){
  const host=$('hd-module-settings');if(!host)return;
  if(!root()){host.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-muted">이 설정은 최고관리자 전용입니다.</p>';return;}
  if(!moduleConfigRaw){host.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-muted">Firebase 업무 설정을 불러오는 중입니다.</p>';return;}
  const accessOptions=(value)=>[['staff','로그인 직원'],['manager','직급자 이상'],['admin','관리자 이상'],['super','최고관리자만']].map(([id,label])=>'<option value="'+id+'" '+(value===id?'selected':'')+'>'+label+'</option>').join('');
  host.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-muted">내부 앱은 포털 안에서 열고, 외부 서비스는 새 탭에서 엽니다. 앱별 품목과 화면 표시 항목을 먼저 등록할 수 있습니다.</p>'+modules().map(row=>'<article class="hd-module-setting" data-hd-module-row="'+row.id+'"><div class="hd-module-setting-head"><div><strong>'+esc(row.label)+'</strong><small>'+ (row.mode==='internal'?'포털 내부':'외부 새 탭')+' · '+esc(row.category)+'</small></div><label>접근 등급<select data-hd-module-access>'+accessOptions(row.access)+'</select></label><label><input type="checkbox" data-hd-module-visible '+(row.visible!==false?'checked':'')+'> 메뉴 표시</label></div>'+(row.mode==='internal'?'<label class="hd-module-field">관리 품목 (한 줄에 하나씩)<textarea data-hd-module-items rows="3" placeholder="예: 소금빵\n명장단팥빵">'+esc((row.items||[]).join('\n'))+'</textarea></label><label class="hd-module-field">화면 표시 항목 (쉼표로 구분)<input data-hd-module-fields value="'+esc((row.fields||[]).join(', '))+'" placeholder="예: 품목, 수량, 매장"></label>':'')+'</article>').join('')+'<button type="button" class="hd-primary hd-save" data-hd-modules-save>업무 설정 저장</button><p id="hd-module-status" role="status"></p>';
 }
 function saveModuleSettings(){
  if(!root())throw Error('최고관리자 계정으로 로그인해주세요.');
  if(!db())throw Error('Firebase 연결을 확인해주세요.');
  const entries=[...document.querySelectorAll('[data-hd-module-row]')].map(card=>{
   const id=card.dataset.hdModuleRow,defaults=moduleDefaults.find(x=>x.id===id);if(!defaults)throw Error('알 수 없는 업무 메뉴입니다.');
   const access=card.querySelector('[data-hd-module-access]').value,visible=card.querySelector('[data-hd-module-visible]').checked;
   const items=defaults.mode==='internal'?card.querySelector('[data-hd-module-items]').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[];
   const fields=defaults.mode==='internal'?card.querySelector('[data-hd-module-fields]').value.split(',').map(x=>x.trim()).filter(Boolean):[];
   if(items.length>1000||items.some(x=>x.length>100)||fields.length>40||fields.some(x=>x.length>50)||!['staff','manager','admin','super'].includes(access))throw Error('품목은 1,000개 이하, 표시 항목은 40개 이하로 입력해주세요.');
   return {...defaults,access,visible,items,fields};
  });
  if(entries.length!==moduleDefaults.length)throw Error('업무 메뉴 전체를 확인해주세요.');
  return db().ref(base+'moduleConfig').transaction(current=>{const value={...(current||{}),version:1,modules:entries,updatedAt:new Date().toISOString()};return value;},undefined,false);
 }

 function applyMenu(){
  for(const group of ['today','resources']){
   const host=document.querySelector(`[data-menu-group="${group}"]`);
   if(!host)continue;
   for(const board of boards().filter(row=>row.group===group)){
    const el=host.closest('nav').querySelector(`[data-target="${board.id}"]`);
    if(!el)continue;
    host.append(el);
    el.hidden=board.visible===false || el.dataset.accessHidden==='true';
    const text=el.lastChild;if(text?.nodeType===Node.TEXT_NODE)text.textContent=board.label;
   }
   // Move a board when its category changes, including after a Firebase update.
   for(const board of boards().filter(row=>row.group!==group)){
    const el=host.querySelector(`[data-target="${board.id}"]`);
    if(el)document.querySelector(`[data-menu-group="${board.group}"]`)?.append(el);
   }
   host.querySelectorAll('[data-custom-menu]').forEach(el=>el.remove());
   for(const item of links().filter(row=>row.group===group)){
    if(item.visible===false)continue;
    const a=document.createElement('a');a.dataset.customMenu=item.id;a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.className='w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 font-medium text-sm transition-all';
    a.textContent='↗  '+item.label;a.addEventListener('click',()=>{if(window.innerWidth<1024)$('mobile-menu-btn')?.click();});host.append(a);
   }
  }
  for(const row of boards()){
   const card=document.querySelector(`#view-dashboard [data-open="${row.id}"]`);
   if(card)card.hidden=row.visible===false || row.home===false || card.dataset.accessHidden==='true';
  }
  renderModuleMenu();
 }
 function monthGrid(host, compact){
  if(!host)return;
  const [year,number]=month.split('-').map(Number),first=new Date(Date.UTC(year,number-1,1)),count=new Date(Date.UTC(year,number,0)).getUTCDate(),offset=first.getUTCDay();
  const byDay={};for(const row of Object.values(events))if(validDate(row?.date))byDay[row.date]=(byDay[row.date]||0)+1;
  const days=Array.from({length:Math.ceil((offset+count)/7)*7},(_,index)=>{
   const day=index-offset+1;if(day<1||day>count)return '<span class="hd-calendar-blank"></span>';
   const key=`${month}-${String(day).padStart(2,'0')}`;
   return `<button type="button" class="hd-day ${key===selected?'is-selected':''} ${key===kstToday()?'is-today':''}" data-hd-date="${key}" aria-label="${key} 일정 보기" aria-pressed="${key===selected}"><span>${day}</span>${byDay[key]?`<i aria-label="일정 ${byDay[key]}건"></i>`:''}</button>`;
  }).join('');
  host.innerHTML=`<div class="hd-calendar-head"><div><span class="hd-kicker">${compact?'01 · CALENDAR':'CALENDAR'}</span><h2>${year}년 ${number}월</h2></div><div class="hd-calendar-actions"><button type="button" data-hd-month="-1" aria-label="이전 달">‹</button><button type="button" data-hd-today>오늘</button><button type="button" data-hd-month="1" aria-label="다음 달">›</button></div></div><div class="hd-calendar-grid hd-weekdays">${['일','월','화','수','목','금','토'].map(x=>`<span>${x}</span>`).join('')}</div><div class="hd-calendar-grid hd-days">${days}</div>${compact?`<div class="hd-calendar-footer"><span>${labelDate(selected)} · 일정 ${byDay[selected]||0}건</span><button type="button" data-hd-open>일정표 보기 →</button></div>`:''}`;
 }
 function agenda(){
  const rows=Object.entries(events).filter(([,x])=>x?.date===selected).sort((a,b)=>String(a[1].time||'').localeCompare(String(b[1].time||'')));
  return `<div class="hd-agenda-head"><div><span class="hd-kicker">SELECTED DATE</span><h3>${labelDate(selected)} 일정</h3></div>${root()?'<button type="button" class="hd-primary" data-hd-new>+ 일정 등록</button>':''}</div><div class="hd-agenda-list">${rows.length?rows.map(([id,x])=>`<article class="hd-event"><div><time>${esc(x.time||'종일')}</time><h4>${esc(x.title)}</h4>${x.description?`<p>${esc(x.description)}</p>`:''}</div>${root()?`<div><button type="button" data-hd-edit="${esc(id)}">수정</button><button type="button" data-hd-delete="${esc(id)}">삭제</button></div>`:''}</article>`).join(''):'<p class="hd-empty">이 날짜에 등록된 일정이 없습니다.</p>'}</div>`;
 }
 function calendarView(){
  const host=$('view-calendar');if(!host||!host.classList.contains('active'))return;
  host.innerHTML=`<div class="hd-page-head"><span class="hd-kicker">HARE,HARE · WORKSPACE</span><h2>일정표</h2><p>날짜를 선택하면 그날의 일정을 볼 수 있습니다.</p></div>${readError?`<p class="hd-error" role="status">${esc(readError)}</p>`:''}<div class="hd-layout"><section class="hd-panel" id="hd-full-calendar"></section><section class="hd-panel" id="hd-agenda">${agenda()}</section></div><section id="hd-editor"></section>`;
  monthGrid($('hd-full-calendar'),false);
  if(editEvent)editor(editEvent);
 }
 let lastRenderedView='';
 function render(viewId){
  const entering=lastRenderedView!==viewId;lastRenderedView=viewId;
  if(viewId==='view-calendar')calendarView();
  if(viewId==='view-menu-admin')adminView();
  if(sectionMap[viewId]){
   innerMenu(viewId);
   if(entering)requestAnimationFrame(()=>{const items=sections(viewId).filter(canShowSection),target=items.find(x=>x.default)||items[0];if(target)openSection(viewId,target.id);});
  }
 }
 function renderDashboard(){monthGrid($('dashboard-calendar'),true);applyMenu();}
 function renderNotices(items){
  const host=$('dashboard-notice-ticker');if(!host)return;
  const rows=(Array.isArray(items)?items:[]).filter(x=>x?.id&&x?.title).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,20);
  host.hidden=!rows.length;if(!rows.length){host.innerHTML='';return;}
  const content=rows.map(x=>{const stamp=String(x.createdAt||x.updatedAt||'').slice(0,10);return `<button type="button" data-hd-notice="${esc(x.id)}">${validDate(stamp)?labelDate(stamp):''} 공지사항 : ${esc(x.title)}</button>`;}).join('');
  host.innerHTML=`<span class="hd-notice-label">NOTICE</span><div class="hd-notice-window"><div class="hd-notice-track"><div class="hd-notice-copy">${content}</div><div class="hd-notice-copy" aria-hidden="true" inert>${content}</div></div></div>`;
 }
 function editor(id=''){
  if(!root())return;
  const item=id?events[id]:null;editEvent=id;
  const host=$('hd-editor');if(!host)return;
  host.innerHTML=`<form id="hd-event-form" class="hd-panel"><div class="hd-agenda-head"><h3>${item?'일정 수정':'일정 등록'}</h3><button type="button" data-hd-cancel>닫기</button></div><div class="hd-form-grid"><label>날짜<input name="date" type="date" value="${esc(item?.date||selected)}" required></label><label>시간<input name="time" type="time" value="${esc(item?.time||'')}"></label><label class="hd-wide">제목<input name="title" maxlength="100" value="${esc(item?.title||'')}" required></label><label class="hd-wide">내용<textarea name="description" maxlength="1000">${esc(item?.description||'')}</textarea></label></div><button type="submit" class="hd-primary">저장</button><p role="status"></p></form>`;
 }
 function adminView(){
  const host=$('view-menu-admin');if(!host||!host.classList.contains('active'))return;
  if(!window.HareAdmin?.canView?.('view-menu-admin')){host.innerHTML='';return;}
  const editable=menuManager(),list=boards();
  const accessOptions=(value)=>[['all','전체 (비로그인 포함)'],['staff','로그인 사용자'],['manager','매니저 이상'],['admin','관리자 이상']].map(([id,label])=>`<option value="${id}" ${value===id?'selected':''}>${label}</option>`).join('');
  const cards=list.map((row,index)=>{
   const children=sections(row.id);
   const inner=children.length?`<div class="hd-inner-editor"><div class="hd-inner-editor-head"><span>메뉴 이름</span><span>표시</span><span>바로가기 표시 대상</span><span>기본</span><span>순서</span></div>${children.map((child,i)=>`<div class="hd-inner-editor-row" data-hd-section="${esc(child.id)}"><div><input data-hd-section-label value="${esc(child.label)}" maxlength="40" aria-label="${esc(child.label)} 내부 메뉴 이름" ${editable?'':'disabled'}><small>${esc(child.id)}</small></div><label><input type="checkbox" data-hd-section-visible ${child.visible!==false?'checked':''} ${editable?'':'disabled'}> 표시</label><select data-hd-section-access aria-label="${esc(child.label)} 바로가기 표시 대상" ${editable?'':'disabled'}>${accessOptions(child.access||'all')}</select><label><input type="radio" name="hd-default-${row.id}" data-hd-section-default ${child.default?'checked':''} ${editable?'':'disabled'}> 기본</label><div class="hd-inner-order"><button type="button" data-hd-move-section="-1" ${editable&&i>0?'':'disabled'} aria-label="${esc(child.label)} 위로">↑</button><button type="button" data-hd-move-section="1" ${editable&&i<children.length-1?'':'disabled'} aria-label="${esc(child.label)} 아래로">↓</button></div></div>`).join('')}</div>`:'<p class="hd-muted">이 게시판에는 포털에서 관리할 내부 메뉴가 없습니다.</p>';
   return `<article class="hd-board-card" data-hd-board="${row.id}"><div class="hd-board-main"><div class="hd-board-name"><input data-hd-label value="${esc(row.label)}" maxlength="40" ${editable?'':'disabled'} aria-label="${esc(row.label)} 게시판 이름"><small>${row.id}</small></div><label>위치<select data-hd-group ${editable?'':'disabled'}><option value="today" ${row.group==='today'?'selected':''}>TODAY</option><option value="resources" ${row.group==='resources'?'selected':''}>자료</option></select></label><label><input type="checkbox" data-hd-visible ${row.visible!==false?'checked':''} ${editable?'':'disabled'}> 표시</label><label><input type="checkbox" data-hd-home ${row.home?'checked':''} ${editable?'':'disabled'} ${document.querySelector(`#view-dashboard [data-open="${row.id}"]`)?'':'disabled'}> 홈 바로가기</label><div class="hd-board-actions"><button type="button" data-hd-move="-1" ${editable&&index>0?'':'disabled'} aria-label="${esc(row.label)} 위로">↑</button><button type="button" data-hd-move="1" ${editable&&index<list.length-1?'':'disabled'} aria-label="${esc(row.label)} 아래로">↓</button><button type="button" data-hd-open-board="${row.id}">열기</button></div></div><details class="hd-board-details"><summary>내부 메뉴 관리 <span>${children.length}개</span></summary>${inner}</details></article>`;
  }).join('');
  const custom=links().map((x,index,all)=>`<div class="hd-custom-row" data-hd-link="${esc(x.id)}"><input data-hd-link-label value="${esc(x.label)}" maxlength="40" aria-label="메뉴 이름" ${editable?'':'disabled'}><input data-hd-link-url value="${esc(x.url)}" type="url" aria-label="메뉴 주소" ${editable?'':'disabled'}><select data-hd-link-group ${editable?'':'disabled'}><option value="today" ${x.group==='today'?'selected':''}>TODAY</option><option value="resources" ${x.group==='resources'?'selected':''}>자료</option></select><label><input type="checkbox" data-hd-link-visible ${x.visible!==false?'checked':''} ${editable?'':'disabled'}> 표시</label><button type="button" data-hd-move-link="-1" ${editable&&index>0?'':'disabled'} aria-label="${esc(x.label)} 위로">↑</button><button type="button" data-hd-move-link="1" ${editable&&index<all.length-1?'':'disabled'} aria-label="${esc(x.label)} 아래로">↓</button><button type="button" data-hd-remove-link="${esc(x.id)}" ${editable?'':'disabled'}>삭제</button></div>`).join('');
  host.innerHTML=`<div class="hd-page-head"><span class="hd-kicker">ADMIN</span><h2>게시판 · 메뉴 관리</h2><p>게시판을 펼쳐 내부 메뉴의 이름, 순서, 표시 여부와 기본 항목을 설정합니다.</p><p class="hd-access-help"><strong>바로가기 표시 대상</strong>은 내부 메뉴 버튼의 노출 범위입니다. 게시글 읽기·글쓰기 권한은 변경되지 않습니다. 화면 접근 권한은 ‘아이디 · 권한 관리’에서 설정합니다.</p></div>${!editable?'<p class="hd-error">게시판 메뉴 저장에는 Firebase 인증이 연결된 관리자 계정 또는 최고관리자 로그인이 필요합니다.</p>':''}${menuError?`<p class="hd-error">${esc(menuError)}</p>`:''}<section class="hd-panel"><div class="hd-board-list">${cards}</div></section><section class="hd-panel"><h3>추가 메뉴</h3><p class="hd-muted">새 메뉴는 HTTPS 링크로 연결됩니다. 기존 게시판의 내용과 권한은 그대로 유지됩니다.</p><div id="hd-custom-list">${custom}</div>${editable?'<button type="button" data-hd-add-link>+ 링크 메뉴 추가</button>':''}</section>${editable?'<button type="button" class="hd-primary hd-save" data-hd-save>전체 메뉴 저장</button>':''}<p id="hd-menu-status" role="status"></p><section class="hd-panel" id="hd-module-settings"></section>`;
  moduleSettingsMarkup();
 }
 function readAdminForm(){
  const list=[...document.querySelectorAll('[data-hd-board]')].map(card=>{
   const id=card.dataset.hdBoard,defaults=sectionMap[id]||[];
   const inner=[...card.querySelectorAll('[data-hd-section]')].map(row=>({
    id:row.dataset.hdSection,label:row.querySelector('[data-hd-section-label]').value.trim(),
    visible:row.querySelector('[data-hd-section-visible]').checked,
    access:row.querySelector('[data-hd-section-access]').value,
    default:row.querySelector('[data-hd-section-default]').checked
   }));
   if(inner.length!==defaults.length||new Set(inner.map(x=>x.id)).size!==inner.length||inner.some(x=>!defaults.some(y=>y[0]===x.id)||!x.label||!['all','staff','manager','admin'].includes(x.access)))throw Error('내부 메뉴의 이름과 대상을 확인해주세요.');
   if(inner.length&&inner.filter(x=>x.default).length!==1)throw Error('게시판마다 기본 내부 메뉴를 하나 선택해주세요.');
   if(inner.some(x=>x.visible)&&inner.some(x=>x.default&&x.visible===false))throw Error('숨긴 내부 메뉴는 기본 메뉴로 선택할 수 없습니다.');
   return {id,label:card.querySelector('[data-hd-label]').value.trim(),group:card.querySelector('[data-hd-group]').value,visible:card.querySelector('[data-hd-visible]').checked,home:card.querySelector('[data-hd-home]').checked,sections:inner};
  });
  if(list.length!==builtins.length||list.some(x=>!x.label||!['today','resources'].includes(x.group)))throw Error('게시판 메뉴 이름과 위치를 확인해주세요.');
  const custom=[...document.querySelectorAll('[data-hd-link]')].map(row=>({id:row.dataset.hdLink,label:row.querySelector('[data-hd-link-label]').value.trim(),url:row.querySelector('[data-hd-link-url]').value.trim(),group:row.querySelector('[data-hd-link-group]').value,visible:row.querySelector('[data-hd-link-visible]').checked}));
  if(custom.length>30||custom.some(x=>!x.label||!/^https:\/\//i.test(x.url)||!['today','resources'].includes(x.group)))throw Error('추가 메뉴의 이름과 HTTPS 주소를 확인해주세요.');
  return {version:1,boards:list,links:custom,updatedAt:new Date().toISOString()};
 }
 function syncOrderButtons(){
  for(const row of document.querySelectorAll('[data-hd-board]')){
   row.querySelector('[data-hd-move="-1"]').disabled=!row.previousElementSibling;
   row.querySelector('[data-hd-move="1"]').disabled=!row.nextElementSibling;
   for(const child of row.querySelectorAll('[data-hd-section]')){
    child.querySelector('[data-hd-move-section="-1"]').disabled=!child.previousElementSibling?.matches('[data-hd-section]');
    child.querySelector('[data-hd-move-section="1"]').disabled=!child.nextElementSibling?.matches('[data-hd-section]');
   }
  }
  for(const row of document.querySelectorAll('[data-hd-link]')){
   row.querySelector('[data-hd-move-link="-1"]').disabled=!row.previousElementSibling;
   row.querySelector('[data-hd-move-link="1"]').disabled=!row.nextElementSibling;
  }
 }
 async function saveMenu(){
  if(!menuManager())throw Error('Firebase 인증이 연결된 관리자 로그인이 필요합니다.');if(!db())throw Error('Firebase 연결을 확인해주세요.');
  const next=readAdminForm(),ref=db().ref(base+'menuConfig'),expected=JSON.stringify(configRaw);
  let result;try{result=await ref.transaction(current=>JSON.stringify(current)===expected?next:undefined,undefined,false);}catch(err){if(err.code==='PERMISSION_DENIED')throw Error('Firebase 메뉴 저장 규칙이 이 관리자 계정의 쓰기를 허용하지 않습니다. Firebase 인증 및 규칙 설정을 확인해주세요.');throw err;}
  if(!result.committed)throw Error('다른 곳에서 메뉴가 변경되었습니다. 새로 받은 설정을 확인한 뒤 다시 저장해주세요.');
  configRaw=result.snapshot.val();config=configRaw;applyMenu();adminView();$('hd-menu-status').textContent='Firebase에 메뉴를 저장했습니다.';
 }
 function shiftMonth(change){const [year,num]=month.split('-').map(Number);const date=new Date(Date.UTC(year,num-1+change,1));month=date.toISOString().slice(0,7);selected=month+'-01';renderDashboard();calendarView();}
 function init(go){
  navigate=go;if(subscribed)return;subscribed=true;
  renderDashboard();watchInnerMenus();
  if(!db()){readError='Firebase에 연결하지 못했습니다. 일정을 불러올 수 없습니다.';calendarView();return;}
  db().ref(base+'calendarEvents').on('value',snap=>{events=snap.val()||{};readError='';renderDashboard();calendarView();},err=>{readError='일정 읽기 실패: '+err.message;calendarView();});
  db().ref(base+'menuConfig').on('value',snap=>{configRaw=snap.val();config=configRaw;menuError='';applyMenu();adminView();const active=document.querySelector('.spa-page.active');if(active&&sectionMap[active.id])innerMenu(active.id);},err=>{menuError='메뉴 설정 읽기 실패: '+err.message;adminView();});
  db().ref(base+'moduleConfig').on('value',snap=>{moduleConfigRaw=snap.exists()?snap.val():{};moduleConfig=moduleConfigRaw||{};localStorage.setItem('harePortalModuleConfig',JSON.stringify(moduleConfig));applyMenu();moduleSettingsMarkup();},err=>{moduleConfigRaw=null;moduleConfig={};const status=$('hd-module-settings');if(status)status.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-error">업무 설정을 읽지 못했습니다. Firebase Rules에 moduleConfig 읽기 규칙이 있는지 확인해주세요.</p>';});
 }
 document.addEventListener('click',async event=>{
  const btn=event.target.closest('[data-hd-date],[data-hd-month],[data-hd-today],[data-hd-open],[data-hd-notice],[data-hd-new],[data-hd-edit],[data-hd-delete],[data-hd-cancel],[data-hd-open-board],[data-hd-inner],[data-hd-move],[data-hd-move-section],[data-hd-move-link],[data-hd-add-link],[data-hd-remove-link],[data-hd-save],[data-hd-module],[data-hd-module-close],[data-hd-modules-save]');
  if(!btn)return;
  try{
   if(btn.dataset.hdDate){selected=btn.dataset.hdDate;month=selected.slice(0,7);renderDashboard();if(!btn.closest('#view-calendar'))navigate?.('view-calendar');else calendarView();return;}
   if(btn.dataset.hdMonth){shiftMonth(Number(btn.dataset.hdMonth));return;}
   if(btn.hasAttribute('data-hd-today')){selected=kstToday();month=selected.slice(0,7);renderDashboard();calendarView();return;}
   if(btn.hasAttribute('data-hd-open')){navigate?.('view-calendar');return;}
   if(btn.dataset.hdNotice){if(navigate?.('view-bulletin'))window.HareUnified?.openBulletin?.(btn.dataset.hdNotice);return;}
   if(btn.hasAttribute('data-hd-new')){editor();return;}
   if(btn.dataset.hdEdit){editor(btn.dataset.hdEdit);return;}
   if(btn.dataset.hdDelete){if(!root())throw Error('최고관리자 로그인이 필요합니다.');if(confirm('이 일정을 삭제할까요?'))await db().ref(base+'calendarEvents').child(btn.dataset.hdDelete).remove();return;}
   if(btn.hasAttribute('data-hd-cancel')){editEvent='';$('hd-editor').innerHTML='';return;}
   if(btn.dataset.hdOpenBoard){navigate?.(btn.dataset.hdOpenBoard);return;}
   if(btn.dataset.hdModule){openModule(btn.dataset.hdModule);return;}
   if(btn.hasAttribute('data-hd-module-close')){closeModule();return;}
   if(btn.hasAttribute('data-hd-modules-save')){btn.disabled=true;const status=$('hd-module-status');try{const result=await saveModuleSettings();if(!result.committed)throw Error('저장되지 않았습니다. 설정을 새로고침한 뒤 다시 시도해주세요.');if(status)status.textContent='업무 메뉴와 품목 설정을 저장했습니다.';}catch(err){if(status)status.textContent='저장 실패: '+err.message;else throw err;}finally{btn.disabled=false;}return;}
   if(btn.dataset.hdInner){openSection(btn.dataset.hdInnerBoard,btn.dataset.hdInner);return;}
   if(!menuManager())throw Error('Firebase 인증이 연결된 관리자 로그인이 필요합니다.');
   if(btn.dataset.hdMove){const row=btn.closest('[data-hd-board]'),next=Number(btn.dataset.hdMove)<0?row.previousElementSibling:row.nextElementSibling;if(next){if(Number(btn.dataset.hdMove)<0)next.before(row);else next.after(row);syncOrderButtons();}return;}
   if(btn.dataset.hdMoveSection){const row=btn.closest('[data-hd-section]'),next=Number(btn.dataset.hdMoveSection)<0?row.previousElementSibling:row.nextElementSibling;if(next?.matches('[data-hd-section]')){if(Number(btn.dataset.hdMoveSection)<0)next.before(row);else next.after(row);syncOrderButtons();}return;}
   if(btn.dataset.hdMoveLink){const row=btn.closest('[data-hd-link]'),next=Number(btn.dataset.hdMoveLink)<0?row.previousElementSibling:row.nextElementSibling;if(next){if(Number(btn.dataset.hdMoveLink)<0)next.before(row);else next.after(row);syncOrderButtons();}return;}
   if(btn.hasAttribute('data-hd-add-link')){const host=$('hd-custom-list'),row=document.createElement('div');row.className='hd-custom-row';row.dataset.hdLink='link-'+crypto.randomUUID();row.innerHTML='<input data-hd-link-label maxlength="40" placeholder="메뉴 이름" aria-label="메뉴 이름"><input data-hd-link-url type="url" placeholder="https://" aria-label="메뉴 주소"><select data-hd-link-group><option value="today">TODAY</option><option value="resources">자료</option></select><label><input type="checkbox" data-hd-link-visible checked> 표시</label><button type="button" data-hd-move-link="-1" aria-label="위로">↑</button><button type="button" data-hd-move-link="1" aria-label="아래로">↓</button><button type="button" data-hd-remove-link>삭제</button>';host.append(row);syncOrderButtons();row.querySelector('input').focus();return;}
   if(btn.hasAttribute('data-hd-remove-link')){btn.closest('[data-hd-link]').remove();syncOrderButtons();return;}
   if(btn.hasAttribute('data-hd-save')){btn.disabled=true;try{await saveMenu();}finally{btn.disabled=false;}}
  }catch(err){const status=$('hd-menu-status')||$('hd-event-form')?.querySelector('[role="status"]');if(status)status.textContent='저장하지 못했습니다: '+err.message;else alert(err.message);}
 });
 document.addEventListener('submit',async event=>{
  if(event.target.id!=='hd-event-form')return;event.preventDefault();const form=event.target,status=form.querySelector('[role="status"]');
  try{
   if(!root())throw Error('최고관리자 로그인이 필요합니다.');if(!db())throw Error('Firebase 연결을 확인해주세요.');
   const data=new FormData(form),date=String(data.get('date')),title=String(data.get('title')||'').trim(),description=String(data.get('description')||'').trim(),time=String(data.get('time')||'');
   if(!validDate(date)||!title)throw Error('날짜와 제목을 확인해주세요.');
   const id=editEvent,ref=id?db().ref(base+'calendarEvents').child(id):db().ref(base+'calendarEvents').push();
   await ref.set({date,time,title,description,createdAt:id?events[id]?.createdAt||new Date().toISOString():new Date().toISOString(),updatedAt:new Date().toISOString()});
   editEvent='';selected=date;month=date.slice(0,7);calendarView();
  }catch(err){status.textContent='저장하지 못했습니다: '+err.message;}
 });
 window.addEventListener('hare-admin-change',()=>{editEvent='';applyMenu();calendarView();adminView();const active=document.querySelector('.spa-page.active');if(active&&sectionMap[active.id])innerMenu(active.id);});
 window.HareDashboard={init,render,renderDashboard,renderNotices,applyMenu};
 window.HareWorkspace={modules,getModuleSettings:id=>modules().find(x=>x.id===id)||null,openModule};
})();
