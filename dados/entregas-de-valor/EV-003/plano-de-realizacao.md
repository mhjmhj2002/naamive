# Plano de Realização — EV-003: Coordenação do Trabalho Preparado

## Referência e Origem

* **Entrega de Valor proprietária:** [EV-003 — Coordenação do Trabalho Preparado](entrega-de-valor.md)
* **Identificador técnico da EV:** `b06d5c8e-f9d1-457b-8880-87305dc3aca6`
* **Módulo proprietário:** [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md)
* **Status da EV:** `EM_REALIZACAO` (transicionado a partir de `FORMADA` com parecer `FORMACAO_SUFICIENTE` do Auditor da Entrega de Valor)
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material de Arquitetura do Owner:** Node.js (TypeScript) + PostgreSQL relacional com interface web responsiva (Bootstrap 5) e worker desacoplado em background.

## Estratégia de Realização Técnica

A realização técnica da EV-003 materializa no ecossistema do NAAMIVE as capacidades nucleares de coordenação do trabalho em estrita conformidade com a Especificação da EV-003 e a arquitetura hexagonal estabelecida nas EVs anteriores:
1. **Esquema Relacional e Migrações PostgreSQL:** Criação das tabelas relacionais de coordenação (`trabalhos_coordenados`, `handoffs_coordenacao`, `retornos_coordenacao`) com integridade referencial com a tabela `projetos`, constraints estruturais, índices para correlação rápida e isolamento atômico de concorrência.
2. **Núcleo de Domínio de Coordenação (TypeScript):** Implementação das entidades puras `TrabalhoCoordenado`, `HandoffCoordenacao`, `RetornoCoordenacao`, das regras de transição de condições operacionais (`POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA`, `ENCERRADO`), do invariante nuclear de especialização (`competência → Ator → Skill → Executor`) e do serviço de domínio `MotorCoordenacaoTrabalho` para identificação determinística do próximo avanço válido.
3. **Persistência Transacional, Casos de Uso e Background Worker:** Implementação do repositório PostgreSQL (`RepositorioCoordenacaoPostgres`), do serviço de aplicação (`ServicoAplicacaoCoordenacao`), contratos de casos de uso (avaliação de elegibilidade, despacho de handoff, recepção de retorno e conciliação de dependências) e tarefas assíncronas do worker em background.
4. **Camada Web Responsiva e Suíte de Testes Integrada:** Rotas HTTP (`/coordenacao`, `/coordenacao/trabalhos/:id`), templates responsivos com Bootstrap 5 para acompanhamento e despacho com um clique ("Delegar Próximo Avanço"), visualização de handoffs emitidos, gestão de pendências e suíte completa de testes de ponta a ponta.

## Grafo de Dependências Técnicas (DAG)

```text
IT-009 (Esquema Relacional PostgreSQL de Coordenação do Trabalho e Migrações)
  │
  ▼
IT-010 (Núcleo de Domínio de Coordenação, Motor de Elegibilidade e Invariante de Especialização)
  │
  ▼
IT-011 (Repositório PostgreSQL, Serviço de Aplicação de Coordenação e Worker em Background)
  │
  ▼
IT-012 (Camada Web Responsiva de Coordenação, Despacho de Handoffs e Suíte Integrada)
```

## Decomposição em Itens de Trabalho

| Código | Título Técnico | Status Atual | Dependências |
| --- | --- | --- | --- |
| [`IT-009`](../../itens-de-trabalho/IT-009/item-de-trabalho.md) | Esquema Relacional PostgreSQL de Coordenação do Trabalho e Migrações | `CONCLUIDO` | Nenhuma (sucede baseline consolidada na EV-002) |
| [`IT-010`](../../itens-de-trabalho/IT-010/item-de-trabalho.md) | Núcleo de Domínio de Coordenação, Motor de Elegibilidade e Invariante de Especialização | `CONCLUIDO` | `IT-009` |
| [`IT-011`](../../itens-de-trabalho/IT-011/item-de-trabalho.md) | Repositório PostgreSQL, Serviço de Aplicação de Coordenação e Worker em Background | `PRONTO_PARA_EXECUCAO` | `IT-010` |
| [`IT-012`](../../itens-de-trabalho/IT-012/item-de-trabalho.md) | Camada Web Responsiva de Coordenação, Despacho de Handoffs e Suíte Integrada | `CRIADO` | `IT-011` |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Coordenação, transições de condições operacionais, encadeamento de competência/Ator/Skill e avaliação lógica do próximo avanço válido pelo motor de domínio.
* **Testes de Integração:** Validação das migrações PostgreSQL, constraints de chaves estrangeiras com `projetos(id)`, integridade referencial dos handoffs e retornos, e operações transacionais com atomicidade de despacho.
* **Testes de Integração de Casos de Uso:** Simulação completa do ciclo de coordenação (avaliação de trabalhos → seleção do próximo avanço → despacho idempotente de handoff → registro de retorno → liberação de dependências sucessoras).
* **Testes End-to-End:** Execução integrada da jornada de Coordenação na aplicação web responsiva (Bootstrap 5), demonstrando despacho com um clique, inspeção do handoff estruturado com referências recuperáveis e exibição de pendências soberanas do Owner.
* **Verificação Estrita:** Garantia de aprovação em `npm run typecheck`, `npm run build` e execução com 100% de sucesso da suíte de testes (`npm test`).
