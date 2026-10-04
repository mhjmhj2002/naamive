# IT-009 — Esquema Relacional PostgreSQL de Coordenação do Trabalho e Migrações

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `eb722aeb-d52d-4ee0-9f16-cac749fb919b` |
| Código | `IT-009` |
| Entrega de Valor proprietária | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Módulo de proveniência | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Criar o esquema de dados relacional e scripts de migração no PostgreSQL para suportar a Coordenação do Trabalho, compreendendo as tabelas `trabalhos_coordenados`, `handoffs_coordenacao` e `retornos_coordenacao`, com integridade referencial a `projetos(id)`, constraints de condições operacionais, chaves únicas para tokens de correlação e índices para consultas de dependências e histórico.
* **Fronteira técnica:** Camada de infraestrutura e persistência de dados (`migrations/005_esquema_coordenacao_trabalho.sql`), scripts SQL de criação de tabelas, índices e funções de integridade.
* **Dependências de outros itens:** Nenhuma (sucede a baseline técnica de persistência consolidada no IT-005/EV-002).
* **Contratos lógicos observados:** Especificação da EV-003 (Seção Dados, contratos e integrações), campos canônicos de `trabalhos_coordenados`, `handoffs_coordenacao` e `retornos_coordenacao`.
* **Decisões locais autorizadas:** Nomes exatos de índices, definições de tipos para JSONB e queries de migração idempotente.

## Critérios Técnicos de Aceitação

1. **Migração Idempotente:** Script de migração executa sem falhas tanto em ambiente PostgreSQL padrão quanto em `pg-mem` utilizado nos testes locais.
2. **Integridade Referencial e Constraints:** Chaves estrangeiras `trabalhos_coordenados.projeto_id` vinculadas a `projetos(id)`, `handoffs_coordenacao.trabalho_id` a `trabalhos_coordenados(id)` e `retornos_coordenacao.handoff_id` a `handoffs_coordenacao(id)` devidamente aplicadas.
3. **Restrições de Condição e Unicidade:** Constraint de validação para as condições operacionais (`POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA`, `ENCERRADO`), constraint de unicidade no código do trabalho e no token de correlação do handoff.
4. **Testes de Migração:** Bateria de testes automatizados validando a criação das tabelas, aplicação de constraints e integridade de cascata ou proteção referencial.
5. **Verificação Estrita:** `npm run typecheck`, `npm run build` e suíte de testes aprovados sem erros.

## Execução e Evidências

* **Executor:** Engenheiro de Software (`execucao-do-item-de-trabalho`)
* **Artefatos produzidos / alterados:**
  - `migrations/005_esquema_coordenacao_trabalho.sql`: DDL relacional idempotente criando `trabalhos_coordenados`, `handoffs_coordenacao` e `retornos_coordenacao`, com chaves estrangeiras para `projetos(id)`, constraints de integridade referencial `ON DELETE RESTRICT`, checagem de condição operacional `chk_condicao_operacional`, índices (`idx_trabalhos_projeto_id`, `idx_trabalhos_condicao_operacional`, `idx_handoffs_trabalho_id`, `idx_handoffs_token_correlacao`, `idx_retornos_handoff_id`) e restrições de unicidade (`uq_trabalhos_coordenados_codigo`, `uq_handoffs_token_correlacao`).
  - `tests/it009-esquema-relacional-coordenacao.test.ts`: Bateria automatizada cobrindo execução da migração 005, integridade referencial entre as 3 tabelas e projetos, unicidade de tokens e códigos, e rejeição de condições operacionais inválidas.
* **Resultado de testes locais:**
  - `npx vitest run tests/it009-esquema-relacional-coordenacao.test.ts`: 2 testes aprovados com 100% de sucesso.
  - `npm run typecheck && npm run build && npm test`: 9 suítes e 60 testes aprovados com 100% de sucesso, sem erros de tipagem TypeScript ou falhas de compilação.
* **Conclusão técnica:** O esquema relacional de coordenação do trabalho foi implementado com integridade total e atende a todos os critérios de aceitação do IT-009.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Engenheiro de Software
