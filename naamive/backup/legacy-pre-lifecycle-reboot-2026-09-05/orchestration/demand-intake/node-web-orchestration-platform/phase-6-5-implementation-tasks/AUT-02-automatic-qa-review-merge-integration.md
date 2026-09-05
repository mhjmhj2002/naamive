---
task: AUT-02
status: DONE
prevalidation_status: PREVALIDATION_READY_FOR_IMPLEMENTATION
implementation_completed_at: 2026-08-24
title: Pipeline automático QA, review, merge e integração
depends_on: [AUT-01, REC-01, LR-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# AUT-02 — Pipeline automático QA → review → merge → integração

Contrato normativo obrigatório antes de qualquer código:
[`AUT-02-automatic-qa-review-merge-integration-prevalidation.md`](AUT-02-automatic-qa-review-merge-integration-prevalidation.md)
(`AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1`). A implementação está `DONE`.

## Objetivo e problema corrigido

Implementar o contrato versionado para encadear output, QA determinístico,
review independente, `ACCEPT`, merge, candidata, validação e integração no
`WORK_ITEM_DELIVERY:v2`.

## Contexto, atual e esperado

Hoje o worker conclui desenvolvimento em `QA_IN_PROGRESS`/`EVIDENCE_REVIEW` com
`SUBMIT_QA`, mas não cria o próximo job. No fluxo esperado, cada handoff grava
intenção, job e evento atomicamente; somente `ACCEPT` habilita promoção; falha
gera retry, finding ou block pela causa; integração reavalia dependentes e macro
estado sem comando humano.

## Invariantes

- sucesso técnico, QA, ACCEPT, merge e integração são fatos distintos;
- QA/review/merge usam o mesmo snapshot imutável e SHA;
- somente Assurance persiste `ACCEPT`; ausência de policy/reviewer nunca autoaceita;
- REC-01 é a única autoridade para `EFFECT_UNKNOWN` e recovery;
- merge é por WI, mas a candidata imutável é por module revision/round e só
  nasce quando todo o conjunto requerido estiver pronto;
- revision stale antes de `PRE_EFFECT` é fail-closed (`SUPERSEDED`/`NO_OP`);
- merge/candidata/integração têm fencing, idempotência e reconciliação Git;
- AUT-03, REC-02 e GAT-02 não são antecipadas; LR-02 é a única autoridade macro.

## Componentes prováveis

Worker, jobs/outbox, QA, assurance, `phase3.ts`, Git delivery, candidate services,
integration, agregador LR-02, eventos/SSE e reconciliador.

## Dependências e restrições

Depende de AUT-01, REC-01 e LR-02. Não amplia seletores F6 (AUT-03), não aceita
risco material e não substitui recuperação específica por retry genérico.

## Estratégia de implementação e compatibilidade

Implementar snapshot, ledger de intents, executores e projeções exatamente como
prevalidados. Endpoints v2 tornam-se reemit/reconcile governado; v1 permanece
legado, sem bypass de saga.

## Critérios de aceite

- output cria QA automático sobre snapshot congelado;
- QA pass cria review independente; só `ACCEPT` autoriza merge;
- QA/review/validation negativos produzem finding, rework ou stop corretos;
- merge por WI e candidata agregada por revision/round são auditáveis e exatamente uma vez;
- criação/finalização da candidata promovem todos os membros do manifest
  atomicamente; integração parcial de subset é proibida;
- crash/replay/concurrency convergem sem repetir efeito externo;
- WI integrado emite reavaliação LR-02, sem mutação macro direta;
- recurso já `CANCELLED` é fenced/no-op; cancelamento funcional é GAT-02.

## Testes obrigatórios

Executar a matriz completa da prevalidation em PostgreSQL real, incluindo
happy path, QA failure, `REWORK`/`BLOCK`/`ESCALATE`, no reviewer, stale SHA,
REC-01 Git recovery, crash/replay, concorrência, revision antiga, recurso já
`CANCELLED`, candidata multi-WI, succession/pre-effect e coexistência legada.

## Riscos e evidências esperadas

Riscos: autoaceite, merge duplicado, SHA obsoleto e saga parcial. Evidências:
ledger de handoffs, intents/hashes, eventos ordenados, manifesto Git e resultados
E2E do fluxo sem cliques técnicos.

## Evidência de conclusão

A migration `065_phase_6_5_automatic_assurance_integration.sql` publicou o
ledger imutável de snapshots, QA, intents fenced, merges por WI, manifests
multi-WI, validation reports e integração coletiva. O runtime passou a encadear
automaticamente QA, Assurance independente, `ACCEPT`, merge, candidata,
validação, integração e um único `MACRO_REEVALUATE`, mantendo endpoints v2 como
reemit/reconcile e preservando o fluxo legado.

As regressões AUT-02 usam PostgreSQL real e Git real para provar QA/review,
ausência de autoaccept, REC-01 `NOT_APPLIED`/`APPLIED_UNRECORDED`, barreira N−1,
concorrência do último merge, rollback coletivo controlado, manifest imutável,
finalizers concorrentes, replay e projeção compartilhada por todos os membros.
`npm run build`, as regressões AUT-01/REC-01/LR-02/Assurance/Phase 3 e os testes
AUT-02 passam. A dívida histórica de quatro asserts de inventory
(`FAILED` esperado versus `RETRYABLE` vigente) permanece preexistente e fora do
escopo, conforme checkpoint de continuidade.

## AUT-02-FIX-01 — RequiredWorkItemSet:v1 exato

A auditoria posterior identificou que a primeira implementação usava apenas
`plan.payload.work_items.length` como autoridade de membership. O fix preserva
o identificador normativo já materializado, `payload.work_item_id`, deriva e
ordena o conjunto congelado da plan revision `APPROVED`, deriva o conjunto
observado apenas dos WIs da mesma plan revision/module revision/round e exige
igualdade exata. Identidade inválida, ausente, extra ou duplicada falha fechada.

O manifest agora congela `required_work_item_set`, `observed_work_item_set`, o
`plan_work_item_id` de cada membro e o fingerprint
`RequiredWorkItemSet:v1`, ligado também a plan revision, module revision e
round. A validação da candidate recompõe e confere lista, identidade persistida
e fingerprint. Testes unitários e PostgreSQL/Git E2E cobrem `A/B/C`, mesma
contagem `A/B/X`, missing, extra, duplicata no plano e no observado, ordem
diferente, lineage errado, manifest e replay. AUT-02 permanece `DONE` após o
fechamento validado deste finding; AUT-03, REC-02 e GAT-02 não foram iniciadas.

## AUT-02-FIX-02 — identidade PlanWorkItem materializada imutável

A migration `067_phase_6_5_immutable_plan_work_item_identity.sql` persiste
`module_plan_revision_id` e `plan_work_item_id` no Work Item v2 materializado.
O PostgreSQL valida a identidade contra a plan revision `APPROVED`, confere
project/module/module revision/round, impede duplicação na mesma geração e
torna toda a lineage normativa imutável. O backfill usa o payload apenas uma
vez e somente quando a correspondência histórica é inequívoca; legado v1 e v2
sem plan lineage continuam preservados.

`RequiredWorkItemSet:v1` não depende mais de `work_items.payload`: o observed
set vem de `work_items.plan_work_item_id`. O delivery candidate congela essa
identidade no snapshot/hash, o manifest multi-WI a propaga por membro e a
candidate validation recompõe a prova a partir do Work Item e do delivery
candidate persistidos. Alterar `payload.work_item_id` não muda elegibilidade.
Testes PostgreSQL cobrem mutation, lineage incorreta, duplicidade, concorrência,
replay e legado; AUT-02 permanece `DONE`. AUT-03, REC-02 e GAT-02 não foram
iniciadas.
