import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('F5-24 SSE E2E uses one active subscription and coalesces render-time events without a loop', async () => {
  const page=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  const start=page.indexOf('/* F5-24 ownership boundary');
  const end=page.indexOf('</script>',start);
  assert.ok(start>=0&&end>start,'F5-24 controller script is present');
  const streams:any[]=[];let fetches=0;let pump:()=>void=()=>{};
  class FakeEventSource { closed=false;listeners=new Map<string,Function[]>();onmessage:Function|null=null;constructor(_url:string){streams.push(this)}addEventListener(type:string,listener:Function){this.listeners.set(type,[...(this.listeners.get(type)??[]),listener])}close(){this.closed=true}emit(type='MODULE_PLAN_PROPOSED'){for(const listener of this.listeners.get(type)??[])listener({data:'{}'});this.onmessage?.({data:'{}'})}}
  const element=()=>({className:'',id:'',dataset:{},style:{},append(){},appendChild(){},replaceChildren(){},before(){},querySelector(){return null},children:[]});
  const context:any={console,EventSource:FakeEventSource,fetch:async()=>{fetches++;return{ok:true,json:async()=>({module_plan_review:[]})}},setInterval:(fn:()=>void)=>{pump=fn;return 1},document:{createElement:element,querySelector:()=>element()},phase3Panel:{before(){}},message(){},f518Post:async()=>({}),stream:null,projectId:null,detail:{hidden:true},decision:{hidden:true},phase2:{hidden:true},projects:async()=>{},confirm:()=>true};
  vm.runInNewContext(`${page.slice(start,end)};globalThis.f524Test={f524,f524Subscribe};`,context);
  context.f524Test.f524.project_id='project-a';context.f524Test.f524Subscribe('project-a');
  const stream=streams[0];stream.emit();stream.emit('MODULE_PLAN_APPROVED');stream.emit('MODULE_PLAN_FAILED');
  assert.equal(fetches,0,'SSE handler only marks pending work');
  pump();await Promise.resolve();await Promise.resolve();
  assert.equal(streams.length,1,'one subscription is created for the project');
  assert.equal(fetches,1,'a burst of SSE events produces one refresh');
  pump();await Promise.resolve();
  assert.equal(fetches,1,'the completed refresh does not loop');
});
