---
task: F4-09
status: DONE
---

# F4-09 — Auditoria, evidências, uso e observabilidade

## Referências

- [Plano: auditoria e observabilidade](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: retenção e redaction](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Emitir a timeline completa de seleção, tentativa, retry, quota, fallback, validação, conclusão e bloqueio com correlação e fatos canônicos.
2. Persistir evidências JSON/Markdown com hash e referências de execução/tentativa; registrar configuração, política, uso/custo e ator/motivo somente em formato sanitizado.
3. Criar logs, spans e métricas mínimas aprovadas, com labels de baixa cardinalidade e sem conteúdo, IDs únicos, segredo, header, ambiente ou comando sensível.
4. Aplicar retenção mínima de 365 dias e tombstone auditável; nunca deixar alteração administrativa apagar o histórico.

## Aceite e comandos

Cobrir todos os eventos, hash/correlação, métricas de sucesso/falha/retry/fallback/quota/timeout/custo, auditoria antes/depois sanitizada e sentinelas de segredo/conteúdo em todos os destinos.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
