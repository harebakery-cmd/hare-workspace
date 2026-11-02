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
 const boardDefaults = () => builtins.map(([id,label,group]) => ({id,label,group,visible:true,home:['view-order','view-newprod','view-recipe','view-production','view-origin'].includes(id)}));
 const base = 'hareharePortal/shared/';
 const db = () => window.HareFirebase?.database;
 const root = () => !!window.HareFirebase?.isRoot?.() && window.HareAdmin?.currentAccount?.()?.id === 'hare01';
 const kstToday = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value+'T00:00:00Z').valueOf()) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const labelDate = value => value.replaceAll('-','.');
 let navigate = null, selected = kstToday(), month = selected.slice(0,7), events = {}, config = null, configRaw = null, readError = '', menuError = '', editEvent = '', subscribed = false;
 function boards(){
  const saved = Array.isArray(config?.boards) ? config.boards : [];
  const byId = new Map(saved.filter(row => builtinIds.has(row?.id)).map(row => [row.id,row]));
  return boardDefaults().map(row => ({...row,...byId.get(row.id),id:row.id})).sort((a,b) => {
   const ai=saved.findIndex(x=>x?.id===a.id),bi=saved.findIndex(x=>x?.id===b.id);
   return (ai<0?builtins.findIndex(x=>x[0]===a.id)+100:ai)-(bi<0?builtins.findIndex(x=>x[0]===b.id)+100:bi);
  });
 }
 function links(){return (Array.isArray(config?.links)?config.links:[]).filter(row=>row && /^https:\/\//i.test(row.url||'') && String(row.label||'').trim()).slice(0,30);}
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
 function render(viewId){
  if(viewId==='view-calendar'){calendarView();return;}
  if(viewId==='view-menu-admin')adminView();
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
  const editable=root(),list=boards();
  const rows=list.map((row,index)=>`<tr data-hd-board="${row.id}"><td><input data-hd-label value="${esc(row.label)}" maxlength="40" ${editable?'':'disabled'} aria-label="${esc(row.label)} 메뉴 이름"><small>${row.id}</small></td><td><select data-hd-group ${editable?'':'disabled'}><option value="today" ${row.group==='today'?'selected':''}>TODAY</option><option value="resources" ${row.group==='resources'?'selected':''}>자료</option></select></td><td><label><input type="checkbox" data-hd-visible ${row.visible!==false?'checked':''} ${editable?'':'disabled'}> 표시</label></td><td><label><input type="checkbox" data-hd-home ${row.home?'checked':''} ${editable?'':'disabled'} ${document.querySelector(`#view-dashboard [data-open="${row.id}"]`)?'':'disabled'}> 홈 바로가기</label></td><td><button type="button" data-hd-move="-1" data-hd-id="${row.id}" ${editable&&index>0?'':'disabled'} aria-label="${esc(row.label)} 위로">↑</button><button type="button" data-hd-move="1" data-hd-id="${row.id}" ${editable&&index<list.length-1?'':'disabled'} aria-label="${esc(row.label)} 아래로">↓</button> <button type="button" data-hd-open-board="${row.id}">열기</button></td></tr>`).join('');
  const custom=links().map((x,index,all)=>`<div class="hd-custom-row" data-hd-link="${esc(x.id)}"><input data-hd-link-label value="${esc(x.label)}" maxlength="40" aria-label="메뉴 이름" ${editable?'':'disabled'}><input data-hd-link-url value="${esc(x.url)}" type="url" aria-label="메뉴 주소" ${editable?'':'disabled'}><select data-hd-link-group ${editable?'':'disabled'}><option value="today" ${x.group==='today'?'selected':''}>TODAY</option><option value="resources" ${x.group==='resources'?'selected':''}>자료</option></select><label><input type="checkbox" data-hd-link-visible ${x.visible!==false?'checked':''} ${editable?'':'disabled'}> 표시</label><button type="button" data-hd-move-link="-1" ${editable&&index>0?'':'disabled'} aria-label="${esc(x.label)} 위로">↑</button><button type="button" data-hd-move-link="1" ${editable&&index<all.length-1?'':'disabled'} aria-label="${esc(x.label)} 아래로">↓</button><button type="button" data-hd-remove-link="${esc(x.id)}" ${editable?'':'disabled'}>삭제</button></div>`).join('');
  host.innerHTML=`<div class="hd-page-head"><span class="hd-kicker">ADMIN</span><h2>게시판 · 메뉴 관리</h2><p>각 게시판의 메뉴 이름, 위치, 표시 여부와 순서를 한 곳에서 설정합니다. 홈 바로가기는 기존 카드에 적용됩니다.</p></div>${!editable?'<p class="hd-error">공유 메뉴를 저장하려면 최고관리자 hare01로 로그인하세요.</p>':''}${menuError?`<p class="hd-error">${esc(menuError)}</p>`:''}<section class="hd-panel"><div class="hd-table-wrap"><table class="hd-table"><thead><tr><th>게시판</th><th>메뉴 위치</th><th>메뉴</th><th>홈</th><th>순서 · 이동</th></tr></thead><tbody>${rows}</tbody></table></div></section><section class="hd-panel"><h3>추가 메뉴</h3><p class="hd-muted">새 메뉴는 HTTPS 링크로 연결됩니다. 기존 게시판의 내용과 권한은 그대로 유지됩니다.</p><div id="hd-custom-list">${custom}</div>${editable?'<button type="button" data-hd-add-link>+ 링크 메뉴 추가</button>':''}</section>${editable?'<button type="button" class="hd-primary hd-save" data-hd-save>전체 메뉴 저장</button>':''}<p id="hd-menu-status" role="status"></p>`;
 }
 function readAdminForm(){
  const list=[...document.querySelectorAll('[data-hd-board]')].map(tr=>({id:tr.dataset.hdBoard,label:tr.querySelector('[data-hd-label]').value.trim(),group:tr.querySelector('[data-hd-group]').value,visible:tr.querySelector('[data-hd-visible]').checked,home:tr.querySelector('[data-hd-home]').checked}));
  if(list.length!==builtins.length||list.some(x=>!x.label||!['today','resources'].includes(x.group)))throw Error('게시판 메뉴 이름과 위치를 확인해주세요.');
  const custom=[...document.querySelectorAll('[data-hd-link]')].map(row=>({id:row.dataset.hdLink,label:row.querySelector('[data-hd-link-label]').value.trim(),url:row.querySelector('[data-hd-link-url]').value.trim(),group:row.querySelector('[data-hd-link-group]').value,visible:row.querySelector('[data-hd-link-visible]').checked}));
  if(custom.length>30||custom.some(x=>!x.label||!/^https:\/\//i.test(x.url)||!['today','resources'].includes(x.group)))throw Error('추가 메뉴의 이름과 HTTPS 주소를 확인해주세요.');
  return {version:1,boards:list,links:custom,updatedAt:new Date().toISOString()};
 }
 function syncOrderButtons(){
  for(const row of document.querySelectorAll('[data-hd-board]')){
   row.querySelector('[data-hd-move="-1"]').disabled=!row.previousElementSibling;
   row.querySelector('[data-hd-move="1"]').disabled=!row.nextElementSibling;
  }
  for(const row of document.querySelectorAll('[data-hd-link]')){
   row.querySelector('[data-hd-move-link="-1"]').disabled=!row.previousElementSibling;
   row.querySelector('[data-hd-move-link="1"]').disabled=!row.nextElementSibling;
  }
 }
 async function saveMenu(){
  if(!root())throw Error('최고관리자 로그인이 필요합니다.');if(!db())throw Error('Firebase 연결을 확인해주세요.');
  const next=readAdminForm(),ref=db().ref(base+'menuConfig'),expected=JSON.stringify(configRaw);
  const result=await ref.transaction(current=>JSON.stringify(current)===expected?next:undefined,undefined,false);
  if(!result.committed)throw Error('다른 곳에서 메뉴가 변경되었습니다. 새로 받은 설정을 확인한 뒤 다시 저장해주세요.');
  configRaw=result.snapshot.val();config=configRaw;applyMenu();adminView();$('hd-menu-status').textContent='Firebase에 메뉴를 저장했습니다.';
 }
 function shiftMonth(change){const [year,num]=month.split('-').map(Number);const date=new Date(Date.UTC(year,num-1+change,1));month=date.toISOString().slice(0,7);selected=month+'-01';renderDashboard();calendarView();}
 function init(go){
  navigate=go;if(subscribed)return;subscribed=true;
  renderDashboard();
  if(!db()){readError='Firebase에 연결하지 못했습니다. 일정을 불러올 수 없습니다.';calendarView();return;}
  db().ref(base+'calendarEvents').on('value',snap=>{events=snap.val()||{};readError='';renderDashboard();calendarView();},err=>{readError='일정 읽기 실패: '+err.message;calendarView();});
  db().ref(base+'menuConfig').on('value',snap=>{configRaw=snap.val();config=configRaw;menuError='';applyMenu();adminView();},err=>{menuError='메뉴 설정 읽기 실패: '+err.message;adminView();});
 }
 document.addEventListener('click',async event=>{
  const btn=event.target.closest('[data-hd-date],[data-hd-month],[data-hd-today],[data-hd-open],[data-hd-notice],[data-hd-new],[data-hd-edit],[data-hd-delete],[data-hd-cancel],[data-hd-open-board],[data-hd-move],[data-hd-move-link],[data-hd-add-link],[data-hd-remove-link],[data-hd-save]');
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
   if(!root())throw Error('최고관리자 로그인이 필요합니다.');
   if(btn.dataset.hdMove){const row=btn.closest('tr'),next=Number(btn.dataset.hdMove)<0?row.previousElementSibling:row.nextElementSibling;if(next){if(Number(btn.dataset.hdMove)<0)next.before(row);else next.after(row);syncOrderButtons();}return;}
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
 window.addEventListener('hare-admin-change',()=>{editEvent='';applyMenu();calendarView();adminView();});
 window.HareDashboard={init,render,renderDashboard,renderNotices,applyMenu};
})();
