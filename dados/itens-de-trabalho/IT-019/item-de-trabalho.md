# IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `e61a07cd-21b9-47fe-bb47-3be22c8cbcf9` |
| Código | `IT-019` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `CRIADO` |

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
