---
document_type: agent-execution-guide
status: APPROVED_FOR_PHASE_2
created_at: 2026-07-31
scope: execution of Phase 2 tasks F2-01 through F2-06
primary_roadmap: 01_DELIVERY_ROADMAP.md
---

# Guia de Execução do Agente — Fase 2

## Contexto do workspace

| Item | Localização |
| --- | --- |
| Raiz do projeto | `/home/mhj/git/naamive` |
| Documentação da migração | `/home/mhj/git/naamive/naamive/orchestration/demand-intake/node-web-orchestration-platform` |
| Runtime alvo | `/home/mhj/git/naamive/naamive/runtime/node-web` |
| Runtime Python legado | `/home/mhj/git/naamive/naamive/runtime/python` |

Trabalhe a partir da raiz do projeto. O runtime Python permanece `DEPRECATED` e
é somente referência de paridade; não recebe funcionalidades novas.

## Fonte de verdade e ordem de leitura

1. `00_PRODUCT_NORTH_STAR.md` para limites de produto, segurança e auditoria.
2. `01_DELIVERY_ROADMAP.md` para tarefas, pendências, issues e decisões da
   Fase 2.
3. `02_PHASE_1_STATE_MACHINE_CONTRACT.md` e as decisões `PROJECT_DISCOVERY` v1
   no roadmap para evoluir workflow somente por nova definição/migration.
4. `03_ARTIFACT_STORAGE_AND_AUDIT_CONTRACT.md` para referências imutáveis.
5. `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` para operação, outbox, lease,
   segurança local e exclusividade.
6. Este guia durante toda a execução.

## Escopo e ordem obrigatória

Execute somente F2-01 a F2-06. Não iniciar Fase 3.

1. F2-01: portar análise, módulos sugeridos, requisitos e revisão com testes
   de paridade críticos.
2. F2-02 e F2-03: evoluir worker/outbox e adaptador Codex isolado.
3. F2-04 e F2-05: projeções/SSE e tela de compromisso.
4. F2-06: aceite web controlado e smoke real separado.
5. Implementar `I-005` junto da fase: `ARCHIVE_PROJECT` global.

## Decisões aprovadas da Fase 2

### Fluxo e jobs

`START_PRODUCT_DISCOVERY` é disponível apenas em `REGISTERED` e retorna
`ACCEPTED` com `operation_id`. O workflow publicado `PROJECT_DISCOVERY` v1 usa:

```text
REGISTERED
  → ANALYSIS_IN_PROGRESS
  → REQUIREMENTS_IN_PROGRESS
  → REVIEW_IN_PROGRESS
  → WAITING_FOR_PRODUCT_COMMITMENT
  ├─ aprovar → PRODUCT_COMMITMENT
  └─ solicitar ajustes → REQUIREMENTS_IN_PROGRESS
```

Jobs sequenciais: `ANALYZE_PRODUCT_NEED`, `DEFINE_PRODUCT_REQUIREMENTS` e
`REVIEW_PRODUCT_COMMITMENT`. Agentes nunca mudam o estado; gravam evidência e
solicitam transição ao workflow.

### Evidências

Cada job grava JSON estruturado e Markdown legível no ArtifactStore, com versão
de schema, correlação, hashes e referências de entrada. Tipos obrigatórios:

- `product-need-analysis`: problema, público, objetivos, riscos, hipóteses,
  lacunas, perguntas e sugestões de módulos.
- `product-requirements`: escopo, fora de escopo, requisitos, critérios de
  sucesso, restrições, dependências e módulos consolidados.
- `product-commitment-review`: findings, riscos, recomendação e resultado
  `READY_FOR_GATE` ou `REQUIRES_ADJUSTMENT`.
- `product-commitment-decision`: decisão, feedback, versão e referências das
  três evidências anteriores.

O gate aprova ou solicita ajustes sobre o pacote completo. Decisão individual
por módulo pertence à Fase 3.

### Codex e execução

Um job/agente por vez. Configuração por ambiente:

```dotenv
NAAMIVE_AGENT_TIMEOUT_SECONDS=600
NAAMIVE_AGENT_MAX_RETRIES=2
NAAMIVE_AGENT_HEARTBEAT_SECONDS=30
NAAMIVE_CODEX_COMMAND=codex
NAAMIVE_CODEX_WORKDIR=/caminho/externo/workspaces
NAAMIVE_CODEX_TIMEOUT_SECONDS=600
```

O adaptador usa processo filho e workdir temporário externo ao repositório
NAAMIVE. Contexto é arquivo temporário estruturado, não argumento de shell.
Nunca persistir prompt completo, stdout/stderr bruto, tokens, segredos ou
variáveis de ambiente. Timeout encerra o processo e produz falha sanitizada.

### Web, SSE e gate

Exibir status de negócio, etapa atual, duração real, heartbeat, próxima ação e
timeline persistida. Eventos/status mostram data, hora, minuto e segundo locais.
Evidências mostram somente resumo sanitizado, tipo, hash e data. Gate mostra
resumos, módulos consolidados, parecer, riscos/findings e referências.

### Arquivamento global

`ARCHIVE_PROJECT` está disponível em qualquer estado ativo, inclusive job ou
gate. Exige confirmação e motivo. O workflow passa por `ARCHIVING`, encerra
trabalho ativo de modo governado, grava evento/evidência e chega a `ARCHIVED`.

No PostgreSQL, registrar `archived_at`, `archived_by`, `archive_reason` e
`archived_from_state`. No ArtifactStore, gravar
`archive/projects/<project-id>/archive-record.json`. Não mover artefatos
canônicos nem alterar o repositório Git externo. Ocultar arquivados da lista
padrão, com filtro para consultá-los.

## Regras obrigatórias

- Definições publicadas são imutáveis: criar migration/versão nova de workflow.
- Estado, evento, operação e job são atômicos quando aplicável.
- Jobs usam PostgreSQL outbox, lease, idempotência, retry e lock global.
- Todo comando é idempotente ou retorna conflito explicável.
- Toda falha é sanitizada, auditável e indica próxima ação.
- A identidade vem de `NAAMIVE_OPERATOR_ID` no servidor, nunca do payload web.
- API é localhost-only; ArtifactStore e workdirs são externos ao repositório
  NAAMIVE.
- Não iniciar próxima fase por saída de agente sem evidência persistida e
  transição autorizada pelo workflow.

## Testes e validação

No diretório `naamive/runtime/node-web`:

```sh
npm run build
docker compose up -d postgres
npm run migrate
npm run test
npm run e2e
```

O E2E usa adaptador controlado/determinístico e cobre: início, três jobs,
evidências correlacionadas, heartbeat, ajuste retornando a requisitos,
aprovação até `PRODUCT_COMMITMENT` e arquivamento durante job/gate. Execução
real do Codex é smoke separado; falha de ambiente externo deve ser registrada
como issue, sem invalidar o aceite controlado.

## Atualização do roadmap

Antes de cada tarefa, marque `TO DO → DOING`; após definição de pronto e
validação, marque `DONE` com observação factual. Registre issues reais na tabela
de issues do roadmap com ID sequencial, impacto, proposta e aprovação. Uma issue
`BLOCKING` bloqueia apenas a tarefa/fase afetada. Ao fim, revise pendências,
status e issues para eliminar divergências.

## Critério de término

F2-01 a F2-06 estão `DONE`; `I-005` está resolvida; não há issue
`OPEN/BLOCKING` da Fase 2. A demonstração web reproduz `REGISTERED` → início
assíncrono → análise → requisitos → revisão → gate → `PRODUCT_COMMITMENT`,
incluindo SSE, evidências e cenários de ajuste/arquivamento. Não iniciar a Fase
3.
