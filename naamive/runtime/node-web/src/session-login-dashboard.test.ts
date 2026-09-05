import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('GAT-03-FIX-02 separates the unauthenticated login page from the protected dashboard', async () => {
  const [login, app, server] = await Promise.all([
    readFile(new URL('web/login.html', root), 'utf8'),
    readFile(new URL('web/index.html', root), 'utf8'),
    readFile(new URL('src/server.ts', root), 'utf8')
  ]);

  assert.match(login, /<h1[^>]*>NAAMIVE<\/h1>/);
  assert.match(login, /name="username"/);
  assert.match(login, /name="password"/);
  assert.match(login, /\/api\/auth\/login/);
  assert.doesNotMatch(login, /id="projects"|id="intake"|id="detail"|EventSource|allowed_actions/);

  assert.doesNotMatch(app, /id="login"|name="password"|name="username"/);
  assert.match(app, /id="currentUser"/);
  assert.match(app, /id="logout"/);
  assert.match(app, /data-dashboard-region="projects"/);
  assert.match(app, /data-dashboard-region="create-draft"/);
  assert.match(app, /data-dashboard-region="project-detail"/);
  assert.match(app, /class="col-lg-4" data-dashboard-region="projects"/);
  assert.match(app, /class="col-lg-8" data-dashboard-region="create-draft"/);
  assert.match(app, /class="col-12" data-dashboard-region="project-detail"/);
  assert.match(app, /await request\('\/api\/auth\/session'\)/);
  assert.ok(app.indexOf('await restoreSession()') < app.lastIndexOf('await loadProjects()'), 'projects load only after session restoration');
  assert.match(app, /window\.location\.replace\('\/login'\)/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|csrf_token.*(?:location|search|URL)/i);

  assert.match(server, /url\.pathname === '\/' \|\| url\.pathname === '\/login'/);
  assert.match(server, /location: '\/login'/);
  assert.match(server, /location: '\/'/);
});
