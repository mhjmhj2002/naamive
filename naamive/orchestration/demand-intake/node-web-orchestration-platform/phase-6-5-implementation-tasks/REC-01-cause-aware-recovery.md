---
task: REC-01
status: DONE
title: Recovery orientado pela causa
depends_on: [LR-01, AUT-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# REC-01 — Recovery orientado pela causa

## Objetivo e problema corrigido

Selecionar recovery pela causa e distinguir retry técnico, restart, resume/
reconcile, rework com evidência e recuperação de integração. Corrige a UI que
chama restart para tentativas com evidência, payload técnico exigido do usuário,
estados recuperáveis sem saída e blockers externos inconsistentes.

## Contexto, atual e esperado

O backend possui operações robustas dispersas, mas projeção e UI escolhem ações
incompatíveis. O servidor deve derivar causa, delivery, SHA, findings, tentativa,
worktree e única próxima ação; automação executa recovery quando seguro e humano
atua apenas quando materialidade/política exigir.

## Invariantes

- retry reutiliza contexto quando a tentativa falhou transitoriamente sem efeito;
- restart só cria tentativa nova quando não há evidência a preservar;
- resume/reconcile trata lease/processo/handoff incerto antes de repetir efeito;
- rework preserva commits, delivery, SHA, finding e rodada;
- integração usa causa específica: transiente, defeito, divergência ou aplicada
  sem registro;
- nenhuma ação exige payload técnico derivável no client.

## Componentes prováveis

Novo recovery service, development/integration services, worker/reconciler,
worktree/Git, endpoints de retry/restart/rework, projections e audit events.

## Dependências e restrições

Depende conceitualmente de LR-01 e funcionalmente de AUT-01: toda nova attempt,
reservation ou job deve respeitar a fronteira transacional do scheduler. GAT-01
e GAT-03 são guardrails para eventual decisão humana, sem ampliar a fronteira
funcional. Não corrige reviewer/block F6 (REC-02), não apaga tentativa ou
worktree ambíguo e não oferece mais de uma ação incompatível por estado/causa.

Contrato de pré-validação publicado em
[`REC-01-cause-aware-recovery-prevalidation.md`](REC-01-cause-aware-recovery-prevalidation.md):
`EFFECT_UNKNOWN ⇒ RECONCILE BEFORE RETRY`, matriz de footprints, semântica das
ações, `RecoveryDecision` auditável, integração AUT-01 e fronteira REC-02.

## Estratégia de implementação e migração

Implementar a taxonomia e matriz versionadas já pré-validadas; centralizar
`RecoveryClassifier` e `RecoveryExecutor`; resolver contexto no servidor;
executar/persistir decisão idempotente; reconciliar estado intermediário;
mapear estados legados sem ação e preservar evidência.

## Critérios de aceite

- falha transitória usa retry; sem output terminal usa restart; evidência/finding
  usa rework; lease/handoff incerto usa resume/reconcile;
- `REWORK_ELIGIBLE` e `WAITING_FOR_ESCALATION` sempre têm saída válida;
- UI não monta delivery/SHA/findings;
- integração bloqueada expõe ação específica e auditada;
- resolução de blocker limpa projeção ativa e preserva histórico;
- repetição concorrente não duplica tentativa ou efeito.

## Testes obrigatórios

Timeout, quota, lease perdida, processo morto, sem output, commits existentes,
QA finding, worktree dirty/missing/diverged, merge/push ambíguo, payload adulterado,
idempotência, restart do worker e migração de estados em limbo.

## Riscos e evidências esperadas

Riscos: repetir efeito já aplicado, perder commits e classificar causa errada.
Evidências: taxonomia/matriz versionada, recovery decisions, relatórios JSON/
Markdown, eventos/projeções e E2E por causa.

## Evidência de implementação — 2026-08-23

Os dois findings da auditoria de `9e9bdaf0` foram fechados: o executor agora
possui fencing persistente por claim UUID e geração monotônica, e o finding
permanece `OPEN` durante o agendamento de rework. A transição para
`FIXED_PENDING_REVALIDATION` ocorre somente quando F3 persiste evidência de um
commit corretivo auditável.

- `RECOVERY_POLICY:v1` centraliza causa, certainty, footprint e uma única ação
  entre `RETRY`, `RESTART`, `RESUME`, `RECONCILE`, `REWORK`,
  `RECORD_AND_CONTINUE` e `INTEGRATION_RECOVERY`;
- `recovery_decisions` persiste decisão, versionamento, fingerprint,
  idempotência, operation/evento, estado de execução e lineage de convergência;
- o executor revalida estado/versão, retoma decisões persistidas e impede
  repetição quando o efeito é desconhecido;
- restart e rework criam nova attempt exclusivamente pelo scheduler AUT-01;
  retry reutiliza delivery, worktree e job, preservando contador e backoff;
- reconciliação Git distingue `NOT_APPLIED`, `APPLIED_UNRECORDED` e
  `DIVERGED`, incluindo merge/push e fechamento da operation de integração;
- liberação por recovery solicita
  `scheduleEligibleWorkItems('RECOVERY_CAPACITY_RELEASED')` pós-commit;
- endpoints e adapters v2 ignoram payload técnico como autoridade, sob a
  autenticação/RBAC legítima de GAT-03; o comportamento legado fora do v2 foi
  preservado;
- projeções publicam decisão, causa, razão e continuação conhecida sem expor
  botões técnicos contraditórios ou antecipar REC-02.

Validação: migrations `056`–`060`, build, suítes REC-01 e regressões diretamente
afetadas passaram. A suíte global manteve somente as quatro falhas
históricas já auditadas em `inventory.e2e.test.ts` (`FAILED` esperado versus
`RETRYABLE` atual), sem falha nova.
