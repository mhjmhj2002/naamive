---
task: F4-08
status: DONE
---

# F4-08 — Persistência versionada, segredos, classificação e egress

## Referências

- [Plano: modelo, operação e segurança](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: P0-17 e P0-18](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Criar `025_phase_4_agent_runtime.sql` exatamente dentro do contrato físico aprovado: tabelas, FKs, índices, imutabilidade, retenção, auditoria e reconciliação de `DISPATCHED`.
2. Implementar cadastro administrativo auditável e versionado de runtime/configuração/política; congelar a versão usada em cada execução e nunca editar política publicada ou tentativa terminal.
3. Implementar `EnvironmentSecretResolver` somente para referências allowlisted no ambiente; validar namespace, ambiente, adapter, auth, endpoint TLS/host/porta, modelo e timeout sem persistir valores.
4. Aplicar classificação, egress, paths e redaction antes de dispatch; DeepSeek aceita somente os hosts, modelos, classificações e limites aprovados; `RESTRICTED` bloqueia.

## Aceite e comandos

Cobrir migration/restart, unicidade e transições, versão congelada, segredo ausente/fora do namespace, rotação, endpoint não permitido, TLS, classificação/egress e sentinelas de segredo em banco, backups, logs, API e ArtifactStore.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
