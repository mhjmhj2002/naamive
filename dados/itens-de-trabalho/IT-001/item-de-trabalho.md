# IT-001 — Estrutura Base Node.js/TypeScript, Configuração e Esquema PostgreSQL

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `1f531980-82a1-432d-8e40-02264c8d9ab7` |
| Código | `IT-001` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

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

* **Executor:** (Aguardando assunção pelo Engenheiro de Software)
* **Artefatos produzidos / alterados:** N/A
* **Resultado de testes locais:** N/A
* **Conclusão técnica:** N/A

## Resultado do Processo

* **Resultado da Execução:** (Pendente)
* **Data / Registro:** (Pendente)
