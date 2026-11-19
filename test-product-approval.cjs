const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/legacy-master.js', 'utf8');
const events = {};
const form = {id:'legacy-master-form',fields:{name:'망고 테스트',price:'8900',origin0:'태국산',allergens:'우유',stores:['doan']}};
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
  document:{readyState:'loading',addEventListener:(name,fn)=>{events[name]=fn;},getElementById:id=>id==='legacy-master-form'?form:null},
  FormData:TestFormData,crypto:{randomUUID:()=>`test-${++seq}`},structuredClone,setTimeout,clearTimeout,console,
};
vm.runInNewContext(source,context);
const flush=()=>new Promise(resolve=>setTimeout(resolve,10));
(async()=>{
  events.submit({target:form,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products.length,0,'New requests must not publish a product');
  assert.equal(Object.keys(state.submissions).length,1,'Guest request must wait for review');
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
  form.fields={...form.fields,name:'관리자 신제품'};
  events.submit({target:form,preventDefault(){}});
  await flush();
  assert.equal(state.catalog.products.length,1,'Admin new product must wait for review too');
  assert.equal(Object.keys(state.submissions).length,1);
  console.log('Product approval flow passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
