# IT-004 — Camada Web Responsiva, Adaptadores HTTP e Suíte de Testes Locais

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `ec19cf4b-5775-47e2-8e10-c1b7147a46fa` |
| Código | `IT-004` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a camada web responsiva e o servidor HTTP (Node.js/TypeScript) com rotas para registro, consulta, atualização, submissão de pareceres e aprovação da Necessidade, acompanhada de interface visual responsiva (Bootstrap/HTML/CSS) e suíte integrada de testes locais verificando a jornada completa de EV-001.
* **Fronteira técnica:** Servidor HTTP (`src/web/`), rotas/controllers, templates ou assets da interface web responsiva e suíte de testes de integração ponta a ponta local (`tests/e2e/` ou `tests/integration/`).
* **Dependências de outros itens:** `IT-003`.
* **Contratos lógicos observados:** Todos os contratos da Especificação de EV-001: interface responsiva apresentando a posição atual, histórico distinguível, bloqueio visual para decisões não autorizadas e disponibilização do Compromisso da Necessidade.
* **Decisões locais autorizadas:** Framework HTTP (ex: Express, Fastify ou Hono para Node.js), mecanismo de renderização de interface (ex: SSR com templates EJS/Pug ou HTML/Bootstrap estático servido pela aplicação) e ferramental de testes de ponta a ponta (ex: Supertest com Vitest).

## Critérios Técnicos de Aceitação

1. **Interface Responsiva Operante:** Telas responsivas acessíveis via navegador e rotas HTTP correspondentes permitindo criar Necessidade, acompanhar histórico e registrar pareceres.
2. **Decisão do Owner:** Tela com ação explícita de aprovação pelo Owner com validação de identidade e exibição imediata do Compromisso da Necessidade gerado.
3. **Suíte Integrada de Testes de Ponta a Ponta:** Bateria de testes automatizados locais que executa a jornada completa (Criação → Formação → Auditoria → Decisão do Owner → Geração do Compromisso → Disponibilização a M-002) e passa com 100% de sucesso.
4. **Verificação de Não Regressão:** Validação de que entradas inválidas ou transições proibidas retornam diagnósticos claros com código HTTP apropriado sem corromper o estado persistido.

## Execução e Evidências

* **Executor:** Ator Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `src/domain/repositorio-necessidade.ts`: Adicionado método `listarTodas()` na interface do repositório de domínio;
  - `src/infrastructure/database/repositorio-postgres.ts`: Implementação do método `listarTodas()` com hidratação completa de histórico, resultados e compromissos;
  - `src/infrastructure/database/repositorio-memoria.ts`: Implementação em memória (`RepositorioNecessidadeMemoria`) para testes isolados e suporte à camada web;
  - `src/web/templates.ts`: Templates HTML responsivos (com Bootstrap 5 via CDN) para layout mestre, listagem de necessidades, formulário de cadastro e tela de detalhes (incluindo painel de governança por atores, painel de decisão exclusiva do Owner e exibição consolidada do Compromisso disponível para M-002);
  - `src/web/servidor-web.ts`: Servidor HTTP nativo e adaptadores de rotas tratando `GET /`, `GET /nova`, `POST /necessidades`, `GET /necessidades/:id`, `POST /necessidades/:id/parecer-auditoria`, `POST /necessidades/:id/avancar-qualificacao`, `POST /necessidades/:id/recomendacao-qualificacao`, `POST /necessidades/:id/submeter-decisao`, `POST /necessidades/:id/decisao-owner` e API REST `GET /api/compromissos/:id`;
  - `src/index.ts`: Exportação central dos módulos da camada web e repositório;
  - `tests/it004-camada-web-responsiva.test.ts`: Suíte integrada de testes locais validando interface responsiva, autoridade estrita do Owner na decisão de compromisso, jornada ponta a ponta da EV-001 (com processamento assíncrono do worker e bootstrap de M-002) e verificação de não-regressão.
* **Resultado de testes locais:**
  - 31 de 31 testes executados com 100% de aprovação (`vitest run`);
  - Verificação de tipos TypeScript estrita sem erros (`npm run typecheck` / `tsc --noEmit`);
  - Compilação de distribuição de produção executada com sucesso (`npm run build` / `tsc`).
* **Conclusão técnica:** Todos os 4 critérios técnicos de aceitação de IT-004 foram plenamente cumpridos e verificados.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-03 (Registro pelo Ator Engenheiro de Software)
