# IT-012 — Camada Web Responsiva de Coordenação, Despacho de Handoffs e Suíte Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `0a9629c9-1cb5-4662-9682-28ed516fcc60` |
| Código | `IT-012` |
| Entrega de Valor proprietária | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Módulo de proveniência | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `CRIADO` |

## Definição Técnica

* **Objetivo técnico:** Estender a camada web HTTP e templates responsivos em Bootstrap 5 para gestão e visualização da Coordenação do Trabalho (`/coordenacao`, `/coordenacao/trabalhos/:id`, `/coordenacao/handoffs/:id`), permitindo ao operador ou Owner disparar o despacho com um clique ("Delegar Próximo Avanço"), inspecionar handoffs gerados com suas referências recuperáveis, acompanhar o grafo de dependências e bloqueios, registrar retornos simulados/manuais, visualizar pendências soberanas do Owner com isolamento de identidade (`mhj`), e executar uma bateria integrada de testes end-to-end locais comprovando toda a jornada da EV-003.
* **Fronteira técnica:** Servidor HTTP (`src/web/`), rotas de coordenação, templates HTML responsivos (`src/web/templates.ts`), e suíte de testes de integração e ponta a ponta (`tests/`).
* **Dependências de outros itens:** `IT-011`.
* **Contratos lógicos observados:** Rotas HTTP para coordenação, visualização responsiva de trabalhos, handoffs e retornos, badges de condições operacionais (`POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, etc.), e integração de links na barra de navegação global.
* **Decisões locais autorizadas:** Layout visual das telas, formatação do painel de resumo de progresso, estilização das referências recuperáveis no handoff e componentes visuais de alertas de bloqueio.

## Critérios Técnicos de Aceitação

1. **Navegação Web Responsiva:** Rotas HTTP operacionais e templates HTML renderizando a lista de trabalhos coordenados, visualização do próximo avanço válido em destaque e detalhes completos do trabalho.
2. **Despacho com Um Clique:** Ação de delegação na interface web que dispara a geração e emissão do handoff, atualizando a condição operacional para `EM_EXECUCAO`.
3. **Exibição do Handoff com Contexto Recuperável:** Tela ou modal exibindo o pacote estruturado do handoff com todas as referências canônicas a Necessidade, Projeto, Módulo, EV, critérios observáveis de término e token de correlação.
4. **Visualização de Bloqueios e Decisões Humanas:** Exibição clara e diferenciada dos trabalhos bloqueados e dos que exigem decisão material soberana do Owner, com formulário protegido para liberação pelo usuário autenticado `mhj`.
5. **Suíte Completa de Testes End-to-End:** Bateria de testes de ponta a ponta cobrindo toda a jornada da EV-003 na interface web e na camada HTTP com 100% de sucesso.
6. **Verificação Estrita:** `npm run typecheck`, `npm run build` e suíte de testes (`npm test`) sem nenhuma falha ou regressão nas capacidades das EVs anteriores (EV-001 e EV-002).

## Execução e Evidências

* **Executor:** (A ser atribuído — Engenheiro de Software)
* **Artefatos produzidos / alterados:** (A preencher na execução)
* **Resultado de testes locais:** (A preencher na execução)
* **Conclusão técnica:** (A preencher na execução)

## Resultado do Processo

* **Resultado da Execução:** (A preencher na execução: `EXECUCAO_CONCLUIDA` ou `EXECUCAO_IMPEDIDA`)
* **Data / Registro:** (A preencher na execução)
