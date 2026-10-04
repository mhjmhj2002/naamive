# IT-016 — Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `853756c8-5bc9-40d7-a8b7-d403452fca94` |
| Código | `IT-016` |
| Entrega de Valor proprietária | [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](../../entregas-de-valor/EV-004/entrega-de-valor.md) |
| Módulo de proveniência | [M-004 — Contexto e Rastreabilidade](../../modulos/M-004/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar as rotas HTTP e templates responsivos em Bootstrap 5 para inspeção e navegação da rastreabilidade (`/rastreabilidade` e `/rastreabilidade/:entidade/:codigo`), permitindo ao operador e ao Owner visualizar a árvore genealógica de governança da Necessidade até os trabalhos, linha do tempo interativa de eventos e decisões, badges de classificação epistêmica (`CONHECIDO`, `INFERIDO`, `PROPOSTO`, `DESCONHECIDO`), filtragem por finalidade declarada, diagnóstico visual de lacunas e contradições, e construir uma suíte integrada end-to-end comprovando toda a jornada da EV-004.
* **Fronteira técnica:** Servidor HTTP (`src/web/`), templates HTML responsivos (`src/web/templates.ts`), layout mestre e suíte completa de testes de ponta a ponta (`tests/`).
* **Dependências de outros itens:** `IT-015`.
* **Contratos lógicos observados:** Rotas REST e visualização responsiva, links na navbar mestre do sistema, design escuro consistente (Dark Mode do NAAMIVE), feedback de diagnósticos e suporte dual (HTML e JSON).
* **Decisões locais autorizadas:** Diagramação visual da árvore causal, formatação dos cards de linha do tempo e estilização de badges epistêmicas.

## Critérios Técnicos de Aceitação

1. **Navegação Web Responsiva:** Rotas `/rastreabilidade` e `/rastreabilidade/:entidade/:codigo` ativas e renderizando templates Bootstrap 5 integrados à navbar global.
2. **Visualização da Linhagem Causal:** Exibição clara da ascendência desde a Necessidade até os Itens de Trabalho e Resultados do Processo.
3. **Filtro de Contexto por Finalidade:** Interface com seleção de finalidade (ex.: `AUDITAR_FORMACAO`, `DESPACHAR_TRABALHO`) exibindo o pacote contextual sintetizado e proporcional.
4. **Badges Epistêmicas e Indicador de Vigência:** Destaque visual para o nível de certeza do registro e diferenciação entre registro ativo e histórico superado.
5. **Suíte Completa End-to-End e Verificação Estrita:** Bateria de testes de ponta a ponta validando toda a jornada da EV-004 na web e confirmando aprovação total em `npm run typecheck`, `npm run build` e `npm test` sem regressões.

## Execução e Evidências

* **Executor:** Engenheiro de Software (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`)
* **Artefatos produzidos / alterados:**
  - `src/web/templates.ts`: Inclusão do link de "Rastreabilidade" e da menção à "EV-004" na navbar responsiva global; implementação dos helpers visuais `obterClasseBadgeEpistemica` e `obterClasseBadgeDiagnostico`; implementação das visões completas `renderizarPainelRastreabilidade` e `renderizarDetalhesRastreabilidade` com suporte a métricas, inspeção genealógica, filtragem por finalidade e linha do tempo de proveniência.
  - `src/web/servidor-web.ts`: Injeção de `servicoContexto` e `repositorioContexto` nas dependências do servidor HTTP; implementação das rotas `GET /rastreabilidade`, `POST /rastreabilidade/auditar`, `GET /rastreabilidade/consulta` e `GET /rastreabilidade/:entidade/:codigo`, com suporte dual de conteúdo (HTML responsivo e JSON).
  - `src/server.ts`: Injeção de `servicoContexto` e `repositorioContexto` no bootstrap da aplicação web.
  - `tests/it016-camada-web-rastreabilidade.test.ts`: Suíte de testes automatizados com 5 testes de integração ponta a ponta validando painel web, linhagem causal, badges epistêmicas, pacotes proporcionais por finalidade declarada e auditoria.
* **Resultado de testes locais:**
  - `npm run typecheck`: 0 erros (aprovado).
  - `npm run build`: compilação TypeScript concluída com 100% de sucesso.
  - `npx vitest run tests/it016-camada-web-rastreabilidade.test.ts`: 5 testes executados e aprovados com 100% de sucesso.
  - `npm test`: 16 arquivos de teste e 110 testes unitários e de integração executados com 100% de aprovação (0 falhas).
* **Conclusão técnica:** Todos os 5 critérios técnicos de aceitação foram cumpridos integralmente. O módulo web e a suíte integrada da EV-004 estão plenamente operacionais.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 (Conclusão técnica integral de IT-016)
