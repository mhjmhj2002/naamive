---
task: F4-01
status: DONE
---

# F4-01 — Contratos neutros, versionados e validados

## Referências

- [Plano: contratos e invariantes](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: P0-14](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)
- [Schemas canônicos](../phase-4-contracts/)

## Implementar

1. Carregar e validar, antes de persistir ou despachar, os três schemas Draft 2020-12 `naamive://agent-runtime/v1/...`; rejeitar propriedades extras e referências/conteúdo inválidos.
2. Definir tipos e interfaces do domínio para request, attempt result, adapter, `AI Runtime`, `SecretReference`, erro sanitizado, uso e evidência, sem tipos para credenciais ou payload bruto.
3. Implementar apenas `CODEX_CLI` e `OPENAI_COMPATIBLE_HTTP`; adapters não criam jobs, não alteram estado canônico nem executam transições.
4. Garantir IDs de correlação, classificação, política/versão, referências por hash e chave de idempotência; não duplicar os schemas em contratos divergentes.

## Aceite e comandos

Cobrir request/resultados válidos e inválidos, URI/versionamento, propriedades extras, referências sem conteúdo e ausência de segredo em tipo, API, log e evidência.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
git -C /home/mhj/git/naamive diff --check
```
