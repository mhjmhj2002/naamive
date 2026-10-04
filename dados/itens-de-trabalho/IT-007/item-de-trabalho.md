# IT-007 — Repositório PostgreSQL, Serviço de Aplicação de Projeto e Handoff M-001/M-002

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `b76f8324-9e3c-44f3-9bff-063c0a609789` |
| Código | `IT-007` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `CRIADO` |

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

* **Executor:** (A ser assumido pelo Ator Engenheiro de Software)
* **Artefatos produzidos / alterados:** (A preencher na execução)
* **Resultado de testes locais:** (A preencher na execução)
* **Conclusão técnica:** (A preencher na execução)

## Resultado do Processo

* **Resultado da Execução:** (Pendente de execução)
* **Data / Registro:** (Pendente de execução)
