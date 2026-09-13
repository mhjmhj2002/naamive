import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

export const CONTINUITY_PATH = 'PROJECT_CONTINUITY.md';
const PROJECT_STATUS_PATH = /^project\/naamive\/projects\/[^/]+\/STATUS\.md$/;

function normalizedPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function continuityViolation(changedPaths) {
  const paths = new Set(changedPaths.map(normalizedPath));
  const changedProjectIndexFact = [...paths].some((path) => PROJECT_STATUS_PATH.test(path));
  return changedProjectIndexFact && !paths.has(CONTINUITY_PATH);
}

function gitOutput(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function pathsFromDiff(base, head) {
  const refs = head === undefined ? [base] : [base, head];
  return gitOutput(['diff', '--name-only', ...refs]).split('\n').filter(Boolean);
}

function refsFromArguments(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--base' || args[index] === '--head') values.set(args[index], args[index + 1]);
  }
  if (!values.size) return undefined;
  if (!values.get('--base') || !values.get('--head')) throw new Error('Use --base <ref> junto com --head <ref>.');
  return [values.get('--base'), values.get('--head')];
}

export function changedPathsForRepository(args = process.argv.slice(2)) {
  const refs = refsFromArguments(args);
  if (refs) return pathsFromDiff(...refs);

  const workingTreePaths = pathsFromDiff('HEAD');
  if (workingTreePaths.length) return workingTreePaths;

  try {
    gitOutput(['rev-parse', '--verify', 'HEAD^']);
  } catch {
    return [];
  }
  return pathsFromDiff('HEAD^', 'HEAD');
}

export function checkProjectContinuity(changedPaths = changedPathsForRepository()) {
  if (continuityViolation(changedPaths)) {
    throw new Error(
      'Project continuity drift detected:\n' +
      'Project STATUS changed without PROJECT_CONTINUITY.md.\n' +
      'Reconcile PROJECT_CONTINUITY.md before completing the task.'
    );
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    checkProjectContinuity();
    process.stdout.write('Project continuity guard passed.\n');
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
