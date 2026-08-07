---
task: F5-21
status: TODO
---

# F5-21 — Aceite consolidado da Fase 5

## Referências

- [Planning: critério de aceite da Fase 5](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 1-10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Auditoria: veredito e ordem recomendada](../PHASE_5_TECHNOLOGY_BASELINE_AUDIT.md)

## Implementar

1. Provar a jornada completa Catálogo → Perfil → Projeto → Technology Baseline → Módulo sempre por referências versionadas, em um repositório descartável, com compromisso de produto aprovado.
2. Provar seeds/catálogo/perfil: executar o mesmo pacote duas vezes sem duplicar; publicação inicial com exatamente as categorias, itens, perfil e regras definidos; somente `TYPESCRIPT_MODULAR_MONOLITH` ativo como perfil e `MICROSERVICES` cadastrado porém indisponível; API retorna o snapshot publicado e opções selecionáveis; engine sem referência aos nomes.
3. Provar atomicidade da publicação e a baseline: falha de schema/referência/cardinalidade/compatibilidade `ERROR`/estado ativo/persistência não deixa revisão `PUBLISHED` incompleta; hash e associações congeladas só existem para a revisão publicada; inventário resolve fatos sanitizados no contexto; a UI monta o `DRAFT` com IDs; fato desconhecido/ambíguo/item inativo permanece como evidência sem integrar a baseline.
4. Provar módulo e evolução: antes da aprovação, API e UI recusam o primeiro módulo; depois do gate, proposta, arquitetura, work item, QA e Dev conservam a mesma revisão de baseline e referências exatas; revisão posterior cria novo contexto/gate sem modificar registros autorizados; evolução futura por nova versão dos seeds exige capacidade implementada e validada, sem alterar contrato central da engine, workflow, endpoints genéricos, enums tecnológicos ou migrations.
5. Provar legado e auditoria: projeto v2 em `PRODUCT_COMMITMENT` consultável e legado executando a jornada sem baseline retroativa; timeline, SSE e evidências auditáveis sem revelar conteúdo sensível nem executar código do repositório.

## Comandos finais

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate
npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

Marcar F5-01 a F5-21 `DONE` somente quando todos os cenários obrigatórios passarem, o pacote de seeds rodar duas vezes sem duplicação, nenhum conteúdo sensível/tecnológico livre persistir e a jornada v3 estiver integralmente demonstrada com legado v2 preservado.