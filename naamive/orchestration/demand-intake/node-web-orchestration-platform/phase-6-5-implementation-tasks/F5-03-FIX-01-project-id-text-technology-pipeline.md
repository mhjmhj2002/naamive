---
task: F5-03-FIX-01
status: TO_DO
title: Corrigir incompatibilidade de project_id UUID no pipeline de Technology Selection/Baseline para projetos com ID textual
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-04
depends_on: [F5-03, F5-09, F5-17, TST-02, UI-01-FIX-02]
context: NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
---

# F5-03-FIX-01 — Corrigir incompatibilidade de project_id UUID no pipeline de Technology Selection/Baseline

## Problema

Durante o manual E2E pós-F6.5, o projeto real:

```text
financas-familiares-lab-1
```

percorreu com sucesso:

```text
CREATE
→ SUBMIT_INTAKE
→ VALIDATE_INTAKE
→ REGISTER_PROJECT
→ START_PRODUCT_DISCOVERY
→ ANALYZE_PRODUCT_NEED
→ DEFINE_PRODUCT_REQUIREMENTS
→ REVIEW_PRODUCT_COMMITMENT
→ PRODUCT_COMMITMENT APPROVED
```

e avançou corretamente para:

```text
workflow_code    = PROJECT_DISCOVERY
workflow_version = 3
state            = TECHNOLOGY_SELECTION_PREPARING
```

com job:

```text
PREPARE_TECHNOLOGY_SELECTION_CONTEXT
```

Ao executar o worker real, o job falhou imediatamente:

```text
event       = job_execution_failed
kind        = PREPARE_TECHNOLOGY_SELECTION_CONTEXT
step        = technology_selection_context
error_kind  = DatabaseError
cause_code  = 22P02
attempt     = 1
```

e depois novamente:

```text
cause_code  = 22P02
attempt     = 2
```

O worker agendou retry.

O servidor e o worker manuais foram parados para preservar o estado e evitar interferência nos testes automatizados.

## Classificação

**P1 — o lifecycle real chega corretamente ao pipeline tecnológico, mas o worker falha ao persistir o contexto devido a incompatibilidade entre a identidade textual real do projeto e colunas UUID do schema F5.**

Esse finding bloqueia o manual E2E e pode afetar qualquer projeto criado pelo fluxo oficial cujo `projects.id` não seja UUID.

## Evidência técnica já identificada

### 1. Projeto real usa ID textual

```text
projects.id = financas-familiares-lab-1
```

Esse valor é textual e válido no contrato atual do projeto/runtime. Não mudar o projeto real apenas para satisfazer o schema F5.

### 2. Schema F5 mistura `project_id uuid` e `project_key text`

A migration histórica `027_phase_5_baseline_context.sql` cria, entre outras, estruturas com dupla identidade de projeto. Exemplo:

```sql
CREATE TABLE technology_selection_contexts (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  ...
);
```

Também inspecionar integralmente as tabelas relacionadas, incluindo no mínimo:

```text
technology_selection_contexts
technology_baselines
technology_baseline_revisions
technology_baseline_gates
technology_inventory
```

e quaisquer outras tabelas F5/F6 que carreguem `project_id` e/ou `project_key`.

Não assumir que o primeiro erro é o único.

### 3. O worker grava `project.id` textual na coluna UUID

`prepareTechnologySelectionContext(...)` atualmente insere conceitualmente:

```ts
INSERT INTO technology_selection_contexts(
  id,
  project_id,
  project_key,
  ...
)
VALUES(
  contextId,
  project.id,
  project.id,
  ...
)
```

Para o projeto manual:

```text
project_id  uuid ← "financas-familiares-lab-1"  → PostgreSQL 22P02
project_key text ← "financas-familiares-lab-1"  → válido
```

### 4. Testes podem ter mascarado o bug

Fixtures de Fase 5 usam em diversos pontos:

```ts
const project = randomUUID()
```

ou equivalente.

Isso permite que o mesmo código passe nos testes mesmo que o fluxo oficial produza IDs textuais.

A correção deve adicionar cobertura com project ID textual realista.

# Objetivo

Corrigir o pipeline de Technology Selection/Baseline para funcionar com a identidade de projeto realmente suportada pelo runtime:

```text
projects.id = text
```

sem:

- exigir que projetos reais passem a usar UUID;
- alterar ou recriar o projeto manual;
- fazer cast artificial de texto arbitrário para UUID;
- introduzir uma segunda identidade de projeto sem contrato explícito;
- quebrar compatibilidade histórica;
- reescrever migrations já aplicadas.

A solução deve preservar integridade referencial e permitir continuar o mesmo manual E2E a partir do job já existente.

# Investigação obrigatória antes de implementar

Antes de alterar código:

1. ler `/AGENTS.md`;
2. ler esta task completa;
3. ler `NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md`;
4. inspecionar a migration `027_phase_5_baseline_context.sql`;
5. inspecionar migrations posteriores que alterem as tabelas tecnológicas;
6. mapear todas as tabelas/colunas do pipeline tecnológico que usam `project_id` e `project_key`;
7. mapear todas as FKs e índices relacionados;
8. rastrear todos os INSERT/UPDATE/SELECT que escrevem ou comparam esses campos;
9. inspecionar testes atuais que usam `randomUUID()` como project id;
10. confirmar a causa do `22P02` com evidência de código/schema.

Não implementar antes de fechar o mapa de impacto.

# Decisão arquitetural esperada

A identidade canônica atual do projeto está em:

```text
projects.id
```

e é textual.

Portanto, o pipeline tecnológico deve ser compatível com essa identidade.

A correção deve escolher uma estratégia consistente e mínima.

Estratégias aceitáveis incluem, se confirmadas pelo schema e contratos:

```text
project_id TEXT REFERENCES projects(id)
```

ou remoção de coluna redundante quando `project_key` já é a identidade canônica e a migração puder ser feita de forma compatível.

Não adotar solução que:

```text
hash(project.id) → UUID
generate UUID paralelo → mapear por fora
cast(project.id::uuid)
```

apenas para satisfazer colunas históricas.

Se existir uma identidade UUID real e canônica de projeto já persistida em outro campo/tabela, provar isso antes de usá-la.

# Persistência / migrations

## 1. Não reescrever migration publicada

Não editar semanticamente:

```text
027_phase_5_baseline_context.sql
```

ou outras migrations históricas já aplicadas.

Criar migration aditiva nova para corrigir o schema atual.

## 2. Preservar dados existentes

A migration deve:

- preservar linhas existentes;
- preservar FKs;
- preservar índices relevantes;
- preservar constraints de integridade;
- não apagar snapshots/baselines/contextos;
- não recriar tabelas de forma destrutiva sem necessidade;
- permitir rollback transacional natural em caso de falha da migration.

## 3. Tipos coerentes

Toda coluna que representa diretamente `projects.id` deve usar tipo compatível com a identidade canônica.

Se coexistirem `project_id` e `project_key`, documentar claramente:

```text
qual é a identidade canônica;
por que ambas existem;
qual FK cada uma possui;
```

e eliminar inconsistências de tipo.

# Escopo de código a inspecionar

No mínimo:

```text
naamive/runtime/node-web/migrations/027_phase_5_baseline_context.sql
naamive/runtime/node-web/migrations/029_phase_5_workflow_v3.sql
naamive/runtime/node-web/migrations/031_phase_5_baseline_revision.sql
naamive/runtime/node-web/src/selection-context.ts
naamive/runtime/node-web/src/inventory.ts
naamive/runtime/node-web/src/baseline-draft.ts
naamive/runtime/node-web/src/baseline-gate.ts
naamive/runtime/node-web/src/baseline-revision.ts
naamive/runtime/node-web/src/technology-api.ts
naamive/runtime/node-web/src/worker.ts
naamive/runtime/node-web/src/*.e2e.test.ts
```

Também buscar globalmente por:

```text
project_id uuid
project_key
technology_selection_contexts
technology_baselines
technology_baseline_revisions
technology_baseline_gates
START_TECHNOLOGY_INVENTORY
PREPARE_TECHNOLOGY_SELECTION_CONTEXT
```

# Comportamento esperado após correção

## Caso principal

Dado um projeto:

```text
id                = financas-familiares-lab-1
workflow           = PROJECT_DISCOVERY v3
state              = TECHNOLOGY_SELECTION_PREPARING
PRODUCT_COMMITMENT = APPROVED
```

e job:

```text
PREPARE_TECHNOLOGY_SELECTION_CONTEXT
```

o worker deve:

1. aceitar o project id textual;
2. localizar a revisão de catálogo PUBLISHED válida;
3. localizar exatamente um profile ativo;
4. preparar o snapshot;
5. persistir `technology_selection_contexts`;
6. persistir artifact;
7. executar a transição oficial;
8. marcar contexto READY;
9. avançar o projeto;
10. persistir evento;
11. concluir operation/job sem retry.

Nenhum `22P02`.

## Continuação do pipeline

Não basta corrigir apenas o primeiro INSERT.

Validar também que o project id textual atravessa as próximas etapas compatíveis do pipeline, no mínimo até onde os contratos permitem sem decisão humana:

```text
selection context
→ inventory
→ baseline draft/revision
→ baseline gate
```

Se uma etapa posterior ainda falhar pelo mesmo problema de tipo, a task não está concluída.

# Retry / estado atual do manual E2E

O projeto manual real possui job já criado e tentou executar duas vezes.

Estado observado:

```text
project:
  financas-familiares-lab-1

workflow:
  PROJECT_DISCOVERY v3

state:
  TECHNOLOGY_SELECTION_PREPARING

job:
  PREPARE_TECHNOLOGY_SELECTION_CONTEXT

attempts observed:
  1 → 22P02
  2 → 22P02
```

A correção deve permitir retomar esse mesmo job/projeto, respeitando a política atual de retry.

Não:

- apagar o job;
- zerar attempts manualmente;
- recriar projeto;
- recriar gate;
- reaprovar PRODUCT_COMMITMENT;
- editar banco runtime manual para "fazer passar".

Se a política de retry já tiver esgotado o job, investigar o mecanismo oficial de recuperação existente e documentar como retomar sem manipulação ad hoc.

# Testes obrigatórios

## A. Regression com project id textual

Criar projeto de teste com ID textual semelhante ao fluxo real, por exemplo:

```text
financas-familiares-test-1
```

NÃO usar UUID como project id nesse cenário.

Executar o pipeline real de `PREPARE_TECHNOLOGY_SELECTION_CONTEXT`.

Validar:

```text
job/operation concluídos
context READY
project avançado
evento persistido
sem 22P02
```

## B. Integridade referencial

Validar que as tabelas tecnológicas referenciam corretamente o projeto textual.

Cobrir inserts/reads relevantes de:

```text
technology_selection_contexts
technology_baselines
technology_baseline_revisions
technology_baseline_gates
```

e outras tabelas afetadas pela migration.

## C. Compatibilidade com UUID textual

Projetos cujo `projects.id` seja uma string UUID válida também devem continuar funcionando.

O objetivo é ampliar compatibilidade para qualquer `projects.id` válido, não quebrar fixtures históricos.

## D. Pipeline posterior

Com project id textual, executar as próximas etapas tecnológicas automatizáveis que usam as mesmas estruturas.

Validar que não há novo:

```text
22P02
foreign key violation
operator does not exist
type mismatch
```

## E. Migration

Rodar migrations em banco descartável do zero.

Validar:

- schema final correto;
- FKs presentes;
- índices presentes;
- constraints relevantes preservadas.

Se houver teste de upgrade a partir de schema anterior, adicionar/usar quando possível.

## F. Falhas funcionais continuam fail-closed

Preservar testes para:

- catálogo PUBLISHED ausente;
- zero profile ativo;
- mais de um profile ativo;
- item inválido;
- compatibility rule inválida;
- estado de workflow incompatível;
- projeto arquivado;
- predecessor inválido.

A correção de tipo não pode relaxar guardas funcionais.

# TST-02 / isolamento obrigatório

Todo teste PostgreSQL deve usar exclusivamente banco descartável:

```text
naamive_test_*
naamive_e2e_*
```

Nunca executar teste contra:

```text
naamive
```

O runner deve remover o banco mesmo em falha.

Não iniciar servidor/worker manual durante o aggregate.

Não permitir que worker real consuma fixtures automatizadas.

# Manual E2E — preservação obrigatória

Preservar integralmente o projeto real:

```text
financas-familiares-lab-1
```

e seus registros atuais.

Não executar testes automatizados contra ele.

Não limpá-lo.

Não alterar seu estado por SQL manual.

Após a correção e certificação, o manual E2E deve ser retomado do mesmo ponto.

# Validações obrigatórias

Após implementar:

```bash
npm run build
npm test
npm run e2e
git diff --check
git status --short
```

Se houver teste focado específico, executar antes do aggregate.

Relatar contagens exatas.

Falhas históricas conhecidas devem ser classificadas contra a baseline existente; não criar nova baseline para falha causada pela mudança.

# Critérios de aceite

A task só está concluída quando:

- [ ] causa raiz do `22P02` estiver confirmada;
- [ ] todas as colunas tecnológicas que representam `projects.id` tiverem tipos coerentes;
- [ ] migration aditiva nova corrigir o schema sem reescrever migration antiga;
- [ ] project id textual funcionar em `PREPARE_TECHNOLOGY_SELECTION_CONTEXT`;
- [ ] o job concluir sem retry por tipo;
- [ ] o contexto ficar `READY`;
- [ ] o projeto avançar pela transição oficial;
- [ ] pipeline posterior relevante funcionar com ID textual;
- [ ] IDs UUID-textuais antigos continuarem funcionando;
- [ ] guardas funcionais permanecerem fail-closed;
- [ ] FKs/índices/constraints relevantes forem preservados;
- [ ] testes PostgreSQL usarem banco descartável;
- [ ] aggregate não introduzir regressão nova;
- [ ] banco runtime `naamive` não for usado por testes;
- [ ] projeto manual `financas-familiares-lab-1` não for alterado pelos testes;
- [ ] `git diff --check` passar;
- [ ] nenhum commit/push/reset/clean/rebase/merge for executado pelo agente.

# Não fazer

Não:

- mudar `projects.id` para UUID;
- renomear o projeto manual;
- recriar o projeto manual;
- gerar UUID paralelo apenas para satisfazer F5;
- fazer cast de project id textual para UUID;
- editar migration histórica publicada;
- remover FK para "resolver" o erro;
- relaxar constraints sem necessidade;
- corrigir apenas `technology_selection_contexts` sem mapear o restante do pipeline;
- usar mocks quando existe infraestrutura PostgreSQL real;
- rodar testes contra `naamive`;
- apagar job/retry real;
- manipular estado do projeto manual via SQL;
- fazer commit;
- fazer push;
- fazer reset;
- fazer clean;
- fazer rebase;
- fazer merge.

# Evidência esperada no retorno do agente

Ao concluir, informar:

1. causa raiz confirmada;
2. todas as tabelas/colunas afetadas;
3. migration criada e estratégia de evolução;
4. arquivos modificados;
5. comportamento com project id textual;
6. resultado do teste focado de `PREPARE_TECHNOLOGY_SELECTION_CONTEXT`;
7. evidência de continuação do pipeline tecnológico;
8. resultado de migration do zero;
9. resultado de `npm run build`;
10. resultado de `npm test`;
11. resultado de `npm run e2e` com contagens exatas;
12. lista exata de falhas, se houver;
13. nomes dos bancos descartáveis criados/removidos, se disponíveis;
14. confirmação de que `naamive` não foi usado por testes;
15. confirmação de que `financas-familiares-lab-1` não foi alterado;
16. estado atual esperado do job manual para retomada;
17. `git diff --check`;
18. `git status --short`;
19. confirmação de que não houve commit/push/reset/clean/rebase/merge.

Não declarar PASS se houver regressão nova.
