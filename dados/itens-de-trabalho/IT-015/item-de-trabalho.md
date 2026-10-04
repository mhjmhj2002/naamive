# IT-015 — Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `3361a73a-0c86-4d55-907b-1f9a3ced18f7` |
| Código | `IT-015` |
| Entrega de Valor proprietária | [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](../../entregas-de-valor/EV-004/entrega-de-valor.md) |
| Módulo de proveniência | [M-004 — Contexto e Rastreabilidade](../../modulos/M-004/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Implementar a persistência relacional transacional em `src/infrastructure/database/repositorio-contexto-postgres.ts`, o serviço de aplicação `src/application/servico-contexto.ts` orquestrando os casos de uso de preservação de proveniência, estabelecimento de vínculos causais direcionados, recuperação orientada por finalidade e montagem da árvore genealógica de rastreabilidade, e integrar ao worker assíncrono em background uma rotina periódica de auditoria de consistência de contexto e proveniência.
* **Fronteira técnica:** Camada de infraestrutura de dados (`src/infrastructure/database/`), serviço de aplicação (`src/application/`), worker desacoplado (`src/worker/`) e testes de integração em `tests/`.
* **Dependências de outros itens:** `IT-014`.
* **Contratos lógicos observados:** Casos de uso `preservarRegistro`, `estabelecerVinculoCausal`, `recuperarContextoPorFinalidade`, `obterTrilhaRastreabilidade` e `auditarConsistenciaContexto`, respeitando transações ACID, idempotência de inserção e conciliação de metadados em JSONB.
* **Decisões locais autorizadas:** Mecanismo de cache em memória local se útil, formato interno das queries SQL parametrizadas e tratamento de erros de violação de chave única.

## Critérios Técnicos de Aceitação

1. **Repositório Transacional PostgreSQL:** Operações de inserção e consulta de `RegistroProveniencia` e `VinculoCausal` com integridade e suporte pleno ao `pg-mem` e PostgreSQL real.
2. **Idempotência de Preservação:** Inserção repetida de evento/decisão com os mesmos dados identificadores preserva a cronologia sem duplicar o registro físico.
3. **Serviço de Aplicação Operacional:** Casos de uso completos atendendo aos contratos lógicos da Especificação da EV-004.
4. **Worker Desacoplado Integrado:** Tarefa periódica registrada no worker em background para auditoria assíncrona de referências órfãs ou lacunas de proveniência.
5. **Testes de Integração e Serviço:** Bateria automatizada de testes cobrindo o ciclo de preservação, vinculação causal e recuperação por finalidade.

## Execução e Evidências

* **Executor:** (Aguardando atribuição do Engenheiro de Software)
* **Artefatos produzidos / alterados:** (Aguardando execução)
* **Resultado de testes locais:** (Aguardando execução)
* **Conclusão técnica:** (Aguardando execução)

## Resultado do Processo

* **Resultado da Execução:** (Pendente)
* **Data / Registro:** (Pendente)
