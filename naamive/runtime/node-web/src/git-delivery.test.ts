import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertAuditableCommits, assertIncrementalPaths, botCommit, commitMessage, createWorktree, initializePhaseRefs, mergeAndPush, mergeAndPushDetached, reconcileIntegration, reconcileWorktree, removeWorktree, GitDeliveryError } from './git-delivery.js';
const run=(cwd:string,args:string[])=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();
test('integrates a phase with merge commit and bot trailers into a local bare remote',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-git-')),bare=join(root,'remote.git'),repo=join(root,'repo'); try {
  execFileSync('git',['init','--bare',bare]); execFileSync('git',['clone',bare,repo]); run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'a.txt'),'a');run(repo,['add','.']);run(repo,['commit','-m','initial']);run(repo,['branch','-M','integration']);run(repo,['push','origin','integration']);run(repo,['checkout','-b','phases/3']);writeFileSync(join(repo,'feature.txt'),'x');const phase=botCommit(repo,['feature.txt'],commitMessage('feat','wi-1','add feature',{project:'p1',phase:'3',execution:'e1'}));run(repo,['push','origin','phases/3']);run(repo,['checkout','integration']);const before=run(repo,['rev-parse','HEAD']);const result=mergeAndPush(repo,'phases/3','integration',phase,before);assert.equal(run(repo,['show','-s','--format=%P',result.mergeSha]).split(' ')[1],phase);assert.equal(reconcileIntegration(repo,'integration',before,phase),'APPLIED_UNRECORDED');
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('integrates from a detached worktree without moving the primary checkout',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-detached-integration-')),bare=join(root,'remote.git'),repo=join(root,'repo');try {
  execFileSync('git',['init','--bare',bare]);execFileSync('git',['clone',bare,repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'base.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);initializePhaseRefs(repo,base);run(repo,['push','origin','integration','phases/3']);run(repo,['checkout','phases/3']);writeFileSync(join(repo,'phase.txt'),'phase');run(repo,['add','.']);run(repo,['commit','-m','phase']);const phase=run(repo,['rev-parse','HEAD']);run(repo,['checkout','phases/3']);const result=mergeAndPushDetached(repo,'phases/3','integration',phase,base);assert.equal(run(repo,['branch','--show-current']),'phases/3');assert.deepEqual(run(repo,['show','-s','--format=%P',result.mergeSha]).split(' '),[base,phase]);assert.equal(run(repo,['rev-parse','origin/integration']),result.mergeSha);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('enforces only the incremental work-item path policy',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-path-')),bare=join(root,'remote.git'),repo=join(root,'repo');try {execFileSync('git',['init','--bare',bare]);execFileSync('git',['clone',bare,repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'base.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);initializePhaseRefs(repo,base);writeFileSync(join(repo,'allowed.ts'),'ok');run(repo,['add','.']);run(repo,['commit','-m','change']);assert.deepEqual(assertIncrementalPaths(repo,base,['allowed.ts']),['allowed.ts']);writeFileSync(join(repo,'secret.ts'),'no');run(repo,['add','.']);run(repo,['commit','-m','bad']);assert.throws(()=>assertIncrementalPaths(repo,base,['allowed.ts']),GitDeliveryError);}finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects uncommitted paths outside the work-item allowlist',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-untracked-path-')),repo=join(root,'repo');try {execFileSync('git',['init',repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'allowed.ts'),'ok');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);writeFileSync(join(repo,'secret.ts'),'no');assert.throws(()=>assertIncrementalPaths(repo,base,['allowed.ts']),GitDeliveryError);}finally{rmSync(root,{recursive:true,force:true});}
});
test('creates independent auditable worktrees and reconciles each lifecycle',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-worktree-')),bare=join(root,'remote.git'),repo=join(root,'repo'),tree=join(root,'worktree'),secondTree=join(root,'worktree-2');try {
  execFileSync('git',['init','--bare',bare]);execFileSync('git',['clone',bare,repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'base.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);initializePhaseRefs(repo,base);
  const created=createWorktree(repo,tree,'work-items/wi-1',base);assert.equal(created.baseSha,base);assert.equal(reconcileWorktree(repo,tree,'work-items/wi-1',base),'ACTIVE');const second=createWorktree(repo,secondTree,'work-items/wi-2',base);assert.equal(second.baseSha,base);assert.equal(reconcileWorktree(repo,secondTree,'work-items/wi-2',base),'ACTIVE');
  writeFileSync(join(tree,'draft.txt'),'draft');assert.equal(reconcileWorktree(repo,tree,'work-items/wi-1',base),'DIRTY');assert.throws(()=>removeWorktree(repo,tree),GitDeliveryError);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('rebuilds an inactive delivery branch at the requested base SHA',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-stale-delivery-')),repo=join(root,'repo'),first=join(root,'first'),second=join(root,'second');try {
  execFileSync('git',['init',repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'base.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);
  createWorktree(repo,first,'work-items/wi-stale',base);writeFileSync(join(first,'stale.txt'),'stale');run(first,['add','.']);run(first,['commit','-m','stale delivery']);removeWorktree(repo,first);
  createWorktree(repo,second,'work-items/wi-stale',base);assert.equal(run(second,['rev-parse','HEAD']),base);assert.equal(run(second,['status','--porcelain']),'');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects Git refs that would be a prefix of another delivery ref',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-ref-')),repo=join(root,'repo');try {
  execFileSync('git',['init',repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'base.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);
  assert.throws(()=>initializePhaseRefs(repo,base,'phases','phases/3'),GitDeliveryError);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('requires every delivery commit to be authored by the bot with all trailers',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-audit-')),repo=join(root,'repo');try {
  execFileSync('git',['init',repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'a.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);
  writeFileSync(join(repo,'a.txt'),'change');run(repo,['add','.']);run(repo,['commit','-m','feat(wi-1): unsafe']);assert.throws(()=>assertAuditableCommits(repo,base,'wi-1'),GitDeliveryError);
  run(repo,['reset','--hard',base]);writeFileSync(join(repo,'a.txt'),'change');botCommit(repo,['a.txt'],commitMessage('feat','wi-1','safe change',{project:'p1',phase:'3',execution:'e1'}));assert.equal(assertAuditableCommits(repo,base,'wi-1').length,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects renamed paths under the incremental delivery policy',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-policy-')),repo=join(root,'repo');try {
  execFileSync('git',['init',repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'a.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);
  run(repo,['mv','a.txt','b.txt']);run(repo,['commit','-am','rename']);assert.throws(()=>assertIncrementalPaths(repo,base,['**']),GitDeliveryError);
 }finally{rmSync(root,{recursive:true,force:true});}
});
