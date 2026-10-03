# Plano de Realização — EV-001: Compromisso da Necessidade

## Identificação e Rastreabilidade

| Campo | Valor |
| --- | --- |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](entrega-de-valor.md) |
| Identificador técnico da EV | `80264aa7-5243-4396-a99e-e33e38aca286` |
| Módulo proprietário | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) |
| Ator responsável | Especialista em Planejamento da Realização |
| Status da EV ao planejar | `FORMADA` → `EM_REALIZACAO` |

## Contexto Técnico e Solução de Alto Nível

A Especificação de EV-001 foi aprovada com `FORMACAO_SUFICIENTE` pelo Auditor da Entrega de Valor. Ela define a construção da capacidade de conduzir uma Necessidade desde o seu registro até o Compromisso da Necessidade decidido formalmente pelo Owner (`APROVADO`), disponibilizando-o de forma idempotente para consumo por M-002 (Projeto).

### Baseline Técnica Adotada
* **Proposta Inicial — Baseline Essencial:**
  - Aplicação backend em monólito modular;
  - Java 21 e Spring Boot (Spring Web, Spring Data JPA / JDBC, Bean Validation);
  - Banco relacional PostgreSQL com migrações versionadas (Flyway);
  - Interface web simples servida pela própria aplicação (Thymeleaf ou templates mínimos) e endpoints REST HTTP para integração e verificação automatizada;
  - Portas lógicas explícitas para identidade autenticada do Owner, contexto/rastreabilidade (M-004) e bootstrap de Projeto (M-002).

## Estratégia de Decomposição e Grafo de Dependências (DAG)

A realização é decomposta em 4 Itens de Trabalho técnicos atômicos e progressivos:

```text
IT-001: Estrutura Base, Esquema de Persistência e Modelo Transacional
  ↓
IT-002: Domínio da Necessidade, Regras de Transição e Composição do Compromisso
  ↓
IT-003: Adaptador de Autenticação do Owner e Portas de Integração (M-002 e M-004)
  ↓
IT-004: Adaptador Web/HTTP e Suíte de Verificação Local Integrada
```

1. **IT-001 (Fundação de Dados e Persistência):** Define o bootstrap da aplicação Spring Boot, migrações Flyway no PostgreSQL para as tabelas de Necessidade, Histórico de Eventos/Evidências, Resultados do Processo e Solicitação de Bootstrap de Projeto. Não possui dependências prévias (`PRONTO_PARA_EXECUCAO`).
2. **IT-002 (Núcleo de Domínio e Casos de Uso):** Implementa as entidades, objetos de valor, regras de transição de status da Necessidade, validação de pré-condições, distinção estrita entre status/resultado/decisão e a lógica de consolidação da visão do Compromisso da Necessidade após `APROVADO`. Depende de IT-001 (`CRIADO`).
3. **IT-003 (Portas de Segurança e Integração):** Concretiza o adaptador de identidade do Owner (exigência de autenticação e identificação confiável para decisão material) e as portas de handoff idempotente com M-002 e correlação com M-004. Depende de IT-002 (`CRIADO`).
4. **IT-004 (Controladores Web/HTTP e Testes de Ponta a Ponta):** Disponibiliza os endpoints/páginas de registro, consulta, formação, qualificação, decisão do Owner e consulta do Compromisso, integrando a suíte de testes de ponta a ponta que valida os 6 critérios verificáveis da Especificação. Depende de IT-003 (`CRIADO`).

## Lista de Itens de Trabalho Materializados

| Código | Título Técnico | Status Inicial | Dependências | Registro |
| --- | --- | --- | --- | --- |
| `IT-001` | Estrutura Base, Esquema de Persistência e Modelo Transacional | `PRONTO_PARA_EXECUCAO` | Nenhuma | [IT-001](../../itens-de-trabalho/IT-001/item-de-trabalho.md) |
| `IT-002` | Domínio da Necessidade, Regras de Transição e Composição do Compromisso | `CRIADO` | `IT-001` | [IT-002](../../itens-de-trabalho/IT-002/item-de-trabalho.md) |
| `IT-003` | Adaptador de Autenticação do Owner e Portas de Integração | `CRIADO` | `IT-002` | [IT-003](../../itens-de-trabalho/IT-003/item-de-trabalho.md) |
| `IT-004` | Adaptador Web/HTTP e Suíte de Verificação Local Integrada | `CRIADO` | `IT-003` | [IT-004](../../itens-de-trabalho/IT-004/item-de-trabalho.md) |

## Estratégia de Integração e Verificação Técnica Local

* **Compilação e Linter:** Código construído com Maven/Gradle sem warnings impeditivos.
* **Testes de Unidade:** 100% de sucesso nas asserções das regras de negócio do domínio (isoladas de banco e HTTP).
* **Testes de Integração:** Subida do contexto Spring com banco transacional (testes usando Testcontainers PostgreSQL ou H2 em compatibilidade com migrações Flyway).
* **Verificação Local:** Validação da suíte antes do handoff ao Integrador da Realização.

## Gatilho de Início da Realização

Com a aprovação deste Plano de Realização e a materialização dos Itens de Trabalho `IT-001` a `IT-004`, a Entrega de Valor `EV-001` transiciona formalmente para o status `EM_REALIZACAO`.
