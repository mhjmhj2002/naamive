# IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `13e54fa2-d018-4927-9c98-444855d045d2` |
| Código | `IT-020` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `CONCLUIDO` |
| Resultado do Processo | `EXECUCAO_CONCLUIDA` |

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

## Execução e Evidências

* **Ator responsável:** Engenheiro de Software (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`).
* **Resultado do Processo:** `EXECUCAO_CONCLUIDA`.
* **Arquivos modificados / criados:**
  - `src/web/templates.ts`: inclusão de badges de conclusão (`obterClasseBadgeConclusao`) e métodos (`obterClasseBadgeMetodo`), templates responsivos `renderizarPainelVerificacao` (matriz de conformidade, métricas e listagem) e `renderizarDetalhesVerificacao` (cards de critérios, histórico de evidências, formulários de coleta e avaliação estrita), e atualização da navbar mestre.
  - `src/web/servidor-web.ts`: injeção de dependências `servicoVerificacao` e `repositorioVerificacao`, rotas GET `/verificacao`, POST `/verificacao/resultados`, GET `/verificacao/:id`, POST `/verificacao/:id/criterios`, POST `/verificacao/:id/evidencias`, POST `/verificacao/:id/avaliar` e POST `/verificacao/:id/reavaliar-background`. Suporte dual a HTML e JSON.
  - `src/server.ts`: injeção de `servicoVerificacao` e `repositorioVerificacao` no bootstrap do servidor web.
  - `tests/it020-camada-web-verificacao.test.ts`: suíte de 5 testes de integração ponta a ponta cobrindo navegação web, visualização de matriz, coleta de evidências, confrontação estrita com motor, reavaliação no worker assíncrono e detecção de divergências.
* **Validação Técnica Local:**
  - `npm run typecheck`: 0 erros de tipagem.
  - `npm run build`: compilação limpa sem erros.
  - `npm test`: **20 arquivos de teste e 143 testes automatizados aprovados (100% de sucesso sem regressões)**.

## Handoff para Integração da Realização

Com a conclusão do `IT-020` (`EXECUCAO_CONCLUIDA`), todos os quatro Itens de Trabalho da EV-005 (`IT-017`, `IT-018`, `IT-019`, `IT-020`) foram integralmente construídos e validados. O trabalho na EV-005 avança para atuação do **Integrador da Realização** (`.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md`) para fechamento do Plano de Realização e emissão do parecer agregado de realização.

