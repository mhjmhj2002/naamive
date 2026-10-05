# IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `13e54fa2-d018-4927-9c98-444855d045d2` |
| Código | `IT-020` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Implementar as rotas HTTP e templates responsivos em Bootstrap 5 para inspeção e acompanhamento da verificação de software (`/verificacao` e `/verificacao/:id`), permitindo ao operador e ao Owner visualizar a matriz de conformidade técnica, cartões de critérios com badges coloridas de conclusão (`CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `DIVERGÊNCIA_ENCONTRADA`), laudos técnicos fundamentados, e construir uma suíte integrada end-to-end comprovando toda a jornada da EV-005 sem regressões.
* **Fronteira técnica:** Servidor HTTP (`src/web/`), templates HTML responsivos (`src/web/templates.ts`), layout mestre e suíte completa de testes de ponta a ponta (`tests/`).
* **Dependências de outros itens:** `IT-019`.
* **Contratos lógicos observados:** Rotas REST e visualização responsiva, links na navbar mestre do sistema, design escuro consistente (Dark Mode do NAAMIVE), feedback de divergências e suporte dual (HTML e JSON).
* **Decisões locais autorizadas:** Diagramação visual da matriz de conformidade, formatação dos cards de critérios e estilização de badges de laudo.

## Critérios Técnicos de Aceitação

1. **Navegação Web Responsiva:** Rotas `/verificacao` e `/verificacao/:id` ativas e renderizando templates Bootstrap 5 integrados à navbar global.
2. **Visualização da Matriz de Conformidade:** Exibição clara de resultados avaliados, total de critérios atendidos, critérios com evidência insuficiente e divergências apontadas.
3. **Badges de Conclusão Técnica:** Destaque visual por cores para cada conclusão técnica (`CRITÉRIO_DEMONSTRADO` em verde, `CRITÉRIO_NÃO_DEMONSTRADO` em vermelho, `EVIDÊNCIA_INSUFICIENTE` em amarelo/aviso, etc.).
4. **Suíte Completa End-to-End e Verificação Estrita:** Bateria de testes de ponta a ponta validando toda a jornada da EV-005 na web e confirmando aprovação total em `npm run typecheck`, `npm run build` e `npm test` sem regressões.

## Handoff do IT-019

Com a conclusão do `IT-019` (`EXECUCAO_CONCLUIDA`), a camada de persistência transacional (`RepositorioVerificacaoPostgres`), o serviço de aplicação (`ServicoVerificacao`) e a integração assíncrona com o worker foram consolidados. A dependência prévia do `IT-020` foi plenamente satisfeita. O item avança para **`PRONTO_PARA_EXECUCAO`** e fica disponível para atuação do **Engenheiro de Software** na construção da interface web responsiva e da suíte integrada de verificação.

