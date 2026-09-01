## 1. Baseline

- Commit anterior à LR-01: `972394facc78b11cb4c8bf7f5b3f687d1d8aa12d` — `docs: prepare phase 6.5 lifecycle alignment`.
- Branch: `phase6.5-lifecycle-alignment`.
- Node: `v24.18.1`.
- Configuração efetiva: `NAAMIVE_AGENT_MAX_RETRIES=2`.

O worker usa:

```ts
const permanent = Number(current.attempts) > config().agentMaxRetries;
```

Logo, na primeira falha (`attempts=1`), o estado correto pela política vigente é `RETRYABLE`, não `FAILED`.

## 2. Quatro testes falhando

| Teste | Esperado | Obtido | Relação com retry |
| --- | --- | --- | --- |
| `rejects committed Git symlinks and submodules before parsing repository content` | `jobs.status = FAILED` | `RETRYABLE` após a falha de symlink; o cenário de submodule nem chega a executar | tentativa 1 não excede `2` |
| `uses only package.json and rolls back all final persistence when its insert fails` | `jobs.status = FAILED` | `RETRYABLE` após o trigger lançar `P0001` | tentativa 1 não excede `2` |
| `reserves operation, job and evidence before a malformed manifest fails without final inventory` | `jobs.status = FAILED`, `last_error = AGENT_EXECUTION_FAILED` | `RETRYABLE`, com `last_error = AGENT_EXECUTION_FAILED` | tentativa 1 não excede `2` |
| `retries safely both before inventory persistence and after its immutable snapshot was written` | `jobs.status = FAILED` após trigger de falha | `RETRYABLE` | tentativa 1 não excede `2` |

As quatro stacks apontam para assertions do próprio [inventory.e2e.test.ts](/home/mhj/git/naamive/naamive/runtime/node-web/src/inventory.e2e.test.ts), todas comparando `RETRYABLE` com `FAILED`.

## 3. Resultado no HEAD anterior

A suíte foi executada no commit `972394f`, em worktree temporário, com:

- mesmas dependências;
- mesmo Node;
- mesmo limite de retry (`2`);
- banco PostgreSQL clonado e isolado na migration 047;
- mesmo comando de teste.

Resultado no baseline: `6 passed`, `4 failed`.

| Teste | Resultado no HEAD anterior | Comportamento |
| --- | --- | --- |
| Symlink/submodule | FAIL | `RETRYABLE` vs. `FAILED` |
| Falha de persistência | FAIL | `RETRYABLE` vs. `FAILED` |
| Manifest malformado | FAIL | `RETRYABLE` vs. `FAILED` |
| Retry antes de persistir | FAIL | `RETRYABLE` vs. `FAILED` |

A execução atual, já com a migration 048 da LR-01 aplicada em outro banco isolado, produziu o mesmo `6/10`, as mesmas quatro falhas e a mesma divergência de estado.

## 4. Classificação

`FALHA PREEXISTENTE`

## 5. Evidências

- Os hashes de `inventory.e2e.test.ts`, `worker.ts` e `config.ts` no working tree são idênticos aos do `HEAD`.
- O diff da LR-01 não altera inventory, worker, adapter, runtime ou configuração.
- A migration 048 não referencia `technology_inventory`, `START_TECHNOLOGY_INVENTORY` nem `PREPARE_TECHNOLOGY_SELECTION_CONTEXT`.
- A comparação isolada 047/baseline versus 048/LR-01 reproduziu exatamente o mesmo resultado.
- As variáveis alteradas para isolamento foram somente banco, diretório de artefatos e raízes de repositório; `agentMaxRetries` permaneceu em `2`.

## 6. Causa provável

A divergência é anterior à LR-01:

- `ef98f129` (06/ago) introduziu a política do worker e o default `agentMaxRetries=2`.
- `678017d` e `60f05cb` (08/ago) introduziram assertions que exigem falha terminal após uma única execução.
- `a4a3851` (09/ago) adicionou o quarto caso com a mesma expectativa.

Trata-se de teste desatualizado frente à política de retry já existente, não de mudança causada pela LR-01.

## 7. Impacto na LR-01

A LR-01 pode ser aceita: não há regressão direta ou indireta demonstrável sobre inventory, retry, worker, workflow version, fixture, seed, migration ou ordem de teste.

Nenhuma correção foi aplicada nesta task.

## 8. Git status final

O working tree original permaneceu intacto; o status final é idêntico ao encontrado antes do diagnóstico. Nenhum arquivo foi modificado por esta análise. O worktree e os dois bancos temporários usados na comparação foram removidos.

```text
 M naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/LR-01-publish-conformant-workflows-v2.md
 M naamive/runtime/node-web/src/agent-execution-admin.ts
 M naamive/runtime/node-web/src/module-plan-review.ts
 M naamive/runtime/node-web/src/module-planning.e2e.test.ts
 M naamive/runtime/node-web/src/module-planning.ts
 M naamive/runtime/node-web/src/phase3-http.e2e.test.ts
 M naamive/runtime/node-web/src/phase3.e2e.test.ts
 M naamive/runtime/node-web/src/phase3.ts
 M naamive/runtime/node-web/src/projection.test.ts
 M naamive/runtime/node-web/src/service.ts
 M naamive/runtime/node-web/src/test-plan-helper.ts
 M naamive/runtime/node-web/src/workflow.ts
?? naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/LR-01-state-model-prevalidation.md
?? naamive/runtime/node-web/migrations/048_phase_6_5_conformant_workflows.sql
?? naamive/runtime/node-web/src/fixtures/
?? naamive/runtime/node-web/src/lifecycle-v2.e2e.test.ts
?? naamive/runtime/node-web/src/real-project-snapshot.test.ts
```