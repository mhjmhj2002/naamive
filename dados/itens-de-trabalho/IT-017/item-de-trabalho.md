# IT-017 — Esquema Relacional PostgreSQL de Verificação de Software e Migrações

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `1f456108-a558-450a-8bf8-d3e91129fec1` |
| Código | `IT-017` |
| Entrega de Valor proprietária | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Módulo de proveniência | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Projetar e implementar a migração de esquema relacional PostgreSQL `007_esquema_verificacao_software.sql` para suportar o registro de resultados de software (`resultados_software`), catálogo de critérios verificáveis (`criterios_verificaveis`), coleta de evidências de verificação (`evidencias_verificacao`) e emissão de laudos técnicos de conformidade (`laudos_verificacao`), com integridade referencial estrita, constraints de unicidade, colunas `JSONB` indexadas para telemetria/evidências e rastreabilidade causal.
* **Fronteira técnica:** Camada de infraestrutura de persistência (`migrations/007_esquema_verificacao_software.sql`) e suíte de testes de migração/esquema (`tests/it017-esquema-relacional-verificacao.test.ts`).
* **Dependências de outros itens:** Nenhuma (sucede a baseline técnica consolidada na EV-004).
* **Contratos lógicos observados:** Especificação da EV-005, contemplando as tabelas `resultados_software`, `criterios_verificaveis`, `evidencias_verificacao` e `laudos_verificacao`, índices especializados por resultado, módulo, critério e conclusão técnica.
* **Decisões locais autorizadas:** Nomenclatura específica de índices, suporte a dialetos e emulação via `pg-mem`, tipos de dados precisos e scripts SQL idempotentes.

## Critérios Técnicos de Aceitação

1. **Arquivo de Migração Criado e Idempotente:** Criação do script SQL `migrations/007_esquema_verificacao_software.sql` contendo `CREATE TABLE IF NOT EXISTS` e índices relacionais.
2. **Integridade Referencial e Constraints:** Chaves estrangeiras entre critérios/evidências/laudos e resultados de software com constraints de integridade adequadas e unicidade de códigos legíveis (`codigo_referencia`).
3. **Compatibilidade com pg-mem e PostgreSQL Real:** Execução bem-sucedida das migrações em ambiente real PostgreSQL e na biblioteca de emulação `pg-mem` utilizada nos testes unitários e de integração.
4. **Verificação Estrita:** Aprovação em `npm run typecheck`, `npm run build` e suíte de testes com cobertura da migração.

## Execução e Evidências

* **Executor:** Ator agêntico Engenheiro de Software (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`).
* **Artefatos produzidos / alterados:**
  - `migrations/007_esquema_verificacao_software.sql`: script DDL ANSI/PostgreSQL contendo a criação das tabelas `resultados_software`, `criterios_verificaveis`, `evidencias_verificacao` e `laudos_verificacao`, com restrições explícitas de chave primária, chaves estrangeiras com cascata controlada, constraints CHECK de métodos de observação e conclusões de verificação, colunas JSONB para telemetria/evidências e índices especializados.
  - `tests/it017-esquema-relacional-verificacao.test.ts`: suíte de testes de migração cobrindo a execução da migração 007, verificação da existência de todas as tabelas, integridade de constraints de unicidade (`codigo_referencia`, par `resultado_software_id, criterio_id`), validação de enums/CHECK de métodos e conclusões técnicas, e integridade referencial com cascata.
* **Resultado de testes locais:**
  - `npm run typecheck`: 100% de sucesso sem erros de tipagem TypeScript.
  - `npm run build`: compilação concluída com êxito (`tsc`).
  - `vitest run tests/it017-esquema-relacional-verificacao.test.ts`: 2 testes aprovados com 100% de sucesso.
  - Suíte completa (`npm test`): 17 arquivos de teste e 112 testes aprovados com 100% de sucesso sem regressões.
* **Conclusão técnica:** Todos os 4 critérios técnicos de aceitação foram integralmente atendidos.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04
