import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
test('F5-24 review controller owns its panel, SSE and retained UI state',()=>{
  assert.match(page,/const f524Controller=\{project_id:null,plan_revision_id:null,selected_logical_id:null,feedback_draft:''/);
  assert.match(page,/module_plan_review/);
  assert.match(page,/const f524Panel=document\.createElement\('section'\)/);
  assert.match(page,/const f524Subscribe=id=>\{f524\.stream\?\.close\(\)/);
  assert.match(page,/refresh_in_flight/);
  assert.match(page,/refresh_requested/);
  assert.match(page,/Histórico de revisões \(somente leitura\)/);
  assert.match(page,/confirm\(`Aprovar/);
  assert.match(page,/Esclarecer cobertura de critérios/);
  assert.match(page,/Bloqueios:/);
  assert.doesNotMatch(page,/f524Draw[^]*plan\.payload/);
});
