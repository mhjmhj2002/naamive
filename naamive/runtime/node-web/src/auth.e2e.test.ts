import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';

process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET='gat03-bootstrap-secret-that-is-long-enough';

if (!process.env.DATABASE_URL) {
  test('GAT-03 requer PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool, withTransaction } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const { openCatalogGate } = await import('./gate-catalog.js');
  const projectA=`auth-a-${randomUUID().slice(0,8)}`,projectB=`auth-b-${randomUUID().slice(0,8)}`,moduleA=randomUUID(),moduleB=randomUUID();
  const origin='http://127.0.0.1:3000';
  const call=async(base:string,path:string,init:RequestInit={})=>fetch(`${base}${path}`,{...init,headers:{origin,...init.headers}});
  const cookie=(response:Response)=>String(response.headers.get('set-cookie')??'').split(';')[0];
  const cleanup=async()=>{
    await pool.query(`DELETE FROM auth_audit_records WHERE principal_id IN (SELECT id FROM auth_principals WHERE username LIKE 'gat03-%')`);
    await pool.query(`DELETE FROM auth_sessions WHERE principal_id IN (SELECT id FROM auth_principals WHERE username LIKE 'gat03-%')`);
    await pool.query(`DELETE FROM auth_role_grants WHERE principal_id IN (SELECT id FROM auth_principals WHERE username LIKE 'gat03-%')`);
    await pool.query(`DELETE FROM auth_credentials WHERE principal_id IN (SELECT id FROM auth_principals WHERE username LIKE 'gat03-%')`);
    await pool.query(`DELETE FROM auth_principals WHERE username LIKE 'gat03-%'`);
    for(const projectId of [projectA,projectB]) { await pool.query(`UPDATE gate_records SET decision_id=NULL WHERE project_id=$1`,[projectId]); await pool.query(`DELETE FROM gate_decisions WHERE gate_id IN (SELECT id FROM gate_records WHERE project_id=$1)`,[projectId]); await pool.query(`DELETE FROM gate_records WHERE project_id=$1`,[projectId]); await pool.query(`DELETE FROM events WHERE project_id=$1`,[projectId]); await pool.query(`DELETE FROM projects WHERE id=$1`,[projectId]); }
  };

  test('GAT-03 autentica, aplica RBAC/GAT-01, CSRF, escopo, revogação e redaction', async t => {
    await cleanup();
    const server=createApiServer(); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${(server.address() as any).port}`;
    t.after(async()=>{server.close();await cleanup();await pool.end();});
    const bootstrap=await call(base,'/api/auth/bootstrap',{method:'POST',headers:{'content-type':'application/json','x-naamive-bootstrap-secret':process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET!},body:JSON.stringify({username:'gat03-admin',password:'senha-admin-segura-123'})});
    assert.equal(bootstrap.status,201);
    assert.equal((await call(base,'/api/auth/bootstrap',{method:'POST',headers:{'content-type':'application/json','x-naamive-bootstrap-secret':process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET!},body:JSON.stringify({username:'gat03-other',password:'senha-outra-segura-123'})})).status,409);
    assert.equal((await call(base,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'gat03-admin',password:'incorreta'})})).status,401);
    const adminLogin=await call(base,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'gat03-admin',password:'senha-admin-segura-123'})}); assert.equal(adminLogin.status,200); const admin=await adminLogin.json() as any,adminCookie=cookie(adminLogin),adminHeaders={'content-type':'application/json','x-csrf-token':admin.csrf_token,cookie:adminCookie};
    assert.match(adminCookie,/naamive_session=/); assert.match(String(adminLogin.headers.get('set-cookie')),/HttpOnly/); assert.match(String(adminLogin.headers.get('set-cookie')),/SameSite=Strict/);
    assert.equal((await fetch(`${base}/api/projects`)).status,401);
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft) VALUES($1,'A','owner','tester','/tmp','local','main','000','REGISTERED','{}'),($2,'B','owner','tester','/tmp','local','main','000','REGISTERED','{}')`,[projectA,projectB]);
    const leadResponse=await call(base,'/api/admin/auth/principals',{method:'POST',headers:adminHeaders,body:JSON.stringify({username:'gat03-lead',password:'senha-lead-segura-123',grants:[{role_code:'TECH_LEAD',action_code:'DECIDE_CATALOG_GATE',project_id:projectA,resource_type:'MODULE',resource_id:moduleA}]})});assert.equal(leadResponse.status,201); const lead=await leadResponse.json() as any;
    const workerResponse=await call(base,'/api/admin/auth/service-principals',{method:'POST',headers:adminHeaders,body:JSON.stringify({username:'gat03-worker',grants:[{role_code:'WORKER_SERVICE',action_code:'WORKER_EXECUTE',project_id:projectA,resource_type:'WORK_ITEM',resource_id:'wi-a'}]})});assert.equal(workerResponse.status,201);const worker=await workerResponse.json() as any;
    assert.equal((await call(base,'/api/admin/auth/principals',{method:'POST',headers:adminHeaders,body:JSON.stringify({username:'gat03-invalid',password:'senha-invalida-segura-123',grants:[{role_code:'WORKER_SERVICE',action_code:'WORKER_EXECUTE'}]})})).status,422);
    const leadLogin=await call(base,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'gat03-lead',password:'senha-lead-segura-123'})});const leadBody=await leadLogin.json() as any,leadHeaders={'content-type':'application/json','x-csrf-token':leadBody.csrf_token,cookie:cookie(leadLogin),'x-actor-role':'BUSINESS_OWNER','x-actor-id':'spoofed'};
    const opening=(scopeId:string)=>({gate_code:'MATERIAL_ARCHITECTURE',scope_type:'MODULE',scope_id:scopeId,condition_code:'MATERIALITY_POLICY_MATCHED',reason:'Contrato público.',evidence:{policy_id:'architecture/materiality',policy_version:1,material_impacts:['API'],alternatives:['compatível'],affected_boundaries:['module']}});
    const gateA:any=await withTransaction(client=>openCatalogGate(client,projectA,opening(moduleA)));
    const gateB:any=await withTransaction(client=>openCatalogGate(client,projectB,opening(moduleB)));
    const decision={version:1,decision:'APPROVE',reason:'Revisado.',evidence:{review:'ok'}};
    assert.equal((await call(base,`/api/projects/${projectA}/catalog-gates/${gateA.id}/decision`,{method:'POST',headers:{...leadHeaders,'x-csrf-token':'invalido','idempotency-key':'csrf'},body:JSON.stringify(decision)})).status,403);
    const denied=await call(base,`/api/projects/${projectB}/catalog-gates/${gateB.id}/decision`,{method:'POST',headers:{...leadHeaders,'idempotency-key':'cross'},body:JSON.stringify(decision)});assert.equal(denied.status,403);
    const accepted=await call(base,`/api/projects/${projectA}/catalog-gates/${gateA.id}/decision`,{method:'POST',headers:{...leadHeaders,'idempotency-key':'gate'},body:JSON.stringify(decision)});assert.equal(accepted.status,202);assert.equal((await pool.query(`SELECT actor_id,actor_role FROM gate_decisions WHERE gate_id=$1`,[gateA.id])).rows[0].actor_id,lead.principal_id);assert.equal((await pool.query(`SELECT actor_role FROM gate_decisions WHERE gate_id=$1`,[gateA.id])).rows[0].actor_role,'TECH_LEAD');
    const expiredLogin=await call(base,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:'gat03-lead',password:'senha-lead-segura-123'})});const expiredCookie=cookie(expiredLogin);await pool.query(`UPDATE auth_sessions SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 second' WHERE session_hash=$1`,[createHash('sha256').update(String(expiredCookie).split('=')[1]).digest('hex')]);assert.equal((await call(base,`/api/projects/${projectA}/catalog-gates`,{headers:{cookie:expiredCookie}})).status,401);
    const workerAuth={'authorization':`Service ${worker.principal_id}:${worker.credential}`,'content-type':'application/json'};
    assert.equal((await call(base,'/api/internal/worker/authorize',{method:'POST',headers:workerAuth,body:JSON.stringify({project_id:projectA,resource_type:'WORK_ITEM',resource_id:'wi-a'})})).status,204);
    assert.equal((await call(base,'/api/internal/worker/authorize',{method:'POST',headers:workerAuth,body:JSON.stringify({project_id:projectA,resource_type:'WORK_ITEM',resource_id:'wi-b'})})).status,403);
    assert.equal((await call(base,`/api/projects/${projectB}/catalog-gates/${gateB.id}/decision`,{method:'POST',headers:{...workerAuth,'idempotency-key':'service-gate'},body:JSON.stringify(decision)})).status,403);
    const rotated=await call(base,`/api/admin/auth/service-principals/${worker.principal_id}/rotate`,{method:'POST',headers:adminHeaders});assert.equal(rotated.status,200);const rotation=await rotated.json() as any;
    assert.equal((await call(base,'/api/internal/worker/authorize',{method:'POST',headers:workerAuth,body:JSON.stringify({project_id:projectA,resource_type:'WORK_ITEM',resource_id:'wi-a'})})).status,401);
    const rotatedWorkerHeaders={...workerAuth,authorization:`Service ${worker.principal_id}:${rotation.credential}`};assert.equal((await call(base,'/api/internal/worker/authorize',{method:'POST',headers:rotatedWorkerHeaders,body:JSON.stringify({project_id:projectA,resource_type:'WORK_ITEM',resource_id:'wi-a'})})).status,204);
    assert.equal((await call(base,`/api/admin/auth/principals/${worker.principal_id}/revoke`,{method:'POST',headers:adminHeaders})).status,200);
    assert.equal((await call(base,'/api/internal/worker/authorize',{method:'POST',headers:rotatedWorkerHeaders,body:JSON.stringify({project_id:projectA,resource_type:'WORK_ITEM',resource_id:'wi-a'})})).status,401);
    assert.equal((await call(base,'/api/auth/logout',{method:'POST',headers:leadHeaders})).status,204);
    assert.equal((await call(base,`/api/projects/${projectA}/catalog-gates`,{headers:{cookie:leadHeaders.cookie}})).status,401);
    const audit=(await pool.query(`SELECT reason_code FROM auth_audit_records WHERE principal_id=$1`,[worker.principal_id])).rows.map(row=>String(row.reason_code)).join(' ');assert.ok(!audit.includes(worker.credential));
  });
}
