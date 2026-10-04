# IT-015 — Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `3361a73a-0c86-4d55-907b-1f9a3ced18f7` |
| Código | `IT-015` |
| Entrega de Valor proprietária | [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](../../entregas-de-valor/EV-004/entrega-de-valor.md) |
| Módulo de proveniência | [M-004 — Contexto e Rastreabilidade](../../modulos/M-004/modulo.md) |
| Status | `CONCLUIDO` |

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

* **Executor:** Ator agêntico Engenheiro de Software (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`).
* **Artefatos produzidos / alterados:**
  - `src/domain/repositorio-contexto.ts`: Contrato de domínio puro do repositório de contexto e proveniência.
  - `src/infrastructure/database/repositorio-contexto-postgres.ts`: Implementação relacional transacional PostgreSQL com suporte a JSONB, integridade referencial ACID e total compatibilidade com `pg-mem` e PostgreSQL ANSI.
  - `src/infrastructure/database/repositorio-contexto-memoria.ts`: Implementação em memória nativa para fallback e testes ágeis.
  - `src/application/servico-contexto.ts`: Serviço de aplicação orquestrando os casos de uso `preservarRegistro`, `estabelecerVinculoCausal`, `recuperarContextoPorFinalidade`, `obterTrilhaRastreabilidade`, `auditarConsistenciaContexto` e `agendarAuditoriaBackground`.
  - `src/worker/worker-segundo-plano.ts`: Integração com o manipulador assíncrono `AUDITORIA_CONTEXTO_PROVENIENCIA` registrando eventos de auditoria na porta de rastreabilidade.
  - `src/server.ts` e `src/index.ts`: Injeção de dependências e exportações da camada de aplicação e infraestrutura de contexto.
  - `tests/it015-repositorio-e-servico-contexto.test.ts`: Bateria com 9 testes automatizados cobrindo os 4 critérios técnicos de aceitação.
* **Resultado de testes locais:**
  - `tests/it015-repositorio-e-servico-contexto.test.ts`: 9 testes passando com 100% de sucesso.
  - Suíte completa do projeto (`npm test`): 15 arquivos de testes e 105 testes passando com 100% de sucesso.
  - Verificação de tipos (`npm run typecheck`): 0 erros.
  - Compilação do build de produção (`npm run build`): compilação limpa sem erros.
* **Conclusão técnica:** Todos os 5 critérios técnicos de aceitação plenamente satisfeitos sem violação de invariantes e sem introdução de débitos técnicos.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Emissão legítima pelo Engenheiro de Software.
* **Efeito na dependência subsequente:** Com a conclusão de IT-015, todas as dependências de `IT-016` foram satisfeitas; o item `IT-016` avança para `PRONTO_PARA_EXECUCAO`.
