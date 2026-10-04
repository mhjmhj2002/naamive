# IT-001 — Estrutura Base Node.js/TypeScript, Configuração e Esquema PostgreSQL

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `1f531980-82a1-432d-8e40-02264c8d9ab7` |
| Código | `IT-001` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `CONCLUIDO` |

## Definição Técnica

* **Objetivo técnico:** Inicializar a fundação do projeto em Node.js com TypeScript, scripts de compilação/teste, mecanismo de conexão transacional com PostgreSQL e esquema relacional com migrações versionadas para armazenar a Necessidade, status, histórico e evidências.
* **Fronteira técnica:** Configuração do projeto (`package.json`, `tsconfig.json`), dependências de produção e desenvolvimento, infraestrutura de migração de banco de dados (ex: SQL puro versionado ou migrator leve) e pool de conexões PostgreSQL (`pg`).
* **Dependências de outros itens:** Nenhuma (item de fundação).
* **Contratos lógicos observados:** Esquema físico relacional respeitando a separação obrigatória entre referência estável da Necessidade, único status vigente, histórico imutável de atividades, Resultados do Processo, recomendações e decisão humana do Owner.
* **Decisões locais autorizadas:** Escolha das bibliotecas auxiliares de teste (ex: `vitest` ou `jest`), ferramenta de migração (ex: script customizado ou biblioteca leve de migração SQL) e organização modular de pastas (`src/`, `tests/`, `migrations/`).

## Critérios Técnicos de Aceitação

1. **Compilação e Tipagem:** O projeto TypeScript deve compilar sem erros com tipagem estática estrita ativada (`tsc --noEmit`).
2. **Esquema Relacional e Migrações:** Scripts de migração criam tabelas relacionais em PostgreSQL com chaves primárias, integridade referencial e índices adequados para `necessidade`, `historico_atividades`, `resultados_processo`, `decisoes_owner` e `compromissos`.
3. **Conectividade e Testes:** Suíte de testes automatizados locais valida a execução de migrações e operações transacionais básicas de inserção e consulta contra o banco de dados.

## Execução e Evidências

* **Executor:** Engenheiro de Software (Ator agêntico)
* **Artefatos produzidos / alterados:**
  * `package.json`: Configuração inicial do projeto Node.js (ESM), scripts (`build`, `typecheck`, `test`), dependências (`dotenv`, `pg`) e devDependencies (`typescript`, `vitest`, `@types/node`, `@types/pg`, `pg-mem`).
  * `tsconfig.json`: Configuração estrita do compilador TypeScript (`target: ES2022`, `module: NodeNext`, `strict: true`, `exactOptionalPropertyTypes: true`).
  * `vitest.config.ts`: Configuração da suíte de testes com Vitest.
  * `migrations/001_tabelas_iniciais_necessidade.sql`: Esquema relacional PostgreSQL com tabelas `necessidade`, `historico_atividades`, `resultados_processo`, `decisoes_owner`, `compromissos`, índices e integridade referencial.
  * `src/config/ambiente.ts`: Módulo de leitura de configurações de ambiente fortemente tipado.
  * `src/infrastructure/database/conexao.ts`: Gerenciador de conexão PostgreSQL com pool e suporte transacional `BEGIN`/`COMMIT`/`ROLLBACK`.
  * `src/infrastructure/database/migrador.ts`: Executor idempotente de migrações SQL com tabela de controle.
  * `src/index.ts`: Ponto de entrada de exportação modular.
  * `tests/it001-fundacao.test.ts`: Suíte de testes automatizados locais cobrindo carregamento de ambiente, execução e idempotência de migrações, operações transacionais e rollback em caso de falha.
* **Resultado de testes locais:**
  * `npm run typecheck`: 0 erros encontrados (`tsc --noEmit`).
  * `npm run build`: Compilação de código TypeScript para `dist/` com sucesso.
  * `npm test`: 4 testes executados e 4 aprovados (100% de sucesso).
* **Conclusão técnica:** Fundação do projeto Node.js com TypeScript e camada de persistência PostgreSQL estruturadas em estrita observância à Decisão Material do Owner e aos critérios técnicos do item.

## Resultado do Processo

* **Resultado da Execução:** `EXECUCAO_CONCLUIDA`
* **Data / Registro:** 2026-10-03 — Execução técnica concluída com 100% de sucesso nos testes locais.


