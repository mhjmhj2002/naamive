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
import { authorizeRework, authorizeWorkItem, createCandidate, decideModule, materializeModule, phase3Detail, startDevelopment, submitQa } from './phase3.js';
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
  if(product&&!approved){const operationId=randomUUID(),jobId=randomUUID();await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'PRODUCT_DISCOVERY','QUEUED',$3,$4,$5)`,[operationId,projectId,`rework:${row.id}:${row.version}`,correlation,row.revision_id]);await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'DEFINE_PRODUCT_REQUIREMENTS',$5)`,[jobId,operationId,projectId,row.revision_id,`rework-requirements:${operationId}`]);}
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,$2,$3,$4,$5)`, [projectId, product?(approved?'PRODUCT_COMMITMENT_APPROVED':'PRODUCT_COMMITMENT_ADJUSTMENTS_REQUESTED'):(approved ? 'PROJECT_REGISTERED' : 'GATE_REJECTED'), correlation, { gate_id: row.id,feedback }, config().operatorId]); return { project_id: projectId, state: target };
});
export const createApiServer = () => createServer(async (request, response) => { try {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'access-control-allow-origin': settings.webOrigin, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key' }); return response.end(); }
  const url = new URL(request.url ?? '/', settings.webOrigin); const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(intake|submit|decision|events|start-discovery|retry-discovery|apply-review-adjustments|archive))?$/);
  const phase3Match = url.pathname.match(/^\/api\/projects\/([^/]+)\/modules(?:\/([^/]+)(?:\/(decision|work-items))?)?$/);
  const workItemMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/work-items\/([^/]+)\/(development|qa|rework)$/);
  if (request.method === 'POST' && url.pathname === '/api/projects') return respond(response, 201, await createProject(await json(request)));
  if (request.method === 'GET' && url.pathname === '/api/projects') return respond(response, 200, { items: await listProjects(url.searchParams.get('archived')==='true') });
  if (request.method === 'POST' && url.pathname === '/api/agent/readiness') { try { return respond(response,200,await checkAgentReadiness(true)); } catch(error) { const code=error instanceof AgentReadinessError||error instanceof AgentConfigurationError?error.code:'CODEX_PROCESS_FAILED'; return respond(response,503,{code,message:'O agente não está pronto. Corrija a configuração e teste novamente.'}); } }
  if (match && request.method === 'GET' && url.searchParams.get('phase3') === 'true') return respond(response, 200, await phase3Detail(match[1]));
  if (match && request.method === 'GET' && match[2] === undefined) return respond(response, 200, await projectDetail(match[1]));
  if (phase3Match && request.method === 'POST' && !phase3Match[2]) return respond(response,202,await materializeModule(phase3Match[1],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'decision') return respond(response,202,await decideModule(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (phase3Match && request.method === 'POST' && phase3Match[3] === 'work-items') return respond(response,202,await authorizeWorkItem(phase3Match[1],phase3Match[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'development') return respond(response,202,await startDevelopment(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'qa') return respond(response,202,await submitQa(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (workItemMatch && request.method === 'POST' && workItemMatch[3] === 'rework') return respond(response,202,await authorizeRework(workItemMatch[1],workItemMatch[2],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (request.method === 'POST' && /^\/api\/projects\/[^/]+\/integration-candidates$/.test(url.pathname)) return respond(response,202,await createCandidate(url.pathname.split('/')[3],await json(request),request.headers['idempotency-key']?.toString()??randomUUID()));
  if (match && request.method === 'PUT' && match[2] === undefined) return respond(response, 200, await bindRepository(match[1], await json(request)));
  if (match && request.method === 'PUT' && match[2] === 'intake') return respond(response, 200, await saveIntake(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'submit') return respond(response, 202, await submitIntake(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'start-discovery') return respond(response, 202, await startProductDiscovery(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'retry-discovery') return respond(response, 202, await retryProductDiscovery(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'apply-review-adjustments') return respond(response, 202, await applyReviewAdjustments(match[1],await json(request),request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'archive') return respond(response, 200, await archiveProject(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'decision') return respond(response, 200, await decide(match[1], await json(request)));
  if (match && request.method === 'GET' && match[2] === 'events') { response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': settings.webOrigin }); let after=Number(url.searchParams.get('after') ?? 0); const timer=setInterval(async()=> { for (const item of await projectTimeline(match[1], after)) { after=Number(item.id); response.write(`id: ${item.id}\nevent: ${item.event_type}\ndata: ${JSON.stringify(item)}\n\n`); } }, 750); request.on('close', ()=>clearInterval(timer)); return; }
  if (request.method === 'GET' && url.pathname === '/assets/bootstrap.min.css') { response.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'public, max-age=86400' }); return response.end(await readFile(bootstrapCss)); }
  if (request.method === 'GET' && url.pathname === '/') { response.writeHead(200, {'content-type':'text/html'}); return response.end(await readFile(join(staticRoot, 'index.html'))); }
  respond(response, 404, { code: 'NOT_FOUND' });
} catch (error) { const requestId=randomUUID(); const known=error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR');
  log('server',known.status>=500?'error':'warn',known.status>=500?'request_failed':'request_rejected',{request_id:requestId,method:request.method,route:new URL(request.url ?? '/',settings.webOrigin).pathname,status:known.status,code:known.code,error_kind:error instanceof Error?error.constructor.name:'UnknownError',database_code:typeof (error as { code?: unknown })?.code==='string'?(error as { code:string }).code:undefined});
  respond(response, known.status, { code: known.code, message: known.message, request_id: requestId }); } });
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const server = createApiServer(); server.listen(settings.port, settings.host, () => log('server','info','server_started',{url:`http://${settings.host}:${settings.port}`,artifact_store:'configured',repository_roots:settings.repositoryRoots.length}));
  process.on('SIGTERM', async () => { log('server','info','server_stopping'); server.close(); await pool.end(); log('server','info','server_stopped'); });
}
