# IT-002 — Núcleo de Domínio da Necessidade, Regras de Transição e Compromisso

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `e5dcae16-17b5-4a67-a068-d06efceabfbe` |
| Código | `IT-002` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar as classes e entidades puras de domínio em TypeScript para a Necessidade, catálogo oficial de status da Necessidade, validação de transições de ciclo de vida, registro de pareceres/qualificações por atores competentes e geração do Compromisso consolidado após `APROVADO`.
* **Fronteira técnica:** Camada de domínio puro (`src/domain/`), repositórios/interfaces de persistência e serviços de domínio desacoplados de bibliotecas externas de transporte ou interface gráfica.
* **Dependências de outros itens:** `IT-001`.
* **Contratos lógicos observados:**
  1. Catálogo oficial de status da Necessidade mantido isolado de histórico e resultados;
  2. Validação estrita de autoridade (apenas o Owner autenticado pode emitir `APROVADO`);
  3. Geração do Compromisso como visão derivada consolidada apenas após decisão humana válida;
  4. Rejeição de transições ou resultados inválidos sem alteração do status corrente.
* **Decisões locais autorizadas:** Nomenclatura interna de tipos, métodos e funções utilitárias do domínio, mantendo fidelidade estrita à terminologia em Português do Brasil.

## Critérios Técnicos de Aceitação

1. **Invariantes de Domínio:** Entidades do domínio TypeScript garantem que uma Necessidade não pode transicionar diretamente sem passar pelos marcos normativos requeridos.
2. **Separação Conceitual:** Testes unitários comprovam que Resultados do Processo, pareceres de atores e decisões do Owner não são tratados como status.
3. **Composição do Compromisso:** Função de composição do Compromisso gera visão consolidada idêntica à especificação quando a decisão `APROVADO` estiver presente e falha se invocada em outro estado.
4. **Cobertura Unitária:** Suíte de testes unitários locais com execução via `npm test` cobrindo todos os cenários válidos e inválidos de transição de ciclo de vida.

## Execução e Evidências

* **Executor:** Engenheiro de Software (Ator agêntico)
* **Artefatos produzidos / alterados:**
  * `src/domain/tipos.ts`: Enumerações oficiais e imutáveis para `StatusNecessidade`, `TipoResultadoProcesso`, `DecisaoMaterialOwner`, `TipoNecessidade` e `AtorCompetenteNecessidade`.
  * `src/domain/erros.ts`: Hierarquia de exceções de domínio puro (`ErroDominio`, `TransicaoInvalidaErro`, `AutoridadeInvalidaErro`, `InvarianteVioladaErro`).
  * `src/domain/valores.ts`: Interfaces de dados, contratos de histórico de atividade, resultados do processo, decisões do Owner e compromisso da necessidade.
  * `src/domain/necessidade.ts`: Entidade raiz encapsulando regras de integridade, histórico imutável de atividades, separação estrita de resultados e decisões, transições canônicas (`EM_FORMACAO` → `EM_QUALIFICACAO` → `AGUARDANDO_DECISAO` → `EM_PROJETO` → `ATENDIDA` / `CANCELADA`).
  * `src/domain/servico-compromisso.ts`: `ServicoCompromissoNecessidade` para validação e composição segura da visão consolidada após aprovação formal do Owner.
  * `src/domain/repositorio-necessidade.ts`: Interface desacoplada `RepositorioNecessidade` para persistência.
  * `src/index.ts`: Ponto central de exportação modularizada do domínio.
  * `tests/it002-dominio-necessidade.test.ts`: 13 testes unitários locais cobrindo criação, invariantes obrigatórias, emissão de resultados por atores competentes, rejeição de autoridade inválida, bloqueio de transições ilegítimas, decisões do Owner com usuário autenticado, consolidação do compromisso e transições terminais.
* **Resultado de testes locais:**
  * `npm run typecheck`: 0 erros encontrados (`tsc --noEmit`).
  * `npm run build`: Compilação de TypeScript para JavaScript executável em `dist/` com sucesso.
  * `npm test`: 17 testes executados em 2 arquivos (`tests/it001-fundacao.test.ts` e `tests/it002-dominio-necessidade.test.ts`), 17 aprovados (100% de sucesso).
* **Conclusão técnica:** O núcleo de domínio puro da Necessidade foi implementado com fidelidade rigorosa aos modelos normativos, satisfazendo plenamente todos os critérios técnicos de aceitação.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-03 — Execução técnica concluída com 100% de sucesso nos testes locais.
