import assert from 'node:assert/strict';
import test from 'node:test';
import { developmentRuntimeSanitize } from './development-runtime.js';

const base={schema_version:'development-runtime/v1',work_item_id:'00000000-0000-4000-8000-000000000001',attempt:null,inconsistency:null,history:[],diagnostic_id:null};
test('F5-25 sanitizer rejects runtime paths, prompts, commands and secrets',()=>{
  assert.deepEqual(developmentRuntimeSanitize(base),base);
  for(const key of ['path','uri','prompt','command','stdout','stderr','content','secret','token'])assert.throws(()=>developmentRuntimeSanitize({...base,[key]:'unsafe'}));
  assert.throws(()=>developmentRuntimeSanitize({...base,attempt:'file:///private'}));
});
