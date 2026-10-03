# IT-001 — Estrutura Base, Esquema de Persistência e Modelo Transacional

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `81d0d24d-a150-4371-956b-0d2a1b07042f` |
| Código | `IT-001` |
| Entrega de Valor proprietária | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Módulo de proveniência | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `PRONTO_PARA_EXECUCAO` |

## Definição Técnica

* **Objetivo técnico:** Inicializar o projeto de software conforme a Baseline Essencial (Java 21, Spring Boot) e implementar as migrações Flyway e entidades de persistência para armazenamento da Necessidade, histórico de auditoria/evidências, Resultados do Processo, decisões humanas e registro de solicitação idempotente de bootstrap para M-002.
* **Fronteira técnica:** Camada de infraestrutura e persistência de dados; configuração base do projeto (`pom.xml` / `build.gradle`), scripts SQL de migração Flyway e mapeamento objeto-relacional ou repositórios Spring Data.
* **Dependências de outros itens:** Nenhuma (item de fundação técnica).
* **Contratos lógicos observados:** Especificação da EV-001 (seção Dados, contratos e integrações: referência estável UUID, único status vigente, registros imutáveis de histórico/evidência, distinção entre status, resultado de auditoria e decisão humana do Owner).
* **Decisões locais autorizadas:** Nomenclatura detalhada das tabelas e colunas no banco de dados (respeitando a separação obrigatória entre `status` e `resultado_processo`/`decisao_humana`), configuração de dialeto JPA/Hibernate e pooling de conexões.

## Critérios Técnicos de Aceitação

1. O projeto compila com Java 21 sem erros de dependências ou compilação.
2. Scripts de migração Flyway executam perfeitamente sobre instância PostgreSQL (ou Testcontainers em testes de integração), criando as tabelas com integridade referencial e chaves primárias/estrangeiras.
3. Teste de integração automatizado valida a persistência e recuperação de um registro de Necessidade com histórico associado sem erros.

## Execução e Evidências

* **Executor:** *Pendente de atribuição ao Engenheiro de Software*
* **Artefatos produzidos / alterados:** *Pendente*
* **Resultado de testes locais:** *Pendente*
* **Conclusão técnica:** *Pendente*

## Resultado do Processo

* **Resultado da Execução:** *Pendente*
* **Data / Registro:** *Pendente*
