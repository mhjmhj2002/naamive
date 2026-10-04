# Plano de Realização — EV-001: Compromisso da Necessidade

## Referência e Origem

* **Entrega de Valor proprietária:** [EV-001 — Compromisso da Necessidade](entrega-de-valor.md)
* **Identificador técnico da EV:** `80264aa7-5243-4396-a99e-e33e38aca286`
* **Módulo proprietário:** [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md)
* **Status da EV na elaboração:** `FORMADA` (com `FORMACAO_SUFICIENTE` do Auditor da EV)
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material de Arquitetura do Owner:** Node.js (TypeScript) + PostgreSQL, com interface web responsiva e worker contínuo em background.

## Estratégia de Realização Técnica

A realização técnica materializa a evolução prometida pela EV-001 de forma desacoplada e incremental, alinhada à Decisão Material do Owner:
1. **Fundação e Persistência:** Estrutura base do projeto Node.js/TypeScript, ferramental de compilação/testes (`npm`/`tsc`/`vitest`), esquema relacional PostgreSQL e migrações versionadas.
2. **Núcleo de Domínio:** Entidades puras da Necessidade em TypeScript, regras de transição de status, separação de histórico/evidências, validação de competência e composição do Compromisso.
3. **Worker em Background e Portas de Integração:** Mecanismo de processamento contínuo em background desacoplado (para jobs e reconciliação), porta de autenticação do Owner e porta idempotente de bootstrap para M-002.
4. **Camada Web Responsiva e Verificação Integrada:** Aplicação HTTP servindo a interface web responsiva (HTML/CSS responsivo com Bootstrap), adaptadores web/API e suíte integrada de testes automatizados locais demonstrando a jornada de ponta a ponta.

## Grafo de Dependências Técnicas (DAG)

```text
IT-001 (Estrutura Base, Configuração TypeScript e Esquema PostgreSQL)
  │
  ▼
IT-002 (Domínio da Necessidade, Regras de Transição e Composição do Compromisso)
  │
  ▼
IT-003 (Worker em Background, Portas de Integração e Autenticação do Owner)
  │
  ▼
IT-004 (Camada Web Responsiva, Rotas HTTP e Suíte de Testes Integrados Locais)
```

## Decomposição em Itens de Trabalho

| Código | Título Técnico | Status Inicial | Dependências |
| --- | --- | --- | --- |
| `IT-001` | Estrutura Base Node.js/TypeScript, Configuração e Esquema PostgreSQL | `PRONTO_PARA_EXECUCAO` | Nenhuma |
| `IT-002` | Núcleo de Domínio da Necessidade, Regras de Transição e Compromisso | `CRIADO` | `IT-001` |
| `IT-003` | Worker em Background Desacoplado, Autenticação e Portas de Integração | `CRIADO` | `IT-002` |
| `IT-004` | Camada Web Responsiva, Adaptadores HTTP e Suíte de Testes Locais | `CRIADO` | `IT-003` |

## Estratégia de Testes e Integração Local

* **Testes de Unidade:** Testes estritos em TypeScript cobrindo entidades puras, invariantes de transição e regras de competência de atores.
* **Testes de Integração:** Validação da camada de acesso a dados PostgreSQL e aplicação de migrações de esquema.
* **Testes de Processamento Assíncrono:** Validação do worker executando continuamente sem degradação do loop de eventos.
* **Testes de Integração Web:** Testes das rotas HTTP e renderização responsiva das telas da jornada da Necessidade.
* **Suíte Integrada Local:** Verificação ponta a ponta demonstrando a jornada da demanda até o Compromisso da Necessidade aprovado.

## Transição de Status da Entrega de Valor

Com a aprovação deste Plano de Realização e a materialização dos Itens de Trabalho `IT-001` a `IT-004`, o status da Entrega de Valor é formalmente transicionado de:
```text
FORMADA → EM_REALIZACAO
```

## Handoff para Execução

O item de trabalho inicial `IT-001` encontra-se no status **`PRONTO_PARA_EXECUCAO`** e fica disponível para assunção pelo Ator **Engenheiro de Software**, conforme o roteiro da Skill `.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`.
