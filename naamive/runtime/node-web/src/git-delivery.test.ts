import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertIncrementalPaths, botCommit, commitMessage, initializePhaseRefs, mergeAndPush, reconcileIntegration, GitDeliveryError } from './git-delivery.js';
const run=(cwd:string,args:string[])=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();
test('integrates a phase with merge commit and bot trailers into a local bare remote',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-git-')),bare=join(root,'remote.git'),repo=join(root,'repo'); try {
  execFileSync('git',['init','--bare',bare]); execFileSync('git',['clone',bare,repo]); run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'a.txt'),'a');run(repo,['add','.']);run(repo,['commit','-m','initial']);run(repo,['branch','-M','integration']);run(repo,['push','origin','integration']);run(repo,['checkout','-b','phases/3']);writeFileSync(join(repo,'feature.txt'),'x');const phase=botCommit(repo,['feature.txt'],commitMessage('feat','wi-1','add feature',{project:'p1',phase:'3',execution:'e1'}));run(repo,['push','origin','phases/3']);run(repo,['checkout','integration']);const before=run(repo,['rev-parse','HEAD']);const result=mergeAndPush(repo,'phases/3','integration',phase,before);assert.equal(run(repo,['show','-s','--format=%P',result.mergeSha]).split(' ')[1],phase);assert.equal(reconcileIntegration(repo,'integration',before,phase),'APPLIED_UNRECORDED');
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('enforces only the incremental work-item path policy',()=>{
 const root=mkdtempSync(join(tmpdir(),'naamive-path-')),bare=join(root,'remote.git'),repo=join(root,'repo');try {execFileSync('git',['init','--bare',bare]);execFileSync('git',['clone',bare,repo]);run(repo,['config','user.name','tester']);run(repo,['config','user.email','tester@localhost']);writeFileSync(join(repo,'base.txt'),'base');run(repo,['add','.']);run(repo,['commit','-m','base']);const base=run(repo,['rev-parse','HEAD']);initializePhaseRefs(repo,base);writeFileSync(join(repo,'allowed.ts'),'ok');run(repo,['add','.']);run(repo,['commit','-m','change']);assert.deepEqual(assertIncrementalPaths(repo,base,['allowed.ts']),['allowed.ts']);writeFileSync(join(repo,'secret.ts'),'no');run(repo,['add','.']);run(repo,['commit','-m','bad']);assert.throws(()=>assertIncrementalPaths(repo,base,['allowed.ts']),GitDeliveryError);}finally{rmSync(root,{recursive:true,force:true});}
});
