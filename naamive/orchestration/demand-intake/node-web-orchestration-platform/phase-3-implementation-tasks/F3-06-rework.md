---
task: F3-06
status: DONE
---

# F3-06 — Rework limitado e revalidação auditável

## Referências

- [Roadmap: F3-06](../01_DELIVERY_ROADMAP.md)
- [Planejamento: workflows, QA e rework](../09_PHASE_3_PLANNING.md)
- Runtime: `src/phase3.ts`, workflows/migrations F3 e testes Phase 3.

## Implementar

1. Autorizar rework com operação idempotente, contador monotônico e uma única correção ativa por `work_item + module_revision`.
2. Exigir finding/delivery/SHA pertinente e persistir `rework-decision` JSON/Markdown com justificativa, limite e referências.
3. Escalonar crítico, terceira rodada, escopo, arquitetura ou repetição; gate humano decide risco, escopo, arquitetura ou encerramento.
4. Preservar histórico e impedir fechamento implícito; somente revalidação F3-05 fecha finding.
5. Para finding de candidata: atribuição segura ou item corretivo, reabertura do módulo e candidata nova; preservar a antiga.

## Aceite e comandos

Cobrir duas rodadas, terceira bloqueada, crítico, replay/concorrência, risco aceito, revalidação e finding de candidata que reabre módulo.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
docker compose up -d postgres
npm run migrate && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

## Conclusão

Implementado em 2026-08-04: decisões de rework persistidas e idempotentes,
referenciando finding, delivery e SHA; índice que impede correção ativa
concorrente por `work_item + module_revision`; limite de duas rodadas com
gate humano auditável para crítico, repetição, escopo, arquitetura e terceira
rodada; e revalidação que permanece a única operação que fecha findings.
Findings de candidata preservam a candidata supersedida, reabrem o módulo e
mantêm a atribuição segura aos itens corretivos.
