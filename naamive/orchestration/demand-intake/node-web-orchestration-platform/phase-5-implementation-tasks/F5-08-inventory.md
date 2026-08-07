---
task: F5-08
status: TODO
---

# F5-08 — Comando `START_TECHNOLOGY_INVENTORY` e inventário read-only

## Referências

- [Planning: Technology Inventory e comandos mínimos](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 3, 7](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/discovery-agent-jobs.ts`, `src/git-delivery.ts` (worktree), `src/artifacts.ts`
- Estrutura persistente de `technology_inventory`: criada na F5-02 (migration aditiva); esta task apenas a utiliza/popula e não inventa DDL.

## Implementar

1. Implementar o comando `START_TECHNOLOGY_INVENTORY` (executado por worker): exige contexto de seleção válido (fixado por `PREPARE_TECHNOLOGY_SELECTION_CONTEXT`) e opera exclusivamente sobre o SHA vinculado ao projeto (`repository_sha`).
2. Criar a operação/job/evidência **antes da leitura** do repositório, e somente então inspecionar a worktree Git temporária detached no SHA persistido (nunca o `HEAD` atual nem a árvore do operador), confirmando `rev-parse <sha>` igual ao SHA reservado antes e depois da leitura; falha sem snapshot se divergirem.
3. Resolver os fatos exclusivamente contra o snapshot `PUBLISHED` fixado (mesmo `technology_catalog_revision_id` do contexto) e persistir `technology_inventory` read-only (tabela da F5-02) ligado ao projeto, SHA, execução e `technology_catalog_revision_id`, seguindo o fluxo "detectar fato sanitizado → resolver contra o snapshot `PUBLISHED` → gerar snapshot imutável da detecção e da resolução".
4. Gravar para cada fato `source_path`, `detector_code`, `confidence`, valor resumido, resultado (`RESOLVED_ACTIVE`, `RESOLVED_INACTIVE`, `UNKNOWN_CATALOG_ITEM`, `AMBIGUOUS_CATALOG_ITEM`) e, quando resolvido, `catalog_item_id`; nunca incluir conteúdo integral, credencial, segredo, variável de ambiente ou log bruto.
5. Usar lista fechada de caminhos/parsers, limites de bytes/profundidade/tamanho de campos, rejeição de symlink/submódulo/path fora da allowlist/manifesto malformado; o comando **nunca cria itens de catálogo** e o inventário nunca cria, ativa, inativa ou altera o Catálogo Tecnológico.

## Aceite e comandos

Cobrir resolução ativa, item inativo, tecnologia desconhecida e ambígua, contexto ausente/inválido, mudança de `HEAD` entre enfileiramento e leitura, worktree detached no SHA, criação de operação/job/evidência antes da leitura, rejeições de segurança e ausência de execução/exposição/criação no Catálogo. Suíte alvo de inventário: `src/inventory.e2e.test.ts` (integração de inventário).

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check