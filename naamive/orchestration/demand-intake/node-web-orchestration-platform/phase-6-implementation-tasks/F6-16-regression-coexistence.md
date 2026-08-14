---
task: F6-16
status: DONE
depends_on: [F6-13, F6-14, F6-15]
---

# F6-16 — Regressão e coexistência das Fases 3, 4 e 5

## Diretrizes para o agente

Não aceite regressão como efeito colateral da supervision. Isole a correção no caminho F6 quando houver quebra de legado. Mantenha `TO_DO`/`DOING`/`DONE` auditáveis; no final atualize status, valide o diff, faça commit e push.

## Itens de implementação

- [x] **DONE:** Executar e corrigir regressões F3 de findings, rework, QA, gates e `INTEGRATION_BLOCKED`, confirmando que F6 apenas correlaciona e respeita sua autoridade.
- [x] **DONE:** Executar e corrigir regressões F4 de contrato, adapters, retry/fallback, quota, execução `SUCCEEDED` e `BLOCKED_NO_EXECUTOR_AVAILABLE` em requests fora de F6.
- [x] **DONE:** Executar e corrigir regressões F5 de baseline, discovery, planejamento de módulos, projeções e runtime de desenvolvimento.
- [x] **DONE:** Auditar API, logs, SSE e ArtifactStore para ausência de prompt, payload bruto, stdout/stderr, segredo, path interno ou conteúdo não permitido introduzido por F6.

## Aceite

Build, unitários, integração e E2E F3/F4/F5/F6 verdes; diferenças de comportamento somente nos dispatches explicitamente opt-in F6.

## Evidência executada — 2026-08-14 (reexecução final)

- `npm test`: aprovado após a correção de isolamento de falha do job `REVIEW`; preserva as regressões F3, F4 e F5, inclusive findings/rework/QA e os cenários F5 de manifesto malformado e retry antes/depois da persistência do inventário.
- `npm run e2e`: aprovado contra PostgreSQL local. O cenário dedicado `assurance.e2e.test.ts` executou falha real do reviewer, retry do mesmo dispatch, restart sem segunda decisão terminal, reviewer inelegível sem autoaceite, rework com revalidação e review independente versionado, recorrência sem progresso escalada, lifecycle completo de blocks, gates humanos, comandos idempotentes, cancelamento HTTP autorizado com precedência sobre review, SSE HTTP com cursor e replay/reconexão idempotente e projeções sanitizadas por projeto/módulo/work item/correlação.
- A cobertura F3 E2E consolidada continua validando deduplicação de findings, limite de duas rodadas e fechamento de finding somente pela QA posterior; F6 somente registra o handoff corretivo no domínio proprietário F3.
- O contrato de UI F6 é executado como E2E (`web-ui-f6-12.e2e.test.ts`): papel restringe comandos, confirmação/motivo/evidência são obrigatórios, EventSource não usa polling, expõe degradação/reconexão, possui região acessível e não contém conteúdo sensível.
- O caminho legado permanece opt-in: a política F6 só cria `work_acceptances` para seletores publicados; as execuções F3/F4/F5 sem essa política não recebem alteração de lifecycle.
