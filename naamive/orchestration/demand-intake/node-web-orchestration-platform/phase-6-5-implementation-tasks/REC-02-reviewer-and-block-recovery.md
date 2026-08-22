---
task: REC-02
status: TO DO
title: Recuperação de reviewer e blocks
depends_on: [AUT-03, GAT-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# REC-02 — Recuperação de reviewer e blocks

## Objetivo e problema corrigido

Eliminar limbos de reviewer indisponível/falho e tornar assistência, routing,
especialista, retry e escalada um fluxo autônomo. Corrige a falha terminal de
review que volta a espera sem novo block e a assistência apenas registrada por API.

## Contexto, atual e esperado

F6 possui lifecycle e entidades de block, mas ausência inicial e falha posterior
de reviewer não convergem pelo mesmo recovery. O runtime deve tentar reviewer
alternativo, runtime elegível, assistência e especialista; só então abrir gate
humano autorizado, sempre com block deduplicado e contexto preservado.

## Invariantes

- reviewer nunca é o produtor e exceção não dispensa `agent_id` distinto;
- falha terminal cria/correlaciona block antes de deixar acceptance em espera;
- assistência/advisory recomenda; não decide requisito, arquitetura, risco ou gate;
- resolução reenfileira apenas o dispatch permitido, sem nova acceptance;
- retry/restart/reopen não duplica block, review ou decisão terminal;
- escalada só ocorre por política, materialidade ou automação esgotada.

## Componentes prováveis

Worker, `assurance.ts`, reviewer selector, runtime policies, `work_blocks`,
assistance proposals, routing matrix, gates GAT-01, reconciler e projeções.

## Dependências e restrições

Depende de AUT-03 e GAT-01. Preserva fatos F3/F4 nativos, não inventa papel sem
responsabilidade distinta e não usa reconcile manual como caminho ordinário.

## Estratégia de implementação e compatibilidade

Unificar indisponibilidade inicial/falha terminal; abrir block idempotente;
aplicar estratégia ordenada de reeleição/fallback/assist/routing; despachar
especialista; abrir gate apenas se necessário; reconciliar acceptances legadas
em espera sem reinterpretar decisão anterior.

## Critérios de aceite

- zero reviewer e reviewer terminalmente falho geram block e saída operacional;
- reviewer alternativo/runtime permitido são tentados automaticamente;
- assistência/especialista são efetivamente despachados;
- resolução reentra no review correto; recorrência escala conforme política;
- nenhuma parada fica sem motivo, autoridade, decisões e continuação.

## Testes obrigatórios

Zero reviewers, reviewer inelegível/falhando, fallback, runtime alternativo,
exceção válida/expirada, assistência, routing por categoria, resolução/reabertura,
recorrência, cancelamento concorrente, restart e idempotência PostgreSQL.

## Riscos e evidências esperadas

Riscos: loop de reviewers, auto-review e advisory executando decisão. Evidências:
tentativas/independence checks, block lifecycle, dispatches de assistência,
routing/gates auditados e E2E sem limbo.
