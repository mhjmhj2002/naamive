---
task: F5-09
status: TODO
---

# F5-09 — Contexto de seleção tecnológica imutável

## Referências

- [Planning: workflow, seleção de versão, gates e comandos](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 4, 8](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Dependência de execução: a F5-10 deve ser executada antes, pois publica o workflow v3 e o estado `TECHNOLOGY_SELECTION_PREPARING` no qual este comando opera; sem esse estado publicado o comando não tem guard de estado válido.

## Implementar

1. Implementar `PREPARE_TECHNOLOGY_SELECTION_CONTEXT` (worker, somente em `TECHNOLOGY_SELECTION_PREPARING`): fixa, na mesma operação, uma `technology_catalog_revision` `PUBLISHED`, o Perfil Tecnológico `ACTIVE` dentro desse snapshot e as regras ativas aplicáveis, em um contexto imutável.
2. Registrar no contexto `technology_catalog_revision_id`, perfil e regras do snapshot, junto de hash, ator, correlação e evidência; a criação do `DRAFT` usa exclusivamente esse snapshot e mudanças posteriores nas tabelas correntes não alteram revisão pendente ou aprovada.
3. Implementar a regra de versão: uma nova revisão de baseline sempre reinicia a preparação e obtém o snapshot global `PUBLISHED` então selecionável, preservando o contexto anterior para histórico.
4. Impedir criar o `DRAFT` na ausência de revisão publicada, perfil ativo no snapshot, item selecionável, regra consistente ou resolução válida, registrando erro explicável e sem produzir baseline parcial.

## Aceite e comandos

Cobrir preparação válida, ausência de revisão publicada/perfil/item/regra, restart preservando contexto anterior, `Archival` cancelando contexto e evidência de contexto imutável no ArtifactStore.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check