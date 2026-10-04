# IT-005 — Esquema Relacional PostgreSQL do Projeto, Migrações e Integridade 1:1

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `7cec5945-d12b-4273-808b-1393af3010e4` |
| Código | `IT-005` |
| Entrega de Valor proprietária | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Módulo de proveniência | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Criar o esquema de dados relacional e scripts de migração no PostgreSQL (com suporte transparente para o ambiente de testes em `pg-mem` e banco real) para as entidades de Projeto (`projetos`, `etapas_formacao_projeto`, `auditorias_projeto` e `direcoes_projeto`), impondo a restrição de integridade referencial e unicidade estrita 1:1 com a tabela `necessidades` (`UNIQUE(necessidade_id)`).
* **Fronteira técnica:** Scripts SQL de migração / inicialização do esquema em `src/infrastructure/database/` e rotinas de bootstrap do banco de dados.
* **Dependências de outros itens:** Nenhuma dependência interna na EV-002 (sucede a infraestrutura base e migrações já consolidadas em `IT-001` da EV-001).
* **Contratos lógicos observados:** Especificação da EV-002 (seção Modelo de Dados Relacional): tabelas `projetos`, `etapas_formacao_projeto`, `auditorias_projeto` e `direcoes_projeto` com tipos UUID, timestamps e chaves estrangeiras.
* **Decisões locais autorizadas:** Nomenclatura detalhada de índices e constraints de banco, mecanismos de migração idempotente (ex: `CREATE TABLE IF NOT EXISTS`).

## Critérios Técnicos de Aceitação

1. **Esquema Relacional PostgreSQL Criado:** Tabelas `projetos`, `etapas_formacao_projeto`, `auditorias_projeto` e `direcoes_projeto` criadas com suas respectivas chaves primárias, estrangeiras e restrições.
2. **Garantia do Invariante 1:1:** Restrição `UNIQUE` sobre `necessidade_id` na tabela `projetos`, impedindo duplicidade de projetos para uma mesma Necessidade no nível de banco.
3. **Compatibilidade com Testes:** Suporte de migração e schema garantido no PostgreSQL e no adaptador de memória `pg-mem`.
4. **Compilação e Verificação:** Scripts e definições de banco tipadas sem erros de lint ou TypeScript.

## Execução e Evidências

* **Executor:** (A ser assumido pelo Ator Engenheiro de Software)
* **Artefatos produzidos / alterados:** (A preencher na execução)
* **Resultado de testes locais:** (A preencher na execução)
* **Conclusão técnica:** (A preencher na execução)

## Resultado do Processo

* **Resultado da Execução:** (Pendente de execução)
* **Data / Registro:** (Pendente de execução)
