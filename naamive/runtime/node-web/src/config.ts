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
  return {
    databaseUrl: required('DATABASE_URL'),
    artifactRoot: fileURLToPath(artifactStore),
    repositoryRoots,
    operatorId,
    host,
    webOrigin,
    port: Number(process.env.PORT ?? 3000),
    agentTimeoutSeconds: Number(process.env.NAAMIVE_AGENT_TIMEOUT_SECONDS ?? 600),
    agentReadinessTimeoutSeconds: Number(process.env.NAAMIVE_AGENT_READINESS_TIMEOUT_SECONDS ?? 20),
    agentReadinessCacheSeconds: Number(process.env.NAAMIVE_AGENT_READINESS_CACHE_SECONDS ?? 300),
    agentMaxRetries: Number(process.env.NAAMIVE_AGENT_MAX_RETRIES ?? 2),
    // Operator initiated development retries are a separate, bounded recovery
    // path.  Keeping the limit in configuration makes the decision auditable
    // and prevents an indefinitely growing retry lineage.
    developmentRetryMaxAttempts: Number(process.env.NAAMIVE_DEVELOPMENT_RETRY_MAX_ATTEMPTS ?? 3),
    developmentHeartbeatSeconds: Number(process.env.NAAMIVE_DEVELOPMENT_HEARTBEAT_SECONDS ?? 60),
    agentHeartbeatSeconds: Number(process.env.NAAMIVE_AGENT_HEARTBEAT_SECONDS ?? 30),
    // F5-23 pendency 22: observable timeout & degradation policy. The planning
    // timeout may only be elevated once telemetry is available, is configurable
    // and audited (default 12 minutes = 720s). A heartbeat fires every 60s and a
    // no-signal warning at a lower threshold (120s = 2 minutes). These are also
    // recorded in the telemetry audit log so the policy itself is auditable.
    planTimeoutSeconds: Number(process.env.NAAMIVE_PLAN_TIMEOUT_SECONDS ?? 720),
    planHeartbeatSeconds: Number(process.env.NAAMIVE_PLAN_HEARTBEAT_SECONDS ?? 60),
    planNoSignalSeconds: Number(process.env.NAAMIVE_PLAN_NO_SIGNAL_SECONDS ?? 120),
    // F5-23 pendency 19: enable capturing the `codex exec --json` operational
    // stream. When disabled the closed-contract parser is not invoked.
    planTelemetryEnabled: process.env.NAAMIVE_PLAN_TELEMETRY_ENABLED !== 'false',
    codexCommand: process.env.NAAMIVE_CODEX_COMMAND ?? 'codex',
    codexWorkdir: process.env.NAAMIVE_CODEX_WORKDIR,
    agentAdapter: process.env.NAAMIVE_AGENT_ADAPTER ?? 'codex',
    runtimeEnvironment: process.env.NAAMIVE_RUNTIME_ENVIRONMENT ?? 'development',
    deepseekSecretEnvName: process.env.NAAMIVE_DEEPSEEK_SECRET_ENV_NAME ?? 'NAAMIVE_SECRET_DEEPSEEK_API_KEY',
    agentExecutionServiceEnabled: process.env.NAAMIVE_AGENT_EXECUTION_SERVICE_ENABLED === 'true',
    agentExecutionAttemptsEnabled: process.env.NAAMIVE_AGENT_EXECUTION_ATTEMPTS_ENABLED === 'true',
    runtimeProjectionEnabled: process.env.NAAMIVE_AGENT_RUNTIME_PROJECTION_ENABLED === 'true',
    deepseekPublicEnabled: process.env.NAAMIVE_DEEPSEEK_PUBLIC_ENABLED === 'true',
    deepseekInternalEnabled: process.env.NAAMIVE_DEEPSEEK_INTERNAL_ENABLED === 'true'
  };
};

export const containedPath = (candidate: string, roots: string[]): string => {
  const resolved = realpathSync(candidate);
  if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) throw new Error('REPOSITORY_PATH_NOT_ALLOWED');
  return resolved;
};
