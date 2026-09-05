import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.phase4-contract-tests`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
process.env.NAAMIVE_OPERATOR_ID ??= 'phase4-contract-tester';

const { validateAgentExecutionAttemptResult, validateAgentExecutionRequest, ContractValidationError } = await import('./agent-runtime-contracts.js');

const artifact = { artifactId: '11111111-1111-4111-8111-111111111111', sha256: 'a'.repeat(64), schemaVersion: 1 };

test('validates a canonical agent execution request and result', async () => {
  const request = await validateAgentExecutionRequest({
    executionId: '22222222-2222-4222-8222-222222222222',
    operationId: '33333333-3333-4333-8333-333333333333',
    jobId: '44444444-4444-4444-8444-444444444444',
    projectId: '55555555-5555-4555-8555-555555555555',
    agentId: 'product-discovery',
    agentVersion: 'phase-4-v1',
    taskType: 'ANALYZE_PRODUCT_NEED',
    classification: 'PUBLIC',
    contextReference: artifact,
    outputSchemaReference: artifact,
    timeoutSeconds: 30,
    idempotencyKey: 'phase4-request-idempotency-key',
    policyName: 'standard-implementation',
    policyVersion: 1
  });
  assert.equal(request.classification, 'PUBLIC');
  const result = await validateAgentExecutionAttemptResult({
    attemptId: '66666666-6666-4666-8666-666666666666',
    executionId: request.executionId,
    runtimeId: '77777777-7777-4777-8777-777777777777',
    adapterType: 'CODEX_CLI',
    status: 'SUCCEEDED',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 12,
    structuredOutputReference: artifact,
    retryable: false,
    fallbackEligible: false
  });
  assert.equal(result.status, 'SUCCEEDED');
});

test('rejects extra properties and non-reference content', async () => {
  await assert.rejects(() => validateAgentExecutionRequest({
    executionId: '22222222-2222-4222-8222-222222222222',
    operationId: '33333333-3333-4333-8333-333333333333',
    jobId: '44444444-4444-4444-8444-444444444444',
    projectId: '55555555-5555-4555-8555-555555555555',
    agentId: 'product-discovery',
    agentVersion: 'phase-4-v1',
    taskType: 'ANALYZE_PRODUCT_NEED',
    classification: 'PUBLIC',
    contextReference: { ...artifact, content: 'forbidden' },
    outputSchemaReference: artifact,
    timeoutSeconds: 30,
    idempotencyKey: 'phase4-request-idempotency-key',
    policyName: 'standard-implementation',
    policyVersion: 1,
    unexpected: true
  }), (error: any) => error instanceof ContractValidationError && error.code === 'AGENT_EXECUTION_REQUEST_INVALID');
});
