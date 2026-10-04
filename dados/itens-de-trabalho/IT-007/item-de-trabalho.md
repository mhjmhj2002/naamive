# IT-007 — Repositório PostgreSQL, Serviço de Aplicação de Projeto e Handoff M-001/M-002

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `b76f8324-9e3c-44f3-9bff-063c0a609789` |
| Código | `IT-007` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar o repositório PostgreSQL concreto para Projeto (com operações transacionais), os serviços de aplicação correspondentes aos casos de uso de bootstrap, avanço de formação e auditoria, e a integração concreta da `PortaIntegracaoProjeto` entre M-001 e M-002 (incluindo o worker em background para reconciliação assíncrona).
* **Fronteira técnica:** Camada de infraestrutura (`src/infrastructure/database/`), serviços de aplicação (`src/application/` ou `src/application/projeto/`) e adaptadores de integração entre módulos (`src/infrastructure/adapters/`).
* **Dependências de outros itens:** `IT-006`.
* **Contratos lógicos observados:** Casos de uso da Especificação da EV-002 (`solicitarBootstrapProjeto`, `registrarEtapaFormacao`, `registrarParecerAuditoria`, `obterProjetoPorId`, `obterDirecaoProjeto`), contrato da `PortaIntegracaoProjeto` e reconciliação idempotente com devolução de `jaExistente`.
* **Decisões locais autorizadas:** Estruturação de consultas SQL seguras (queries parametrizadas), gerenciamento de transações de banco de dados e estratégias de lock otimista/pessimista se necessário.

## Critérios Técnicos de Aceitação

1. **Repositório Transacional PostgreSQL:** Operações de salvar, atualizar, buscar por ID e buscar por Necessidade ID persistidas e recuperadas fielmente no banco de dados.
2. **Bootstrap Idempotente:** Invocação múltipla de solicitação de bootstrap para a mesma Necessidade retorna a instância existente sem erro ou duplicação (`jaExistente: true`).
3. **Sincronização com M-001:** Ao confirmar a materialização do Projeto, a Necessidade associada em M-001 é transicionada para `EM_PROJETO`.
4. **Testes de Integração de Módulos:** Testes de integração automatizados locais passando com 100% de sucesso validando o ciclo de integração M-001 → M-002.

## Execução e Evidências

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `migrations/004_decisoes_e_historico_projeto.sql`: Migração com tabelas relacionais de histórico e decisões do Owner para o Projeto.
  - `src/infrastructure/database/repositorio-projeto-postgres.ts`: Repositório PostgreSQL transacional com suporte a operações completas de Projeto (salvar, obterPorId, obterPorCodigo, obterPorNecessidadeId, listarTodos) e hidratação de etapas, auditorias e direções.
  - `src/infrastructure/database/repositorio-projeto-memoria.ts`: Repositório em memória para suporte a isolamento e testes.
  - `src/application/servico-aplicacao-projeto.ts`: Serviço de aplicação com orquestração dos casos de uso de bootstrap, avanço de etapas de formação, parecer de auditoria e geração da Direção.
  - `src/infrastructure/adapters/integracao-modulos.ts`: `AdaptadorIntegracaoProjeto` conectado ao `ServicoAplicacaoProjeto` com devolução de `jaExistente: true` e preservação do invariante 1:1.
  - `src/domain/necessidade.ts`: Suporte à retenção e recuperação do `projetoId` associado.
  - `src/infrastructure/database/repositorio-postgres.ts`: Hidratação segura de `_projetoId` a partir dos metadados de vínculo 1:1.
  - `src/server.ts` e `src/index.ts`: Injeção de dependência e exportações de domínio e infraestrutura.
  - `tests/it007-repositorio-e-servico-projeto.test.ts`: Suíte de testes com 5 testes cobrindo persistência transacional, hidratação completa, idempotência de bootstrap, orquestração de formação/auditoria e integração assíncrona com o worker em background.
* **Resultado de testes locais:**
  - `npm test`: 51/51 testes passando com 100% de sucesso em 7 arquivos de teste.
  - `npm run typecheck`: 0 erros encontrados via `tsc --noEmit`.
  - `npm run build`: Compilação limpa com código de saída 0.
* **Conclusão técnica:** Todos os critérios técnicos foram plenamente atendidos. O Item de Trabalho dependente subsequente (`IT-008 — Camada Web Responsiva de Projetos, Visualização da Direção e Suíte Integrada`) encontra-se com todas as dependências satisfeitas e apto a ser transicionado de `CRIADO` para `PRONTO_PARA_EXECUCAO`.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 (Concluído pelo Engenheiro de Software)
