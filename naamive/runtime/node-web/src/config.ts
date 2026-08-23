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
  const developmentExecutorRaw=process.env.NAAMIVE_DEVELOPMENT_EXECUTOR;
  if(developmentExecutorRaw && !['codex','deepseek','controlled'].includes(developmentExecutorRaw)) throw new Error('NAAMIVE_DEVELOPMENT_EXECUTOR must be codex, deepseek or controlled');
  const authSessionHours=Number(process.env.NAAMIVE_AUTH_SESSION_HOURS ?? 8);
  if(!Number.isFinite(authSessionHours)||authSessionHours<1||authSessionHours>168)throw new Error('NAAMIVE_AUTH_SESSION_HOURS must be between 1 and 168');
  if(process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET!==undefined&&process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET!==''&&process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET.length<32)throw new Error('NAAMIVE_AUTH_BOOTSTRAP_SECRET must have at least 32 characters');
  return {
    databaseUrl: required('DATABASE_URL'),
    // Checked when a long-running SERVER/WORKER process is started.  Keeping
    // configuration importable without it permits offline migrations and unit
    // tests, neither of which is a runtime process.
    buildId: process.env.NAAMIVE_BUILD_ID ?? null,
    artifactRoot: fileURLToPath(artifactStore),
    repositoryRoots,
    operatorId,
    host,
    webOrigin,
    port: Number(process.env.PORT ?? 3000),
    authSessionHours,
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
    // Server-side development reservation reconciliation (not worker-only).
    // A RESERVED delivery whose DEVELOP_WORK_ITEM job is never consumed is
    // failed terminal+visible after this bounded grace.  It also bounds how
    // long an expired lease (dead worker) may keep an attempt active before
    // the server marks it recoverable/terminal.
    developmentReservationGraceSeconds: Number(process.env.NAAMIVE_DEVELOPMENT_RESERVATION_GRACE_SECONDS ?? 300),
    // How often the SERVER process runs the outside-the-worker reconciliation.
    developmentReconcileIntervalSeconds: Number(process.env.NAAMIVE_DEVELOPMENT_RECONCILE_INTERVAL_SECONDS ?? 30),
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
    codexModel: /^[A-Za-z0-9._:-]{1,80}$/.test(process.env.NAAMIVE_CODEX_MODEL ?? '') ? process.env.NAAMIVE_CODEX_MODEL! : null,
    codexWorkdir: process.env.NAAMIVE_CODEX_WORKDIR,
    agentAdapter: process.env.NAAMIVE_AGENT_ADAPTER ?? 'codex',
    // Development is intentionally selected independently from the legacy
    // discovery adapter.  The selector is closed so a typo never silently
    // falls back to a different provider.
    developmentExecutor: (developmentExecutorRaw as 'codex'|'deepseek'|'controlled'|undefined) ?? ((process.env.NAAMIVE_AGENT_ADAPTER === 'controlled' ? 'controlled' : 'codex') as 'codex'|'deepseek'|'controlled'),
    deepseekModel: /^[A-Za-z0-9._:-]{1,80}$/.test(process.env.NAAMIVE_DEEPSEEK_MODEL ?? '') ? process.env.NAAMIVE_DEEPSEEK_MODEL! : 'deepseek-v4-flash',
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
