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
  {id:'cake-menu',label:'케이크 메뉴',category:'디자인',mode:'internal',url:'https://harebakery-cmd.github.io/cake-menu/',access:'super',visible:true,items:[],fields:[]},
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
 const embeddedModuleIds = new Set();
 const roleRank = {guest:0,staff:1,manager:2,admin:3,super:4};
 const accountRole = () => window.HareAdmin?.currentAccount?.()?.role || 'guest';
 function moduleViewId(id){return 'view-module-'+id;}
 function prepareModuleViews(){
  const host=$('scroll-container');if(!host)return;
  for(const row of moduleDefaults.filter(x=>x.mode==='internal')){
   const id=moduleViewId(row.id);if($(id))continue;
   const page=document.createElement('section');page.id=id;page.className='spa-page hd-module-page';page.dataset.hdModuleId=row.id;
   page.innerHTML='<header class="hd-module-head"><div><span class="hd-module-kicker">WORKSPACE</span><h2>'+esc(row.label)+'</h2></div><button type="button" data-hd-module-close>← TODAY</button></header><iframe class="hd-module-frame" title="'+esc(row.label)+'" data-module-url="'+esc(row.url)+'" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
   host.append(page);
  }
  const original=window.HareAdmin?.canView;
  if(original&&!original.__hareModuleRoutes){const canView=function(id){const match=String(id||'').match(/^view-module-(.+)$/);if(match){const row=modules().find(x=>x.id===match[1]);return !!row&&row.mode==='internal'&&canOpenModule(row);}return original(id);};canView.__hareModuleRoutes=true;window.HareAdmin.canView=canView;}
  const observer=new MutationObserver(()=>{const active=host.querySelector('.spa-page.active[data-hd-module-id]');if(active){const row=modules().find(x=>x.id===active.dataset.hdModuleId);if(row&&$('page-title'))$('page-title').textContent=row.label;}});
  observer.observe(host,{subtree:true,attributes:true,attributeFilter:['class']});
 }
 prepareModuleViews();
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
  const linked=row.id?.startsWith('app:')?modules().find(x=>x.id===row.id.slice(4)):null;
  return row.visible!==false && (!linked||linked.visible!==false) && (roleRank[accountRole()]??0)>=required;
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
  const current=selectedSection[boardId]?.startsWith('app:')?selectedSection[boardId]:(pressed!==null&&pressed!==undefined?(pressed?'store:'+pressed:'all'):selectedSection[boardId]);
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
  if(boardId==='view-order'&&!id.startsWith('app:')){
   const storeId=id==='all'?'':id.startsWith('store:')?id.slice(6):null;
   if(storeId!==null){const button=[...host.querySelectorAll('.u-store-tabs [data-store-id]')].find(x=>x.dataset.storeId===storeId);if(button?.getAttribute('aria-pressed')!=='true')button?.click();}
  }else if(boardId==='view-recipe'&&id==='register'&&!host.querySelector('.u-recipe-editor')){
   host.querySelector('[data-action="open-recipe-register"]')?.click();
  }
  innerMenu(boardId);
  if(id.startsWith('app:')){openModule(id.slice(4));return;}
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
 let navigate = null, selected = kstToday(), month = selected.slice(0,7), events = {}, config = null, configRaw = null, moduleConfig = {}, moduleConfigRaw = null, historyImports = {}, historyListener = null, pendingImport = null, readError = '', menuError = '', editEvent = '', subscribed = false;
 function boards(){
  const saved = Array.isArray(config?.boards) ? config.boards : [];
  const byId = new Map(saved.filter(row => builtinIds.has(row?.id)).map(row => [row.id,row]));
  return boardDefaults().map(row => ({...row,...byId.get(row.id),id:row.id})).sort((a,b) => {
   const ai=saved.findIndex(x=>x?.id===a.id),bi=saved.findIndex(x=>x?.id===b.id);
   return (ai<0?builtins.findIndex(x=>x[0]===a.id)+100:ai)-(bi<0?builtins.findIndex(x=>x[0]===b.id)+100:bi);
  });
 }
 function links(){return (Array.isArray(config?.links)?config.links:[]).filter(row=>row && /^https:\/\//i.test(row.url||'') && String(row.label||'').trim()).slice(0,30);}
 function modules(){const saved=Array.isArray(moduleConfig?.modules)?moduleConfig.modules:[];const byId=new Map(saved.filter(x=>moduleDefaults.some(d=>d.id===x?.id)).map(x=>[x.id,x]));return moduleDefaults.map(row=>({...row,...byId.get(row.id),id:row.id,mode:row.mode,url:row.url,category:row.id==='cake-menu'?'디자인':row.category}));}
 function canOpenModule(row){const role=accountRole();if(row.access==='super')return root();return (roleRank[role]??0)>=(moduleRank[row.access]??1);}
 function moduleURL(row){const url=new URL(row.url);if(row.mode==='internal'&&url.origin!==location.origin)throw Error('내부 업무 링크는 harebakery-cmd.github.io 안에서만 열 수 있습니다.');if(row.mode==='external'&&!['harehare-pop-studio.avionenpapier1.chatgpt.site','do-rim.github.io','harehare-member.avionenpapier1.chatgpt.site'].includes(url.hostname))throw Error('등록된 외부 링크 주소가 아닙니다.');return url.href;}
 function normalizeSidebarIcons(){
  const sidebar=document.getElementById('sidebar');
  if(!sidebar)return;
  sidebar.querySelectorAll('.nav-btn,#admin-category button,#sidebar a[href],#bread-order-menu summary').forEach(item=>{
   const icon=item.firstElementChild;
   if(icon&&(icon.tagName==='DIV'||(icon.tagName==='SPAN'&&icon.hasAttribute('aria-hidden')&&!icon.querySelector('svg')))){
    icon.className='hd-menu-icon';icon.textContent='';icon.setAttribute('aria-hidden','true');icon.style.cssText='display:inline-block;width:7px;height:7px;min-width:7px;flex:0 0 7px;border-radius:2px;background:#c5c7cb;margin:0';
   }
  });
 }
 function renderModuleMenu(){
  const host=document.querySelector('[data-menu-group="resources"]');if(!host)return;
  const adminCategory=document.getElementById('admin-category');
  if(adminCategory&&host.contains(adminCategory))host.after(adminCategory);
  host.querySelectorAll('.hd-app-menu-group').forEach(x=>x.remove());
  const rows=modules().filter(x=>x.visible!==false&&!embeddedModuleIds.has(x.id));
  const categories=[...new Set(rows.map(x=>x.category||'업무 도구'))];
  const adminToolsVisible=!!adminCategory&&!adminCategory.hidden&&adminCategory.dataset.accessHidden!=='true';
  if(adminToolsVisible&&!categories.includes('관리'))categories.push('관리');
  for(const category of categories){
   const categoryRows=rows.filter(x=>(x.category||'업무 도구')===category);
   if(category==='관리'&&!categoryRows.length&&!adminToolsVisible)continue;
   const group=document.createElement('div');group.className='hd-app-menu-group';group.dataset.hdModuleCategory=category;group.innerHTML='<div class="hd-app-menu-caption">'+esc(category)+'</div>';
   categoryRows.forEach(row=>{
    const button=document.createElement('button');button.type='button';button.dataset.hdModule=row.id;button.className='hd-app-menu-button';
    button.innerHTML='<span class="hd-menu-icon" style="display:inline-block;width:7px;height:7px;min-width:7px;flex:0 0 7px;border-radius:2px;background:#c5c7cb;margin:0" aria-hidden="true"></span><span class="hd-menu-label">'+esc(row.label)+'</span>'+(row.mode==='external'?'<span class="hd-menu-external" aria-hidden="true">↗</span>':'');
    button.setAttribute('aria-label',row.label+(canOpenModule(row)?'':' · 권한 필요'));group.append(button);
   });
   if(category==='관리'&&adminCategory){
    adminCategory.querySelector(':scope > p')?.remove();
    group.append(adminCategory);
   }
   host.append(group);
  }
  ensureModuleScreenStyles();
  normalizeSidebarIcons();
 }
 let moduleScreenTitle='';
 function ensureModuleScreenStyles(){
  if($('hd-app-screen-style'))return;
  const style=document.createElement('style');style.id='hd-app-screen-style';
  style.textContent='.hd-module-page{max-width:1440px;margin:0 auto}.hd-module-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 auto 18px}.hd-module-kicker{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted,#777)}.hd-module-head h2{margin:4px 0 0;font-size:clamp(22px,3vw,32px);font-weight:700}.hd-module-head button{border:1px solid var(--edge,rgba(0,0,0,.2));border-radius:999px;padding:8px 16px;background:transparent;color:inherit}.hd-module-frame{display:block;width:100%;height:calc(100dvh - 210px);min-height:500px;border:1px solid var(--edge,rgba(0,0,0,.14));border-radius:18px;background:#fff}@media(max-width:640px){.hd-module-head{margin-bottom:12px}.hd-module-frame{height:calc(100dvh - 165px);min-height:60dvh;border-radius:12px}}.hd-menu-icon{display:inline-block!important;width:7px!important;height:7px!important;min-width:7px!important;flex:0 0 7px!important;border-radius:2px!important;background:#c5c7cb!important;margin-right:0!important}.hd-app-menu-group{margin-top:18px}.hd-app-menu-caption{padding:0 16px;margin-bottom:8px;color:#777;font-size:11px;font-weight:700;letter-spacing:.12em}.hd-app-menu-button{display:flex;align-items:center;gap:12px;width:100%;padding:10px 16px;border:0;border-radius:12px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}.hd-app-menu-button:hover{background:rgba(0,0,0,.05)}.hd-menu-external{margin-left:auto;color:var(--muted,#777)}';
  document.head.append(style);
 }
 function closeModule(){
  const active=document.querySelector('.spa-page.active[data-hd-module-id]');
  if(active)navigate?.('view-dashboard');
 }
 function openModule(id){
  const row=modules().find(x=>x.id===id);if(!row)return;
  if(!canOpenModule(row)){alert('이 업무 메뉴를 열 권한이 없습니다. 필요한 권한은 '+({staff:'로그인 직원',manager:'직급자',admin:'관리자',super:'최고관리자'}[row.access]||'로그인 사용자')+'입니다.');return;}
  const url=moduleURL(row);
  if(row.mode==='external'){window.open(url,'_blank','noopener,noreferrer');return;}
  prepareModuleViews();
  const viewId=moduleViewId(id),page=$(viewId),frame=page?.querySelector('iframe');
  if(!page||!frame)return;
  const alreadyLoaded=frame.dataset.moduleLoaded==='true';
  frame.dataset.loaded='true';
  if(!navigate?.(viewId))return;
  const title=$('page-title');if(title)title.textContent=row.label;
  if(!alreadyLoaded){
   frame.addEventListener('load',()=>frame.contentWindow?.postMessage({type:'hare-workspace:module-config',moduleId:id,settings:window.HareWorkspace?.getModuleSettings(id)||null,history:window.HareWorkspace?.getHistoryImports(id)||[]},location.origin));
   frame.src=url;frame.dataset.moduleLoaded='true';
  }
 }

 function csvRows(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\\n'){row.push(cell.replace(/\\r$/,''));rows.push(row);row=[];cell='';}else cell+=ch;}
  if(cell||row.length){row.push(cell.replace(/\\r$/,''));rows.push(row);}return rows;
 }
 async function readZipEntry(bytes,name){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw Error('정상적인 .xlsx 파일이 아닙니다.');
  const entries=view.getUint16(eocd+10,true),start=view.getUint32(eocd+16,true);let offset=start;
  for(let i=0;i<entries;i++){
   if(view.getUint32(offset,true)!==0x02014b50)throw Error('Excel 압축 구조를 읽을 수 없습니다.');
   const method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),nameLen=view.getUint16(offset+28,true),extraLen=view.getUint16(offset+30,true),commentLen=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
   const entryName=new TextDecoder().decode(bytes.slice(offset+46,offset+46+nameLen));
   if(entryName===name){
    if(size>20*1024*1024)throw Error('압축 해제된 Excel 시트가 너무 큽니다. 20MB 이하로 나눠 업로드해주세요.');
    const localName=view.getUint16(local+26,true),localExtra=view.getUint16(local+28,true),begin=local+30+localName+localExtra,compressed=bytes.slice(begin,begin+size);
    if(method===0)return new TextDecoder().decode(compressed);
    if(method===8){if(!('DecompressionStream'in window))throw Error('이 브라우저에서는 .xlsx 압축을 풀 수 없습니다. CSV로 저장해 업로드해주세요.');const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return await new Response(stream).text();}
    throw Error('지원하지 않는 Excel 압축 형식입니다.');
   }
   offset+=46+nameLen+extraLen+commentLen;
  }
  return null;
 }
 async function xlsxRows(file){
  const bytes=new Uint8Array(await file.arrayBuffer()),sheet=await readZipEntry(bytes,'xl/worksheets/sheet1.xml');
  if(!sheet)throw Error('첫 번째 시트를 찾을 수 없습니다.');
  const sharedXml=await readZipEntry(bytes,'xl/sharedStrings.xml'),shared=[];
  if(sharedXml){const doc=new DOMParser().parseFromString(sharedXml,'application/xml');for(const item of doc.getElementsByTagName('si'))shared.push([...item.getElementsByTagName('t')].map(x=>x.textContent||'').join(''));}
  const xml=new DOMParser().parseFromString(sheet,'application/xml');if(xml.querySelector('parsererror'))throw Error('Excel 시트를 읽을 수 없습니다.');
  const rows=[];
  for(const row of xml.getElementsByTagName('row')){const cells=[];for(const cell of row.getElementsByTagName('c')){
    const ref=cell.getAttribute('r')||'',letters=(ref.match(/^[A-Z]+/)||['A'])[0];let col=0;for(const ch of letters)col=col*26+ch.charCodeAt(0)-64;col--;
    const v=cell.getElementsByTagName('v')[0]?.textContent||'',type=cell.getAttribute('t');let value=type==='s'?(shared[Number(v)]??''):type==='inlineStr'?[...cell.getElementsByTagName('t')].map(x=>x.textContent||'').join(''):v;
    cells[col]=value;
   }rows.push(cells.map(x=>x??''));}
  return rows;
 }
 async function parseImportFile(file){
  if(!file||file.size>5*1024*1024)throw Error('파일을 선택해주세요. 파일은 5MB 이하로 업로드할 수 있습니다.');
  const ext=file.name.toLowerCase().split('.').pop();let raw;
  if(ext==='csv')raw=csvRows(new TextDecoder('utf-8').decode(await file.arrayBuffer()).replace(/^\\uFEFF/,''));
  else if(ext==='xlsx')raw=await xlsxRows(file);
  else throw Error('.xlsx 또는 CSV 파일을 선택해주세요. 오래된 .xls 파일은 .xlsx로 다시 저장해주세요.');
  const source=raw.filter(row=>row.some(cell=>String(cell??'').trim()!==''));
  if(source.length<2)throw Error('제목 행과 데이터 행이 있는 파일을 선택해주세요.');
  const headers=source[0].map((x,i)=>String(x||'항목 '+(i+1)).trim().slice(0,100));
  const rows=source.slice(1).map(row=>Object.fromEntries(headers.map((key,i)=>[key,String(row[i]??'').trim()])));
  if(rows.length>5000||headers.length>80)throw Error('한 번에 최대 5,000행, 80개 열까지 업로드할 수 있습니다.');
  if(JSON.stringify(rows).length>3*1024*1024)throw Error('업로드한 표 데이터는 3MB 이하로 나눠주세요.');
  return {headers,rows};
 }
 function importPreviewHtml(){
  if(!pendingImport)return '';
  const preview=pendingImport.rows.slice(0,5),headers=pendingImport.headers;
  return '<div class="hd-import-preview"><p><strong>'+esc(pendingImport.filename)+'</strong> · '+pendingImport.rows.length.toLocaleString('ko-KR')+'행 · '+headers.length+'개 항목</p><div class="hd-import-table-wrap"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+preview.map(row=>'<tr>'+headers.map(h=>'<td>'+esc(row[h])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="hd-muted">미리보기는 처음 5행입니다. 업로드한 기록은 운영 중인 현재 데이터와 분리해 보관합니다.</p><button type="button" class="hd-primary" data-hd-import-save>이전 기록 보관</button></div>';
 }
 function savedImportsHtml(){
  const rows=Object.entries(historyImports||{}).map(([id,row])=>({id,...row})).sort((a,b)=>(b.uploadedAt||0)-(a.uploadedAt||0)).slice(0,20);
  if(!rows.length)return '<p class="hd-muted">보관된 이전 기록이 없습니다.</p>';
  return '<div class="hd-import-list">'+rows.map(row=>'<div><strong>'+esc(row.filename||'Excel 기록')+'</strong><span>'+esc(modules().find(x=>x.id===row.moduleId)?.label||row.moduleId||'업무')+' · '+Number(row.rowCount||0).toLocaleString('ko-KR')+'행 · '+esc(row.uploadedAt?new Date(row.uploadedAt).toLocaleString('ko-KR'):'')+'</span></div>').join('')+'</div>';
 }
 function moduleSettingsMarkup(){
  const host=$('hd-module-settings');if(!host)return;
  if(!root()){host.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-muted">이 설정은 최고관리자 전용입니다.</p>';return;}
  if(!moduleConfigRaw){host.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-muted">Firebase 업무 설정을 불러오는 중입니다.</p>';return;}
  const accessOptions=(value)=>[['staff','로그인 직원'],['manager','직급자 이상'],['admin','관리자 이상'],['super','최고관리자만']].map(([id,label])=>'<option value="'+id+'" '+(value===id?'selected':'')+'>'+label+'</option>').join('');
  host.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-muted">내부 앱은 포털 안에서 열고, 외부 서비스는 새 탭에서 엽니다. 앱별 품목과 화면 표시 항목을 먼저 등록할 수 있습니다.</p>'+modules().map(row=>'<article class="hd-module-setting" data-hd-module-row="'+row.id+'"><div class="hd-module-setting-head"><div><strong>'+esc(row.label)+'</strong><small>'+ (row.mode==='internal'?'포털 내부':'외부 새 탭')+' · '+esc(row.category)+'</small></div><label>접근 등급<select data-hd-module-access>'+accessOptions(row.access)+'</select></label><label><input type="checkbox" data-hd-module-visible '+(row.visible!==false?'checked':'')+'> 메뉴 표시</label></div>'+(row.mode==='internal'?'<label class="hd-module-field">관리 품목 (한 줄에 하나씩)<textarea data-hd-module-items rows="3" placeholder="예: 소금빵\n명장단팥빵">'+esc((row.items||[]).join('\n'))+'</textarea></label><label class="hd-module-field">화면 표시 항목 (쉼표로 구분)<input data-hd-module-fields value="'+esc((row.fields||[]).join(', '))+'" placeholder="예: 품목, 수량, 매장"></label>':'')+'</article>').join('')+'<button type="button" class="hd-primary hd-save" data-hd-modules-save>업무 설정 저장</button><p id="hd-module-status" role="status"></p><div class="hd-import-panel"><h4>이전 기록 Excel 업로드</h4><p class="hd-muted">운영 데이터와 분리해 이전 기록으로 보관합니다. .xlsx 또는 Excel에서 저장한 .csv를 지원합니다.</p><label>업무<select id="hd-import-module">'+modules().map(x=>'<option value="'+x.id+'">'+esc(x.label)+'</option>').join('')+'</select></label><div class="hd-import-controls"><input type="file" id="hd-import-file" accept=".xlsx,.csv"><button type="button" data-hd-import-preview>파일 미리보기</button></div>\${importPreviewHtml()}<h4>최근 보관 기록</h4>\${savedImportsHtml()}</div>';
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
  const legacyShowcard=document.querySelector('[data-target="view-showcard"]');if(legacyShowcard){legacyShowcard.hidden=true;legacyShowcard.style.display='none';}
  document.querySelectorAll('a[href="https://harebakery-cmd.github.io/hare-allergen/"],a[href="https://harehare-member.avionenpapier1.chatgpt.site/manage"]').forEach(link=>link.remove());
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
 function syncHistoryImports(){
  if(!db())return;
  const ref=db().ref(base+'historyImports');
  if(root()){
   if(historyListener)return;
   historyListener=snap=>{historyImports=snap.val()||{};moduleSettingsMarkup();};
   ref.on('value',historyListener,err=>{historyListener=null;const status=$('hd-module-status');if(status)status.textContent='이전 기록 목록을 읽지 못했습니다. Firebase Rules를 확인해주세요.';});
  }else if(historyListener){ref.off('value',historyListener);historyListener=null;historyImports={};}
 }
 function init(go){
  navigate=go;if(subscribed)return;subscribed=true;
  renderDashboard();watchInnerMenus();
  if(!db()){readError='Firebase에 연결하지 못했습니다. 일정을 불러올 수 없습니다.';calendarView();return;}
  db().ref(base+'calendarEvents').on('value',snap=>{events=snap.val()||{};readError='';renderDashboard();calendarView();},err=>{readError='일정 읽기 실패: '+err.message;calendarView();});
  db().ref(base+'menuConfig').on('value',snap=>{configRaw=snap.val();config=configRaw;menuError='';applyMenu();adminView();const active=document.querySelector('.spa-page.active');if(active&&sectionMap[active.id])innerMenu(active.id);},err=>{menuError='메뉴 설정 읽기 실패: '+err.message;adminView();});
  db().ref(base+'moduleConfig').on('value',snap=>{moduleConfigRaw=snap.exists()?snap.val():{};moduleConfig=moduleConfigRaw||{};applyMenu();moduleSettingsMarkup();},err=>{moduleConfigRaw=null;moduleConfig={};const status=$('hd-module-settings');if(status)status.innerHTML='<h3>업무 메뉴·품목 설정</h3><p class="hd-error">업무 설정을 읽지 못했습니다. Firebase Rules에 moduleConfig 읽기 규칙이 있는지 확인해주세요.</p>';});
  syncHistoryImports();
 }
 document.addEventListener('click',async event=>{
  const btn=event.target.closest('[data-hd-date],[data-hd-month],[data-hd-today],[data-hd-open],[data-hd-notice],[data-hd-new],[data-hd-edit],[data-hd-delete],[data-hd-cancel],[data-hd-open-board],[data-hd-inner],[data-hd-move],[data-hd-move-section],[data-hd-move-link],[data-hd-add-link],[data-hd-remove-link],[data-hd-save],[data-hd-module],[data-hd-module-close],[data-hd-module-back],[data-hd-modules-save],[data-hd-import-preview],[data-hd-import-save]');
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
   if(btn.hasAttribute('data-hd-module-close')||btn.hasAttribute('data-hd-module-back')){closeModule();return;}
   if(btn.hasAttribute('data-hd-modules-save')){btn.disabled=true;const status=$('hd-module-status');try{const result=await saveModuleSettings();if(!result.committed)throw Error('저장되지 않았습니다. 설정을 새로고침한 뒤 다시 시도해주세요.');if(status)status.textContent='업무 메뉴와 품목 설정을 저장했습니다.';}catch(err){if(status)status.textContent='저장 실패: '+err.message;else throw err;}finally{btn.disabled=false;}return;}
   if(btn.hasAttribute('data-hd-import-preview')){
    if(!root())throw Error('최고관리자 로그인이 필요합니다.');
    const file=$('hd-import-file')?.files?.[0],moduleId=$('hd-import-module')?.value,status=$('hd-module-status');btn.disabled=true;
    try{const parsed=await parseImportFile(file);pendingImport={...parsed,moduleId,filename:file.name};moduleSettingsMarkup();}catch(err){if(status)status.textContent='Excel 읽기 실패: '+err.message;}finally{btn.disabled=false;}return;
   }
   if(btn.hasAttribute('data-hd-import-save')){
    if(!root()||!pendingImport)throw Error('최고관리자 계정과 미리보기 파일을 확인해주세요.');
    const status=$('hd-module-status');btn.disabled=true;
    try{if(!db())throw Error('Firebase 연결을 확인해주세요.');const ref=db().ref(base+'historyImports').push();await ref.set({moduleId:pendingImport.moduleId,filename:pendingImport.filename,headers:pendingImport.headers,rows:pendingImport.rows,rowCount:pendingImport.rows.length,uploadedAt:Date.now(),uploadedBy:window.HareAdmin?.currentAccount?.()?.id||'hare01'});pendingImport=null;if(status)status.textContent='이전 기록을 저장했습니다.';}catch(err){if(status)status.textContent='업로드 실패: '+err.message;}finally{btn.disabled=false;}return;
   }

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
 window.addEventListener('hare-admin-change',()=>{syncHistoryImports();editEvent='';applyMenu();calendarView();adminView();const active=document.querySelector('.spa-page.active');if(active&&sectionMap[active.id])innerMenu(active.id);});
 window.HareDashboard={init,render,renderDashboard,renderNotices,applyMenu};
 window.HareWorkspace={modules,getModuleSettings:id=>modules().find(x=>x.id===id)||null,getHistoryImports:id=>Object.values(historyImports||{}).filter(x=>!id||x.moduleId===id),openModule};
})();
