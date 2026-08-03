import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const isLoopback = (host: string) => host === '127.0.0.1' || host === '::1' || host === 'localhost';

export const config = () => {
  const artifactStore = new URL(required('NAAMIVE_ARTIFACT_STORE_URI'));
  if (artifactStore.protocol !== 'file:') throw new Error('only persistent file:// ArtifactStore is supported in Phase 1');
  const repositoryRoots = required('NAAMIVE_REPOSITORY_ROOTS').split(',').map((path) => realpathSync(path.trim()));
  const operatorId = required('NAAMIVE_OPERATOR_ID');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(operatorId)) throw new Error('NAAMIVE_OPERATOR_ID must use kebab-case');
  const host = process.env.HOST ?? '127.0.0.1';
  if (!isLoopback(host)) throw new Error('Phase 1 API must bind to loopback only');
  const webOrigin = process.env.NAAMIVE_WEB_ORIGIN ?? `http://${host}:${process.env.PORT ?? '3000'}`;
  if (!new URL(webOrigin).hostname || !isLoopback(new URL(webOrigin).hostname)) throw new Error('NAAMIVE_WEB_ORIGIN must be localhost-only');
  return { databaseUrl: required('DATABASE_URL'), artifactRoot: fileURLToPath(artifactStore), repositoryRoots, operatorId, host, webOrigin, port: Number(process.env.PORT ?? 3000), agentTimeoutSeconds: Number(process.env.NAAMIVE_AGENT_TIMEOUT_SECONDS ?? 600), agentReadinessTimeoutSeconds: Number(process.env.NAAMIVE_AGENT_READINESS_TIMEOUT_SECONDS ?? 20), agentReadinessCacheSeconds: Number(process.env.NAAMIVE_AGENT_READINESS_CACHE_SECONDS ?? 300), agentMaxRetries: Number(process.env.NAAMIVE_AGENT_MAX_RETRIES ?? 2), agentHeartbeatSeconds: Number(process.env.NAAMIVE_AGENT_HEARTBEAT_SECONDS ?? 30), codexCommand: process.env.NAAMIVE_CODEX_COMMAND ?? 'codex', codexWorkdir: process.env.NAAMIVE_CODEX_WORKDIR, agentAdapter: process.env.NAAMIVE_AGENT_ADAPTER ?? 'codex' };
};

export const containedPath = (candidate: string, roots: string[]): string => {
  const resolved = realpathSync(candidate);
  if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) throw new Error('REPOSITORY_PATH_NOT_ALLOWED');
  return resolved;
};
