import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-test-artifacts';
process.env.NAAMIVE_REPOSITORY_ROOTS ??= '/tmp';
process.env.NAAMIVE_OPERATOR_ID ??= 'test-operator';
const { validateIntake } = await import('./service.js');

const valid = {
  title: 'Melhorar atendimento', business_owner: 'Produto', business_problem: 'Clientes abandonam o pedido',
  desired_outcome: 'Reduzir abandono', success_metrics: ['Reduzir abandono em 10%'], stakeholders: ['Atendimento'],
  known_constraints: ['Nenhuma restrição conhecida'], evidence_sources: ['Entrevistas'], assumptions: ['Amostra representa clientes'], open_questions: ['Qual canal tem maior abandono?']
};

test('accepts a complete business intake', () => assert.deepEqual(validateIntake(valid), []));
test('reports each missing mandatory intake field', () => {
  const errors = validateIntake({ ...valid, title: ' ', stakeholders: [] });
  assert.deepEqual(errors.map((error) => error.field), ['title', 'stakeholders']);
});
test('rejects technology decisions in business content', () => {
  const errors = validateIntake({ ...valid, desired_outcome: 'Migrar para PostgreSQL' });
  assert.equal(errors[0]?.code, 'INTAKE_TECHNOLOGY_DECISION');
  assert.equal(errors[0]?.field, 'desired_outcome');
});
