---
task: F4-05
status: DONE
---

# F4-05 — Políticas de seleção determinísticas

## Referências

- [Plano: política de seleção](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: P0-16](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Resolver política publicada e imutável por agente/tarefa/criticidade, com primário, fallback, versão e motivo estruturado persistidos.
2. Aplicar ordem obrigatória: cancelamento, runtime/configuração habilitados, classificação/egress, paths, criticidade/escopo/Codex-only, política e disponibilidade conhecida.
3. Impedir que preferência, custo ou pedido do navegador ultrapasse segurança, classificação, criticidade ou política; rejeição é `POLICY_BLOCKED`.
4. Permitir administração auditada de runtime/política sem JSON livre, override implícito ou seleção por IA/preço.

## Aceite e comandos

Cobrir cada perfil aprovado, Codex-only, runtime desabilitado, paths/classificação/egress negados, preferência conflitante, versão congelada e razão de seleção reproduzível.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
