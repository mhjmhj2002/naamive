# IT-005 — Esquema Relacional PostgreSQL do Projeto, Migrações e Integridade 1:1

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `7cec5945-d12b-4273-808b-1393af3010e4` |
| Código | `IT-005` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Criar o esquema de dados relacional e scripts de migração no PostgreSQL (com suporte transparente para o ambiente de testes em `pg-mem` e banco real) para as entidades de Projeto (`projetos`, `etapas_formacao_projeto`, `auditorias_projeto` e `direcoes_projeto`), impondo a restrição de integridade referencial e unicidade estrita 1:1 com a tabela `necessidades` (`UNIQUE(necessidade_id)`).
* **Fronteira técnica:** Scripts SQL de migração / inicialização do esquema em `src/infrastructure/database/` e rotinas de bootstrap do banco de dados.
* **Dependências de outros itens:** Nenhuma dependência interna na EV-002 (sucede a infraestrutura base e migrações já consolidadas em `IT-001` da EV-001).
* **Contratos lógicos observados:** Especificação da EV-002 (seção Modelo de Dados Relacional): tabelas `projetos`, `etapas_formacao_projeto`, `auditorias_projeto` e `direcoes_projeto` com tipos UUID/VARCHAR, timestamps e chaves estrangeiras.
* **Decisões locais autorizadas:** Nomenclatura detalhada de índices e constraints de banco, mecanismos de migração idempotente (ex: `CREATE TABLE IF NOT EXISTS`).

## Critérios Técnicos de Aceitação

1. **Esquema Relacional PostgreSQL Criado:** Tabelas `projetos`, `etapas_formacao_projeto`, `auditorias_projeto` e `direcoes_projeto` criadas com suas respectivas chaves primárias, estrangeiras e restrições.
2. **Garantia do Invariante 1:1:** Restrição `UNIQUE` sobre `necessidade_id` na tabela `projetos`, impedindo duplicidade de projetos para uma mesma Necessidade no nível de banco.
3. **Compatibilidade com Testes:** Suporte de migração e schema garantido no PostgreSQL e no adaptador de memória `pg-mem`.
4. **Compilação e Verificação:** Scripts e definições de banco tipadas sem erros de lint ou TypeScript.

## Execução e Evidências

* **Executor:** Engenheiro de Software
* **Artefatos produzidos / alterados:**
  - `migrations/003_esquema_projetos.sql`: Script DDL ANSI SQL/PostgreSQL com as 4 tabelas, índices e constraints de integridade referencial e unicidade 1:1 (`uq_projetos_necessidade_id`).
  - `tests/it005-esquema-relacional-projeto.test.ts`: Suíte de testes automatizados com cobertura completa dos 3 critérios de aceitação (execução de migração, imposição de unicidade 1:1 e persistência relacional com integridade referencial).
* **Resultado de testes locais:**
  - `npm test`: 5 suítes de teste executadas com sucesso, 34/34 testes passando (100% de sucesso).
  - `npm run build && npm run typecheck`: Compilação TypeScript limpa, sem erros ou avisos.
* **Conclusão técnica:** O esquema relacional do Projeto está materializado e plenamente integrado à esteira de migrações automáticas do NAAMIVE, com invariante nuclear 1:1 validado no banco.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-04 — Suíte de testes local 100% verde; dependência técnica de `IT-006` desbloqueada.
