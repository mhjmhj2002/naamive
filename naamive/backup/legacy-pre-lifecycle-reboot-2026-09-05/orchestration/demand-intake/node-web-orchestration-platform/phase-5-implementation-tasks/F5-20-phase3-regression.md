---
task: F5-20
status: DONE
---

# F5-20 — Regressão Fase 3, coexistência v2/v3 e legado sem baseline

## Referências

- [Planning: referências aplicadas, regressão e legado](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 7, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: suítes `src/phase3.e2e.test.ts`, `src/phase3-http.e2e.test.ts`, `src/product-discovery.e2e.test.ts`

## Implementar

1. Preservar a materialização de módulo, suas revisões e o gate individual para projetos legados v2 em `PRODUCT_COMMITMENT`, sem inserção retroativa de evento ou baseline; projeto v2 permanece consultável e identificado como `BASELINE_NOT_REQUIRED_LEGACY`.
2. Ajustar os testes E2E F3 existentes que inserem projetos diretamente em `PRODUCT_COMMITMENT` com `PROJECT_DISCOVERY, 2`: manter cenários legados v2 e acrescentar setup com baseline aprovada para cenários v3, sem quebrar os cenários legados.
3. Provar que projeto v3 não pode iniciar Dev se alguma referência obrigatória de baseline estiver ausente, e que legado v2 continua materializando e entregando módulo sem baseline retroativa.
4. Garantir robustez da trigger de igualdade de referência com operações aditivas/reconciliação existentes (ex.: FKs `ON DELETE SET NULL` de migração 022), sem contrato rígido que trave auditoria ou recuperação.

## Aceite e comandos

Cobrir materialização/entrega de módulo legado v2 sem baseline, cenário v3 sem referência obrigatória bloqueando Dev, coexistência v2/v3, não conversão retroativa e ausência de regressão nas suítes F3.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
