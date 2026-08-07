---
task: F5-19
status: TODO
---

# F5-19 — Testes de integração de inventário, workflow e múltiplas revisões

## Referências

- [Planning: testes e validação (itens 4-5)](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 1-10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: suítes `src/inventory.e2e.test.ts`, `src/phase3.e2e.test.ts`, `src/http-acceptance.e2e.test.ts`

## Implementar

1. Consolidar integração de inventário: resolução ativa/inativa, desconhecida e ambígua; crash/retry antes/depois da escrita; mudança de `HEAD` entre enfileiramento e leitura; worktree detached no SHA; symlink, submódulo, path fora da allowlist, arquivo excessivo, manifesto malformado, segredo e arquivo não suportado; confirmar ausência de execução, exposição sensível e criação/alteração no Catálogo.
2. Consolidar workflow e múltiplas revisões: compromisso aprovado → preparação do contexto → inventário resolvido → `DRAFT` expandido → aprovação → módulo; uma revisão posterior reinicia o contexto, pode adotar nova revisão de catálogo/perfil e abre novo gate sem alterar baseline antiga nem módulo ativo; validar bloqueio antes do gate e a herança da revisão ao módulo, work item, QA e Dev.

## Aceite e comandos

Cobrir os dois grupos determinísticos isolados por cenário, sem credenciais/custo/chamadas reais, trabalho em worktree detached no SHA e auditabilidade no ArtifactStore.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check