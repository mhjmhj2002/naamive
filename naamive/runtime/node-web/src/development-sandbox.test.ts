import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.development-sandbox-artifacts`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
process.env.NAAMIVE_OPERATOR_ID ??= 'development-sandbox-tester';
const { developmentSandboxArgs, applyDeepseekDevelopmentFiles } = await import('./agent.js');

const command = (file:string, args:string[], cwd:string) => new Promise<string>((resolve,reject) =>
  execFile(file,args,{cwd,encoding:'utf8'},(error,stdout) => error ? reject(error) : resolve(String(stdout)))
);

test('development sandbox permits allowlisted writes and an auditable Git commit only', async () => {
  const workspace=await mkdtemp(join(tmpdir(),'naamive-sandbox-'));
  try {
    await command('git',['init'],workspace);
    await command('git',['config','user.name','sandbox-test'],workspace);
    await command('git',['config','user.email','sandbox-test@localhost'],workspace);
    await mkdir(join(workspace,'src'),{recursive:true});
    await writeFile(join(workspace,'src','allowed.ts'),'existing');
    const args=await developmentSandboxArgs(workspace,['src/allowed.ts'],'/bin/sh',['-ec',[
      "printf 'changed' > src/allowed.ts",
      'if mkdir forbidden; then exit 20; fi',
      "if printf 'blocked' > forbidden/file; then exit 21; fi",
      "git add src/allowed.ts && git commit -m 'sandbox delivery' -m 'Naamive-Work-Item: sandbox-test'"
    ].join('; ')]);
    await command('bwrap',args,workspace);
    assert.equal(await readFile(join(workspace,'src','allowed.ts'),'utf8'),'changed');
    await assert.rejects(readFile(join(workspace,'forbidden','file')));
    assert.match(await command('git',['log','-1','--format=%B'],workspace),/Naamive-Work-Item: sandbox-test/);
  } finally { await rm(workspace,{recursive:true,force:true}); }
});

test('DeepSeek development output can replace only explicitly allowlisted files', async () => {
  const workspace=await mkdtemp(join(tmpdir(),'naamive-deepseek-patch-'));
  try {
    await mkdir(join(workspace,'src'),{recursive:true});
    await writeFile(join(workspace,'src','allowed.ts'),'before');
    await applyDeepseekDevelopmentFiles(workspace,['src/allowed.ts'],{files:[{path:'src/allowed.ts',content:'after'}]});
    assert.equal(await readFile(join(workspace,'src','allowed.ts'),'utf8'),'after');
    await assert.rejects(applyDeepseekDevelopmentFiles(workspace,['src/allowed.ts'],{files:[{path:'outside.ts',content:'blocked'}]}),/DEEPSEEK_INVALID_PATCH/);
    await assert.rejects(readFile(join(workspace,'outside.ts')));
  } finally { await rm(workspace,{recursive:true,force:true}); }
});
