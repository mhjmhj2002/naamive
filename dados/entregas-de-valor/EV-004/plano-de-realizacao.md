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
| [`IT-013`](../../itens-de-trabalho/IT-013/item-de-trabalho.md) | Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações | `CONCLUIDO` | Nenhuma (sucede baseline consolidada na EV-003) |
| [`IT-014`](../../itens-de-trabalho/IT-014/item-de-trabalho.md) | Núcleo de Domínio de Contexto, Rastreabilidade e Motor de Recuperação Proporcional | `CONCLUIDO` | `IT-013` |
| [`IT-015`](../../itens-de-trabalho/IT-015/item-de-trabalho.md) | Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background | `CONCLUIDO` | `IT-014` |
| [`IT-016`](../../itens-de-trabalho/IT-016/item-de-trabalho.md) | Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada | `CONCLUIDO` | `IT-015` |

## Critérios de Aceitação e Testes

* **Testes de Unidade:** Cobertura estrita das entidades de domínio de Contexto, imutabilidade do registro de proveniência, idempotência lógica de vínculos causais, distinção estrita entre registro vigente e histórico superado, e filtragem proporcional por finalidade pelo motor de contexto.
* **Testes de Integração:** Validação da migração PostgreSQL (`006_esquema_contexto_rastreabilidade.sql`), integridade de chaves estrangeiras entre registros e vínculos causais, unicidade de vínculos direcionados e operações transacionais com atomicidade.
* **Testes de Casos de Uso:** Simulação completa de preservação de eventos/decisões, construção de ascendência causal direcionada, recuperação contextual proporcional para múltiplas finalidades (`DESPACHAR_TRABALHO`, `AUDITAR_FORMACAO`, etc.) e detecção diagnóstica de lacunas e contradições.
* **Testes End-to-End:** Execução integrada da jornada de Rastreabilidade na aplicação web responsiva (Bootstrap 5), demonstrando visualização da linhagem genealógica da Necessidade até os trabalhos, linha do tempo com badges epistêmicas e filtros por finalidade.
* **Verificação Estrita:** Garantia de aprovação em `npm run typecheck`, `npm run build` e execução com 100% de sucesso da suíte completa de testes (`npm test`), mantendo verdes todos os testes das EVs anteriores.

## Resultado do Processo — Integração da Realização

`REALIZACAO_INTEGRADA`

### Parecer Técnico do Integrador da Realização

O Ator agêntico **Integrador da Realização** avaliou a integridade técnica global do software produzido pela realização da **`EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade`**, com base nas diretrizes da Skill `.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md` e no catálogo normativo de [Resultados do Processo do Item de Trabalho](../../../documentacao/item-de-trabalho/07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md):

1. **Checagem de Cobertura e Conclusão:**
   - Todos os 4 Itens de Trabalho planejados da EV-004 alcançaram formalmente o status **`CONCLUIDO`** com Resultado do Processo `EXECUCAO_CONCLUIDA`:
     * [`IT-013`](../../itens-de-trabalho/IT-013/item-de-trabalho.md): `CONCLUIDO` (Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações)
     * [`IT-014`](../../itens-de-trabalho/IT-014/item-de-trabalho.md): `CONCLUIDO` (Núcleo de Domínio de Contexto, Rastreabilidade e Motor de Recuperação Proporcional)
     * [`IT-015`](../../itens-de-trabalho/IT-015/item-de-trabalho.md): `CONCLUIDO` (Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background)
     * [`IT-016`](../../itens-de-trabalho/IT-016/item-de-trabalho.md): `CONCLUIDO` (Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada)

2. **Build e Tipagem Estrita:**
   - Execução de `npm run typecheck` (`tsc --noEmit`): aprovado sem erros.
   - Execução de `npm run build` (`tsc`): compilação concluída com 100% de sucesso.

3. **Suíte Integrada de Testes:**
   - Execução de `npm test`: 16 arquivos de teste e 110 testes automatizados executados e aprovados com 100% de sucesso.
   - Todos os testes de unidade, persistência relacional (PostgreSQL via `pg-mem`), serviços de aplicação, rotinas assíncronas do worker e ponta a ponta na camada web responsiva funcionaram de maneira integrada, sem regressões em nenhum dos módulos ou entregas de valor anteriores (`EV-001`, `EV-002`, `EV-003`).

4. **Declaração de Prontidão Técnica:**
   - O software executável está plenamente integrado e apto para a avaliação de valor de negócio.
   - A Entrega de Valor permanece em **`EM_REALIZACAO`**, aguardando o processo de Verificação.

## Handoff para o Verificador da Entrega de Valor

Com a emissão formal de `REALIZACAO_INTEGRADA`, a realização técnica interna da EV-004 está concluída. Entrega-se formalmente o handoff para o Ator agêntico **Verificador da Entrega de Valor** (`.agents/skills/entrega-de-valor/verificacao-da-entrega-de-valor/SKILL.md`) para realização da verificação independente da evolução de software frente aos critérios de valor estabelecidos na Especificação da EV-004.

