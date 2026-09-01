import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-f5-17-ui-artifacts';
process.env.NAAMIVE_OPERATOR_ID ??= 'f5-17-ui-tester';

type DevTools = { call(method: string, params?: Record<string, unknown>): Promise<any>; close(): void };
const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));
const eventually = async (check: () => Promise<boolean>, description: string) => { for (let attempt = 0; attempt < 80; attempt++) { if (await check()) return; await sleep(100); } throw new Error(`Timed out: ${description}`); };

const connectDevTools = async (port: number): Promise<DevTools> => {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const target = targets.find(item => item.type === 'page'); assert.ok(target, 'Chrome page target is available');
  const socket = net.createConnection(port, '127.0.0.1'); let buffer = Buffer.alloc(0), opened = false, sequence = 0;
  const replies = new Map<number, { resolve(value: any): void; reject(reason: unknown): void }>();
  const send = (payload: string) => { const body = Buffer.from(payload), mask = randomBytes(4), length = body.length; const header = length < 126 ? Buffer.from([0x81, 0x80 | length]) : Buffer.from([0x81, 0xfe, length >> 8, length & 255]); const masked = Buffer.from(body); for (let index = 0; index < masked.length; index++) masked[index] ^= mask[index % 4]; socket.write(Buffer.concat([header, mask, masked])); };
  const read = () => { if (!opened) { const boundary = buffer.indexOf('\r\n\r\n'); if (boundary < 0) return; if (!buffer.subarray(0, boundary).toString().includes('101')) throw new Error('Chrome DevTools WebSocket upgrade failed'); buffer = buffer.subarray(boundary + 4); opened = true; } while (buffer.length >= 2) { const lengthCode = buffer[1] & 127; let offset = 2, length = lengthCode; if (lengthCode === 126) { if (buffer.length < 4) return; length = buffer.readUInt16BE(2); offset = 4; } if (lengthCode === 127) throw new Error('Unexpected large DevTools frame'); if (buffer.length < offset + length) return; const frame = buffer.subarray(offset, offset + length); buffer = buffer.subarray(offset + length); if ((buffer[0] & 0x08) !== 0) continue; const message = JSON.parse(frame.toString()); const pending = replies.get(message.id); if (pending) { replies.delete(message.id); message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result); } } };
  socket.on('data', chunk => { buffer = Buffer.concat([buffer, chunk]); read(); });
  await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.once('connect', () => { socket.write(`GET ${new URL(target.webSocketDebuggerUrl).pathname} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`); const timer = setInterval(() => { if (opened) { clearInterval(timer); resolve(); } }, 10); }); });
  return { call: (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; replies.set(id, { resolve, reject }); send(JSON.stringify({ id, method, params })); }), close: () => socket.destroy() };
};

if (process.env.DATABASE_URL.includes('unused')) test('F5-17 UI E2E requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool, withTransaction } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const { loadCatalogSeedPackage, catalogPackageHash, publishTechnologyCatalog } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const { createTechnologyBaselineDraft } = await import('./baseline-draft.js');
  const { submitTechnologyBaseline } = await import('./baseline-gate.js');
  const { testAuthenticatedHeaders } = await import('./test-auth.js');

  test('F5-17 renders the v3 baseline gate, approves it through the UI, and leaves v2 unblocked', async t => {
    const seed: any = structuredClone(await loadCatalogSeedPackage()), revisionNumber = Date.now() * 100 + Math.floor(Math.random() * 99);
    for (const key of ['categories', 'catalogItems', 'profiles', 'profileItems', 'compatibilityRules', 'catalogRevision']) seed[key].catalog_revision = revisionNumber;
    seed.catalogRevision.records[0].catalog_revision = revisionNumber; seed.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(seed));
    const catalog: any = await publishTechnologyCatalog(seed, 'f5-17-ui-tester', randomUUID()), project = randomUUID(), legacy = randomUUID(), context = randomUUID(), intake = randomUUID(), operation = randomUUID(), job = randomUUID();
    const profile = (await pool.query(`SELECT profile_id FROM technology_catalog_revision_profiles WHERE revision_id=$1 AND is_active LIMIT 1`, [catalog.revisionId])).rows[0].profile_id;
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'F5-17 v3','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',3,'TECHNOLOGY_BASELINE_IN_REVIEW','{}'),($2,'F5-17 legado','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT','{}')`, [project, legacy]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/f5-17-intake','tester')`, [intake, project, 'a'.repeat(64), 'b'.repeat(64)]);
    await pool.query(`INSERT INTO technology_selection_contexts(id,project_id,project_key,technology_catalog_revision_id,technology_profile_id,hash,status) VALUES($1,$2::uuid,$2,$3,$4,$5,'READY')`, [context, project, catalog.revisionId, profile, 'c'.repeat(64)]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'TECHNOLOGY_INVENTORY','SUCCEEDED',$3,$4,$5)`, [operation, project, `f5-17-inventory:${project}`, randomUUID(), intake]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key,completed_at) VALUES($1,$2,$3,$4,'START_TECHNOLOGY_INVENTORY','COMPLETED',$5,clock_timestamp())`, [job, operation, project, intake, `f5-17-job:${project}`]);
    await pool.query(`INSERT INTO technology_inventory(id,project_id,project_key,repository_sha,job_id,technology_catalog_revision_id,source_path,detector_code,confidence,value,resolution_result) VALUES($1,$2::uuid,$2,'000',$3,$4,'package.json','TEST',0.8,'TEST','UNKNOWN_CATALOG_ITEM')`, [randomUUID(), project, job, catalog.revisionId]);
    const draft: any = await withTransaction(client => createTechnologyBaselineDraft(client, project)); await submitTechnologyBaseline(project, draft.revisionId, `f5-17-submit:${project}`);
    const session=await testAuthenticatedHeaders(project,[{role_code:'OPERATOR',action_code:'LIST_PROJECTS',project_id:null},{role_code:'OPERATOR',action_code:'READ_PROJECT'},{role_code:'OPERATOR',action_code:'OPERATE_PROJECT'},{role_code:'OPERATOR',action_code:'READ_PROJECT',project_id:legacy},{role_code:'OPERATOR',action_code:'OPERATE_PROJECT',project_id:legacy}]);
    const configuredOrigin=new URL(process.env.NAAMIVE_WEB_ORIGIN??'http://127.0.0.1:3000'),server = createApiServer(); await new Promise<void>(resolve => server.listen(Number(configuredOrigin.port||80), configuredOrigin.hostname, resolve)); const address = server.address() as import('node:net').AddressInfo, profileDirectory = await mkdtemp(join(tmpdir(), 'naamive-f5-17-chrome-'));
    const chrome = spawn('google-chrome', [`--headless=new`, `--remote-debugging-port=9227`, `--user-data-dir=${profileDirectory}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
    let devtools: DevTools | undefined;
    t.after(async () => { devtools?.close(); chrome.kill(); await new Promise(resolve => chrome.once('exit', resolve)); server.close(); await rm(profileDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); await session.cleanup(); await pool.end(); });
    await eventually(async () => (await fetch('http://127.0.0.1:9227/json/version').catch(() => null)) !== null, 'Chrome DevTools'); devtools = await connectDevTools(9227);
    const [cookieName,cookieValue]=session.headers.cookie.split('=',2);await devtools.call('Network.setCookie',{name:cookieName,value:cookieValue,url:`http://127.0.0.1:${address.port}/`,path:'/'});await devtools.call('Network.setExtraHTTPHeaders',{headers:{Origin:session.headers.origin,'x-csrf-token':session.headers['x-csrf-token']}});
    await devtools.call('Page.navigate', { url: `http://127.0.0.1:${address.port}/` }); await sleep(300);
    const evaluate = async (expression: string) => (await devtools!.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    await evaluate(`window.fetch=((original)=>async(input,init={})=>original(input,{...init,headers:{...Object.fromEntries(new Headers(init.headers||{})),'x-csrf-token':${JSON.stringify(session.headers['x-csrf-token'])}}}))(window.fetch);window.confirm=()=>true`);
    await eventually(async () => await evaluate(`document.querySelector('[data-project-id="${project}"]') !== null`), 'v3 project list');
    await evaluate(`document.querySelector('[data-project-id="${project}"]').click()`);
    await eventually(async () => await evaluate(`[...document.querySelectorAll('#actions h3')].some(node=>node.textContent==='DECIDE_TECHNOLOGY_BASELINE')`), 'canonical v3 baseline decision');
    assert.equal(await evaluate(`document.querySelector('#gatesAndStops')?.textContent.includes('Technology Baseline · PENDING_APPROVAL')`), true, 'safe baseline summary is rendered from the canonical projection');
    assert.equal(await evaluate(`document.querySelector('#gatesAndStops')?.textContent.includes('Revisão 1 · gate OPEN · versão 1')`), true);
    assert.equal(await evaluate(`performance.getEntriesByType('navigation').length`), 1);
    await evaluate(`const form=[...document.querySelectorAll('#actions form')].find(form=>form.querySelector('h3')?.textContent==='DECIDE_TECHNOLOGY_BASELINE');form.querySelector('select[name="decision"]').value='APPROVED';form.querySelector('button[type="submit"]').click()`);
    await eventually(async () => await evaluate(`![...document.querySelectorAll('#actions h3')].some(node=>node.textContent==='DECIDE_TECHNOLOGY_BASELINE')`), 'baseline decision removed after canonical refresh');
    await eventually(async () => await evaluate(`[...document.querySelectorAll('#actions h3')].some(node=>node.textContent==='MATERIALIZE_MODULE')`), 'materialization enabled after baseline approval');
    assert.equal(await evaluate(`document.querySelector('#gatesAndStops')?.textContent.includes('Technology Baseline · APPROVED')`), true);
    assert.equal(await evaluate(`performance.getEntriesByType('navigation').length`), 1);
    await evaluate(`document.querySelector('[data-project-id="${legacy}"]').click()`);
    await eventually(async () => await evaluate(`[...document.querySelectorAll('#actions h3')].some(node=>node.textContent==='MATERIALIZE_MODULE')`), 'legacy v2 materialization');
    assert.equal(await evaluate(`[...document.querySelectorAll('#actions h3')].some(node=>node.textContent==='DECIDE_TECHNOLOGY_BASELINE')`), false);
  });
}
