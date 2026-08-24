---
task: LR-02
document_type: prevalidation
status: PREVALIDATION_READY_FOR_IMPLEMENTATION
implementation_status: TO_DO
created_at: 2026-08-23
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# LR-02 — Pré-validação de sincronização do macro-lifecycle

## Resultado

**PREVALIDATION_READY_FOR_IMPLEMENTATION.** A matriz de lifecycle, os
predicados, as fronteiras e a política de evolução entre revisões aprovadas
estão fechados. A task bloqueadora
[`LR-02A`](LR-02A-canonical-product-commitment-modules.md) está `DONE` e
publicou a fonte canônica/imutável dos módulos comprometidos, eliminando a
reconstrução proibida de texto livre.

LR-02 permanece `TO DO` e é a próxima task serial. Esta atualização de
pré-validação não iniciou LR-02, AUT-02 ou GAT-02.

## Leitura e evidências examinadas

- planejamento 6.5, continuidade e README da fase;
- baseline histórica `2026-08-22-lifecycle-conformance-audit.md`;
- contratos LR-01, GAT-01, GAT-03, AUT-01 e REC-01, inclusive suas
  pré-validações, além de LR-02A, GAT-02 e AUT-02;
- `workflow.ts`, `service.ts`, `phase3.ts`, `product-commitment.ts`,
  `baseline-revision.ts`,
  `eligibility-scheduler.ts`, `recovery.ts`, `reconcile.ts`, `projection.ts`,
  `server.ts`, `worker.ts` e `discovery-agent-jobs.ts`;
- migrations 005, 006, 016--021, 029, 035--040, 048--062 (em especial 061 e
  062), schema de `modules`/`module_revisions`/`module_rounds`/`work_items` e
  os testes `workflow-v3.e2e.test.ts`, `lifecycle-v2.e2e.test.ts`,
  `phase3.e2e.test.ts` e a cobertura F5 de planejamento/review/telemetria.

## Dependências, autoridade e ordem

| Tipo | Contrato | Papel para LR-02 |
| --- | --- | --- |
| Dependência conceitual e funcional | LR-01 | Publica os workflows imutáveis `PROJECT_DISCOVERY:v4`, `MODULE_DELIVERY:v2` e `WORK_ITEM_DELIVERY:v2`, suas transições e classificação legado/v2. |
| Dependência conceitual e funcional | GAT-01 | Define gates, evidência e autoridade; LR-02 só reage à decisão persistida, não cria política humana. |
| Dependência funcional | AUT-01 | É a única autoridade para elegibilidade, capacidade, reservation, delivery, attempt e dispatch de WI. |
| Dependência funcional | REC-01 | É a única autoridade para classificação e execução de recovery, `RecoveryDecision`, retry/restart/reconcile/rework. |
| Guardrail de autoridade | GAT-03 | Autentica/RBAC qualquer gate ou comando humano; não participa da derivação automática do macro-estado. |

Ordem serial consolidada:
`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01 → LR-02A → LR-02`.
AUT-02 continua posterior e depende de LR-02; GAT-02 continua dona de entrega,
pausa, retomada e cancelamento.

## Inventário do estado persistido atual

| Entidade | workflow/version e estado atual | Trigger/componente atual | Problema para LR-02 | Comportamento alvo |
| --- | --- | --- | --- | --- |
| PROJECT | Legado `PROJECT_DISCOVERY:v1..v3`; `v4` publicado, rollout `NEW_PROJECTS=false`. v3 para em `READY_FOR_MODULE_MATERIALIZATION`; v4 contém `ANALYSIS`, `DEFINITION`, `ARCHITECTURE`, `PLANNING`, `IMPLEMENTATION`, `VALIDATION`, `DELIVERY`, `DELIVERED`. | `service.ts`, worker e decisões de gate atualizam `projects.state`; `startProductDiscovery` ainda é comando manual. | Projeto não recebe fatos de módulo/WI e não há intenção recuperável de discovery. | v4 selecionado explicitamente; agregador deriva estado de fatos/evidência e reconciliador recupera lacunas. |
| MODULE | Legado `MODULE_DELIVERY:v1`: `WAITING_FOR_MODULE_APPROVAL`, `DEFINITION_IN_PROGRESS`, `WAITING_FOR_ARCHITECTURE_DECISION`, `PLANNING_IN_PROGRESS`, `WORK_ITEMS_ACTIVE`, `MODULE_COMPLETED`. `v2` publicado, rollout `NEW_MODULES=false`, com `IDENTIFIED` até `DELIVERED`. | `phase3.ts` materializa e atualiza diretamente; `supersedeCandidate` força `WORK_ITEMS_ACTIVE`. | Gate duplicado e módulo não chega às fases macro publicadas. | v2 com transições derivadas pelo agregador, nunca por update ad hoc. |
| MODULE ROUND | Sem `workflow_code/version`; `round_number`, `state`, revisão e módulo. | `phase3.ts` cria rodada ao aprovar plano/rework. | É lineage de execução, não autoridade de macro-fase. | Continua evidência de rodada; não é reduzido a contagem de rounds. |
| WORK ITEM | Legado `WORK_ITEM_DELIVERY:v1`; `v2` já é selecionado em nova materialização de plano. v2 inclui `PLANNED`, `ELIGIBLE_FOR_DISPATCH`, `DISPATCHED`, `DEVELOPING`, `QA_IN_PROGRESS`, `INDEPENDENT_REVIEW`, `READY_FOR_PHASE_MERGE`, `MERGED_TO_PHASE`, recovery/rework/escalation. | AUT-01 atualiza `ELIGIBLE_FOR_DISPATCH`/`DISPATCHED`; worker, `phase3.ts` e REC-01 atualizam os demais. | O fato de execução ainda não tem ponte única para o agregado; `COMPLETED` não é aceite. | Fatos aceitos chamam reavaliação; aceite/integration comprovados, não job concluído, satisfazem predicados. |
| INTEGRATION CANDIDATE | Somente contrato legado `INTEGRATION_CANDIDATE:v1`: criada, validação, pendente/em progresso, integrada, bloqueada, supersedida; não há colunas de workflow/version na tabela. | `phase3.ts` e REC-01 mudam a candidata diretamente. | É evidência de integração, mas ainda não uma máquina versionada por linha. | LR-02 lê registro/evidência como fato; a futura implementação deve vincular a versão macro do projeto/módulo e não inferir por string global. |
| TECHNOLOGY BASELINE | Baseline/revision próprios (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUPERSEDED`), sem workflow macro. | `baseline-revision.ts`; v3 legado exige baseline antes de materializar. | Não equivale a progresso de módulo, mas é pré-condição de contexto quando aplicável. | Evidência/guard de arquitetura; nunca avanço macro por si só. |
| RECOVERY | `recovery_decisions` usa `RECOVERY_POLICY:v1`, causa, certeza, footprint, ação, estado de execução e lineage; não é workflow macro. | `recovery.ts`, worker e reconciler. | Recovery e rework são reais e podem coexistir com a fase macro. | REC-01 emite fato reavaliável; LR-02 apenas interpreta o impacto sem reclassificar causa. |

Estados legados permanecem classificados por LR-01 em `lr01_instance_classification`
como `PRESERVE_LEGACY`; não devem ser promovidos implicitamente. Pontos atuais de
update direto relevantes são `service.ts` (projeto), `phase3.ts` (módulo, WI e
candidata), AUT-01 (WI) e REC-01 (WI/candidata). Após LR-02, esses produtores
publicam fatos/intents; somente o agregador contém regra macro.

## Matriz normativa de PROJECT (`PROJECT_DISCOVERY:v4`)

| Estado | Entrada e evidência mínima | Saída/trigger | Filhos relevantes | Reversibilidade/versionamento |
| --- | --- | --- | --- | --- |
| `ANALYSIS` | `REGISTER_PROJECT` aprovado, intake/revisão e gate registrados; intent de discovery durável. | `ANALYSIS_ACCEPTED` → `DEFINITION`. | Nenhum módulo ainda obrigatório. | Só v4; reabertura de evolução pode voltar aqui com mudança rastreável. |
| `DEFINITION` | análise aceita; requisitos e módulos candidatos rastreáveis. | `PRODUCT_COMMITMENT_READY` → espera de gate; rework do compromisso retorna aqui. | Lista canônica de módulos comprometidos. | Gate humano GAT-01; histórico do gate e revisão preservados. |
| `WAITING_FOR_PRODUCT_COMMITMENT` | evidence GAT-01: `requirements_revision_id`, `candidate_modules`, investimento/riscos. | aprovação → `ARCHITECTURE`; rework → `DEFINITION`. | Nenhum módulo é materializado antes de decisão aprovada. | Gate versionado, fora de qualquer ordinal macro. |
| `ARCHITECTURE` | compromisso aprovado e arquitetura/evidência aceita; baseline aprovada se a política aplicável exigir. | `ARCHITECTURE_ACCEPTED` → `PLANNING`, ou gate material. | Módulos podem ser `IDENTIFIED`/`DEFINED`/`ARCHITECTED`. | Rework material retorna a `ARCHITECTURE`/`DEFINITION` pelo fato autorizado. |
| `PLANNING` | módulos comprometidos materializados, contexto arquitetural válido e planos autorizados. | `PROJECT_PLAN_ACCEPTED` → `IMPLEMENTATION`. | Cada módulo requerido tem plano aprovado (`PLANNED`) ou está em planejamento justificável. | Não avança só porque há um módulo pronto. |
| `IMPLEMENTATION` | predicado `projectImplementationStarted`; pelo menos um módulo requerido iniciou execução válida. | `IMPLEMENTATION_INTEGRATED` → `VALIDATION`. | Módulos podem divergir entre `IMPLEMENTING`, `INTEGRATING` e já `VALIDATING`; progresso parcial vai em substatus. | Finding/rework de fato aceito retorna explicitamente para esta fase. |
| `VALIDATION` | `projectImplementationComplete`: todos módulos requeridos integrados e sem bloqueio/recovery/rework impeditivo. | `VALIDATION_ACCEPTED` → `DELIVERY`, gate de risco ou `VALIDATION_REWORK_REQUIRED` → `IMPLEMENTATION`. | Módulos em `VALIDATING`/`READY_FOR_DELIVERY`. | Finding de módulo/projeto autorizado reabre para `IMPLEMENTATION`. |
| `DELIVERY` / `DELIVERED` | validação aceita; depois aceite final com evidência de operação/handover. | `DELIVERY_ACCEPTED` → `DELIVERED`; rework de entrega → `VALIDATION`. | `READY_FOR_DELIVERY`; `DELIVERED` só após o projeto. | Execução é hook de GAT-02; LR-02 não a implementa. |

## Matriz normativa de MODULE (`MODULE_DELIVERY:v2`)

| Estado | Entrada/evidência mínima | Saída/trigger | Fonte de autoridade | Reabertura |
| --- | --- | --- | --- | --- |
| `IDENTIFIED` | registro materializado da revisão aprovada, com `module_key` estável. | `MODULE_DEFINITION_ACCEPTED` → `DEFINED`. | compromisso/revisão canônica e review independente. | Evolução rastreável pode criar novo ciclo. |
| `DEFINED` / espera arquitetural material | fronteira, escopo, critérios e arquitetura sujeitos a revisão; gate só se material. | arquitetura aceita → `ARCHITECTED`; rework material → `DEFINED`. | evidência/review e GAT-01. | Fato de arquitetura, não WI, autoriza retorno. |
| `ARCHITECTED` / `PLANNING_IN_PROGRESS` / espera de plano | contexto válido e proposta de plano versionada. | proposta → gate; aprovação → `PLANNED`; ajuste → planejamento. | revisão do plano e gate `MODULE_PLAN_APPROVAL`. | Ajuste preserva revision/round. |
| `PLANNED` | plano completo aprovado; WIs materializados com workflow selecionado. | `ELIGIBLE_WORK_ITEMS_AVAILABLE` → `IMPLEMENTING`. | plano aprovado e AUT-01 para dispatch. | Replan explícito, nunca atualização de filho por contagem. |
| `IMPLEMENTING` | `moduleImplementationStarted`: WI requerido despachado ou produzindo, com evidencia/attempt válido. | `MODULE_IMPLEMENTATION_ACCEPTED` → `INTEGRATING`. | predicado aceito/integrado, não job `COMPLETED`. | Finding/rework de WI/validação retorna aqui. |
| `INTEGRATING` | todos WIs requeridos satisfeitos por aceite normativo e integração de fase iniciada. | integração aceita → `VALIDATING`; finding de integração → `IMPLEMENTING`. | acceptance + registro de integração, futuro handoff AUT-02. | Divergência REC-01 mantém/assinala recuperação; finding autorizado retorna a implementação. |
| `VALIDATING` | integração concluída e evidência de validação de módulo criada. | validação aceita → `READY_FOR_DELIVERY`; finding → `IMPLEMENTING`. | validação/review independente. | Reabertura só por finding/rework persistido. |
| `READY_FOR_DELIVERY` / `DELIVERED` | qualidade/segurança aceitas; aceite do projeto entregue. | projeto entregue → `DELIVERED`; finding → `IMPLEMENTING`. | GAT-02 para aceite, LR-02 apenas agrega. | Pausa/cancelamento são hooks GAT-02. |

## Predicados agregados versionados

Os predicados pertencem a um contrato, por exemplo
`MACRO_AGGREGATION:PROJECT_DISCOVERY:4:MODULE_DELIVERY:2:v1`, e recebem fatos
e evidências versionados. Um label de estado é apenas indício; não é evidência
normativa suficiente.

| Predicado | Verdadeiro somente quando | Autoridade |
| --- | --- | --- |
| `moduleImplementationStarted` | existe WI requerido do plano aprovado em dispatch/produção válido, sem ser somente tentativa órfã. | plano/revisão, AUT-01 reservation/attempt. |
| `workItemNormativelySatisfied` | WI possui `ACCEPT`/acceptance normativa aplicável **e** evidência de integração exigida pelo workflow; `EXECUTION_SUCCEEDED`, QA isolado ou job concluído não bastam. | work acceptance, finding fechado/revalidado quando aplicável, integration record. |
| `moduleImplementationComplete` | todo WI requerido do plano/round ativo satisfaz `workItemNormativelySatisfied`; não há finding aberto, `RECOVERY_REQUIRED`, rework ativo, dependência necessária pendente, blocker impeditivo ou escalada sem continuação. | plano, acceptance, findings, blockers, REC-01 e integrações. |
| `moduleIntegrationComplete` | candidata/attempt de integração aplicável confirma efeito integrado e não há divergência, candidata supersedida ou finding aberto imputável ao módulo. | integration candidate/attempt, Git reconciliation REC-01, findings. |
| `moduleValidationComplete` | `moduleIntegrationComplete` e evidência de qualidade/segurança aceita existem; gates materiais, se aplicáveis, foram resolvidos. | validação/review/gate GAT-01. |
| `projectImplementationStarted` | algum módulo requerido tem execução válida e nenhum precondition de compromisso/materialização está ausente. | módulos v2 e suas evidências. |
| `projectImplementationComplete` | todo módulo requerido e ativo satisfaz `moduleIntegrationComplete`; módulos opcionais/cancelados só são excluídos por política GAT-02 persistida. | módulos, plano de compromisso, integration records. |
| `projectValidationComplete` | todo módulo requerido satisfaz `moduleValidationComplete` e não há risco material/escalada impeditivos. | validações, gates e recovery. |

`PAUSED` e `CANCELLED` ainda não são fatos operacionais implementados. Até
GAT-02, eles são `UNSUPPORTED_FUTURE_HOOK`: não contam como concluídos nem são
silenciosamente ignorados. Quando GAT-02 publicar seu contrato, pausa preserva
o estado ativo anterior e aparece como substatus impeditivo; cancelamento só
exclui módulo se a decisão de escopo/cancelamento persistida disser que ele não
é requerido.

## Matriz fato/evidência → MODULE

Chave geral de decisão: `macro:<workflow_code>:<workflow_version>:module:<id>:<source_version>:<fact_fingerprint>`.
Cada linha persiste `MODULE_MACRO_REEVALUATION_REQUESTED` e, se houver mudança,
`MODULE_MACRO_TRANSITIONED` com origem, destino, predicado, referências de
evidência e correlação.

| Fato | Decisão, origem → destino | Evidência/guard |
| --- | --- | --- |
| módulo materializado | `FORWARD_TRANSITION`, nova instância → `IDENTIFIED` | commitment revision canônica, `module_key`, payload/hash e unicidade. |
| arquitetura aprovada | `FORWARD_TRANSITION`, `DEFINED`/espera material → `ARCHITECTED` | review/gate atual e contexto arquitetural. |
| plano aprovado | `FORWARD_TRANSITION`, espera de plano → `PLANNED` | gate e `module_plan_revision` aprovados. |
| WIs raiz despachados / WI produzindo | `FORWARD_TRANSITION`, `PLANNED` → `IMPLEMENTING`; repetição é `NO_CHANGE`. | AUT-01 reservation/job/delivery válidos. |
| todos WIs normativamente satisfeitos | `FORWARD_TRANSITION`, `IMPLEMENTING` → `INTEGRATING` | `moduleImplementationComplete`, nunca contagem de estados. |
| candidata criada | `NO_CHANGE` ou substatus `integration_pending`; não promove sozinha. | candidata ligada aos WIs/round aplicáveis. |
| integração concluída | `FORWARD_TRANSITION`, `INTEGRATING` → `VALIDATING` | `moduleIntegrationComplete`. |
| validação concluída | `FORWARD_TRANSITION`, `VALIDATING` → `READY_FOR_DELIVERY` | `moduleValidationComplete`. |
| finding criado / rework decidido | `REOPEN_TRANSITION`, `INTEGRATING`/`VALIDATING`/`READY_FOR_DELIVERY` → `IMPLEMENTING`; em definição/arquitetura usa trigger específico. | finding aberto vinculado ou decisão REC-01/GAT-01 persistida. |
| recovery ativo | `NO_CHANGE` de fase, com substatus impeditivo; se efeito inviabiliza integração, mantém `INTEGRATING`. | `RecoveryDecision` vigente e fingerprint. |
| recovery concluído | `NO_CHANGE` ou reavaliação; rework concluído não aceita WI implicitamente. | decisão executada e fato resultante. |
| escalada | `NO_CHANGE`, substatus `WAITING_FOR_ESCALATION`; nunca terminal automaticamente. | `RecoveryDecision`/gate record com continuação. |
| pause/cancel reconhecido | `NO_CHANGE` de LR-02, hook GAT-02; futuro comportamento só com decisão publicada. | evento/estado GAT-02 válido. |
| fato sem workflow/versão, evidence incompatível ou source inválido | `INVALID`; nada muda. | validação da transição publicada e referências. |

## Agregação MODULES → PROJECT e compatibilidade

Projeto não é `min(module ordinal)` nem `max(module ordinal)`. Ele representa
a fase que possui evidência global suficiente; a projeção mostra distribuição,
blockers e módulos mais avançados sem transformar isso em transição.

| Cenário | Estado PROJECT | Substatus e motivo | Reabre? |
| --- | --- | --- | --- |
| um módulo em `IMPLEMENTING` | `IMPLEMENTATION` | execução iniciada, mas integração global não demonstrada. | não. |
| dois entregáveis concluídos e um implementando | `IMPLEMENTATION` | progresso parcial visível; predicado universal ainda falso. | não. |
| um módulo em recovery/rework | fase anterior compatível, normalmente `IMPLEMENTATION`; `recovery_active=true` | recovery não é falha terminal nem aceite. | somente por finding/rework autorizado. |
| módulos em fases diferentes | menor fase global comprovada por predicado, tipicamente `PLANNING` ou `IMPLEMENTATION` | distribuição por módulo na projeção. | não por regressão ordinal. |
| todos integrados | `VALIDATION` | `projectImplementationComplete=true`. | não. |
| alguns bloqueados | mantém fase comprovada; `blocked_modules` explica impedimento | blocker não cria gate humano por si. | somente se o fato também for rework/finding autorizado. |
| todos prontos para entrega | `DELIVERY` após validação global aceita | GAT-02 ainda faz o aceite final. | finding de entrega volta a `VALIDATION`. |
| módulo opcional/cancelado | só excluído de universalidade por decisão GAT-02/escopo persistida; pausado continua impeditivo | contrato futuro, não implementação antecipada. | conforme decisão publicada. |
| todos entregues | `DELIVERED` | depende do aceite de projeto GAT-02, não apenas dos módulos. | evolução explícita. |

"Nenhum módulo ultrapassa o projeto" significa compatibilidade semântica, não
ordem numérica: módulo `INTEGRATING`/`VALIDATING` pode coexistir com projeto
`IMPLEMENTATION`, pois o projeto ainda não possui a evidência **de todos** os
módulos. É inválido apenas promover o projeto à frente de seu predicado (por
exemplo `VALIDATION` sem todos os módulos requeridos integrados), ou aceitar
um módulo como entregue antes do aceite de projeto. Mapa permitido: projeto
`PLANNING` aceita módulos até `PLANNED`; `IMPLEMENTATION` aceita módulos de
`IMPLEMENTING` até `READY_FOR_DELIVERY`; `VALIDATION` exige todos ao menos
integrados; `DELIVERY` exige todos prontos para entrega; `DELIVERED` exige
módulos entregues pelo trigger de aceite do projeto.

## Reabertura explícita

Não existe regra "filho regrediu, agregado regride". Apenas estes fatos
autorizam `REOPEN_TRANSITION`, sempre com evento auditável,
`reopening_reason`, referências e transição publicada:

- finding aberto ou rework REC-01 vinculado a WI aceito/integrado:
  MODULE `INTEGRATING`/`VALIDATING`/`READY_FOR_DELIVERY` → `IMPLEMENTING` e
  PROJECT `VALIDATION`/`DELIVERY` → `IMPLEMENTATION`;
- finding de integração/divergência confirmada por REC-01: MODULE permanece em
  `INTEGRATING` com substatus de recovery ou volta a `IMPLEMENTING` se houver
  rework de WI; o projeto volta apenas se o predicado global antes verdadeiro
  torna-se falso por esse fato;
- rework de arquitetura/escopo decidido no gate publicado: retorna somente à
  fase indicada pela transição do workflow;
- rework de entrega GAT-02: PROJECT `DELIVERY` → `VALIDATION`.

O evento guarda o estado anterior, a versão e o fato causador; nenhuma linha
histórica certificada é sobrescrita.

## Descoberta e materialização automáticas

### `REGISTER_PROJECT` → discovery

Para `PROJECT_DISCOVERY:v4`, a aprovação de `REGISTER_PROJECT` deve, na mesma
transação de banco, persistir: decisão do gate, transição para `ANALYSIS`,
`MACRO_DISCOVERY_REQUESTED` e uma intenção/outbox com chave
`discovery:<project_id>:<intake_revision_id>:v4`. Um executor cria ou recupera
a operação/job de discovery. Se o processo cair após o commit, o
`MacroLifecycleReconciler` busca intents pendentes/sem operação e converge
exatamente uma vez. A chamada pós-commit frágil a `startProductDiscovery` não
é admissível. V1--v3 preservam o comando e a semântica histórica.

### Materialização de módulos

O alvo é uma linha por `(project_id, commitment_revision_id, module_key)`,
com `module_key` imutável, payload versionado/hash e unique constraint. A
intenção individual deve usar
`materialize:<project_id>:<commitment_revision_id>:<module_key>`. Assim, se
A/B forem commitados e houver crash, replay cria somente C; concorrência retorna
a mesma linha/intent pelo índice e lock de projeto/revisão. Reprocessar a mesma
revisão é `NO_CHANGE`; uma revisão diferente só cria/atualiza o ciclo segundo
política explícita, nunca reescreve módulo histórico.

### Fonte canônica entregue

**Decisão arquitetural resolvida por LR-02A — committed modules.**

O problema bloqueante era a ausência de uma fonte persistida para
`candidate_modules`; ler texto/metadata de `product-commitment-review` seria
reconstrução de texto livre e quebraria replay, idempotência e auditabilidade.

LR-02A entregou `ProductCommitmentRevision` imutável com itens canônicos,
`module_key`, payload/hash, vínculo a `gate_records/gate_decisions`, read model
e infraestrutura de lineage. A migration 061 e os testes PostgreSQL provaram
replay, concorrência, imutabilidade e proteção cross-project. LR-02 pode agora
consumir somente revisões `APPROVED` e preencher o lineage operacional.

## Política normativa — `COMMITTED_MODULE_EVOLUTION_POLICY:v1`

Esta política fecha a materialização da primeira revisão e o delta entre
`ProductCommitmentRevision` aprovadas. Ela é consumida somente para instâncias
novas selecionadas de `PROJECT_DISCOVERY:v4` / `MODULE_DELIVERY:v2`; não
reinterpreta módulos, revisões, rounds ou projetos `PRESERVE_LEGACY`.

### Entrada, identidade e fingerprint

Para uma revisão `R` em `APPROVED`, a LR-02 compara cada candidato com a
resolução materializada mais recente da mesma `module_key` na cadeia ancestral
de `R` (candidate → materialization → module/revision). Se não existir tal
resolução, o candidato é `ADDED`; se existir, seu fingerprint é o baseline de
`SAME`/`CHANGED`. Essa regra também converge quando uma ancestral foi
parcialmente materializada: uma chave já resolvida nela pode ser reutilizada
pela sucessora; uma chave ainda sem resolução é materializada uma única vez.
`PENDING_APPROVAL` e `REJECTED` nunca são autoridade, não geram delta e não
substituem o baseline de comparação.

`module_key` é a única identidade lógica. Nome, título, ordinal, posição na
lista, UUID de linha e UUID de revisão não participam da identidade. O ordinal
continua exclusivamente de apresentação. Para a mesma `module_key`, a política
calcula `candidateModuleFingerprint:v1(candidate)` como SHA-256 do JSON
canônico abaixo:

```text
{
  policy_version: "COMMITTED_MODULE_EVOLUTION_POLICY:v1",
  module_key,
  name,
  objective,
  scope,
  out_of_scope,
  dependencies,
  acceptance_criteria,
  source_evidence: { requirement_refs, artifact_refs }
}
```

As strings são normalizadas exatamente como `PRODUCT_COMMITMENT_MODULES:v1`
(NFC, quebras de linha normalizadas e trim). As chaves de objeto são emitidas
em ordem lexical. `dependencies` é conjunto: deve estar sem duplicata e em
ordem lexical por `module_key`; `source_evidence.requirement_refs` é conjunto e
ordena lexicalmente; `artifact_refs` é conjunto e ordena por
`artifact_id,sha256`. A ordem de `scope`, `out_of_scope` e
`acceptance_criteria` é preservada porque é conteúdo normativo ordenado. Não é
permitido usar JSON bruto, serialização incidental de `jsonb` ou hash do
snapshot inteiro para decidir `SAME`/`CHANGED`.

`source_evidence` é **normativa** nesta versão: a mudança de qualquer
`requirement_ref`, `artifact_id` ou `sha256` muda o fingerprint e portanto é
`CHANGED`. Não há classe `SAME_WITH_LINEAGE_UPDATE`: essa alternativa quebraria
o fato já publicado pela LR-02A de que as referências canônicas integram o
contrato/evidência do compromisso. A nova linha de materialization lineage é
registrada também em `SAME`; ela não torna uma mudança de evidência invisível.

### Classificação determinística e efeitos

| Classe | Predicado | `module` e `module_revision` | Round, lineage e macro lifecycle |
| --- | --- | --- | --- |
| `SAME` | chave existe no baseline e fingerprint igual | reutiliza o mesmo `module_id` e a mesma `module_revision_id` semanticamente corrente; não cria revision. | grava lineage do candidato de `R` para os IDs reutilizados; não cria round e não reabre módulo/projeto. |
| `CHANGED` | chave existe no baseline e fingerprint diferente | reutiliza obrigatoriamente o mesmo `module_id`; cria uma nova `module_revision` imutável, sucessora da corrente, e faz dela a `current_revision_id`. Criar outro módulo lógico é inválido. | cria um novo `module_round` para a nova revision, grava lineage e executa `REOPEN_TRANSITION` normativo. Evidência e critérios da revisão anterior continuam históricos, mas não satisfazem a nova. |
| `ADDED` | chave não existe em nenhuma materialização requerida anterior do projeto | cria um novo `module_id` e sua primeira `module_revision` (`revision=1`). | cria o primeiro round e o lineage; registra fato de required-set e reabre o projeto quando a fase atual já pressupunha conjunto fechado. |
| `REMOVED` | chave existe no `EffectiveRequiredModuleSet`/baseline, mas não ocorre em `R` | não cria nem altera módulo, revision ou round. | não cria linha artificial de lineage; preserva lineage anterior, registra fato de divergência de escopo e mantém a obrigação até GAT-02 decidir diferente. |

A classificação é por `module_key` no conjunto inteiro, não pareamento por
posição. Em um delta misto, cada candidato é resolvido individualmente,
enquanto `REMOVED` é calculado como diferença do required-set contra as chaves
presentes em `R`.

### Lineage de revision e rounds

O schema atual já possui `modules.current_revision_id`,
`module_revisions.revision` (único por `project_id,module_key,revision`) e
`module_rounds(module_id,revision_id,round_number)`. Ele **não** possui
predecessor explícito em `module_revisions`, nem source direto da revision para
`ProductCommitmentRevision`/`product_commitment_module`; o campo
`supersedes_revision_id` usado hoje dentro de `payload` não é uma FK nem prova
auditável suficiente. A tabela de materializations permite descobrir a origem
de um alvo já materializado por join, mas não fecha sozinha a cadeia de
evolução.

Logo, LR-02 deve adicionar, de forma aditiva, lineage explícito e imutável para
uma revision criada por esta política: predecessor de mesma chave/projeto,
`source_product_commitment_revision_id`,
`source_product_commitment_module_id` e operação/fato de evolução, com FKs
compostas que preservem projeto e `module_key`. A implementação deve assegurar
que a nova revision é `revision = predecessor.revision + 1`, que o predecessor
é preservado (não apagado) e que `modules.current_revision_id` só aponta para
a nova revision na mesma transação que seu round, lineage e transição. Assim é
possível responder, sem ler texto livre: “B2 existe por qual fato?”, “qual
commitment/candidate a gerou?” e “qual B1 ela evolui?”.

`CHANGED` inicia uma nova revision e um novo round; planos, WIs, gates,
deliveries, candidates, acceptance e evidence já ligados à revision/round
anterior nunca são movidos nem reusados como satisfação da nova. Uma proposta
de plano antiga pode continuar como evidência histórica, mas não é plano ativo
da nova revision. A nova `module_revision.status` é `APPROVED`, com a decisão
`PRODUCT_COMMITMENT` fonte como sua aprovação normativa; não se abre um
`MODULE_APPROVAL` duplicado. O `module.state` e o novo `module_round.state`
iniciam em `IDENTIFIED` no contrato v2 e só avançam com os fatos normativos
próprios. Isso evita fingir que um plano ou QA antigo aceitou scope, dependency
ou acceptance alterados.

### Reabertura por mudança comprometida

`CHANGED` e `ADDED` não aplicam decremento de ordinal. Eles publicam
`COMMITTED_MODULE_EVOLUTION_DETECTED` e uma `REOPEN_TRANSITION` com
`reason=PRODUCT_COMMITMENT_EVOLUTION`, revisão/candidato fonte, fingerprint
anterior/novo, evidence, estado anterior e destino. A regra conservadora v1 é
necessária porque o contrato canônico não contém uma taxonomia confiável da
profundidade semântica da alteração:

| Delta | Módulo | Projeto |
| --- | --- | --- |
| `SAME` | nenhum reopen. | nenhum reopen. |
| `CHANGED` | nova revision em `IDENTIFIED`; toda fase posterior da revision anterior é evidência histórica, nunca satisfação. | se o projeto estava em `PLANNING`, `IMPLEMENTATION`, `VALIDATION`, `DELIVERY` ou `DELIVERED`, reabre para `ARCHITECTURE` quando a mudança alcança o conjunto requerido. Se já estava em `ANALYSIS`/`DEFINITION`/`ARCHITECTURE`, preserva a fase ou sua substatus de pendência, sem regressão ordinal. |
| `ADDED` | nova revision/round em `IDENTIFIED`. | aplica a mesma reabertura conservadora de `CHANGED` se a fase já pressupunha conjunto fechado; caso contrário, registra a pendência sem transição redundante. |
| `REMOVED` pendente | não reabre nem encerra o módulo apenas pela ausência. | não promove; expõe `scope_change_pending` e mantém os universais do required-set. Uma decisão GAT-02 futura poderá determinar uma transição. |

Essa regra trata igualmente mudança somente de `acceptance_criteria`,
`scope`, `out_of_scope`, `dependencies`, `objective`, `name` ou
`source_evidence`: todas são `CHANGED`, criam revision e exigem revalidação
integral. Não há heurística silenciosa por tipo de campo. Em especial,
acceptance/evidence da revisão anterior não satisfazem a nova; AUT-02 será a
dona dos fatos novos de QA/review/integration.

Alteração de `dependencies` também é `CHANGED`. A LR-02 registra
`MODULE_DEPENDENCY_GRAPH_CHANGED` e a nova revision fica inelegível até seu
plano/guard refletir o DAG canônico. Ela não mata job, worktree, delivery ou
attempt existente: AUT-01 continua sendo a autoridade de elegibilidade e
scheduling; REC-01 continua sendo a autoridade de recovery. Attempts da
revision anterior são preservadas e só recebem supersession/rework por fato
normativo posterior, nunca por delete implícito.

### `EffectiveRequiredModuleSet:v1` e fronteira GAT-02

`EffectiveRequiredModuleSet(project)` é a autoridade para os universais
`projectImplementationComplete`, `projectValidationComplete` e
`projectReadyForDelivery`; esses predicados não podem iterar simplesmente os
`candidate_modules` da revisão aprovada corrente. Formalmente, ele contém todo
`module_id` materializado por uma revisão aprovada do projeto e ainda não
excluído por um fato de escopo/cancelamento GAT-02 persistido, autorizado e
aplicável a esse módulo/revision. Para uma chave repetida, há um único módulo
lógico; sua revision corrente é a obrigação ativa. Chaves de commitment
posterior ainda não materializadas tornam a materialização incompleta e também
impedem os predicados que a pressupõem.

Assim, `REMOVED` significa somente “ausente da proposta comprometida corrente”.
Ele não faz `DELETE`, `ARCHIVE`, `CANCEL`, `NOT_REQUIRED`, remoção do
required-set, apagamento de lineage nem invalidação do histórico. A LR-02
persiste/projeta `scope_change_pending` com a revisão que detectou a ausência e
o módulo continua requerido e presente nos universais. GAT-02, que permanece
`TO_DO`, será a única autoridade para produzir a decisão de scope/cancelamento
que pode excluí-lo e autorizar a transição correspondente. A LR-02 não inventa
decisão humana nem implementa GAT-02.

### Completion, intents, materialização parcial e replay

`commitmentMaterializationComplete(revision_id)` é verdadeiro somente se a
revisão está `APPROVED` **e** cada candidato dela possui resolução completa e
persistida:

- `SAME`: lineage para o módulo e revision reutilizados;
- `CHANGED`: nova revision, novo round, transição/fato de reabertura e lineage;
- `ADDED`: módulo, primeira revision, primeiro round e lineage.

`REMOVED` não é candidato da revisão nova e portanto não integra esse
universal; é coberto pelo `EffectiveRequiredModuleSet`. Consequentemente,
`PRODUCT_COMMITMENT_APPROVED != COMMITTED_MODULES_MATERIALIZED`. Enquanto uma
resolução faltar, a projeção expõe `commitment_materialization_pending=true`,
os candidate keys/intents pendentes e o motivo; o projeto não avança por um
predicado que exija materialização completa. Exemplo: A `SAME` e B `CHANGED`
concluídos, D `ADDED` pendente mantém `commitmentMaterializationComplete(r2)`
falso após crash/restart, sem desfazer A ou B.

Se uma sucessora se torna `APPROVED` antes de a predecessora completar a
materialização, a predecessora deixa de ser elegível para novas inserções na
tabela de lineage (a guarda LR-02A exige `APPROVED`). Seus intents pendentes
terminam como superseded/no-op, sem rollback nem delete das resoluções já
persistidas. O reconciler processa a sucessora pela cadeia acima e completa
somente as chaves que ainda faltam; uma materialização parcial anterior segue
auditável e pode servir de baseline por chave. A projeção mostra a pendência da
revisão corrente, nunca uma falsa conclusão da predecessora supersedida.

Cada ação durável recebe intent/outbox e chave determinística versionada:

```text
committed-module-evolution:v1:<project>:<revision>:<module_key>:SAME_LINEAGE
committed-module-evolution:v1:<project>:<revision>:<module_key>:EVOLVE_MODULE
committed-module-evolution:v1:<project>:<revision>:<module_key>:ADD_MODULE
scope-divergence:v1:<project>:<revision>:<removed_module_key>
```

O reconciler redescobre revisões aprovadas, recomputa o delta do estado
persistido e cria somente intents faltantes. A unidade transacional de uma
resolução contém seu intent/operação, objeto(s) alvo, lineage, fatos/eventos e
pedido de reavaliação. Reprocessar a mesma revisão não cria module, revision,
round, materialization, intent funcional ou reabertura duplicados; ele encontra
as chaves/uniques e converge para `NO_CHANGE`.

### Concorrência, AUT-01, REC-01 e AUT-02

PostgreSQL é a autoridade de concorrência. Para uma resolução LR-02, a ordem
obrigatória de lock é `project → product_commitment_revision → modules` em
ordem lexical de `module_key` → `module_revisions`/`module_rounds` → intent/
operation. Lotes usam `FOR UPDATE SKIP LOCKED` somente para selecionar intents;
cada handler relê revisão, materializations, required-set e predicados sob
esses locks. A unicidade já publicada por candidato e por
`(project,revision,module_key)`, mais as novas constraints de lineage/revision,
é defesa em profundidade contra dois reconcilers ou duas intents da mesma chave.

A LR-02 não obtém lock de WI, delivery, worktree, job, capacity ou
`RecoveryDecision`; portanto não inverte a ordem de AUT-01 (WI antes do lock
global de capacidade) nem a de REC-01 (decision/job/WI). Quando surge uma
revisão durante trabalho ativo, a transação só registra a evolução/reopen e o
fato para os donos. AUT-01 observa a nova revision/guard para agendar trabalho
futuro sob sua política, sem bypass de capacidade. Se existe recovery ativo,
REC-01 permanece íntegra; LR-02 não a apaga nem reclassifica e preserva sua
evidência. Recovery, revision nova e crash convergem por replay e pela
supersession/rework normativa, não por cancelamento.

AUT-02 continua fora de escopo. O hook que ela receberá é a nova
`module_revision`/round e os fatos de reabertura: QA, review, `ACCEPT`, merge e
integração da revision anterior não são herdados; AUT-02 produzirá os novos
fatos aplicáveis. LR-02 limita-se a materializar/evoluir, reabrir agregados e
publicar facts/intents.

### Matriz mínima de implementação futura

| Grupo | Prova obrigatória em PostgreSQL real |
| --- | --- |
| Primeira revisão | r1 A/B/C cria três módulos, revisões 1, rounds e lineage. |
| `SAME` | r1/A → r2/A idêntico mantém `module_id` e `module_revision_id`, cria somente lineage e não reabre. |
| `CHANGED` | r1/B → r2/B alterado mantém `module_id`, cria B2/round/lineage/predecessor/source e reabre pela regra conservadora. |
| `ADDED` | r1 A/B → r2 A/B/D cria somente D como módulo novo. |
| `REMOVED` | r1 A/B/C → r2 A/B preserva C, seus fatos e `required=true`; registra scope pendente e não cancela. |
| Misto e sucessões | A `SAME`, B `CHANGED`, C `REMOVED`, D `ADDED`; r1 → r2 → r3 e r2 `REJECTED` preservam identidade/autoridade. |
| Aceite/dependência | alteração de criteria não herda acceptance; alteração de dependency exige novo plano/guard, sem matar attempt ativo. |
| Crash/replay | A/B concluídos e D pendente após crash processa só D; replay não duplica objetos, intent, lineage ou reopen. |
| Concorrência/recovery | dois reconcilers resolvem uma vez por candidato; evolução durante recovery preserva `RecoveryDecision` e converge. |
| Agregação/GAT-02 | required-set bloqueia universais até decisão GAT-02 válida; revisão aprovada parcialmente materializada é projetada como pendente. |

## Desenho de agregação, atomicidade e concorrência

`MacroLifecycleAggregator` é função pura/versionada: recebe o par
`workflow_code/version`, aggregate bloqueado, fatos filhos e referências de
evidência; avalia predicados; devolve `FORWARD_TRANSITION`,
`REOPEN_TRANSITION`, `NO_CHANGE` ou `INVALID`. Não cria job, delivery,
worktree, tentativa, gate ou efeito Git.

`MacroLifecycleReconciler` consome intents/fatos persistidos e converge os
agregados. Na mesma transação para um efeito de banco: bloqueia linha do
agregado (`FOR UPDATE`), valida versão/source/predicados, grava transition e
reason/evidence, atualiza state/version, grava evento auditável e a próxima
intenção de reavaliação. Side effects ficam fora. A tabela `events` atual é
durável como audit trail, mas não é outbox suficiente: não possui consumidor,
estado/lease, dedupe por destino nem intent de reprocessamento. LR-02 requer
outbox/intent aditivo (ou extensão equivalente) sem nova mensageria.

Convergência: eventos repetidos usam a chave determinística; handler e
reconciler disputam locks no banco, não lock em memória. Para fan-in de WIs ou
módulos, locks ordenados por aggregate e `FOR UPDATE SKIP LOCKED` para lote de
intents evitam duplicação/deadlock. Cada reavaliação relê dados sob lock, logo
dois WIs/módulos que terminam juntos, recovery+integration, duas instâncias e
crash entre fato e agregado convergem. Crash após aggregate/evento apenas deixa
intent idempotente a ser reconhecida como já aplicada.

Fonte de verdade: fatos filhos, decisões, revisões, evidence, acceptance,
integration records e `RecoveryDecision` são fontes; `projects/modules.state`
são macro-estados persistidos derivados; API/SSE/UI são projeções. Client e
projeção jamais promovem agregado.

## Versionamento e fronteiras

LR-02 governa exclusivamente novas instâncias selecionadas de
`PROJECT_DISCOVERY:v4` e `MODULE_DELIVERY:v2`, com WIs
`WORK_ITEM_DELIVERY:v2`. O rollout permanece desligado até LR-02 implementar e
validar este contrato; committed modules já foram entregues por LR-02A. V1--v3 e MODULE v1 são
consultáveis e classificados `PRESERVE_LEGACY`; não há migração implícita.
Migração futura exige classificação LR-01, pré-condições/evidência, plano
explícito, evento e reavaliação, e rollback de política só afeta novos
dispatches; replay usa as chaves versionadas.

AUT-01 continua a única dona de eligibilidade, dependências, capacidade,
reservation, delivery, attempt e dispatch. LR-02 só observa seus fatos e nunca
cria job/delivery/worktree. REC-01 continua a única dona de causa, retry,
restart, resume, reconcile, rework e `RecoveryDecision`. Ela provoca
reavaliação por `RECOVERY_REQUIRED`, decisão de rework, completion e eventos de
integração; LR-02 não muda a classificação. `WAITING_FOR_ESCALATION` é
substatus consistente e não terminal; REC-02 continua responsável por
reviewer/blocks/routing. AUT-02 implementará QA, review, `ACCEPT`, merge,
candidata, validação e integração; LR-02 só publica os hooks de fatos e os
predicados acima, sem antecipar aquele pipeline. GAT-02 implementará comandos,
autoridade e políticas de pausa/cancelamento; LR-02 apenas reserva a semântica
de agregação após fato GAT-02 válido.

## Matriz de testes obrigatória para a implementação futura

| Grupo | Casos mínimos |
| --- | --- |
| Registro/discovery | aprovação cria intent; replay; crash antes de operation/job; duas instâncias; versão antiga inalterada. |
| Commitment/materialização | zero, um e múltiplos módulos; `module_key` duplicado; revision distinta; crash A/B/C; replay e concorrência. |
| Módulo | raiz dispatchada, múltiplos WIs, fan-in/out, WIs todos aceitos/integrados, blocker, recovery, rework, candidata, integração e validação. |
| Projeto | um/muitos módulos, fases diferentes, módulos concluídos + um implementando, reabertura, todos integrados, todos entregues e pause/cancel quando GAT-02 existir. |
| Predicados negativos | job concluído/QA isolado não conclui WI; evidence/acceptance ausentes; workflow/version/fato incompatíveis não mudam estado. |
| Concorrência/crash | dois WIs e dois módulos simultâneos; event+reconciler; recovery+integration; replay; fato commitado sem agregado; agregado commitado sem consumidor; restart. |
| Versionamento e API | legado preservado; novo workflow correto; migração apenas explícita; API/SSE mostra macro-state/eventos e não oferece comando manual técnico. |
| PostgreSQL | unique keys, locks, idempotência, atomicidade e ausência de avanço duplicado em banco real. |

## Checklist de fronteira concluído

1. Fonte canônica versionada de módulos comprometidos publicada por LR-02A.
2. Pré-validação atualizada para `PREVALIDATION_READY_FOR_IMPLEMENTATION` com schema,
   ownership e vínculo exato ao `PRODUCT_COMMITMENT` implementados.
3. LR-02 pode implementar migration aditiva de intent/outbox, agregador,
   reconciliador, rollout e sua matriz de testes; AUT-02 continua fora de escopo.
