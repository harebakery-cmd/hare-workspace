const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/legacy-master.js', 'utf8');
const events = {};
const host={innerHTML:''};
const form = {id:'legacy-master-form',fields:{name:'망고 테스트',price:'8900',origin0:'태국산',allergens:'우유',stores:['doan']},scrollIntoView(){}};
const state = {catalog:{products:[],categories:[]},submissions:{}};
let isAdmin = false, seq = 0, submissionNum = 0;
const base = 'hareharePortal/shared/';
const database = {ref(path){
  if(path === base + 'productSubmissions') return {push(){const key=`-TEST_APPROVAL_KEY_${++submissionNum}`;return {set:async value=>{state.submissions[key]=value;}}}};
  if(path === base + 'catalog') return {transaction:async change=>{const next=change(state.catalog);if(!next)return {committed:false};state.catalog=next;return {committed:true,snapshot:{val:()=>next}};}};
  const key=path.slice((base+'productSubmissions/').length);
  if(path.startsWith(base+'productSubmissions/'))return {once:async()=>({val:()=>state.submissions[key]||null}),remove:async()=>{delete state.submissions[key];}};
  throw Error('Unexpected database path: '+path);
}};
class TestFormData {
  constructor(target){this.fields=target.fields;}
  get(key){return this.fields[key]??null;}
  getAll(key){return this.fields[key]||[];}
}
const context={
  window:{HareFirebase:{auth:{currentUser:null},database},HareAdmin:{currentAccount:()=>isAdmin?{id:'hare01'}:null}},
  document:{readyState:'loading',addEventListener:(name,fn)=>{events[name]=fn;},getElementById:id=>id==='legacy-master-form'?form:id==='legacy-master-host'?host:null},
  FormData:TestFormData,crypto:{randomUUID:()=>`test-${++seq}`},structuredClone,setTimeout,clearTimeout,console,
};
vm.runInNewContext(source,context);
const flush=()=>new Promise(resolve=>setTimeout(resolve,10));
(async()=>{
  events.submit({target:form,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products.length,0,'New requests must not publish a product');
  assert.equal(Object.keys(state.submissions).length,1,'Guest request must wait for review');
  assert.match(host.innerHTML,/class="active">등록된 신제품/,'Registration should open the new product tab');
  const sid=Object.keys(state.submissions)[0];
  isAdmin=true;
  context.window.HareFirebase.auth.currentUser={uid:'2gGRDUrXlyNwMpw1xpLA3iH35Fd2'};
  const review={id:'legacy-master-review',dataset:{id:sid},fields:{...form.fields,category:'미분류'}};
  events.submit({target:review,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products.length,1);
  assert.equal(state.catalog.products[0].name,'망고 테스트');
  assert.equal(state.catalog.products[0].sourceSubmissionId,review.dataset.id);
  assert.equal(Object.keys(state.submissions).length,0);
  events.submit({target:review,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products.length,1,'Replaying approval must not add a duplicate');
  const productId=state.catalog.products[0].id;
  const editButton={dataset:{lm:'edit',id:productId}};
  events.click({target:{closest:()=>editButton}});
  form.fields={...form.fields,name:'망고 테스트 수정',note:'출력 전 확인',changeNote:'이름 변경'};
  events.submit({target:form,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products[0].note,'출력 전 확인');
  assert.match(state.catalog.products[0].changeHistory[0].summary,/제품명.*비고/);
  assert.equal(state.catalog.products[0].changeHistory[0].note,'이름 변경');
  assert.match(host.innerHTML,/class="active">제품 목록/,'Editing should return to all products');
  state.catalog.products[0].confirmedAt=new Date(Date.now()-4*24*60*60*1000).toISOString();
  const tabButton={dataset:{lm:'tab',value:'registered'}};
  events.click({target:{closest:()=>tabButton}});
  assert.doesNotMatch(host.innerHTML,/data-id="p--TEST_APPROVAL_KEY_1"/,'Old products should leave the new product tab');
  form.fields={...form.fields,name:'관리자 신제품'};
  events.submit({target:form,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products.length,1,'Admin new product must wait for review too');
  assert.equal(Object.keys(state.submissions).length,1);
  console.log('Product approval flow passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
