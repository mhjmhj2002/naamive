# IT-012 — Camada Web Responsiva de Coordenação, Despacho de Handoffs e Suíte Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `0a9629c9-1cb5-4662-9682-28ed516fcc60` |
| Código | `IT-012` |
| Entrega de Valor proprietária | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Módulo de proveniência | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `CONCLUIDO` |

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

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `src/domain/coordenacao.ts`: inclusão do método `registrarDecisaoHumanaLiberacao` para liberação soberana do Owner de trabalhos em `AGUARDANDO_DECISAO_HUMANA` ou `BLOQUEADO`.
  - `src/domain/motor-coordenacao.ts`: inclusão de `trabalhosPossiveis` no diagnóstico e contrato de `ResultadoAvaliacaoElegibilidade`.
  - `src/application/servico-aplicacao-coordenacao.ts`: inclusão do método `liberarDecisaoHumanaOwner` e exposição da lista de trabalhos em `POSSIVEL` na visão agregada de coordenação.
  - `src/web/templates.ts`: atualização do layout mestre com link de Coordenação na navbar, badges de condições operacionais e funções de template responsivas `renderizarPainelCoordenacao`, `renderizarDetalhesTrabalhoCoordenado` e `renderizarDetalheHandoff`.
  - `src/web/servidor-web.ts`: inclusão das rotas `/coordenacao` (GET), `/coordenacao/trabalhos/:id` (GET), `/coordenacao/trabalhos/:id/despachar` (POST), `/coordenacao/handoffs/:id` (GET), `/coordenacao/retornos` (POST) e `/coordenacao/trabalhos/:id/decisao-owner` (POST), com suporte dual HTML e JSON, além de integração de rastreabilidade com o M-004.
  - `src/server.ts`: injeção de `servicoCoordenacao` e `repositorioCoordenacao` na instância do servidor web durante o bootstrap operacional.
  - `tests/it012-camada-web-coordenacao.test.ts`: suíte completa cobrindo navegação, despacho com um clique, inspeção estruturada do handoff, validação de autoridade do Owner `mhj` e jornada end-to-end de coordenação e promoção de sucessores.
* **Resultado de testes locais:**
  - `npm run typecheck`: 100% aprovado sem erros de tipagem.
  - `npm run build`: compilação TypeScript concluída com êxito.
  - `npm test`: 12 suítes de teste executadas, 86 testes aprovados com 100% de sucesso (incluindo as suítes das EVs anteriores sem regressão).
* **Conclusão técnica:** Todos os 6 critérios técnicos de aceitação foram estritamente cumpridos. Camada web de coordenação totalmente operacional.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Engenheiro de Software
