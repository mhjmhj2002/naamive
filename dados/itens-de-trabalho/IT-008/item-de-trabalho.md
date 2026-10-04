# IT-008 — Camada Web Responsiva de Projetos, Visualização da Direção e Suíte Integrada

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `938944f3-c6f6-4ee5-9151-678e3dd82ef3` |
| Código | `IT-008` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Estender a camada web HTTP e templates responsivos com Bootstrap para navegação e acompanhamento do Projeto (listagem de projetos, detalhes, histórico de etapas, submissão de pareceres de auditoria e visualização da Direção do Projeto consolidada), integrando à navegação de Necessidade e executando uma suíte completa de testes de ponta a ponta local.
* **Fronteira técnica:** Servidor HTTP (`src/web/`), rotas/controllers de projeto, templates HTML responsivos (`src/web/templates.ts`) e testes integrados ponta a ponta (`tests/`).
* **Dependências de outros itens:** `IT-007`.
* **Contratos lógicos observados:** Rotas web para projetos (`/projetos`, `/projetos/:id`), visualização da Direção do Projeto aprovada, link bidirecional com a Necessidade de origem (`N-001`), restrição de cancelamento exclusivo pelo Owner e exibição responsiva.
* **Decisões locais autorizadas:** Design de templates e componentes Bootstrap alinhados à identidade visual existente, layout de cards de etapas e pareceres.

## Critérios Técnicos de Aceitação

1. **Navegação Web Responsiva:** Rotas HTTP operacionais e templates HTML renderizando a lista de projetos e o detalhe do projeto com badges de status, etapas e auditorias.
2. **Exibição da Direção do Projeto:** Exibição clara e destacada da Direção do Projeto quando o status for `FORMADO`.
3. **Cancelamento do Owner na Web:** Ação de cancelamento acessível com exigência e validação de credencial/identidade do Owner (`mhj`).
4. **Suíte Completa de Testes End-to-End:** Bateria de testes de ponta a ponta cobrindo toda a jornada da EV-002 (Criação via bootstrap → Formação → Auditoria → Disponibilização da Direção) com 100% de sucesso.
5. **Verificação Estrita:** `npm run typecheck`, `npm run build` e `npm test` executados sem erros.

## Execução e Evidências

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `src/web/templates.ts`: Implementadas funções `renderizarListaProjetos` e `renderizarDetalhesProjeto`, badges Bootstrap de status (`obterClasseBadgeStatusProjeto`), estilização gradiente da Direção do Projeto, cards de etapas de formação e pareceres de auditoria, além de link bidirecional entre Necessidades e Projetos.
  - `src/web/servidor-web.ts`: Implementadas as rotas HTTP de Projeto (`GET /projetos`, `GET /projetos/:id`, `POST /projetos/:id/etapas`, `POST /projetos/:id/parecer-auditoria`, `POST /projetos/:id/cancelar` e `GET /api/projetos/:id/direcao`), com integração plena de persistência e validação de autoridade do Owner.
  - `src/server.ts`: Injetados `servicoProjeto` e `repositorioProjeto` na inicialização do servidor web na composição do bootstrap.
  - `tests/it008-camada-web-projeto.test.ts`: Bateria abrangente de 7 testes de ponta a ponta cobrindo navegação, renderização, registro de etapas, emissão de pareceres, exibição da Direção aprovada, cancelamento pelo Owner e jornada end-to-end da EV-002.
* **Resultado de testes locais:**
  - `npm run typecheck`: 0 erros (tipagem estrita com TypeScript).
  - `npm run build`: Compilação limpa sem advertências.
  - `tests/it008-camada-web-projeto.test.ts`: 7/7 testes aprovados.
  - Suíte completa do projeto (`npm test`): 8/8 arquivos de teste e 58/58 testes aprovados (100% de sucesso).
* **Conclusão técnica:** Todos os critérios técnicos de aceitação do `IT-008` foram plenamente atendidos. A cadeia técnica de Itens de Trabalho da EV-002 (IT-005, IT-006, IT-007 e IT-008) encontra-se 100% concluída.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Conclusão pelo Ator Engenheiro de Software.
