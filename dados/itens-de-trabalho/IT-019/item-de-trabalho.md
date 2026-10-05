# IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `e61a07cd-21b9-47fe-bb47-3be22c8cbcf9` |
| Código | `IT-019` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a persistência transacional em PostgreSQL (`src/infrastructure/database/repositorio-verificacao-postgres.ts`), o serviço de aplicação (`src/application/servico-verificacao.ts`), a integração de rastreabilidade causal com M-004 e as rotinas assíncronas do worker em background (`src/worker/`) para reconciliação contínua e avaliação assíncrona de resultados de software.
* **Fronteira técnica:** Camada de infraestrutura de dados (`src/infrastructure/database/`), camada de aplicação (`src/application/`), worker (`src/worker/`) e suíte de testes de integração (`tests/it019-servico-verificacao-postgres.test.ts`).
* **Dependências de outros itens:** `IT-018`.
* **Contratos lógicos observados:** Casos de uso de registro de resultado, cadastro de critérios, inclusão de evidências, geração de laudos técnicos fundamentados e amarração de links causais com proveniência de M-004.
* **Decisões locais autorizadas:** Mecanismos de transação em pool PostgreSQL, parametrização de intervalos de polling no worker e tratamento de exceções de integridade.

## Critérios Técnicos de Aceitação

1. **Repositório Relacional Transacional:** Métodos de CRUD transacional para resultados de software, critérios, evidências e laudos com atomicidade e tratamento de erros.
2. **Casos de Uso de Aplicação:** Orquestração completa de registro de resultado, critérios, evidências e emissão do laudo técnico agregado.
3. **Integração de Rastreabilidade com M-004:** Geração de vínculos causais entre o laudo técnico emitido e o registro de proveniência do resultado/evolução avaliada.
4. **Worker em Background:** Execução periódica desacoplada sem bloqueio do loop de eventos Node.js.
5. **Verificação Estrita:** Aprovação em `npm run typecheck`, `npm run build` e suíte de testes de integração de serviço e repositório.

## Execução e Evidências

* **Executor:** Ator agêntico **Engenheiro de Software** (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`)
* **Artefatos produzidos / alterados:**
  - `src/domain/repositorio-verificacao.ts`: Contrato de repositório puro para Resultados de Software, Critérios Verificáveis, Evidências e Laudos Técnicos.
  - `src/infrastructure/database/repositorio-verificacao-postgres.ts`: Repositório PostgreSQL transacional com queries parametrizadas, persistência JSONB, índices e integridade referencial.
  - `src/infrastructure/database/repositorio-verificacao-memoria.ts`: Repositório de verificação em memória para testes e execução rápida.
  - `src/application/servico-verificacao.ts`: Serviço de aplicação orquestrando registro de resultados de software, cadastro de critérios, coleta de evidências, emissão de laudo técnico individual/agregado e geração de eventos de rastreabilidade para M-004.
  - `src/worker/worker-segundo-plano.ts`: Integração da tarefa assíncrona `REAVALIAR_CONFORMIDADE_SOFTWARE` com emissão e persistência de laudos e telemetria de contexto.
  - `src/server.ts`: Injeção de dependência de `RepositorioVerificacao` e `ServicoVerificacao` no bootstrap do sistema e no worker.
  - `src/index.ts`: Exportação pública dos contratos, serviços e repositórios de verificação.
  - `tests/it019-servico-verificacao-postgres.test.ts`: Suíte de testes de integração com 8 testes cobrindo CRUD relacional, casos de uso do serviço, rastreabilidade M-004, worker assíncrono e implementação em memória.
* **Resultado de testes locais:**
  - `npm run typecheck`: Compilação de checagem estrita sem erros (0 diagnósticos).
  - `npm run build`: Compilação TypeScript com geração de artefatos em `dist/` com 100% de sucesso.
  - `npm test`: 19 arquivos de teste e 138 testes automatizados executados e 100% aprovados, sem nenhuma regressão.
* **Conclusão técnica:** Todos os 5 critérios técnicos de aceitação atendidos com rigor absoluto.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 (Conclusão técnica pelo Engenheiro de Software)

## Handoff para o IT-020

Com a conclusão do `IT-019` (`EXECUCAO_CONCLUIDA`), a dependência técnica de `IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada` foi plenamente satisfeita. O `IT-020` avança para **`PRONTO_PARA_EXECUCAO`**.

