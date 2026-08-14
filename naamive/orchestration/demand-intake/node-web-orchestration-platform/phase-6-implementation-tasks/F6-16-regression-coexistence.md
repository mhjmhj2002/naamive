---
task: F6-16
status: TODO
depends_on: [F6-13, F6-14, F6-15]
---

# F6-16 — Regressão e coexistência das Fases 3, 4 e 5

## Diretrizes para o agente

Não aceite regressão como efeito colateral da supervision. Isole a correção no caminho F6 quando houver quebra de legado. Mantenha `TO_DO`/`DOING`/`DONE` auditáveis; no final atualize status, valide o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Executar e corrigir regressões F3 de findings, rework, QA, gates e `INTEGRATION_BLOCKED`, confirmando que F6 apenas correlaciona e respeita sua autoridade.
- [ ] **TO_DO:** Executar e corrigir regressões F4 de contrato, adapters, retry/fallback, quota, execução `SUCCEEDED` e `BLOCKED_NO_EXECUTOR_AVAILABLE` em requests fora de F6.
- [ ] **TO_DO:** Executar e corrigir regressões F5 de baseline, discovery, planejamento de módulos, projeções e runtime de desenvolvimento.
- [ ] **TO_DO:** Auditar API, logs, SSE e ArtifactStore para ausência de prompt, payload bruto, stdout/stderr, segredo, path interno ou conteúdo não permitido introduzido por F6.

## Aceite

Build, unitários, integração e E2E F3/F4/F5/F6 verdes; diferenças de comportamento somente nos dispatches explicitamente opt-in F6.

