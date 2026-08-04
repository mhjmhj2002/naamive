import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

export class GitDeliveryError extends Error {
  constructor(readonly code: 'GIT_TREE_DIRTY'|'GIT_REMOTE_AHEAD'|'GIT_MERGE_CONFLICT'|'GIT_PUSH_REJECTED'|'GIT_BRANCH_PROTECTED'|'GIT_DIVERGED', message: string = code) { super(message); }
}
const git = (cwd:string, args:string[]) => execFileSync('git',['-C',cwd,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const safe = (value:string) => /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(value);
export const commitMessage = (type:string, workItem:string, summary:string, meta:{project:string;phase:string;execution:string}) => {
  if (!safe(type)||!safe(workItem)||!safe(meta.project)||!safe(meta.phase)||!safe(meta.execution)) throw new GitDeliveryError('GIT_DIVERGED','invalid Git delivery identifier');
  return `${type}(${workItem}): ${summary}\n\nNaamive-Project: ${meta.project}\nNaamive-Phase: ${meta.phase}\nNaamive-Execution: ${meta.execution}\nNaamive-Work-Item: ${workItem}`;
};
export const assertClean = (repository:string) => { if(git(repository,['status','--porcelain'])) throw new GitDeliveryError('GIT_TREE_DIRTY'); };
export const createWorktree = (repository:string, worktree:string, branch:string, baseSha:string) => {
  assertClean(repository); if(!safe(branch)||!existsSync(repository)||existsSync(worktree)) throw new GitDeliveryError('GIT_DIVERGED');
  git(repository,['worktree','add','-b',branch,worktree,baseSha]); return {path:realpathSync(worktree),baseSha};
};
export const removeWorktree = (repository:string, worktree:string) => { assertClean(worktree); git(repository,['worktree','remove',worktree]); };
export const botCommit = (repository:string, files:string[], message:string) => {
  if(!files.length) throw new GitDeliveryError('GIT_DIVERGED'); git(repository,['add','--',...files]);
  if(!git(repository,['diff','--cached','--name-only'])) throw new GitDeliveryError('GIT_DIVERGED','no staged changes');
  git(repository,['-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',message]); return git(repository,['rev-parse','HEAD']);
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
export const reconcileIntegration = (repository:string, integrationBranch:string, expectedIntegrationSha:string, phaseSha:string) => {
  git(repository,['fetch','origin',integrationBranch]); const head=git(repository,['rev-parse',`origin/${integrationBranch}`]); if(head===expectedIntegrationSha)return 'NOT_APPLIED';
  const parents=git(repository,['show','-s','--format=%P',head]).split(' '); if(parents.includes(phaseSha)) return 'APPLIED_UNRECORDED';
  return 'DIVERGED';
};
