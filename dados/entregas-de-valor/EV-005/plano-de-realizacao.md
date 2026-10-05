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
| [`IT-020`](../../itens-de-trabalho/IT-020/item-de-trabalho.md) | Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada | `CONCLUIDO` | `IT-019` |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Verificação, do motor de avaliação de critérios frente a evidências, do invariante de que ausência de evidência resulta em `EVIDENCIA_INSUFICIENTE` e da detecção de divergências.
* **Testes de Integração:** Validação da migração PostgreSQL (`007_esquema_verificacao_software.sql`), integridade de chaves estrangeiras entre resultados de software, critérios, evidências e laudos técnicos, e operações atômicas no banco.
* **Testes de Casos de Uso:** Simulação completa de registro de resultado de software, derivação/associação de critérios, registro de evidências e emissão de laudo agregado para cenários de aprovação, insuficiência e falha/divergência.
* **Testes End-to-End:** Execução integrada da jornada de Verificação na aplicação web responsiva (Bootstrap 5), demonstrando visualização da matriz de conformidade, cartões de critérios e inspeção de divergências técnicas.
* **Verificação Estrita:** Garantia de aprovação em `npm run typecheck`, `npm run build` e execução com 100% de sucesso da suíte completa de testes (`npm test`), mantendo verdes todos os testes das EVs anteriores (`EV-001` a `EV-004`).

## Resultado do Processo — Integração da Realização

| Campo | Registro |
| --- | --- |
| **Ator competente** | Integrador da Realização |
| **Resultado do Processo** | `REALIZACAO_INTEGRADA` |
| **Status da EV após integração** | `EM_REALIZACAO` (inalterado, aguardando Verificação) |
| **Data da avaliação** | 2026-10-04 |

### Parecer Técnico de Integração da Realização

O Ator agêntico **Integrador da Realização**, atuando sob as diretrizes da Skill `.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md` e em estrita conformidade com o catálogo oficial de [Resultados do Processo do Item de Trabalho e da Realização](../../../documentacao/item-de-trabalho/07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md), inspecionou e avaliou a integridade técnica global do software produzido pela realização da **`EV-005 — Avaliação e Verificação da Entrega de Valor`** ([M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md)):

1. **Checagem de Cobertura e Conclusão dos Itens de Trabalho:**
   - Todos os quatro Itens de Trabalho previstos no DAG de realização da EV-005 foram formalmente concluídos com Resultado do Processo `EXECUCAO_CONCLUIDA`:
     * [`IT-017 — Esquema Relacional PostgreSQL de Verificação de Software e Migrações`](../../itens-de-trabalho/IT-017/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)
     * [`IT-018 — Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade`](../../itens-de-trabalho/IT-018/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)
     * [`IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background`](../../itens-de-trabalho/IT-019/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)
     * [`IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada`](../../itens-de-trabalho/IT-020/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)

2. **Verificação Estática de Tipagem e Compilação Global:**
   - Execução de `npm run typecheck` (`tsc --noEmit`): **aprovada com zero erros ou advertências** em TypeScript strict ESM.
   - Execução de `npm run build` (`tsc`): **compilação limpa concluída com 100% de sucesso**, gerando a distribuição funcional em `dist/`.

3. **Execução da Suíte Integrada de Testes:**
   - Execução completa de `npm test`: **20 arquivos de teste e 143 testes automatizados aprovados (100% verdes)**.
   - A suíte integrada engloba testes de unidade pura de domínio, persistência transacional PostgreSQL com emulação `pg-mem`, serviços de aplicação, tarefas em background no worker desacoplado, integração de proveniência causal com M-004 e testes end-to-end nas rotas web responsivas com Bootstrap 5.
   - Preservação estrita de compatibilidade regressiva: todos os testes das entregas de valor anteriores (`EV-001`, `EV-002`, `EV-003` e `EV-004`) permaneceram 100% íntegros e verdes.

4. **Coesão e Interoperabilidade dos Componentes:**
   - O esquema de banco (`007_esquema_verificacao_software.sql`) e repositório transacional integram-se de forma coesa ao núcleo de domínio (`MotorVerificacaoSoftware`), respeitando a regra estrita de não presunção de conformidade (`EVIDENCIA_INSUFICIENTE`) e a identificação de divergências (`DIVERGENCIA_ENCONTRADA`).
   - O serviço de aplicação emite eventos causais consumidos por M-004 e suporta a reavaliação periódica via worker assíncrono.
   - As interfaces web responsivas (`/verificacao` e `/verificacao/:id`) exibem métricas, matriz de conformidade, cards de critérios com badges coloridas de laudo e formulários para coleta de evidências e avaliação sob demanda.

* **Declaração de Prontidão Técnica:** O software executável atende rigorosamente a todos os critérios de engenharia e encontra-se tecnicamente pronto para a verificação de valor de negócio.

Emite-se formalmente o Resultado do Processo **`REALIZACAO_INTEGRADA`**.

## Handoff para Verificação da Entrega de Valor

A realização técnica da `EV-005` está formalmente integrada com sucesso (`REALIZACAO_INTEGRADA`).
A Entrega de Valor permanece no status **`EM_REALIZACAO`** e o handoff oficial é transferido para o Ator agêntico **Verificador da Entrega de Valor** (`.agents/skills/entrega-de-valor/verificacao-da-entrega-de-valor/SKILL.md`), a fim de conduzir a avaliação substantiva independente da evolução de software integrada frente à Especificação da EV-005, aos critérios de valor e aos beneficiários relevantes.

