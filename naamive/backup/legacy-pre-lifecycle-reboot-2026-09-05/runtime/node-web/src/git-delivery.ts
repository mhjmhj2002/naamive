import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class GitDeliveryError extends Error {
  constructor(readonly code: 'GIT_TREE_DIRTY'|'GIT_REMOTE_AHEAD'|'GIT_MERGE_CONFLICT'|'GIT_PUSH_REJECTED'|'GIT_BRANCH_PROTECTED'|'GIT_DIVERGED'|'GIT_POLICY_VIOLATION', message: string = code) { super(message); }
}
const git = (cwd:string, args:string[]) => execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
/** Deliberately small read-only Git surface for orchestration code. */
export const gitValue = (cwd:string, ...args:string[]) => git(cwd,args);
const safe = (value:string) => /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(value) && !value.includes('//');
const assertDistinctRefs = (...refs:string[]) => {
  if (refs.some((ref) => !safe(ref)) || new Set(refs).size !== refs.length || refs.some((ref, index) => refs.some((other, otherIndex) => index !== otherIndex && other.startsWith(`${ref}/`)))) {
    throw new GitDeliveryError('GIT_DIVERGED', 'ambiguous Git delivery refs');
  }
};
export const commitMessage = (type:string, workItem:string, summary:string, meta:{project:string;phase:string;execution:string}) => {
  if (!safe(type)||!safe(workItem)||!safe(meta.project)||!safe(meta.phase)||!safe(meta.execution)) throw new GitDeliveryError('GIT_DIVERGED','invalid Git delivery identifier');
  return `${type}(${workItem}): ${summary}\n\nNaamive-Project: ${meta.project}\nNaamive-Phase: ${meta.phase}\nNaamive-Execution: ${meta.execution}\nNaamive-Work-Item: ${workItem}`;
};
export const assertClean = (repository:string) => {
  // Active delivery worktrees are deliberately rooted here. They are managed
  // through Git's worktree metadata and must not make the primary checkout
  // look dirty to a subsequent AUT-02 phase merge.
  const dirty=git(repository,['status','--porcelain','--untracked-files=all','--','.',':(exclude).naamive-worktrees/**']);
  if(dirty) throw new GitDeliveryError('GIT_TREE_DIRTY');
};
export const createWorktree = (repository:string, worktree:string, branch:string, baseSha:string) => {
  assertClean(repository); if(!safe(branch)||!existsSync(repository)||existsSync(worktree)) throw new GitDeliveryError('GIT_DIVERGED');
  // Independent work items may execute in parallel.  Database delivery leases,
  // not a repository-wide worktree count, serialize a single work item.
  const refs=git(repository,['for-each-ref','--format=%(refname:short)','refs/heads']).split('\n').filter(Boolean); assertDistinctRefs(branch,...refs.filter(ref=>ref!==branch));
  if(refs.includes(branch)) {
    // A prior failed delivery can leave its private branch behind even after
    // the worktree was released.  `git worktree add <branch>` would silently
    // reuse its old HEAD and ignore baseSha, making the next executor collide
    // with unrecorded files. An active branch is still never repointed.
    const listed=git(repository,['worktree','list','--porcelain']);
    if (listed.split('\n\n').some(entry=>entry.includes(`branch refs/heads/${branch}`))) throw new GitDeliveryError('GIT_DIVERGED','delivery branch is already active');
    git(repository,['branch','-f',branch,baseSha]);
    git(repository,['worktree','add',worktree,branch]);
  } else git(repository,['worktree','add','-b',branch,worktree,baseSha]);
  return {path:realpathSync(worktree),baseSha};
};
export const removeWorktree = (repository:string, worktree:string) => { assertClean(worktree); git(repository,['worktree','remove',worktree]); };
/** Recovery-only removal for a worktree already classified as untrusted. */
export const discardWorktree = (repository:string, worktree:string) => {
  try { if (existsSync(worktree)) git(repository,['worktree','remove','--force',worktree]); }
  finally { rmSync(worktree,{recursive:true,force:true}); git(repository,['worktree','prune']); }
};
/** A failed delivery with no persisted evidence has no recoverable branch
 * state. Remove its orphan branch before a governed restart so a new attempt
 * cannot inherit an unrecorded commit and replay it into itself. */
export const discardDeliveryBranch = (repository:string, branch:string) => {
  if(!safe(branch)) throw new GitDeliveryError('GIT_DIVERGED','invalid delivery branch');
  const listed=git(repository,['worktree','list','--porcelain']);
  if(listed.split('\n\n').some(entry=>entry.includes(`branch refs/heads/${branch}`))) throw new GitDeliveryError('GIT_DIVERGED','delivery branch is still active');
  const refs=git(repository,['for-each-ref','--format=%(refname:short)','refs/heads',branch]).trim();
  if(refs===branch) git(repository,['branch','-D',branch]);
};
export const pruneWorktrees = (repository:string) => { git(repository,['worktree','prune']); };
export const botCommit = (repository:string, files:string[], message:string) => {
  if(!files.length) throw new GitDeliveryError('GIT_DIVERGED'); git(repository,['add','--',...files]);
  if(!git(repository,['diff','--cached','--name-only'])) throw new GitDeliveryError('GIT_DIVERGED','no staged changes');
  git(repository,['-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',message]); return git(repository,['rev-parse','HEAD']);
};
export const assertAuditableCommits = (repository:string, baseSha:string, workItemId:string, head='HEAD') => {
  const commits=git(repository,['rev-list',`${baseSha}..${head}`]).split('\n').filter(Boolean);
  if(!commits.length) throw new GitDeliveryError('GIT_DIVERGED','delivery has no commit');
  for(const commit of commits){const message=git(repository,['show','-s','--format=%B',commit]);const author=git(repository,['show','-s','--format=%an <%ae>',commit]);
    if(author!=='naamive-bot <naamive-bot@localhost>' || !new RegExp(`^[a-z0-9]+\\(${workItemId.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\): .+`, 'm').test(message) || !message.includes('Naamive-Project:') || !message.includes('Naamive-Phase:') || !message.includes('Naamive-Execution:') || !message.includes(`Naamive-Work-Item: ${workItemId}`)) throw new GitDeliveryError('GIT_DIVERGED','invalid delivery commit');}
  return commits;
};
export const mergeWorkItem = (repository:string, phaseBranch:string, workItemBranch:string, expectedHead:string) => {
  assertClean(repository);
  if (git(repository,['rev-parse',workItemBranch]) !== expectedHead) throw new GitDeliveryError('GIT_DIVERGED');
  assertAuditableCommits(repository,git(repository,['merge-base',phaseBranch,workItemBranch]),workItemBranch.slice('work-items/'.length),workItemBranch);
  git(repository,['checkout',phaseBranch]);
  try { git(repository,['merge','--no-ff','--no-edit',workItemBranch]); }
  catch { throw new GitDeliveryError('GIT_MERGE_CONFLICT'); }
  return git(repository,['rev-parse','HEAD']);
};
export type IntegrationResult={phaseSha:string;integrationBefore:string;mergeSha:string};
export const mergeAndPush = (repository:string, phaseBranch:string, integrationBranch:string, expectedPhaseSha:string, expectedIntegrationSha:string):IntegrationResult => {
  assertClean(repository); git(repository,['fetch','origin',phaseBranch,integrationBranch]);
  const remoteIntegration=git(repository,['rev-parse',`origin/${integrationBranch}`]); const phaseSha=git(repository,['rev-parse',phaseBranch]);
  if(remoteIntegration!==expectedIntegrationSha||phaseSha!==expectedPhaseSha) throw new GitDeliveryError('GIT_REMOTE_AHEAD');
  git(repository,['checkout',integrationBranch]); try { git(repository,['merge','--no-ff','--no-edit',expectedPhaseSha]); } catch { throw new GitDeliveryError('GIT_MERGE_CONFLICT'); }
  const mergeSha=git(repository,['rev-parse','HEAD']);
  try { git(repository,['push','origin',`HEAD:refs/heads/${integrationBranch}`]); }
  catch (error:any) { const message=String(error?.stderr??error?.message??''); throw new GitDeliveryError(message.includes('protected')?'GIT_BRANCH_PROTECTED':'GIT_PUSH_REJECTED'); }
  return {phaseSha,integrationBefore:expectedIntegrationSha,mergeSha};
};
/**
 * Performs the integration in an ephemeral detached worktree.  The primary
 * checkout is never moved, which makes a crash/reconciliation inspect only
 * remote state instead of an accidental local checkout state.
 */
export const mergeAndPushDetached = (repository:string, phaseBranch:string, integrationBranch:string, expectedPhaseSha:string, expectedIntegrationSha:string):IntegrationResult => {
  assertClean(repository); git(repository,['fetch','origin',phaseBranch,integrationBranch]);
  const remoteIntegration=git(repository,['rev-parse',`origin/${integrationBranch}`]);
  const phaseSha=git(repository,['rev-parse',phaseBranch]);
  if(remoteIntegration!==expectedIntegrationSha||phaseSha!==expectedPhaseSha) throw new GitDeliveryError('GIT_REMOTE_AHEAD');
  const tree=mkdtempSync(join(tmpdir(),'naamive-integration-'));
  try {
    git(repository,['worktree','add','--detach',tree,expectedIntegrationSha]);
    try { git(tree,['merge','--no-ff','--no-edit',expectedPhaseSha]); } catch { throw new GitDeliveryError('GIT_MERGE_CONFLICT'); }
    const mergeSha=git(tree,['rev-parse','HEAD']);
    const parents=git(tree,['show','-s','--format=%P',mergeSha]).split(' ');
    if(parents.length!==2||parents[0]!==expectedIntegrationSha||parents[1]!==expectedPhaseSha) throw new GitDeliveryError('GIT_DIVERGED','unexpected merge parents');
    try { git(tree,['push','origin',`HEAD:refs/heads/${integrationBranch}`]); }
    catch (error:any) { const message=String(error?.stderr??error?.message??''); throw new GitDeliveryError(message.includes('protected')?'GIT_BRANCH_PROTECTED':'GIT_PUSH_REJECTED'); }
    // Keep the local ref coherent for subsequent candidate inspection without
    // checking it out (the primary worktree remains untouched).
    git(repository,['update-ref',`refs/heads/${integrationBranch}`,mergeSha,expectedIntegrationSha]);
    return {phaseSha,integrationBefore:expectedIntegrationSha,mergeSha};
  } finally {
    try { git(repository,['worktree','remove','--force',tree]); } catch {}
    rmSync(tree,{recursive:true,force:true});
  }
};
export const reconcileIntegration = (repository:string, integrationBranch:string, expectedIntegrationSha:string, phaseSha:string) => {
  git(repository,['fetch','origin',integrationBranch]); const head=git(repository,['rev-parse',`origin/${integrationBranch}`]); if(head===expectedIntegrationSha)return 'NOT_APPLIED';
  const parents=git(repository,['show','-s','--format=%P',head]).split(' '); if(parents.includes(phaseSha)) return 'APPLIED_UNRECORDED';
  return 'DIVERGED';
};
export const assertIncrementalPaths = (repository:string, baseSha:string, allowlist:string[], denylist:string[]=[]):string[] => {
  const normalize=(path:string)=>path.replaceAll('\\','/').replace(/^\.\//,'');
  const permitted=(path:string,patterns:string[])=>patterns.some(pattern=>{const p=normalize(pattern).replace(/\*\*/g,'.*').replace(/\*/g,'[^/]*');return new RegExp(`^${p}$`).test(path)||path.startsWith(normalize(pattern).replace(/\*.*$/,''));});
  // QA is only meaningful for the exact tree that will be merged.  Include
  // unstaged, staged and untracked paths so an HTTP caller cannot hide a
  // forbidden local edit behind the branch HEAD.
  const names=(args:string[])=>git(repository,args).split('\n').filter(Boolean);
  const status=names(['diff','--name-status',baseSha,'HEAD']);
  if(status.some(line=>/^[DR]/.test(line))) throw new GitDeliveryError('GIT_POLICY_VIOLATION','rename or delete is forbidden');
  const changed=[
    ...names(['diff','--name-only','--diff-filter=ACMRTUXB',baseSha,'HEAD']),
    ...names(['diff','--name-only','--diff-filter=ACMRTUXB']),
    ...names(['diff','--cached','--name-only','--diff-filter=ACMRTUXB']),
    ...names(['ls-files','--others','--exclude-standard'])
  ].map(normalize).filter((path,index,all)=>all.indexOf(path)===index);
  const modes=names(['ls-tree','-r','HEAD']).filter(line=>line.startsWith('160000 ')||line.startsWith('120000 '));
  const localModes=names(['ls-files','-s']).filter(line=>line.startsWith('160000 ')||line.startsWith('120000 '));
  if(modes.length||localModes.length) throw new GitDeliveryError('GIT_POLICY_VIOLATION','submodule or symlink is forbidden');
  let hooks=''; try { hooks=git(repository,['config','--get','core.hooksPath']); } catch {}
  if(hooks) throw new GitDeliveryError('GIT_POLICY_VIOLATION','custom Git hooks are forbidden');
  if(changed.some(path=>path.startsWith('../')||path.includes('/../')||permitted(path,denylist)||!permitted(path,allowlist))) throw new GitDeliveryError('GIT_POLICY_VIOLATION','PATH_POLICY_VIOLATION');
  return changed;
};
export const initializePhaseRefs = (repository:string, baseSha:string, phaseBranch='phases/3', integrationBranch='integration') => {
  assertDistinctRefs(phaseBranch,integrationBranch);
  assertClean(repository);
  const refs=git(repository,['for-each-ref','--format=%(refname:short)','refs/heads']).split('\n').filter(Boolean); assertDistinctRefs(phaseBranch,integrationBranch,...refs.filter(ref=>ref!==phaseBranch&&ref!==integrationBranch));
  for(const branch of [integrationBranch,phaseBranch]) { try { git(repository,['rev-parse','--verify',branch]); } catch { git(repository,['branch',branch,baseSha]); } }
  return {phaseSha:git(repository,['rev-parse',phaseBranch]),integrationSha:git(repository,['rev-parse',integrationBranch])};
};

export type WorktreeReconciliation = 'ACTIVE'|'MISSING'|'DIRTY'|'DIVERGED';
export const reconcileWorktree = (repository:string, worktree:string, branch:string, expectedBaseSha:string):WorktreeReconciliation => {
  if (!safe(branch) || !existsSync(worktree)) return 'MISSING';
  const listed=git(repository,['worktree','list','--porcelain']);
  const canonical=realpathSync(worktree);
  if (!listed.split('\n\n').some(entry => entry.split('\n').some(line => line === `worktree ${canonical}`) && entry.includes(`branch refs/heads/${branch}`))) return 'DIVERGED';
  if (git(canonical,['status','--porcelain'])) return 'DIRTY';
  try { return git(canonical,['merge-base','--is-ancestor',expectedBaseSha,'HEAD']) === '' ? 'ACTIVE' : 'DIVERGED'; }
  catch { return 'DIVERGED'; }
};
