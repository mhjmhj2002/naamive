---
task: F5-04
status: TODO
---

# F5-04 — Seeds versionados do Catálogo Tecnológico

## Referências

- [Planning: carga inicial de categorias, itens, perfil e regras; publicação inicial](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 3, 9](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)

## Implementar

1. Criar os seis arquivos de seed versionados com envelope comum `schema_version`, `catalog_revision` e `records`, todos declarando o mesmo `schema_version` e o mesmo `catalog_revision`: `technology-categories.json` (as 20 categorias e suas cardinalidades), `technology-catalog-items.json` (itens ativos e inativos), `technology-profiles.json`, `technology-profile-items.json`, `technology-compatibility-rules.json` e `technology-catalog-revision.json`.
2. Replicar exatamente o conteúdo definido no planning: perfil único ativo `TYPESCRIPT_MODULAR_MONOLITH`, `MICROSERVICES` reconhecível mas inativo, `NODEJS_22` com `version_governance=REQUIRED` e `>=22 <23`, e ausência de itens `NONE`/`DEFER`.
3. Publicar somente o perfil `TYPESCRIPT_MODULAR_MONOLITH` como ativo; não cadastrar regras para itens inexistentes ou inativos de forma a inventar regra que apenas repita a composição do perfil.
4. Validar cada seed por JSON Schema versionado antes de qualquer escrita; divergência de envelope entre os seis arquivos deve falhar antes da persistência.

## Aceite e comandos

Cobrir presença e cardinalidade das 20 categorias, itens ativos/inativos e regras exatas do planning, perfil único ativo e `MICROSERVICES` inativo, envelope coerente entre os seis arquivos e ausência de item `NONE`/`DEFER`.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
git -C /home/mhj/git/naamive diff --check