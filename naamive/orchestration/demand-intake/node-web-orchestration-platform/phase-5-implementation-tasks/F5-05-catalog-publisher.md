---
task: F5-05
status: TODO
---

# F5-05 — Publicação transacional e idempotente da revisão do Catálogo

## Referências

- [Planning: publicação inicial do Catálogo e atomicidade](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 3, 9](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/artifacts.ts` (`putArtifact`/`reconcileArtifactIntents`), `migrations/005...025` (padrão DDL/trigger)

## Implementar

1. Implementar o publicador que carrega os seeds na ordem lógica (categorias → itens → perfis → itens de perfil → regras → publicação da revisão) e valida o conjunto inteiro antes de qualquer escrita: referências de categoria/item/perfil, compatibilidade categoria-item, cardinalidade de cada perfil, regras ativas de severidade `ERROR`, itens de perfil ativos no snapshot e hash esperado.
2. Criar o `DRAFT` global, calcular o hash canônico do conteúdo normalizado e, em uma única transação, persistir identidades, associações versionadas, hash, evidência e transição para `PUBLISHED`; qualquer falha reverte integralmente, sem revisão parcial.
3. Implementar publicação idempotente por `revision_number` e hash do pacote: executar o mesmo pacote duas vezes não duplica registros/associações; conflito com revisão já publicada falha explicitamente, sem sobrescrever histórico.
4. Ao concluir, persistir ator, correlação, hash do pacote e evidência canônica no `ArtifactStore`; não reativar silenciosamente categoria/item/perfil/regra alterada fora da seed.

## Aceite e comandos

Cobrir execução dupla do pacote sem duplicação, falha de schema/referência/cardinalidade/compatibilidade `ERROR`/estado ativo sem revisão `PUBLISHED` incompleta, hash e conteúdo exato da revisão inicial, e ArtifactStore com evidência de publicação.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check