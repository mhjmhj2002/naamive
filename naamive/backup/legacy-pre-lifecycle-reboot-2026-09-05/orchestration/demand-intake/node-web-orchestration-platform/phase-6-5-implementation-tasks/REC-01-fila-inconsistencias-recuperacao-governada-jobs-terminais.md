---
task: REC-01
status: TO_DO
title: Fila de Inconsistências e recuperação governada de jobs terminais
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-04
depends_on: [TST-02, UI-01, UI-02, F5-03-FIX-01]
context: NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
---

# REC-01 — Fila de Inconsistências e recuperação governada de jobs terminais

## Motivação

O manual E2E encontrou uma classe de falha arquitetural, não apenas um bug pontual.

Projeto real:

```text
financas-familiares-lab-1
```

Workflow/estado:

```text
PROJECT_DISCOVERY v3
TECHNOLOGY_SELECTION_PREPARING
```

Job:

```text
9f7d451c-5762-47cc-8918-4df049338c8b
PREPARE_TECHNOLOGY_SELECTION_CONTEXT
```

Operação:

```text
ead32d8b-2e75-4210-9324-b22561425993
```

O job falhou por `22P02` antes da correção de schema. Após esgotar a política de retries, o estado persistido ficou:

```text
status      = FAILED
attempts    = 3
last_error  = AGENT_EXECUTION_FAILED
```

A causa raiz foi posteriormente corrigida por `F5-03-FIX-01`/migration 077, porém o worker corretamente não volta a alugar jobs `FAILED`.

Resultado atual:

```text
falha transitória/defeito de software
→ retries automáticos
→ retries esgotados
→ FAILED terminal
→ causa corrigida posteriormente
→ nenhuma rota oficial para retomar
```

O histórico não deve ser adulterado com SQL manual.

Esse tipo de registro não é um “job para dar retry”; é uma **inconsistência operacional durável** que precisa entrar em um fluxo governado de recuperação.

---

# Objetivo

Criar uma **Fila de Inconsistências** persistente e auditável para falhas terminais recuperáveis, integrada aos mecanismos já existentes de recovery/reconciliation/stop surfaces.

O sistema deve:

1. detectar falha terminal relevante;
2. persistir uma inconsistência durável;
3. preservar integralmente job e operação originais;
4. projetar a inconsistência na leitura canônica;
5. expor uma ação de recuperação somente quando autorizada e segura;
6. criar uma **nova operação e um novo job de recuperação**, vinculados ao histórico original;
7. acompanhar sucesso/falha da recuperação;
8. resolver ou reclassificar a inconsistência sem apagar histórico;
9. permitir que o lifecycle continue normalmente após recuperação bem-sucedida.

---

# Princípios obrigatórios

## 1. Nunca ressuscitar o job antigo

É proibido usar solução equivalente a:

```sql
UPDATE jobs
SET status='RETRYABLE',
    attempts=0
WHERE id=...
```

O job original deve continuar terminal e imutável quanto ao seu histórico operacional:

```text
FAILED
attempts = 3
last_error = ...
```

A recuperação deve criar nova execução.

## 2. Preservar causalidade

A nova recuperação deve conseguir responder:

```text
qual inconsistência originou a recuperação?
qual operação falhou?
qual job falhou?
qual causa foi observada?
qual ação foi autorizada?
quem autorizou?
qual nova operação/job foi criado?
qual foi o resultado?
```

## 3. Idempotência

Cliques repetidos, retries HTTP, refresh da UI ou concorrência não podem criar múltiplas recuperações para a mesma geração de inconsistência.

## 4. Fail-closed

Não publicar ação de recuperação se:

- a inconsistência não for recuperável;
- a autoridade não estiver presente;
- o recurso tiver avançado por outro caminho;
- houver operação conflitante ativa;
- a geração esperada estiver stale;
- a causa exigir reconciliação antes de retry;
- não existir estratégia explicitamente suportada para o tipo de job.

## 5. Não criar “retry genérico de qualquer FAILED”

A recuperação deve ser explícita por estratégia/tipo de falha.

---

# Investigação obrigatória antes de implementar

Antes de alterar código:

1. ler `/AGENTS.md`;
2. ler esta task completa;
3. ler `NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md`;
4. inspecionar:
   - `src/recovery.ts`
   - `src/recovery-policy.ts`
   - `src/recovery-anchor.ts`
   - `src/state-action-projection.ts`
   - `src/worker.ts`
   - `src/reconciliation*.ts` e mecanismos correlatos
   - `src/automatic-assurance-integration.ts`
   - migrations de `recovery_decisions`
   - tabelas de pause/cancellation/reconciliation;
5. mapear como `reconcileCauseAwareRecovery()` funciona hoje;
6. mapear `recovery_decisions`, `execution_state`, claims, generations, idempotency e operações de recovery já existentes;
7. identificar quais invariantes atuais são específicas de:
   - work item;
   - delivery/worktree;
   - integration candidate;
8. decidir se a nova fila:
   - pode estender `recovery_decisions` sem enfraquecer contratos existentes; ou
   - precisa de uma entidade persistente dedicada, por exemplo `inconsistency_cases`.

**Não criar tabela nova antes de provar que o modelo atual não atende.**
**Não forçar jobs de projeto dentro de `recovery_decisions` se isso quebrar semântica/invariantes de work item/integration.**

Documentar a decisão arquitetural adotada no README/task log pós-certificação.

---

# Conceito de Fila de Inconsistências

A projeção conceitual deve suportar pelo menos:

```text
id
project_id
resource_kind
resource_id
source_operation_id
source_job_id
source_job_kind
cause_code
classification
severity
status
generation
recoverability
recommended_action
evidence_refs
created_at
updated_at
resolved_at
resolution_operation_id
```

Os nomes físicos podem variar conforme a arquitetura existente.

Estados mínimos esperados, ou equivalentes:

```text
OPEN
RECOVERY_PENDING
RECOVERY_RUNNING
WAITING_RECONCILIATION
RESOLVED
TERMINAL
SUPERSEDED
```

Se o mecanismo existente de recovery já possui estados equivalentes, reutilizá-los.

Severidade deve ser separada de status. A fila não deve pressupor que toda inconsistência seja `CRITICAL`.

Exemplo:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# Primeira estratégia obrigatória

Implementar suporte real para o caso encontrado:

```text
resource_kind = PROJECT
job_kind = PREPARE_TECHNOLOGY_SELECTION_CONTEXT
source job = FAILED
project state = TECHNOLOGY_SELECTION_PREPARING
workflow = PROJECT_DISCOVERY v3
```

A estratégia de recuperação deve:

1. validar que o job original está terminal;
2. validar que a operação original está terminal;
3. validar que o projeto ainda está no estado compatível;
4. validar que não existe contexto `READY` produzido por outra execução;
5. validar que não existe operação/job equivalente ativo;
6. preservar job/operação originais;
7. criar nova operação com identidade própria;
8. criar novo job `PREPARE_TECHNOLOGY_SELECTION_CONTEXT`;
9. ligar a nova execução à inconsistência e ao predecessor;
10. usar idempotency key determinística;
11. colocar a inconsistência em recuperação;
12. permitir que o worker execute o job novo normalmente;
13. após sucesso, marcar inconsistência como `RESOLVED`;
14. manter toda a cadeia auditável.

A nova execução deve usar o código normal de `prepareTechnologySelectionContext`, sem duplicar implementação do pipeline.

---

# Detecção da inconsistência

Quando um job suportado esgotar retries e virar terminal, a inconsistência deve ser registrada de forma transacional ou reconciliável.

Não aceitar janela silenciosa:

```text
job = FAILED
inconsistência ausente para sempre
```

Se não for seguro inserir o caso na mesma transação da falha, o reconciliador deve detectar deterministicamente a ausência e materializar o caso de forma idempotente.

Também deve haver cobertura para startup/reconciliation posterior encontrar um terminal órfão histórico e criar a inconsistência.

Isso é necessário para o projeto manual atual, cujo job já está `FAILED` antes da implantação desta task.

---

# Integração com projeção/UI

A fila não pode existir apenas no banco.

`STATE_ACTION_PROJECTION:v1` deve refletir o caso aberto de forma sanitizada.

Para o projeto manual atual, após a implementação e migration, a projeção deve deixar de parecer simplesmente parada/sem saída e mostrar algo semanticamente equivalente a:

```text
Inconsistência operacional aberta:
PREPARE_TECHNOLOGY_SELECTION_CONTEXT falhou após esgotar retries.

Próxima ação:
Recuperar operação
```

A ação deve vir por `ActionDescriptor`, nunca hardcoded no frontend.

Sugestão de capability/descriptor:

```text
RECOVER_FAILED_OPERATION
```

ou nome equivalente coerente com os contratos existentes.

A UI-02 deve continuar genérica:

```text
stop_surface.action_descriptor_id
→ descriptor
→ input_binding
→ command
```

Não criar special case de frontend para Technology Selection.

---

# Autoridade

Investigar capabilities existentes e escolher autoridade coerente.

A ação de recuperação é operacional/administrativa e deve exigir autorização explícita.

Não assumir automaticamente que qualquer usuário com `READ_PROJECT` pode recuperar.

A autorização deve ser revalidada no servidor.

---

# Concorrência e stale protection

A recuperação deve possuir fence/version/generation equivalente.

Cobrir no mínimo:

- dois requests simultâneos;
- refresh + novo clique;
- descriptor antigo após outra recuperação;
- inconsistência já resolvida;
- projeto avançado;
- contexto READY já criado;
- operação equivalente ativa.

Esperado:

```text
uma única nova operação/job
```

ou rejeição determinística `409`.

---

# Resultado de nova falha

Se a nova operação de recuperação falhar:

- não adulterar a execução original;
- não perder a inconsistência;
- incrementar geração/tentativa de recuperação de forma auditável ou criar decisão sucessora;
- reaplicar política apropriada;
- permitir escalonamento humano/terminal quando necessário;
- impedir loop infinito automático.

Não transformar a Fila de Inconsistências em retry infinito.

---

# Reconciliação

O mecanismo deve cobrir inconsistências de efeito desconhecido.

Antes de reexecutar uma operação potencialmente não idempotente, deve ser possível exigir:

```text
WAITING_RECONCILIATION
```

Neste primeiro caso (`PREPARE_TECHNOLOGY_SELECTION_CONTEXT`) provar por contratos/queries que é seguro criar a recuperação apenas após verificar ausência de efeito final (`READY`/evento/operation equivalente), ou usar reconciliador existente.

---

# Migração

Se schema novo/alterado for necessário:

- migration aditiva;
- não editar migrations históricas;
- preservar dados existentes;
- índices para fila aberta por projeto/status;
- constraints/FKs;
- uniqueness/idempotency coerente;
- permitir materializar inconsistência para jobs `FAILED` históricos suportados.

A migration não deve editar diretamente o job manual para “reabrir”.

---

# Testes obrigatórios

## A. Terminal → inconsistência

Criar projeto descartável com ID textual.

Levar `PREPARE_TECHNOLOGY_SELECTION_CONTEXT` a `FAILED` terminal de forma controlada.

Validar:

```text
job original FAILED
operation original FAILED
inconsistência OPEN
histórico original preservado
```

## B. Descoberta de terminal histórico

Criar cenário em que o job já está `FAILED` antes do reconciliador.

Rodar o mecanismo oficial.

Validar que a inconsistência é criada uma única vez.

Esse cenário representa o projeto manual atual.

## C. Recuperação governada

Corrigir/retirar a causa da fixture.

Executar a ação oficial de recuperação.

Validar:

```text
job original continua FAILED
nova operation criada
novo job criado
predecessor/source linkage presente
worker executa novo job
context READY
project avança
inconsistência RESOLVED
```

## D. Idempotência/concurrency

Dois requests concorrentes para recuperar a mesma geração:

```text
1 nova operation
1 novo job
```

## E. Stale/fail-closed

Cobrir:

- caso resolvido;
- versão/generation stale;
- projeto avançado;
- contexto já READY;
- operação equivalente ativa;
- sem autorização;
- workflow/version desconhecido;
- job kind sem estratégia suportada.

## F. Projeção

Validar:

- stop surface da inconsistência;
- causa sanitizada;
- `next_action`;
- descriptor autorizado;
- ausência do descriptor sem autoridade;
- `action_descriptor_id`;
- renderer UI-02 genérico.

## G. Nova falha da recuperação

Validar que uma recuperação que falha não cria loop infinito e mantém histórico/auditoria.

## H. Migration do zero

Executar todas as migrations em banco descartável e validar schema/constraints/indexes.

---

# TST-02 / segurança de testes

Todo teste PostgreSQL deve usar apenas:

```text
naamive_test_*
naamive_e2e_*
```

Nunca:

```text
naamive
```

Não iniciar server/worker manual durante aggregate.

Não usar o projeto real em testes automatizados.

---

# Projeto manual — preservação obrigatória

Preservar exatamente:

```text
project_id:
financas-familiares-lab-1

source job:
9f7d451c-5762-47cc-8918-4df049338c8b

source operation:
ead32d8b-2e75-4210-9324-b22561425993

job status:
FAILED

attempts:
3
```

Não:

- alterar status desse job;
- zerar attempts;
- recriar projeto;
- criar contexto manual por SQL;
- avançar projeto por SQL;
- criar job manual por SQL.

Após a implementação, o mecanismo oficial deve conseguir descobrir/materializar a inconsistência histórica desse job e oferecer a recuperação governada.

---

# Critérios de aceite

- [ ] existe conceito persistente/auditável de inconsistência ou extensão comprovadamente correta do recovery atual;
- [ ] terminal suportado é detectado;
- [ ] terminal histórico órfão é reconciliado;
- [ ] job/operação originais nunca são reabertos;
- [ ] nova recuperação cria nova operação/job;
- [ ] causalidade predecessor/source fica persistida;
- [ ] recovery é idempotente;
- [ ] concorrência é protegida;
- [ ] efeito desconhecido exige reconciliação;
- [ ] não há retry infinito;
- [ ] projeção mostra a inconsistência;
- [ ] UI recebe descriptor genérico;
- [ ] autorização é revalidada;
- [ ] fail-closed para casos não suportados;
- [ ] sucesso resolve a inconsistência;
- [ ] falha da recuperação permanece auditável;
- [ ] migration é aditiva;
- [ ] testes usam DB descartável;
- [ ] aggregate não introduz regressões novas;
- [ ] projeto manual não é alterado pelos testes;
- [ ] `git diff --check` passa;
- [ ] nenhum commit/push/reset/clean/rebase/merge é feito pelo agente.

---

# Validações obrigatórias

Executar:

```bash
npm run build
npm test
npm run e2e
git diff --check
git status --short
```

Executar antes testes focados da nova recuperação/fila.

Relatar contagens exatas e classificar qualquer falha contra a baseline conhecida.

---

# Retorno esperado do agente

Informar:

1. decisão arquitetural: extensão de recovery existente vs entidade dedicada;
2. por que a opção escolhida preserva invariantes;
3. migrations criadas;
4. arquivos modificados;
5. como terminal vira inconsistência;
6. como terminal histórico é descoberto;
7. como a recuperação cria nova operação/job;
8. como predecessor/source é persistido;
9. como idempotência e concorrência funcionam;
10. como reconciliação/effect-unknown é tratada;
11. como projeção/UI expõe a parada;
12. autoridade exigida;
13. evidência do teste focado;
14. resultado de build;
15. resultado de npm test;
16. resultado de npm run e2e com contagens;
17. lista exata de falhas;
18. bancos descartáveis criados/removidos;
19. confirmação de que `naamive` não foi usado nos testes;
20. confirmação de que `financas-familiares-lab-1` não foi alterado;
21. `git diff --check`;
22. `git status --short`;
23. confirmação de que não houve commit/push/reset/clean/rebase/merge.

Não declarar PASS se houver regressão nova.
