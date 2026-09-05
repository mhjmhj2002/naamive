import assert from 'node:assert/strict';
import test from 'node:test';
import { GATE_CATALOG_COMPLETE_V1_HASH, GATE_CATALOG_V2_MIGRATION, prepareHistoricalMigrationCompatibility } from './migration-compatibility.js';

test('MIG-FIX-01 compatibility is restricted to the certified 049/051 fresh collision',async()=>{
  const queries:Array<{sql:string;parameters?:unknown[]}>=[];
  const client={query:async(sql:string,parameters?:unknown[])=>{
    queries.push({sql,parameters});
    return {rows:[{content_hash:GATE_CATALOG_COMPLETE_V1_HASH,hash_valid:true,transform_is_noop:true,has_049:true,has_050:true,lacks_051:true,lacks_v2:true,has_legacy_unique:true}]};
  }};
  assert.equal(await prepareHistoricalMigrationCompatibility(client as any,'050_phase_6_5_gate_catalog_snapshots.sql'),false);
  assert.equal(queries.length,0,'unrelated migrations are not inspected or changed');
  assert.equal(await prepareHistoricalMigrationCompatibility(client as any,GATE_CATALOG_V2_MIGRATION),true);
  assert.equal(queries.length,2);
  assert.match(queries[0].sql,/transform_is_noop/);
  assert.deepEqual(queries[0].parameters,[GATE_CATALOG_V2_MIGRATION]);
  assert.match(queries[1].sql,/DROP CONSTRAINT gate_catalog_publications_content_hash_key/);
});

test('MIG-FIX-01 fails closed for an unknown hash or non-equivalent transform',async()=>{
  for(const state of [
    {content_hash:'0'.repeat(64),hash_valid:true,transform_is_noop:true,has_049:true,has_050:true,lacks_051:true,lacks_v2:true,has_legacy_unique:true},
    {content_hash:GATE_CATALOG_COMPLETE_V1_HASH,hash_valid:true,transform_is_noop:false,has_049:true,has_050:true,lacks_051:true,lacks_v2:true,has_legacy_unique:true}
  ]){
    const queries:string[]=[],client={query:async(sql:string)=>{queries.push(sql);return{rows:[state]};}};
    assert.equal(await prepareHistoricalMigrationCompatibility(client as any,GATE_CATALOG_V2_MIGRATION),false);
    assert.equal(queries.length,1,'uncertified state is never mutated');
  }
});
