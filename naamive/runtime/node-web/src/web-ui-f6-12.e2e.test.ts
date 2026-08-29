import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const eventually = async (check: () => Promise<boolean>, what: string) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await check()) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${what}`);
};

type DevTools = { call(method: string, params?: Record<string, unknown>): Promise<any>; close(): void };
const connect = async (port: number): Promise<DevTools> => {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as any[];
  const target = targets.find((candidate) => candidate.type === 'page');
  assert.ok(target);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener('open', () => resolve(), { once: true });
    socket.addEventListener('error', () => reject(new Error('Chrome DevTools connection failed')), { once: true });
  });
  let sequence = 0;
  const replies = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    const reply = replies.get(message.id);
    if (!reply) return;
    replies.delete(message.id);
    if (message.error) reply.reject(new Error(message.error.message));
    else reply.resolve(message.result);
  });
  return {
    call: (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      replies.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }),
    close: () => socket.close(),
  };
};

test('F6 canonical UI operates a server-published governed action and refreshes after SSE reconnection without polling', async (t) => {
  const project = randomUUID(), acceptance = randomUUID();
  const commands: Array<{ path: string; body: any }> = [];
  let projectionRequests = 0, eventConnections = 0, reconnectProjectionRequests = -1, cancelled = false;
  const html = await readFile(new URL('../web/index.html', import.meta.url));
  const refreshHelper = await readFile(new URL('../web/projection-refresh.js', import.meta.url));
  const projection = () => ({
    schema_version: 'STATE_ACTION_PROJECTION:v1', project_id: project, as_of_event_id: projectionRequests,
    project: { lifecycle_state: cancelled ? 'CANCELLED' : 'IMPLEMENTATION', canonical_state: cancelled ? 'CANCELLED' : 'IMPLEMENTATION', workflow_code: 'PROJECT_DISCOVERY', workflow_version: 4, legacy: false, journey_status: cancelled ? 'CANCELLED' : 'IMPLEMENTATION', focus_resource_kind: 'ACCEPTANCE', focus_resource_id: acceptance },
    resources: { modules: [], work_items: [], gates: [], delivery: null, recovery: [], assurance: [{ acceptance_id: acceptance, state: cancelled ? 'CANCELLED' : 'PENDING_REVIEW', classification: 'TECHNICAL', version: 1, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', subject: null }], technology_baseline: null },
    activity: { state: 'IDLE', running_count: 0, queued_count: 0, retryable_count: 0, reconciliation_count: 0, items: [] },
    stop: { paused: null, cancelled: null, archived: false, reconciliation_required: false },
    cause: { code: null, resource_kind: null, resource_id: null }, next_action: cancelled ? null : { text: 'Cancelamento governado disponível.', descriptor_code: 'CANCEL_ACCEPTANCE' },
    allowed_actions: cancelled ? [] : [{
      code: 'CANCEL_ACCEPTANCE', target: { resource_kind: 'ACCEPTANCE', resource_id: acceptance },
      command: { method: 'POST', href: `/api/projects/${project}/assurance/acceptances/${acceptance}/cancel`, idempotency_required: true },
      expected: { resource_version: 1, as_of_event_id: projectionRequests }, confirmation: { required: false },
      input: { schema: { type: 'object', properties: { reason: { type: 'object', description: 'Cancellation reason.' } }, required: ['reason'] }, required_fields: ['reason'] }
    }]
  });
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://local');
    if (url.pathname === '/') { response.writeHead(200, { 'content-type': 'text/html' }); response.end(html); return; }
    if (url.pathname === '/projection-refresh.js') { response.writeHead(200, { 'content-type': 'text/javascript' }); response.end(refreshHelper); return; }
    if (url.pathname === '/api/projects') { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ items: [{ id: project, title: 'Governed assurance fixture', state: 'IMPLEMENTATION' }] })); return; }
    if (url.pathname === `/api/projects/${project}/projection`) { projectionRequests += 1; response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(projection())); return; }
    if (url.pathname === `/api/projects/${project}/events`) {
      eventConnections += 1;
      if (eventConnections === 2) reconnectProjectionRequests = projectionRequests;
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      if (eventConnections === 1) {
        response.write('id: 1\nevent: assurance\ndata: {"id":1}\n\n');
        setTimeout(() => response.end(), 40);
      } else setTimeout(() => { response.write('id: 2\ndata: {"id":2,"event_type":"ASSURANCE_UPDATED"}\n\n'); }, 40);
      return;
    }
    if (request.method === 'POST') {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        commands.push({ path: url.pathname, body: JSON.parse(body) });
        cancelled = true;
        response.writeHead(202, { 'content-type': 'application/json' });
        response.end('{}');
      });
      return;
    }
    response.writeHead(404); response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const profile = await mkdtemp(join(tmpdir(), 'naamive-f6-ui-'));
  const chrome = spawn('google-chrome', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let devtools: DevTools | undefined;
  t.after(async () => { devtools?.close(); chrome.kill(); server.close(); await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });
  let debugPort = 0;
  await eventually(async () => {
    try { debugPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); return Number.isInteger(debugPort) && debugPort > 0; }
    catch { return false; }
  }, 'Chrome DevTools port');
  devtools = await connect(debugPort);
  const evalJs = async (expression: string) => {
    const result = await devtools!.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  await devtools.call('Page.navigate', { url: `http://127.0.0.1:${address.port}/` });
  await eventually(async () => await evalJs(`document.querySelector('[data-project-id="${project}"]') !== null`), 'canonical project list');
  await evalJs(`document.querySelector('[data-project-id="${project}"]').click()`);
  await eventually(async () => await evalJs(`[...document.querySelectorAll('#actions h3')].some(node=>node.textContent==='CANCEL_ACCEPTANCE')`), 'server-published governed action');
  await eventually(async () => eventConnections >= 2, 'SSE reconnect after a disconnected named frame');
  await eventually(async () => projectionRequests > reconnectProjectionRequests, 'canonical refresh after SSE reconnection');
  await eventually(async () => await evalJs(`document.querySelector('#notice').textContent.includes('será restabelecida automaticamente')`), 'SSE degraded state');
  await evalJs(`const form=[...document.querySelectorAll('#actions form')].find(form=>form.querySelector('h3')?.textContent==='CANCEL_ACCEPTANCE');form.querySelector('textarea[name="reason"]').value='{"reason":"incident","evidence_ref":"evidence-ref"}';form.querySelector('button[type="submit"]').click()`);
  await eventually(async () => commands.length === 1, 'descriptor command request');
  assert.equal(commands[0].path, `/api/projects/${project}/assurance/acceptances/${acceptance}/cancel`);
  assert.deepEqual(commands[0].body, { reason: { reason: 'incident', evidence_ref: 'evidence-ref' } });
  await eventually(async () => await evalJs(`document.querySelector('#actions').textContent.includes('Não há ações humanas permitidas')`), 'post-command canonical refresh');
  assert.ok(eventConnections >= 2, 'reconnection is EventSource-driven');
  assert.equal(await evalJs(`performance.getEntriesByType('resource').some(entry=>new URL(entry.name).pathname.endsWith('/assurance'))`), false, 'the browser does not poll the legacy assurance projection endpoint');
  assert.equal(await evalJs(`document.querySelector('#detail').textContent.match(/prompt|stdout|stderr|api[_-]?key|password/i) === null`), true, 'sensitive raw fields are not rendered in the canonical detail');
});
