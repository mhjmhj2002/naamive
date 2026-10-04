# Plano de Realização — EV-002: Direção do Projeto

## Referência e Origem

* **Entrega de Valor proprietária:** [EV-002 — Direção do Projeto](entrega-de-valor.md)
* **Identificador técnico da EV:** `096a280f-c8aa-4de1-932b-159e5a609b21`
* **Módulo proprietário:** [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md)
* **Status da EV:** `FORMADA` (com parecer `FORMACAO_SUFICIENTE` do Auditor da Entrega de Valor)
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material de Arquitetura do Owner:** Node.js (TypeScript) + PostgreSQL com interface web responsiva e worker desacoplado em background.

## Estratégia de Realização Técnica

A realização técnica da EV-002 expande a arquitetura estabelecida na EV-001 de forma desacoplada, incremental e coesa:
1. **Esquema Relacional e Migrações PostgreSQL:** Criação das tabelas de projetos, etapas de formação, pareceres de auditoria e direções de projeto com restrição estrita de unicidade 1:1 com a tabela `necessidades`.
2. **Núcleo de Domínio de Projeto (TypeScript):** Implementação das entidades puras `Projeto`, `DirecaoProjeto`, `EtapaFormacaoProjeto`, invariantes de integridade e regras de transição do catálogo de status do Projeto.
3. **Serviços de Aplicação, Persistência e Integração com M-001:** Repositório PostgreSQL transacional, orquestração de casos de uso de bootstrap, avanço de etapas de formação e confirmação para M-001 via `PortaIntegracaoProjeto`.
4. **Camada Web Responsiva e Suíte de Testes Integrada:** Visualização dos projetos na interface web (Bootstrap), telas de acompanhamento da formação técnica, exibição da Direção aprovada e testes de integração de ponta a ponta.

## Grafo de Dependências Técnicas (DAG)

```text
IT-005 (Esquema PostgreSQL de Projetos e Migrações de Formação/Auditoria)
  │
  ▼
IT-006 (Núcleo de Domínio do Projeto, Regras de Transição e Invariante 1:1)
  │
  ▼
IT-007 (Serviço de Aplicação, Repositório Postgres e Integração com M-001)
  │
  ▼
IT-008 (Camada Web Responsiva de Projeto, Direção e Suíte de Testes Locais)
```

## Decomposição em Itens de Trabalho

| Código | Título Técnico | Status Atual | Dependências |
| --- | --- | --- | --- |
| [`IT-005`](../../itens-de-trabalho/IT-005/item-de-trabalho.md) | Esquema Relacional PostgreSQL do Projeto, Migrações e Integridade 1:1 | `CONCLUIDO` | Nenhuma (sucede baseline consolidada na EV-001) |
| [`IT-006`](../../itens-de-trabalho/IT-006/item-de-trabalho.md) | Núcleo de Domínio de Projeto, Transições de Status e Etapas de Formação | `PRONTO_PARA_EXECUCAO` | `IT-005` (satisfeita) |
| [`IT-007`](../../itens-de-trabalho/IT-007/item-de-trabalho.md) | Repositório PostgreSQL, Serviço de Aplicação de Projeto e Handoff M-001/M-002 | `CRIADO` | `IT-006` |
| [`IT-008`](../../itens-de-trabalho/IT-008/item-de-trabalho.md) | Camada Web Responsiva de Projetos, Visualização da Direção e Suíte Integrada | `CRIADO` | `IT-007` |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Projeto, etapas conceituais de formação e regras de transição.
* **Testes de Integração:** Validação das migrações PostgreSQL, garantia de unicidade `UNIQUE(necessidade_id)` sob concorrência e repositório transacional.
* **Testes de Integração de Módulos:** Validação de handoff e bootstrap bidirecional entre M-001 e M-002 com idempotência comprovada.
* **Testes End-to-End:** Execução integrada da jornada do Projeto na aplicação web responsiva com exibição da Direção aprovada.
