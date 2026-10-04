# Plano de Realização — EV-004: Preservação e Recuperação de Contexto e Rastreabilidade

## Referência e Origem

* **Entrega de Valor proprietária:** [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](entrega-de-valor.md)
* **Identificador técnico da EV:** `806acc2a-8f8f-4389-a234-ca61c42f5bb3`
* **Módulo proprietário:** [M-004 — Contexto e Rastreabilidade](../../modulos/M-004/modulo.md)
* **Status da EV:** `EM_REALIZACAO`
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material de Arquitetura do Owner:** Node.js (TypeScript) + PostgreSQL relacional com interface web responsiva (Bootstrap 5) e worker desacoplado em background (Baseline Essencial, custo R$ 0,00).

## Estratégia de Realização Técnica

A realização técnica da EV-004 materializa no ecossistema do NAAMIVE as capacidades nucleares de preservação estruturada de proveniência e recuperação contextual orientada por finalidade, em estrita conformidade com a Especificação da EV-004 e a arquitetura hexagonal estabelecida no monólito modular:

1. **Esquema Relacional e Migrações PostgreSQL:** Criação das tabelas relacionais de rastreabilidade (`registros_proveniencia` e `vinculos_causais`) na migração `006_esquema_contexto_rastreabilidade.sql`, com integridade referencial, constraints exclusivas em vínculos direcionados, dados semiestruturados em `JSONB`, índices especializados por entidade, código, tipo de registro e indicador de vigência, garantindo isolamento entre estado vigente e histórico explicativo.
2. **Núcleo de Domínio de Contexto e Rastreabilidade (TypeScript):** Implementação das entidades puras `RegistroProveniencia` e `VinculoCausal`, dos Value Objects `ConsultaContexto`, `PacoteContextoProporcional`, dos enums `FinalidadeContexto`, `TipoRegistroProveniencia`, `ClassificacaoEpistemica`, `TipoRelacaoCausal`, do invariante de imutabilidade do histórico e do serviço de domínio `MotorRecuperacaoContexto` para filtragem proporcional e diagnóstico explícito de lacunas e contradições.
3. **Persistência Transacional, Serviço de Aplicação e Background Worker:** Implementação do repositório PostgreSQL (`RepositorioContextoPostgres`), do serviço de aplicação (`ServicoContexto`), contratos dos casos de uso de preservação idempotente, estabelecimento de elos causais, recuperação proporcional por finalidade declarada e da rotina periódica do worker em background para auditoria assíncrona de consistência de contexto.
4. **Camada Web Responsiva de Rastreabilidade e Suíte Integrada:** Criação das rotas HTTP (`/rastreabilidade`, `/rastreabilidade/:entidade/:codigo`), templates responsivos com Bootstrap 5 para inspeção visual da árvore genealógica de governança, linha do tempo cronológica, badges epistêmicas, filtros por finalidade e suíte integrada completa de testes cobrindo toda a jornada da EV-004 sem regressões.

## Grafo de Dependências Técnicas (DAG)

```text
IT-013 (Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações)
  │
  ▼
IT-014 (Núcleo de Domínio de Contexto, Rastreabilidade e Motor de Recuperação Proporcional)
  │
  ▼
IT-015 (Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background)
  │
  ▼
IT-016 (Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada)
```

## Decomposição em Itens de Trabalho

| Código | Título Técnico | Status Atual | Dependências |
| --- | --- | --- | --- |
| [`IT-013`](../../itens-de-trabalho/IT-013/item-de-trabalho.md) | Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações | `PRONTO_PARA_EXECUCAO` | Nenhuma (sucede baseline consolidada na EV-003) |
| [`IT-014`](../../itens-de-trabalho/IT-014/item-de-trabalho.md) | Núcleo de Domínio de Contexto, Rastreabilidade e Motor de Recuperação Proporcional | `CRIADO` | `IT-013` |
| [`IT-015`](../../itens-de-trabalho/IT-015/item-de-trabalho.md) | Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background | `CRIADO` | `IT-014` |
| [`IT-016`](../../itens-de-trabalho/IT-016/item-de-trabalho.md) | Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada | `CRIADO` | `IT-015` |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Contexto, imutabilidade do registro de proveniência, idempotência lógica de vínculos causais, distinção estrita entre registro vigente e histórico superado, e filtragem proporcional por finalidade pelo motor de contexto.
* **Testes de Integração:** Validação da migração PostgreSQL (`006_esquema_contexto_rastreabilidade.sql`), integridade de chaves estrangeiras entre registros e vínculos causais, unicidade de vínculos direcionados e operações transacionais com atomicidade.
* **Testes de Casos de Uso:** Simulação completa de preservação de eventos/decisões, construção de ascendência causal direcionada, recuperação contextual proporcional para múltiplas finalidades (`DESPACHAR_TRABALHO`, `AUDITAR_FORMACAO`, etc.) e detecção diagnóstica de lacunas e contradições.
* **Testes End-to-End:** Execução integrada da jornada de Rastreabilidade na aplicação web responsiva (Bootstrap 5), demonstrando visualização da linhagem genealógica da Necessidade até os trabalhos, linha do tempo com badges epistêmicas e filtros por finalidade.
* **Verificação Estrita:** Garantia de aprovação em `npm run typecheck`, `npm run build` e execução com 100% de sucesso da suíte completa de testes (`npm test`), mantendo verdes todos os testes das EVs anteriores.

## Handoff para Engenheiro de Software

O Plano de Realização encontra-se formalmente materializado e a `EV-004` transicionada para `EM_REALIZACAO`. O item inicial [`IT-013`](../../itens-de-trabalho/IT-013/item-de-trabalho.md) está com status `PRONTO_PARA_EXECUCAO` e é entregue ao Ator agêntico **Engenheiro de Software** (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`) para início imediato da execução técnica.
