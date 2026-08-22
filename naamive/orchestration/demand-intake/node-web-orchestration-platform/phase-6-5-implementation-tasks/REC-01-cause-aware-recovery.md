---
task: REC-01
status: TO DO
title: Recovery orientado pela causa
depends_on: [LR-01]
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

Depende de LR-01. Não corrige reviewer/block F6 (REC-02), não apaga tentativa
ou worktree ambíguo e não oferece mais de uma ação incompatível por estado/causa.

## Estratégia de implementação e migração

Publicar taxonomia de causas e matriz causa→ação; centralizar classificação;
resolver contexto no servidor; executar/persistir decisão idempotente; reconciliar
estado intermediário; mapear estados legados sem ação e preservar evidência.

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
