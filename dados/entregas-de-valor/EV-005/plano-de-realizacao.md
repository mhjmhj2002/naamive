# Plano de Realização — EV-005: Avaliação e Verificação da Entrega de Valor

## Referência e Origem

* **Entrega de Valor proprietária:** [EV-005 — Avaliação e Verificação da Entrega de Valor](entrega-de-valor.md)
* **Identificador técnico da EV:** `6868d52a-295d-46a5-89fc-a6eac1d70dc5`
* **Módulo proprietário:** [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md)
* **Status da EV:** `EM_REALIZACAO`
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material de Arquitetura do Owner:** Node.js (TypeScript strict ESM) + PostgreSQL relacional com interface web responsiva (Bootstrap 5) e worker desacoplado em background (Baseline Essencial, custo R$ 0,00).

## Estratégia de Realização Técnica

A realização técnica da EV-005 materializa no ecossistema do NAAMIVE as capacidades nucleares de registro de resultados de software, derivação de critérios verificáveis, coleta de evidências de testes e emissão automatizada e explicável de laudos técnicos de conformidade, em conformidade com a Especificação da EV-005 e a arquitetura hexagonal estabelecida no monólito modular:

1. **Esquema Relacional e Migrações PostgreSQL:** Criação das tabelas relacionais de verificação (`resultados_software`, `criterios_verificaveis`, `evidencias_verificacao` e `laudos_verificacao`) na migração `007_esquema_verificacao_software.sql`, com integridade referencial por chaves estrangeiras, constraints de unicidade, dados de telemetria e evidências em `JSONB`, índices especializados por resultado, módulo e conclusão, garantindo imutabilidade e rastreabilidade dos laudos.
2. **Núcleo de Domínio de Verificação de Software (TypeScript):** Implementação das entidades puras `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao` e `LaudoVerificacao`, dos enums `ConclusaoVerificacao` (`CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `VERIFICACAO_IMPOSSIVEL`, `DIVERGENCIA_ENCONTRADA`), `MetodoObservacao`, do invariante de não presunção de conformidade e do serviço de domínio `MotorVerificacaoSoftware` para confrontação entre evidências coletadas e condições de satisfação dos critérios.
3. **Persistência Transacional, Serviço de Aplicação e Background Worker:** Implementação do repositório PostgreSQL (`RepositorioVerificacaoPostgres`), do serviço de aplicação (`ServicoVerificacao`), contratos dos casos de uso de cadastro de critérios, recepção de resultados, registro de evidências de execução e emissão fundamentada de laudos, bem como da rotina periódica do worker em background para reavaliação contínua de conformidade.
4. **Camada Web Responsiva de Verificação e Suíte Integrada:** Criação das rotas HTTP (`/verificacao` e `/verificacao/:id`), templates responsivos com Bootstrap 5 para inspeção visual da matriz de conformidade, cartões de critérios com badges coloridas de conclusão, laudos fundamentados e suíte integrada completa de testes cobrindo toda a jornada da EV-005 sem regressões.

## Grafo de Dependências Técnicas (DAG)

```text
IT-017 (Esquema Relacional PostgreSQL de Verificação de Software e Migrações)
  │
  ▼
IT-018 (Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade)
  │
  ▼
IT-019 (Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background)
  │
  ▼
IT-020 (Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada)
```

## Decomposição em Itens de Trabalho

| Código | Título Técnico | Status Inicial | Dependências |
| --- | --- | --- | --- |
| [`IT-017`](../../itens-de-trabalho/IT-017/item-de-trabalho.md) | Esquema Relacional PostgreSQL de Verificação de Software e Migrações | `CONCLUIDO` | Nenhuma (sucede baseline consolidada na EV-004) |
| [`IT-018`](../../itens-de-trabalho/IT-018/item-de-trabalho.md) | Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade | `CONCLUIDO` | `IT-017` |
| [`IT-019`](../../itens-de-trabalho/IT-019/item-de-trabalho.md) | Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background | `CONCLUIDO` | `IT-018` |
| [`IT-020`](../../itens-de-trabalho/IT-020/item-de-trabalho.md) | Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada | `PRONTO_PARA_EXECUCAO` | `IT-019` |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Verificação, do motor de avaliação de critérios frente a evidências, do invariante de que ausência de evidência resulta em `EVIDENCIA_INSUFICIENTE` e da detecção de divergências.
* **Testes de Integração:** Validação da migração PostgreSQL (`007_esquema_verificacao_software.sql`), integridade de chaves estrangeiras entre resultados de software, critérios, evidências e laudos técnicos, e operações atômicas no banco.
* **Testes de Casos de Uso:** Simulação completa de registro de resultado de software, derivação/associação de critérios, registro de evidências e emissão de laudo agregado para cenários de aprovação, insuficiência e falha/divergência.
* **Testes End-to-End:** Execução integrada da jornada de Verificação na aplicação web responsiva (Bootstrap 5), demonstrando visualização da matriz de conformidade, cartões de critérios e inspeção de divergências técnicas.
* **Verificação Estrita:** Garantia de aprovação em `npm run typecheck`, `npm run build` e execução com 100% de sucesso da suíte completa de testes (`npm test`), mantendo verdes todos os testes das EVs anteriores (`EV-001` a `EV-004`).
