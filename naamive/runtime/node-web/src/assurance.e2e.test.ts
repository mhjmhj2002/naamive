import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

/* This is deliberately an E2E test, rather than a mock of the assurance
 * repository: it exercises the durable F6 handoff using PostgreSQL, the real
 * worker and the public HTTP/SSE projection. */
if (!process.env.DATABASE_URL) {
  test('F6 assurance acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_AGENT_ADAPTER = 'controlled';
  process.env.NAAMIVE_OPERATOR_ID ??= 'f6-e2e-operator';
  const { pool, withTransaction } = await import('./db.js');
  const { assuranceProjection, createAcceptance, createIndependentReview, submitOutputForReview, transitionBlock } = await import('./assurance.js');
  const { putArtifact } = await import('./artifacts.js');
  const { runOnce } = await import('./worker.js');
  const { createApiServer } = await import('./server.js');

  const project = randomUUID(), revision = randomUUID(), runtimeA = randomUUID(), runtimeB = randomUUID(), policy = randomUUID();
  const assurancePolicy = randomUUID(), correlation = randomUUID();
  const producerPolicyName = `f6-producer-${policy.slice(0,8)}`;
  const pkg = { contract:{}, authorized_activity:{}, input_artifacts:{}, expected_outputs:{}, required_evidence:{}, completion_criteria:{}, output_reference:{}, evidence:{}, classification:'INTERNAL' };
  const producer = (execution: string) => ({ agentId:'producer', agentVersion:'1', runtimeId:runtimeA, configurationVersion:1, policyId:policy, policyVersion:1, executionContextHash:(awaitIdentity[execution] ?? '') });
  const awaitIdentity: Record<string,string> = {};

  const clean = async () => {
    await pool.query(`DELETE FROM finding_work_items WHERE finding_id IN (SELECT id FROM findings WHERE project_id=$1)`,[project]);
    await pool.query(`DELETE FROM findings WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM review_decisions WHERE review_id IN (SELECT id FROM assurance_reviews WHERE acceptance_id IN (SELECT id FROM work_acceptances WHERE project_id=$1))`, [project]);
    await pool.query(`DELETE FROM assurance_reviews WHERE acceptance_id IN (SELECT id FROM work_acceptances WHERE project_id=$1)`, [project]);
    await pool.query(`DELETE FROM assistance_proposals WHERE block_id IN (SELECT id FROM work_blocks WHERE project_id=$1)`, [project]);
    await pool.query(`DELETE FROM assurance_command_idempotency WHERE resource_id IN (SELECT id::text FROM work_blocks WHERE project_id=$1 UNION SELECT id::text FROM work_acceptances WHERE project_id=$1) OR result_id IN (SELECT id::text FROM work_blocks WHERE project_id=$1 UNION SELECT id::text FROM work_acceptances WHERE project_id=$1)`,[project]);
    // Reviewer dispatches are no longer referenced after assurance_reviews is
    // removed.  Keep producer executions until their acceptance rows are gone.
    await pool.query(`DELETE FROM agent_execution WHERE project_key=$1 AND id NOT IN (SELECT execution_id FROM work_acceptances WHERE project_id=$1)`, [project]);
    for (const table of ['assurance_human_gates','work_blocks','work_acceptances','events']) await pool.query(`DELETE FROM ${table} WHERE project_id=$1`, [project]);
    await pool.query('DELETE FROM agent_execution WHERE project_key=$1', [project]);
    for (const table of ['artifacts','artifact_intents','jobs','operations','intake_revisions']) await pool.query(`DELETE FROM ${table} WHERE project_id=$1`, [project]);
    await pool.query('DELETE FROM projects WHERE id=$1', [project]);
    await pool.query('DELETE FROM assurance_policies WHERE id=$1', [assurancePolicy]);
    await pool.query('DELETE FROM agent_execution_policy WHERE id=$1', [policy]);
    await withTransaction(async c => {
      await c.query('DELETE FROM ai_runtime_configuration WHERE runtime_id IN ($1,$2)', [runtimeA,runtimeB]);
      await c.query('DELETE FROM ai_runtime WHERE id IN ($1,$2)', [runtimeA,runtimeB]);
    });
  };

  const makeAcceptance = async () => {
    const operation = randomUUID(), job = randomUUID(), execution = randomUUID();
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'PRODUCT_DISCOVERY','QUEUED',$3,$4,$5)`, [operation,project,`f6-produce:${operation}`,correlation,revision]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'ASSURANCE_TEST',$5)`, [job,operation,project,revision,`f6-produce-job:${job}`]);
    await pool.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,revision_id,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selected_runtime_id,selected_configuration_version,selection_reason)
      VALUES($1,$2,$3,$4,$5,$6,'ASSURANCE_TEST',$7,'producer','1','ANALYZE_PRODUCT_NEED','INTERNAL',$8,$9,1,'SELECTED',$10,1,'{}')`, [execution,job,operation,project,project,revision,`f6-execution:${execution}`,policy,producerPolicyName,runtimeA]);
    const acceptance = await withTransaction(c => createAcceptance(c, { id:execution, project_key:project, policy_name:producerPolicyName, task_type:'ANALYZE_PRODUCT_NEED', classification:'INTERNAL', agent_id:'producer', agent_version:'1', selected_runtime_id:runtimeA, selected_configuration_version:1, policy_id:policy, policy_version:1 }, correlation));
    const identity = (await pool.query('SELECT producer_identity FROM work_acceptances WHERE id=$1',[acceptance!.id])).rows[0].producer_identity.execution_context_hash;
    awaitIdentity[execution]=identity;
    await pool.query(`UPDATE jobs SET status='LEASED',lease_expires_at=clock_timestamp()+interval '10 minutes' WHERE id=$1`,[job]);
    await pool.query(`UPDATE operations SET status='RUNNING' WHERE id=$1`,[operation]);
    let outputReference:any;
    await withTransaction(async c => {
      const artifact=await putArtifact(c,project,'assurance-structured-output',JSON.stringify({result:'READY_FOR_GATE',evidence:{reference:'f6-e2e'}}),execution);
      outputReference={artifact_id:artifact.id,artifact_hash:artifact.hash,schema_version:1,validated:true};
      await submitOutputForReview(c,execution,outputReference);
    });
    return { execution, acceptance: acceptance!.id, outputReference };
  };

  test('F6 durably dispatches independent review, safely replays it, and keeps unavailable reviewers non-accepting', async (t) => {
    t.after(async () => { await clean(); await pool.end(); });
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft) VALUES($1,'F6 E2E','owner','tester','/tmp','local','main','000','REGISTERED','{}')`,[project]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/f6','tester')`,[revision,project,'a'.repeat(64),'b'.repeat(64)]);
    await withTransaction(async c => {
      await c.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`,[runtimeA,`f6-${runtimeA}`]);
      await c.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',30,'CLI_SESSION','{}','tester','F6 E2E')`,[runtimeA]);
    });
    await pool.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,fallback_allowed,provider_retry_limit,published_at,published_by) VALUES($1,$2,1,'{}',$3,false,0,clock_timestamp(),'tester')`,[policy,producerPolicyName,runtimeA]);
    await pool.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'tester')`,[assurancePolicy,`f6-e2e-${assurancePolicy.slice(0,8)}`,{agentPolicyNames:[producerPolicyName],taskTypes:['ANALYZE_PRODUCT_NEED'],classifications:['INTERNAL']},{schema_version:1,max_rework_rounds:2,minimum_progress_delta:0.1,reviewer_runtime_ids:[runtimeB],runtime_exception_classifications:['INTERNAL'],blockable_failure_codes:['RECONCILIATION_AMBIGUOUS']}]);

    const unavailable=await makeAcceptance();
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[unavailable.acceptance])).rows[0].state,'WAITING_FOR_INDEPENDENT_REVIEWER');
    const waiting:any=await createIndependentReview(unavailable.acceptance,producer(unavailable.execution),{...producer(unavailable.execution),agentId:'unregistered-reviewer',executionContextHash:'different-context'},pkg);
    assert.equal(waiting.state,'WAITING_FOR_INDEPENDENT_REVIEWER');

    await withTransaction(async c => {
      await c.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`,[runtimeB,`f6-${runtimeB}`]);
      await c.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',30,'CLI_SESSION','{}','tester','F6 E2E')`,[runtimeB]);
    });

    const ready=await makeAcceptance();
    const review:any=(await pool.query(`SELECT * FROM assurance_reviews WHERE acceptance_id=$1`,[ready.acceptance])).rows[0];
    assert.ok(review,'OUTPUT_SUBMITTED created the independent REVIEW in the same transaction');
    const durable=await pool.query(`SELECT r.state,e.id AS dispatch_id,e.selected_runtime_id,j.status AS job_status,o.status AS operation_status FROM assurance_reviews r JOIN agent_execution e ON e.id=r.dispatch_execution_id JOIN jobs j ON j.id=e.job_id JOIN operations o ON o.id=e.operation_id WHERE r.id=$1`,[review.id]);
    assert.deepEqual(durable.rows[0],{state:'DISPATCHED',dispatch_id:durable.rows[0].dispatch_id,selected_runtime_id:runtimeB,job_status:'PENDING',operation_status:'QUEUED'});
    // Make the first reviewer attempt fail through the real worker path.  The
    // durable REVIEW job must be retried, not replaced, after a restart.
    const previousAdapter=process.env.NAAMIVE_AGENT_ADAPTER, previousCommand=process.env.NAAMIVE_CODEX_COMMAND, previousRetries=process.env.NAAMIVE_AGENT_MAX_RETRIES;
    process.env.NAAMIVE_AGENT_ADAPTER='codex'; process.env.NAAMIVE_CODEX_COMMAND='false'; process.env.NAAMIVE_AGENT_MAX_RETRIES='1';
    assert.equal(await runOnce(project),true);
    assert.equal((await pool.query(`SELECT status FROM jobs WHERE id=(SELECT job_id FROM agent_execution WHERE id=$1)`,[durable.rows[0].dispatch_id])).rows[0].status,'RETRYABLE');
    process.env.NAAMIVE_AGENT_ADAPTER='controlled';
    if(previousCommand===undefined) delete process.env.NAAMIVE_CODEX_COMMAND; else process.env.NAAMIVE_CODEX_COMMAND=previousCommand;
    await pool.query(`UPDATE jobs SET available_at=clock_timestamp() WHERE id=(SELECT job_id FROM agent_execution WHERE id=$1)`,[durable.rows[0].dispatch_id]);
    assert.equal(await runOnce(project),true);
    if(previousAdapter===undefined) delete process.env.NAAMIVE_AGENT_ADAPTER; else process.env.NAAMIVE_AGENT_ADAPTER=previousAdapter;
    if(previousRetries===undefined) delete process.env.NAAMIVE_AGENT_MAX_RETRIES; else process.env.NAAMIVE_AGENT_MAX_RETRIES=previousRetries;
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1`,[ready.acceptance])).rows[0].n),1); // restart/retry retained the same durable dispatch
    assert.equal(Number((await pool.query('SELECT count(*)::int n FROM review_decisions WHERE review_id=$1',[review.id])).rows[0].n),1);
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[ready.acceptance])).rows[0].state,'ACCEPTED');
    assert.equal((await pool.query(`SELECT correlation_id FROM events WHERE event_type='ASSURANCE_REVIEW_DECIDED' AND payload->>'review_id'=$1`,[review.id])).rows[0].correlation_id,correlation);
    assert.deepEqual((await pool.query(`SELECT j.status AS job_status,o.status AS operation_status FROM agent_execution e JOIN jobs j ON j.id=e.job_id JOIN operations o ON o.id=e.operation_id WHERE e.id=$1`,[ready.execution])).rows[0],{job_status:'COMPLETED',operation_status:'SUCCEEDED'});

    const blocked=await makeAcceptance();
    const previousDecision=process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION;
    process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION='BLOCK';
    assert.equal(await runOnce(project),true);
    if(previousDecision===undefined) delete process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION; else process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION=previousDecision;
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[blocked.acceptance])).rows[0].state,'BLOCKED');
    const reviewerBlock=(await pool.query(`SELECT id FROM work_blocks WHERE acceptance_id=$1 AND source_type='ASSURANCE_REVIEW'`,[blocked.acceptance])).rows[0].id;
    assert.ok(reviewerBlock);

    const unavailableBlock=(await pool.query(`SELECT id FROM work_blocks WHERE acceptance_id=$1`,[unavailable.acceptance])).rows[0].id;
    let resolvedUnavailable:any;
    for (const state of ['DIAGNOSING','SOLUTION_PROPOSED','RESOLUTION_SELECTED','RESOLVING','RESOLVED']) resolvedUnavailable=await transitionBlock(unavailableBlock,state,{reason:'F6 E2E resolution',evidence:{hash:'b'.repeat(64)}},`unavailable:${state}`);
    const reopened=await transitionBlock(resolvedUnavailable.id,'OPEN',{reason:'recurrence',evidence:{reference:'incident-recurred'}},'reopen-once');
    const replayedReopen=await transitionBlock(resolvedUnavailable.id,'OPEN',{reason:'recurrence',evidence:{reference:'incident-recurred'}},'reopen-once');
    assert.equal(reopened.id,replayedReopen.id); assert.equal(reopened.previous_block_id,resolvedUnavailable.id); assert.equal(Number(reopened.cycle),2);
    await transitionBlock(reopened.id,'PAUSED',{reason:'operator pause',evidence:{reference:'pause-1'}},'pause-once');
    assert.equal((await pool.query(`SELECT status FROM jobs WHERE id=(SELECT job_id FROM agent_execution WHERE id=$1)`,[unavailable.execution])).rows[0].status,'BLOCKED');

    const projection=await assuranceProjection(project,'0');
    assert.ok(projection.timeline.length>0); assert.doesNotMatch(JSON.stringify(projection),/stdout|stderr|prompt|secret|password|api[_-]?key/i);
    const replay=await assuranceProjection(project,String(projection.timeline[0].id));
    assert.ok(replay.timeline.every((event:any)=>Number(event.id)>Number(projection.timeline[0].id)));

    // The public transport, not an in-process projection, owns replay.  Two
    // connections using the same cursor are read-only and cannot duplicate a
    // terminal review decision.
    const server=createApiServer(); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const address=server.address(); assert.ok(address&&typeof address!=='string'); const base=`http://127.0.0.1:${address.port}`;
    t.after(()=>server.close());
    const stream=await fetch(`${base}/api/projects/${project}/assurance/events?cursor=0`);
    assert.equal(stream.headers.get('content-type'),'text/event-stream');
    const reader=stream.body!.getReader(), first=await reader.read(), wire=new TextDecoder().decode(first.value);
    assert.match(wire,/event: assurance/); const cursor=Number((wire.match(/id: (\d+)/)||[])[1]); assert.ok(cursor>0); await reader.cancel();
    const replayStream=await fetch(`${base}/api/projects/${project}/assurance/events?cursor=${cursor}`);
    const replayReader=replayStream.body!.getReader(), replayWire=new TextDecoder().decode((await replayReader.read()).value); await replayReader.cancel();
    for(const id of [...replayWire.matchAll(/id: (\d+)/g)].map(match=>Number(match[1]))) assert.ok(id>cursor);
    assert.equal(Number((await pool.query('SELECT count(*)::int n FROM review_decisions WHERE review_id=$1',[review.id])).rows[0].n),1);

    const projectionUrl=`${base}/api/projects/${project}/assurance?correlation_id=${correlation}&limit=2`;
    const unauthorizedProjection=await (await fetch(projectionUrl)).json(); assert.deepEqual(unauthorizedProjection.allowed_actions,[]); assert.ok(unauthorizedProjection.acceptances.length<=2);
    const ownerProjection=await (await fetch(projectionUrl,{headers:{'x-actor-role':'ON_CALL_OWNER'}})).json(); assert.ok(ownerProjection.allowed_actions.includes('RECONCILE_ACCEPTANCE'));
    const nested=await (await fetch(`${base}/api/projects/${project}/work-items/${randomUUID()}/assurance`)).json(); assert.equal(nested.scope.target_type,'work_item'); assert.deepEqual(nested.acceptances,[]);

    const proposalResponse=await fetch(`${base}/api/projects/${project}/assurance/blocks/${reviewerBlock}/proposals`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':'proposal-once'},body:JSON.stringify({alternatives:[{description:'retry after repair',impact:'restores delivery',tradeoff:'additional latency'}],recommendation:{alternative:0},confidence:0.8,human_decision_required:true})});
    assert.equal(proposalResponse.status,202); assert.equal(Number((await pool.query('SELECT count(*)::int n FROM assistance_proposals WHERE block_id=$1',[reviewerBlock])).rows[0].n),1);
    await transitionBlock(reviewerBlock,'ESCALATED',{reason:'critical ambiguity',evidence:{reference:'escalation-1'}},'escalate-review-block');
    await assert.rejects(()=>transitionBlock(reviewerBlock,'RESOLUTION_SELECTED',{reason:'choose repair',evidence:{reference:'decision-1'}},'select-before-gate'),/ASSURANCE_ESCALATED_CLOSURE_GATE_REQUIRED/);
    const gateUrl=`${base}/api/projects/${project}/assurance/gates`,gateBody={block_id:reviewerBlock,gate_type:'ESCALATED_CLOSURE',decision:'APPROVED',reason:'authorized closure',evidence:{reference:'gate-1'},scope:{block_id:reviewerBlock},classification:'INTERNAL'};
    assert.equal((await fetch(gateUrl,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'ON_CALL_OWNER'},body:JSON.stringify(gateBody)})).status,403);
    const closureResponse=await fetch(gateUrl,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'TECH_LEAD','idempotency-key':'closure-gate-once'},body:JSON.stringify(gateBody)});
    assert.equal(closureResponse.status,202); assert.equal((await closureResponse.json()).correlation_id,correlation);
    const reworked=await makeAcceptance();
    const originalDecision=process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION; process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION='REWORK';
    assert.equal(await runOnce(project),true);
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[reworked.acceptance])).rows[0].state,'REWORK_REQUIRED');
    const reconcileUrl=`${base}/api/projects/${project}/assurance/acceptances/${reworked.acceptance}/reconcile`;
    const reconcileHeaders={'content-type':'application/json','x-actor-role':'ON_CALL_OWNER','idempotency-key':`reconcile-reworked-once:${project}`};
    const reconcileBody=JSON.stringify({reason:'corrected output revalidated',evidence:{reference:'revalidation-1'},revalidation:{reference:'qa-1'},output_reference:reworked.outputReference});
    assert.equal((await fetch(reconcileUrl,{method:'POST',headers:reconcileHeaders,body:reconcileBody})).status,202);
    assert.equal((await fetch(reconcileUrl,{method:'POST',headers:reconcileHeaders,body:reconcileBody})).status,202);
    assert.equal(Number((await pool.query('SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1',[reworked.acceptance])).rows[0].n),2);
    if(originalDecision===undefined) delete process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION; else process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION=originalDecision;
    assert.equal(await runOnce(project),true);
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[reworked.acceptance])).rows[0].state,'ACCEPTED');
    assert.equal(Number((await pool.query('SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1',[reworked.acceptance])).rows[0].n),2);

    const stalled=await makeAcceptance(); process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION='REWORK';
    assert.equal(await runOnce(project),true);
    const stalledReconcile=`${base}/api/projects/${project}/assurance/acceptances/${stalled.acceptance}/reconcile`;
    assert.equal((await fetch(stalledReconcile,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'ON_CALL_OWNER'},body:JSON.stringify({reason:'first correction revalidated',evidence:{reference:'revalidation-stalled'},revalidation:{reference:'qa-stalled'},output_reference:stalled.outputReference})})).status,202);
    assert.equal(await runOnce(project),true);
    if(originalDecision===undefined) delete process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION; else process.env.NAAMIVE_CONTROLLED_ASSURANCE_DECISION=originalDecision;
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[stalled.acceptance])).rows[0].state,'ESCALATED');
    assert.equal((await pool.query(`SELECT block_code FROM work_blocks WHERE acceptance_id=$1 AND block_code='REWORK_NO_PROGRESS'`,[stalled.acceptance])).rows[0].block_code,'REWORK_NO_PROGRESS');

    // Cancellation is an HTTP-authorized command and takes precedence over a
    // dispatched review: the worker can no longer decide it afterwards.
    const cancelled=await makeAcceptance();
    const pending:any=(await pool.query(`SELECT * FROM assurance_reviews WHERE acceptance_id=$1`,[cancelled.acceptance])).rows[0];
    const url=`${base}/api/projects/${project}/assurance/acceptances/${cancelled.acceptance}/cancel`;
    assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reason:'operator requested',evidence:{reference:'incident-1'}})})).status,403);
    const cancelHeaders={'content-type':'application/json','x-actor-role':'ON_CALL_OWNER','x-actor-id':'f6-owner','idempotency-key':`cancel-acceptance-once:${project}`};
    const cancelBody=JSON.stringify({reason:'operator requested',evidence:{reference:'incident-1'}});
    assert.equal((await fetch(url,{method:'POST',headers:cancelHeaders,body:cancelBody})).status,202);
    assert.equal((await fetch(url,{method:'POST',headers:cancelHeaders,body:cancelBody})).status,202);
    assert.equal((await pool.query('SELECT state FROM work_acceptances WHERE id=$1',[cancelled.acceptance])).rows[0].state,'CANCELLED');
    assert.equal(await runOnce(project),false);
    assert.equal(Number((await pool.query('SELECT count(*)::int n FROM review_decisions WHERE review_id=$1',[pending.id])).rows[0].n),0);

    for(const gateType of ['SCOPE_ARCHITECTURE_POLICY','ACCEPTED_RISK']) assert.equal((await fetch(gateUrl,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'REPOSITORY_OWNER','idempotency-key':`gate-${gateType}`},body:JSON.stringify({gate_type:gateType,decision:'REJECTED',reason:'reserved decision remains human',evidence:{reference:`evidence-${gateType}`},scope:{project_id:project},classification:'INTERNAL'})})).status,202);
    const exceptionResponse=await fetch(gateUrl,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'TECH_LEAD','idempotency-key':'runtime-exception-once'},body:JSON.stringify({gate_type:'INDEPENDENCE_EXCEPTION',decision:'APPROVED',reason:'isolated runtime capacity',evidence:{reference:'exception-1'},scope:{acceptance_id:unavailable.acceptance},policy_id:assurancePolicy,policy_version:1,expires_at:new Date(Date.now()+60_000).toISOString(),classification:'INTERNAL'})});
    assert.equal(exceptionResponse.status,202); const exceptionGate:any=await exceptionResponse.json();
    const exceptionReviewResponse=await fetch(`${base}/api/projects/${project}/assurance/acceptances/${unavailable.acceptance}/reviews`,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'ON_CALL_OWNER'},body:JSON.stringify({producer:producer(unavailable.execution),candidate:{...producer(unavailable.execution),agentId:'governance-assurance',runtimeId:runtimeA,configurationVersion:1,executionContextHash:'exception-review-context'},review_package:pkg,independence_gate_id:exceptionGate.id})});
    assert.equal(exceptionReviewResponse.status,202); const exceptionReview:any=await exceptionReviewResponse.json(); assert.equal(exceptionReview.independence_check.exception_used,true);
    assert.equal((await fetch(`${base}/api/projects/${project}/assurance/acceptances/${unavailable.acceptance}/cancel`,{method:'POST',headers:{'content-type':'application/json','x-actor-role':'ON_CALL_OWNER'},body:JSON.stringify({reason:'exception scenario complete',evidence:{reference:'exception-complete'}})})).status,202);

    for(const state of ['RESOLUTION_SELECTED','RESOLVING','RESOLVED']) await transitionBlock(reviewerBlock,state,{reason:'review block resolved',evidence:{hash:'c'.repeat(64)}},`review-block:${state}`);
    assert.deepEqual((await pool.query(`SELECT a.state,j.status AS job_status,o.status AS operation_status FROM work_acceptances a JOIN agent_execution e ON e.id=a.execution_id JOIN jobs j ON j.id=e.job_id JOIN operations o ON o.id=e.operation_id WHERE a.id=$1`,[blocked.acceptance])).rows[0],{state:'PENDING_PRODUCE',job_status:'RETRYABLE',operation_status:'QUEUED'});
  });
}
