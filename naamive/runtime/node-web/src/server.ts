import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { ApiError, bindRepository, createProject, listProjects, projectDetail, projectTimeline, saveIntake, submitIntake } from './service.js';
import { pool, withTransaction } from './db.js';
import { putArtifact } from './artifacts.js';
import { randomUUID } from 'node:crypto';
import { transitionTarget } from './workflow.js';
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
  const correlation=randomUUID(); await putArtifact(client, projectId, 'gate-decision', JSON.stringify({ decision: body.decision, feedback, version: row.version }), undefined, row.id);
  const target = await transitionTarget(client, projectId, approved ? 'REGISTER_PROJECT_APPROVED' : 'REGISTER_PROJECT_REJECTED');
  await client.query(`UPDATE gates SET status=$2,decided_at=now() WHERE id=$1`, [row.id, approved ? 'APPROVED' : 'REJECTED']); await client.query(`UPDATE projects SET state=$2 WHERE id=$1`, [projectId, target]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,$2,$3,$4,$5)`, [projectId, approved ? 'PROJECT_REGISTERED' : 'GATE_REJECTED', correlation, { gate_id: row.id }, config().operatorId]); return { project_id: projectId, state: approved ? 'REGISTERED' : 'DRAFT' };
});
export const createApiServer = () => createServer(async (request, response) => { try {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'access-control-allow-origin': settings.webOrigin, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': 'content-type,idempotency-key' }); return response.end(); }
  const url = new URL(request.url ?? '/', settings.webOrigin); const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(intake|submit|decision|events))?$/);
  if (request.method === 'POST' && url.pathname === '/api/projects') return respond(response, 201, await createProject(await json(request)));
  if (request.method === 'GET' && url.pathname === '/api/projects') return respond(response, 200, { items: await listProjects() });
  if (match && request.method === 'GET' && match[2] === undefined) return respond(response, 200, await projectDetail(match[1]));
  if (match && request.method === 'PUT' && match[2] === undefined) return respond(response, 200, await bindRepository(match[1], await json(request)));
  if (match && request.method === 'PUT' && match[2] === 'intake') return respond(response, 200, await saveIntake(match[1], await json(request)));
  if (match && request.method === 'POST' && match[2] === 'submit') return respond(response, 202, await submitIntake(match[1], request.headers['idempotency-key']?.toString() ?? randomUUID()));
  if (match && request.method === 'POST' && match[2] === 'decision') return respond(response, 200, await decide(match[1], await json(request)));
  if (match && request.method === 'GET' && match[2] === 'events') { response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': settings.webOrigin }); let after=Number(url.searchParams.get('after') ?? 0); const timer=setInterval(async()=> { for (const item of await projectTimeline(match[1], after)) { after=Number(item.id); response.write(`id: ${item.id}\nevent: ${item.event_type}\ndata: ${JSON.stringify(item)}\n\n`); } }, 750); request.on('close', ()=>clearInterval(timer)); return; }
  if (request.method === 'GET' && url.pathname === '/assets/bootstrap.min.css') { response.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'public, max-age=86400' }); return response.end(await readFile(bootstrapCss)); }
  if (request.method === 'GET' && url.pathname === '/') { response.writeHead(200, {'content-type':'text/html'}); return response.end(await readFile(join(staticRoot, 'index.html'))); }
  respond(response, 404, { code: 'NOT_FOUND' });
} catch (error) { const known=error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR'); respond(response, known.status, { code: known.code, message: known.message }); } });
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const server = createApiServer(); server.listen(settings.port, settings.host);
  process.on('SIGTERM', async () => { server.close(); await pool.end(); });
}
