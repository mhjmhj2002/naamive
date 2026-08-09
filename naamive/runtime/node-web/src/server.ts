import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ApiError, applyReviewAdjustments, archiveProject, bindRepository, createProject, listProjects, projectDetail, projectTimeline, retryProductDiscovery, saveIntake, startProductDiscovery, submitIntake } from './service.js';
import { checkAgentReadiness, AgentReadinessError, AgentConfigurationError } from './agent.js';
import { pool, withTransaction } from './db.js';
import { putArtifact } from './artifacts.js';
import { randomUUID } from 'node:crypto';
import { transitionTarget } from './workflow.js';
import { log } from './log.js';
import { approveModulePlan, archiveIntegration, authorizeRework, authorizeWorkItem, completeDefinition, createCandidate, decideArchitecture, decideModule, decideReworkGate, materializeModule, mergeWorkItemToPhase, phase3Detail, reconcileDevelopmentWorktree, reconcileIntegrationAttempt, revalidateCandidate, retryIntegration, startDevelopment, startIntegration, startModuleRevision, submitQa, supersedeCandidate, validateCandidate } from './phase3.js';
import { AgentRuntimeAdminError, listRuntimeCatalogue, publishAgentExecutionPolicy, registerRuntime, validateRuntime } from './agent-execution-admin.js';
import { agentExecutionService } from './agent-execution-service.js';
import { decideTechnologyBaseline, submitTechnologyBaseline } from './baseline-gate.js';
import { startTechnologyBaselineRevision } from './baseline-revision.js';
const settings = config(); const staticRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const bootstrapCss = join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css');
const json = async (request: IncomingMessage) => JSON.parse(await new Promise<string>((resolve, reject) => { let body=''; request.on('data', (chunk) => body += chunk); request.on('end', () => resolve(body || '{}')); request.on('error', reject); }));
const respond = (response: ServerResponse, status: number, body: object) => { response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': settings.webOrigin }); response.end(JSON.stringify(body)); };
const decide = async (projectId: string, body: Record<string, unknown>) => withTransaction(async (client) => {
  const gate = await client.query(`SELECT * FROM gates WHERE project_id=$1 AND status='OPEN' FOR UPDATE`, [projectId]); if (!gate.rowCount) throw new ApiError(409, 'GATE_NOT_OPEN'); const row=gate.rows[0];
  if (body.gate_id !== row.id) throw new ApiError(409, 'GATE_VERSION_CONFLICT');
  if (Number(body.version) !== row.version) throw new ApiError(409, 'GATE_VERSION_CONFLICT');
  const approved = body.decision === 'APPROVED', feedback=typeof body.feedback === 'string' ? body.feedback.trim() : '';
  if (!approved && !feedback) throw new ApiError(422, 'GATE_FEEDBACK_REQUIRED');
  if (!approved && body.decision !== 'REJECTED') throw new ApiError(422, 'GATE_DECISION_INVALID');
  const correlation=randomUUID(); const product=row.kind==='PRODUCT_COMMITMENT'; await putArtifact(client, projectId, product?'product-commitment-decision':'gate-decision', JSON.stringify({ schema_version:1,decision: body.decision, feedback, version: row.version, evidence:row.evidence }), undefined, row.id);
  const target = await transitionTarget(client, projectId, product ? (approved?'PRODUCT_COMMITMENT_APPROVED':'PRODUCT_COMMITMENT_ADJUSTMENTS_REQUESTED') : (approved ? 'REGISTER_PROJECT_APPROVED' : 'REGISTER_PROJECT_REJECTED'));
  await client.query(`UPDATE gates SET status=$2,decided_at=now() WHERE id=$1`, [row.id, approved ? 'APPROVED' : 'REJECTED']); await client.query(`UPDATE projects SET state=$2 WHERE id=$1`, [projectId, target]);
  const workflow=(await client.query(`SELECT workflow_code,workflow_version FROM projects WHERE id=$1`,[projectId])).rows[0]; const prepare=product&&approved&&target==='TECHNOLOGY_SELECTION_PREPARING'&&workflow.workflow_code==='PROJECT_DISCOVERY'&&workflow.workflow_version===3;
  if(product&&(!approved||prepare)){const operationId=randomUUID(),jobId=randomUUID(),approvedKind=prepare?'PREPARE_TECHNOLOGY_SELECTION_CONTEXT':'PRODUCT_DISCOVERY';await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version) VALUES($1,$2,$3,'QUEUED',$4,$5,$6,$7,$8)`,[operationId,projectId,approvedKind,prepare?`selection-context:${row.id}:${row.version}`:`rework:${row.id}:${row.version}`,correlation,row.revision_id,prepare?workflow.workflow_code:null,prepare?workflow.workflow_version:null]);await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)`,[jobId,operationId,projectId,row.revision_id,prepare?'PREPARE_TECHNOLOGY_SELECTION_CONTEXT':'DEFINE_PRODUCT_REQUIREMENTS',prepare?`selection-context:${operationId}`:`rework-requirements:${operationId}`]);}
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,$2,$3,$4,$5)`, [projectId, product?(approved?'PRODUCT_COMMITMENT_APPROVED':'PRODUCT_COMMITMENT_ADJUSTMENTS_REQUESTED'):(approved ? 'PROJECT_REGISTERED' : 'GATE_REJECTED'), correlation, { gate_id: row.id,feedback }, config().operatorId]); return { project_id: projectId, state: target };
});
export const createApiServer = () => createServer(async (request, response) => { try {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'access-control-allow-origin': settings.webOrigin, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key' }); return response.end(); }
  const url = new URL(request.url ?? '/', settings.webOrigin); const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(intake|submit|decision|events|start-discovery|retry-discovery|apply-review-adjustments|archive))?$/);
  const phase3Match = url.pathname.match(/^\/api\/projects\/([^/]+)\/modules(?:\/([^/]+)(?:\/(decision|work-items|definition|architecture|plan|revision))?)?$/);
  const workItemMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/work-items\/([^/]+)\/(development|qa|rework|rework-decision|merge|reconcile)$/);
  const candidateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/integration-candidates\/([^/]+)\/(validate|revalidate|supersede|integrate|retry|reconcile|escalate|archive)$/);
  const baselineMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baselines\/([^/]+)\/(submit|decision)$/);
  const baselineRevisionMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/technology-baseline\/revisions\/([^/]+)\/start-revision$/);
  const runtimeValidateMatch = url.pathname.match(/^\/api\/admin\/ai-runtimes\/([^/]+)\/validate$/);
  if (request.method === 'POST' && url.pathname === '/api/projects') return respond(response, 201, await createProject(await json(request)));
  if (request.method === 'GET' && url.pathname === '/api/projects') return respond(response, 200, { items: await listProjects(url.searchParams.get('archived')==='true') });
  if (request.method === 'GET' && url.pathname === '/api/admin/ai-runtimes') return respond(response, 200, { items: await listRuntimeCatalogue() });
  if (request.method === 'POST' && url.pathname === '/api/admin/ai-runtimes') return respond(response, 202, await registerRuntime(await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (request.method === 'POST' && url.pathname === '/api/admin/agent-execution-policies') return respond(response, 202, await publishAgentExecutionPolicy(await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (runtimeValidateMatch && request.method === 'POST') return respond(response, 200, await validateRuntime(runtimeValidateMatch[1]));
  if (request.method === 'POST' && url.pathname === '/api/agent/readiness') {
    try {
      if (agentExecutionService.isEnabled()) {
        const runtime = (await listRuntimeCatalogue()).find((item: any) => item.adapter_type === 'CODEX_CLI');
        if (runtime?.id) return respond(response, 200, await validateRuntime(runtime.id));
      }
      return respond(response, 200, await checkAgentReadiness(true));
    } catch(error) { const code=error instanceof AgentReadinessError||error instanceof AgentConfigurationError?error.code:'CODEX_PROCESS_FAILED'; return respond(response,503,{code,message:'O agente não está pronto. Corrija a configuração e teste novamente.'}); }
  }
  if (match && request.method === 'GET' && url.searchParams.get('phase3') === 'true') return respond(response, 200, await phase3Detail(match[1]));
  if (match && request.method === 'GET' && match[2] === undefined) return respond(response, 200, await projectDetail(match[1]));
  if (baselineMatch && request.method === 'POST' && baselineMatch[3] === 'submit') return respond(response, 202, await submitTechnologyBaseline(baselineMatch[1], baselineMatch[2], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (baselineMatch && request.method === 'POST' && baselineMatch[3] === 'decision') return respond(response, 202, await decideTechnologyBaseline(baselineMatch[1], baselineMatch[2], await json(request), request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (baselineRevisionMatch && request.method === 'POST') return respond(response, 202, await startTechnologyBaselineRevision(baselineRevisionMatch[1], baselineRevisionMatch[2], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (phase3Match && request.method === 'POST' && !phase3Match[2]) return respond(response,202,await materializeModule(phase3Match[1],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'decision') return respond(response,202,await decideModule(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'definition') return respond(response,202,await completeDefinition(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'architecture') return respond(response,202,await decideArchitecture(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'plan') return respond(response,202,await approveModulePlan(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'revision') return respond(response,202,await startModuleRevision(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'work-items') return respond(response,202,await authorizeWorkItem(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'development') return respond(response,202,await startDevelopment(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'qa') return respond(response,202,await submitQa(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'rework') return respond(response,202,await authorizeRework(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'rework-decision') return respond(response,202,await decideReworkGate(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'merge') return respond(response,202,await mergeWorkItemToPhase(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'reconcile') return respond(response,202,await reconcileDevelopmentWorktree(workItemMatch[1],workItemMatch[2],request.headers['idempotency-key']?.toString()??randomUUID()));
  if (request.method === 'POST' && /^\/api\/projects\/[^/]+\/integration-candidates$/.test(url.pathname)) return respond(response,202,await createCandidate(url.pathname.split('/')[3],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'validate') return respond(response,202,await validateCandidate(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'revalidate') return respond(response,202,await revalidateCandidate(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'supersede') return respond(response,202,await supersedeCandidate(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'integrate') return respond(response,202,await startIntegration(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'retry') return respond(response,202,await retryIntegration(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'reconcile') return respond(response,202,await reconcileIntegrationAttempt(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (candidateMatch && request.method === 'POST' && candidateMatch[3] === 'archive') return respond(response,202,await archiveIntegration(candidateMatch[1],candidateMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (match && request.method === 'PUT' && match[2] === undefined) return respond(response, 200, await bindRepository(match[1], await json(request)));
  if (match && request.method === 'PUT' && match[2] === 'intake') return respond(response, 200, await saveIntake(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'submit') return respond(response, 202, await submitIntake(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'start-discovery') return respond(response, 202, await startProductDiscovery(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'retry-discovery') return respond(response, 202, await retryProductDiscovery(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'apply-review-adjustments') return respond(response, 202, await applyReviewAdjustments(match[1],await json(request),request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'archive') return respond(response, 200, await archiveProject(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'decision') return respond(response, 200, await decide(match[1], await json(request)));
  if (match && request.method === 'GET' && match[2] === 'events') { response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'access-control-allow-origin': settings.webOrigin }); const requested=Number(url.searchParams.get('after') ?? request.headers['last-event-id'] ?? 0); let after=Number.isSafeInteger(requested)&&requested>0?requested:0,closed=false,polling=false; const publish=async()=>{if(polling||closed)return;polling=true;try{for(const item of await projectTimeline(match[1],after)){if(closed)return;after=Number(item.id);response.write(`id: ${item.id}\nevent: ${item.event_type}\ndata: ${JSON.stringify(item)}\n\n`);}}finally{polling=false;}}; await publish(); const timer=setInterval(()=>void publish(),750),heartbeat=setInterval(()=>{if(!closed)response.write(': heartbeat\n\n');},15000); request.on('close', ()=>{closed=true;clearInterval(timer);clearInterval(heartbeat);}); return; }
  if (request.method === 'GET' && url.pathname === '/assets/bootstrap.min.css') { response.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'public, max-age=86400' }); return response.end(await readFile(bootstrapCss)); }
  if (request.method === 'GET' && url.pathname === '/') { response.writeHead(200, {'content-type':'text/html'}); return response.end(await readFile(join(staticRoot, 'index.html'))); }
  respond(response, 404, { code: 'NOT_FOUND' });
} catch (error) { const requestId=randomUUID(); const known=error instanceof ApiError ? error : error instanceof AgentRuntimeAdminError ? new ApiError(error.status, error.code, error.message) : new ApiError(500, 'INTERNAL_ERROR');
  log('server',known.status>=500?'error':'warn',known.status>=500?'request_failed':'request_rejected',{request_id:requestId,method:request.method,route:new URL(request.url ?? '/',settings.webOrigin).pathname,status:known.status,code:known.code,error_kind:error instanceof Error?error.constructor.name:'UnknownError',database_code:typeof (error as { code?: unknown })?.code==='string'?(error as { code:string }).code:undefined,database_column:typeof (error as { column?: unknown })?.column==='string'?(error as { column:string }).column:undefined,database_message:typeof (error as { message?: unknown })?.message==='string'?(error as { message:string }).message.replace(/[^A-Za-z0-9_. -]/g,'').slice(0,160):undefined});
  respond(response, known.status, { code: known.code, message: known.message, request_id: requestId }); } });
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const server = createApiServer(); server.listen(settings.port, settings.host, () => log('server','info','server_started',{url:`http://${settings.host}:${settings.port}`,artifact_store:'configured',repository_roots:settings.repositoryRoots.length}));
  process.on('SIGTERM', async () => { log('server','info','server_stopping'); server.close(); await pool.end(); log('server','info','server_stopped'); });
}
