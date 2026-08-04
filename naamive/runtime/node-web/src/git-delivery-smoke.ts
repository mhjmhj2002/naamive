import { execFileSync } from 'node:child_process';

const repository = process.env.NAAMIVE_GIT_SMOKE_REPOSITORY;
const prefix = process.env.NAAMIVE_GIT_SMOKE_PREFIX ?? 'naamive-smoke-';
if (!repository) throw new Error('NAAMIVE_GIT_SMOKE_REPOSITORY is required');
const remote = execFileSync('git',['-C',repository,'remote','get-url','origin'],{encoding:'utf8'}).trim();
if (!remote.includes(prefix)) throw new Error('Git smoke repository is outside the dedicated disposable prefix');
const refs = execFileSync('git',['-C',repository,'ls-remote','--heads','origin'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).length;
console.log(JSON.stringify({ready:true,repository:remote,prefix,remote_heads:refs}));
