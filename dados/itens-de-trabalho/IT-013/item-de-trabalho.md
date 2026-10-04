# IT-013 — Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `d666e2bc-3987-460f-922c-a1dc92ab5889` |
| Código | `IT-013` |
| Entrega de Valor proprietária | [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](../../entregas-de-valor/EV-004/entrega-de-valor.md) |
| Módulo de proveniência | [M-004 — Contexto e Rastreabilidade](../../modulos/M-004/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Projetar e implementar a migração de esquema relacional PostgreSQL `006_esquema_contexto_rastreabilidade.sql` para suportar a preservação de registros de proveniência (`registros_proveniencia`) e vínculos causais (`vinculos_causais`), com integridade referencial estrita, constraints de unicidade direcionada, colunas `JSONB` indexadas para metadados e distinção física e lógica entre estado vigente e histórico explicativo.
* **Fronteira técnica:** Camada de infraestrutura de persistência (`src/infrastructure/database/migrations/`) e suíte de testes de migração/esquema (`tests/`).
* **Dependências de outros itens:** Nenhuma (sucede a baseline técnica consolidada na EV-003).
* **Contratos lógicos observados:** Especificação da EV-004, contemplando as tabelas `registros_proveniencia` e `vinculos_causais`, índices `idx_prov_entidade_cod`, `idx_prov_tipo`, `idx_prov_vigente`, e constraint de integridade relacional `uq_vinculo_direcionado`.
* **Decisões locais autorizadas:** Nomenclatura específica de índices, suporte a dialectos e emulação via `pg-mem`, tipos de dados precisos e scripts SQL idempotentes.

## Critérios Técnicos de Aceitação

1. **Arquivo de Migração Criado e Idempotente:** Criação do script SQL `src/infrastructure/database/migrations/006_esquema_contexto_rastreabilidade.sql` contendo `CREATE TABLE IF NOT EXISTS` e índices relacionais.
2. **Integridade Referencial e Constraints:** Chaves estrangeiras entre vínculos causais e registros de proveniência com `ON DELETE RESTRICT` e constraint `UNIQUE (origem_registro_id, destino_registro_id, tipo_relacao)`.
3. **Compatibilidade com pg-mem e PostgreSQL Real:** Execução bem-sucedida das migrações em ambiente real PostgreSQL e na biblioteca de emulação `pg-mem` utilizada nos testes unitários e de integração.
4. **Verificação Estrita:** Aprovação em `npm run typecheck`, `npm run build` e suíte de testes com cobertura da migração.

## Execução e Evidências

* **Executor:** (Aguardando atribuição do Engenheiro de Software)
* **Artefatos produzidos / alterados:** (Aguardando execução)
* **Resultado de testes locais:** (Aguardando execução)
* **Conclusão técnica:** (Aguardando execução)

## Resultado do Processo

* **Resultado da Execução:** (Pendente)
* **Data / Registro:** (Pendente)
