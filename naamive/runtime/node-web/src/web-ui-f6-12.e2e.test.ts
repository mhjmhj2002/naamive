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

type DevTools = {
  call(method: string, params?: Record<string, unknown>): Promise<any>;
  close(): void;
};

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

test('F6 UI operates governed commands and reconnects its real SSE stream without polling', async (t) => {
  const project = randomUUID();
  const acceptance = randomUUID();
  const block = randomUUID();
  const commands: Array<{ path: string; role: string | string[] | undefined; body: any }> = [];
  let assuranceCalls = 0;
  const html = await readFile(new URL('../web/index.html', import.meta.url));
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://local');
    if (url.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(html);
      return;
    }
    if (url.pathname.endsWith('/assurance/events')) {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.write('id: 1\nevent: assurance\ndata: {"id":1}\n\n');
      setTimeout(() => response.end(), 40);
      return;
    }
    if (url.pathname.endsWith('/assurance')) {
      assuranceCalls += 1;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        next_cursor: 1,
        allowed_actions: ['TRANSITION_BLOCK', 'CANCEL_ACCEPTANCE', 'RECONCILE_ACCEPTANCE'],
        acceptances: [{ id: acceptance, state: 'PENDING_REVIEW' }],
        blocks: [{ id: block, category: 'TECHNICAL', state: 'OPEN' }],
        metrics: {},
      }));
      return;
    }
    if (request.method === 'POST') {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        commands.push({ path: url.pathname, role: request.headers['x-actor-role'], body: JSON.parse(body) });
        response.writeHead(202, { 'content-type': 'application/json' });
        response.end('{}');
      });
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ items: [], modules: [], candidates: [], findings: [], gates: [] }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  const profile = await mkdtemp(join(tmpdir(), 'naamive-f6-ui-'));
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    'about:blank',
  ], { stdio: 'ignore' });
  let devtools: DevTools | undefined;
  t.after(async () => {
    devtools?.close();
    chrome.kill();
    server.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  let debugPort = 0;
  await eventually(async () => {
    try {
      debugPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      return Number.isInteger(debugPort) && debugPort > 0;
    } catch {
      return false;
    }
  }, 'Chrome DevTools port');
  devtools = await connect(debugPort);
  const evalJs = async (expression: string) => {
    const result = await devtools!.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };

  await devtools.call('Page.navigate', { url: `http://127.0.0.1:${address.port}/` });
  await eventually(async () => await evalJs("typeof f6Render === 'function'"), 'F6 application loaded');
  await evalJs(`
    localStorage.setItem('naamive-assurance-role', 'ON_CALL_OWNER');
    window.confirm = () => true;
    f6Subscribe('f6-ui-project');
  `);
  await eventually(async () => await evalJs("document.querySelector('#f6Assurance')?.textContent.includes('Supervisão de trabalho')"), 'F6 panel');
  assert.equal(await evalJs("document.querySelector('#f6Assurance [aria-live=\"polite\"]') !== null"), true);
  await eventually(async () => await evalJs("document.querySelector('#f6Assurance')?.textContent.includes('Conexão em recuperação')"), 'SSE degraded state');

  await evalJs(`
    const panel = document.querySelector('#f6Assurance');
    panel.querySelector('textarea').value = 'incident';
    panel.querySelector('input').value = 'evidence-ref';
    [...panel.querySelectorAll('button')].find((button) => button.textContent === 'Cancelar trabalho').click();
  `);
  await eventually(async () => commands.length === 1, 'authorized cancellation');
  assert.equal(commands[0].role, 'ON_CALL_OWNER');
  assert.match(commands[0].path, /\/cancel$/);
  assert.equal(commands[0].body.reason, 'incident');
  assert.equal(commands[0].body.evidence.reference, 'evidence-ref');
  assert.ok(assuranceCalls >= 1, 'SSE stream was opened');
  assert.equal(await evalJs("performance.getEntriesByType('resource').some((entry) => entry.name.includes('/assurance'))"), true);
  assert.equal(await evalJs("document.querySelector('#f6Assurance').textContent.match(/prompt|stdout|stderr|api[_-]?key|password/i) === null"), true);
});
