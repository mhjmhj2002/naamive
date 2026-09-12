import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const importPattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesIn(fullPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function workspacePackageCycles() {
  const packagesDirectory = resolve(root, 'packages');
  const manifests = readdirSync(packagesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => JSON.parse(readFileSync(resolve(packagesDirectory, entry.name, 'package.json'), 'utf8')));
  const graph = new Map(manifests.map((manifest) => [
    manifest.name,
    Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).filter((name) => name.startsWith('@naamive/'))
  ]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  function visit(name, trail = []) {
    if (visiting.has(name)) { cycles.push([...trail, name].join(' -> ')); return; }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dependency of graph.get(name) ?? []) visit(dependency, [...trail, name]);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of graph.keys()) visit(name);
  return cycles;
}

function packageBoundary(file) {
  const parts = resolve(file).split(sep);
  const packagesIndex = parts.lastIndexOf('packages');
  return packagesIndex === -1 ? undefined : parts[packagesIndex + 1];
}

function isWebClient(file) {
  return resolve(file).includes(`${sep}apps${sep}web${sep}src${sep}client${sep}`);
}

function resolvedSpecifier(file, specifier) {
  return specifier.startsWith('.') ? resolve(dirname(file), specifier) : undefined;
}

export function violationsFor(file) {
  const source = readFileSync(file, 'utf8');
  const violations = [];
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    const target = resolvedSpecifier(file, specifier);
    const sourcePackage = packageBoundary(file);
    const targetPackage = target && packageBoundary(target);
    if (specifier.includes('/internal/') || /@naamive\/[^/]+\/.+/.test(specifier)) {
      violations.push('private module/internal import');
    }
    if (target?.includes(`${sep}internal${sep}`) && !violations.includes('private module/internal import')) {
      violations.push('private module/internal import');
    }
    if (sourcePackage && targetPackage && sourcePackage !== targetPackage) {
      violations.push('cross-package source access via relative import');
    }
    if (isWebClient(file) && (/(?:@naamive\/database|packages\/database)/.test(specifier) || targetPackage === 'database')) {
      violations.push('frontend persistence access');
    }
    if (file.includes(`${sep}packages${sep}modules${sep}`) && /(?:fastify|kysely|pg|react|vite|docker)/.test(specifier)) {
      violations.push('forbidden domain-layer dependency');
    }
    if (file.includes(`${sep}packages${sep}`) && (specifier.includes(`${sep}apps${sep}`) || target?.includes(`${sep}apps${sep}`))) {
      violations.push('package-to-composition-root dependency');
    }
  }
  return violations;
}

export function check(paths = [resolve(root, 'apps'), resolve(root, 'packages')]) {
  const failures = paths.flatMap((path) => filesIn(path)).flatMap((file) =>
    violationsFor(file).map((rule) => `${relative(root, file)}: ${rule}`));
  failures.push(...workspacePackageCycles().map((cycle) => `workspace package dependency cycle: ${cycle}`));
  if (failures.length) throw new Error(`Architecture guardrail violations:\n${failures.join('\n')}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    check();
    process.stdout.write('Architecture guardrails passed.\n');
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
