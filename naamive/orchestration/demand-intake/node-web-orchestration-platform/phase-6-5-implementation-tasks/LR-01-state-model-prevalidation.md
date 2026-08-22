---
task: LR-01
document_type: mandatory-state-model-prevalidation
status: VALIDATED
validated_at: 2026-08-22
---

# LR-01 — Pré-validação normativa do modelo de estados

## Resultado da trava

A matriz abaixo foi fechada antes de qualquer migration ou alteração funcional.
Ela foi validada contra `LIFECYCLE_COMPASS.md`, `PROJECT_LIFECYCLE.md`,
`MODULE_LIFECYCLE.md`, `ORCHESTRATION_PROTOCOL.md`,
`STATE_MACHINE_MODEL.md`, `GATE_POLICY.md`, o planejamento da Fase 6.5 e os
contratos históricos F5/F6 citados pela LR-01.

Não foi encontrado conflito normativo material. O detalhamento web usa códigos
operacionais quando necessário, mas cada código aponta para uma única semântica
canônica. Os quatro gates humanos ordinários continuam sendo registro,
compromisso de produto, aprovação única do plano do módulo e aceite final da
entrega. Arquitetura, risco, segurança, compliance e exceções só abrem gate por
condição material explícita. Nenhum WI recebe autorização humana individual.

## Fronteira LR-01 / AUT-01

LR-01 publica definições, estados, transições, controles, guards, efeitos
autorizados, hashes, vínculos de versão, classificação legada e projeção de
compatibilidade. Ao aprovar um novo plano, LR-01 pode classificar atomicamente o
estado inicial de cada WI como espera por blocker, espera por dependência ou
elegível. Essa classificação não cria delivery, operação de desenvolvimento,
job, lease ou dispatch.

AUT-01 continuará responsável por observar elegibilidade, satisfazer/reavaliar
dependências, respeitar capacidade/worktrees e criar jobs/dispatches de forma
transacional e idempotente. Efeitos marcados `AUT-01` nesta matriz são contrato
publicado, não comportamento implementado nesta task.

## Inventário anterior à publicação

| Workflow/contrato | Versões publicadas | Vínculo atual | Divergência relevante |
| --- | --- | --- | --- |
| `PROJECT_INTAKE` | v1 | `projects.workflow_code/version` | cancelamento normativo não está no catálogo web |
| `PROJECT_DISCOVERY` | v1, v2, v3 | `projects.workflow_code/version` | v3 termina em materialização e contém gates técnicos universais |
| `PROJECT_ARCHIVING` | v1 | troca administrativa no projeto | `ARCHIVED` não equivale a `CANCELLED` |
| `MODULE_DELIVERY` | v1 | sem código/versão na instância | gate de módulo e arquitetura universais; macro-lifecycle incompleto |
| `WORK_ITEM_DELIVERY` | v1 | sem código/versão na instância | `AUTHORIZE_WORK_ITEM` humano; espera, elegibilidade e blocker colapsados |
| `INTEGRATION_CANDIDATE` | v1 | sem código/versão na instância | preservado; automação funcional pertence a AUT-02 |
| execução F4/F6 | constraints e tabelas, sem workflow publicado | `agent_execution.state` e `work_acceptances.state` | micro-lifecycle não está versionado no catálogo |

Consumidores inventariados: `workflow.ts`; `service.ts`; `server.ts`;
`phase3.ts`; `worker.ts`; `agent-execution-service.ts`; `assurance.ts`;
`projection.ts`; baseline/selection F5; contratos HTTP/SSE; renderers web; e
suítes F3/F4/F5/F6. `moduleTarget` fixa `MODULE_DELIVERY v1`; materialização de
plano herda o default de WI v1; vários consumidores comparam estados literais;
e somente projeto possui integridade workflow/estado no banco.

## Semântica canônica final

### Projeto — `PROJECT_DISCOVERY v4`

| Estado | Semântica única | Natureza da espera |
| --- | --- | --- |
| `ANALYSIS` | análise do problema, valor, atores e restrições | automática |
| `DEFINITION` | requisitos e módulos candidatos | automática |
| `WAITING_FOR_PRODUCT_COMMITMENT` | gate humano ordinário de compromisso | gate humano |
| `ARCHITECTURE` | arquitetura e integrações | automática/review |
| `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | decisão arquitetural material detectada | gate humano condicional |
| `PLANNING` | plano agregado, riscos e dependências | automática/review |
| `IMPLEMENTATION` | módulos autorizados em produção | automática |
| `VALIDATION` | validação integrada de produto | automática/review |
| `WAITING_FOR_MATERIAL_RISK_DECISION` | risco residual/produção material | gate humano condicional |
| `DELIVERY` | release, operação e handover prontos para aceite | gate humano final |
| `DELIVERED` | entrega aceita | concluído |
| `EVOLUTION` | mudança posterior rastreável | automática conforme nova demanda |
| `PAUSED` | interrupção humana com último estado ativo preservado | decisão humana |
| `CANCELLED` | encerramento terminal com evidências preservadas | terminal |

### Módulo — `MODULE_DELIVERY v2`

| Estado | Semântica única | Natureza da espera |
| --- | --- | --- |
| `IDENTIFIED` | capacidade materializada após compromisso | automática |
| `DEFINED` | domínio, necessidade e requisitos delimitados | automática/review |
| `ARCHITECTED` | arquitetura interna e interfaces aceitas | automática/review |
| `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | materialidade arquitetural comprovada | gate humano condicional |
| `PLANNING_IN_PROGRESS` | proposta autônoma em produção/rework | automática |
| `WAITING_FOR_MODULE_PLAN_APPROVAL` | revisão atual aguarda decisão única | gate humano ordinário |
| `PLANNED` | plano aprovado; nenhum gate por WI | automática |
| `IMPLEMENTING` | WIs do módulo em produção | automática |
| `INTEGRATING` | contratos e fluxos sendo integrados | automática |
| `VALIDATING` | requisitos, qualidade e segurança em validação | automática/review |
| `READY_FOR_DELIVERY` | evidência suficiente para compor entrega | automática |
| `DELIVERED` | incluído em entrega aceita do projeto | concluído |
| `EVOLVING` | mudança controlada posterior | automática conforme demanda |
| `PAUSED` | interrupção humana com último estado ativo preservado | decisão humana |
| `CANCELLED` | encerramento terminal preservado | terminal |

### Work item — `WORK_ITEM_DELIVERY v2`

| Estado | Semântica única | Natureza da espera |
| --- | --- | --- |
| `PLANNED` | item pertencente à revisão aprovada, ainda não classificado | transacional |
| `WAITING_FOR_EXTERNAL_INPUT` | ao menos um blocker externo ativo e identificado | preenchimento/decisão humana específica |
| `WAITING_FOR_DEPENDENCIES` | predecessor técnico ainda não aceito e integrado | técnica, sem ação humana |
| `ELIGIBLE_FOR_DISPATCH` | guards satisfeitos; aguarda scheduler | técnica, sem ação humana |
| `DISPATCHED` | job/tentativa correlacionada criada | automática |
| `PRODUCING` | tentativa com lease válido em execução | automática |
| `OUTPUT_SUBMITTED` | output/evidência produzidos, ainda não aceitos | automática |
| `QA_IN_PROGRESS` | evidência objetiva sendo validada | automática |
| `WAITING_FOR_INDEPENDENT_REVIEWER` | reviewer elegível indisponível | bloqueio de capacidade/routing |
| `INDEPENDENT_REVIEW` | completude/correção em review independente | automática |
| `ACCEPTED` | decisão `ACCEPT` registrada | aceite técnico, não entrega de negócio |
| `READY_FOR_INTEGRATION` | aceite habilitou integração | automática |
| `INTEGRATING` | merge/integração técnica em curso | automática |
| `INTEGRATED` | item aceito e integrado; habilita dependentes | concluído/reabrível por finding |
| `REWORK_REQUIRED` | finding e contexto corretivo registrados | automática salvo materialidade |
| `BLOCKED` | assistência/routing necessários antes de escalada | bloqueio explícito |
| `RECOVERY_REQUIRED` | falha recuperável com causa/próxima ação | recuperação operacional |
| `WAITING_FOR_ESCALATION` | automação esgotada ou decisão material necessária | gate humano condicional |
| `PAUSED` | interrupção humana registrada | decisão humana |
| `CANCELLED` | encerramento terminal preservado | terminal |

### Execução — `ORCHESTRATION_EXECUTION v1`

| Estado | Semântica única | Natureza da espera |
| --- | --- | --- |
| `RECEIVED` | solicitação recebida | automática |
| `VALIDATING` | contexto, escopo e transição em validação | automática |
| `DISPATCHED` | agente elegível recebeu o despacho | automática |
| `PRODUCING` | agente produz dentro do contexto autorizado | automática |
| `OUTPUT_SUBMITTED` | saída estruturada submetida | automática |
| `EVIDENCE_REVIEW` | vinculação e suficiência de evidência | automática |
| `WAITING_FOR_INDEPENDENT_REVIEWER` | reviewer independente indisponível | routing/capacidade |
| `INDEPENDENT_REVIEW` | review de completude/correção | automática |
| `ACCEPTED` | `ACCEPT` terminal para o trabalho delegado | concluído |
| `REWORK_REQUIRED` | `REWORK` com findings delimitados | corretiva |
| `BLOCKED` | `BLOCK`; assistência/routing antes de escalada | bloqueio explícito |
| `RECOVERY_REQUIRED` | falha recuperável classificada | recuperação operacional |
| `WAITING_FOR_GATE` | `ESCALATE` por materialidade/autoridade | gate humano condicional |
| `FAILED` | falha terminal não recuperável pela política | terminal técnico |
| `REJECTED` | contexto inválido; nada executado | terminal |
| `PAUSED` | execução interrompida por decisão registrada | decisão humana |
| `CANCELLED` | execução encerrada e auditada | terminal |

## Matriz normativa de transições

`NONE` significa ausência de side effect funcional nesta publicação. Efeitos
identificados como `AUT-*`, `LR-02`, `GAT-*` ou `REC-*` são apenas contratos
para as tasks responsáveis.

### Projeto

| Origem | Evento | Controle/autoridade | Guard | Destino | Side effect autorizado | Recuperação |
| --- | --- | --- | --- | --- | --- | --- |
| `ANALYSIS` | `ANALYSIS_ACCEPTED` | `INDEPENDENT_REVIEW` | evidência vinculada e review `ACCEPT` | `DEFINITION` | `LR-02` | finding retorna trabalho sem promoção |
| `DEFINITION` | `PRODUCT_COMMITMENT_READY` | `AUTOMATED_EVIDENCE` | requisitos/módulos rastreáveis | `WAITING_FOR_PRODUCT_COMMITMENT` | abrir único gate de produto | corrigir definição |
| `WAITING_FOR_PRODUCT_COMMITMENT` | `PRODUCT_COMMITMENT_APPROVED` | `HUMAN_DECISION` | gate atual favorável | `ARCHITECTURE` | fechar gate | — |
| `WAITING_FOR_PRODUCT_COMMITMENT` | `PRODUCT_COMMITMENT_REWORK` | `HUMAN_DECISION` | feedback não vazio | `DEFINITION` | registrar feedback | nova revisão |
| `ARCHITECTURE` | `ARCHITECTURE_ACCEPTED` | `INDEPENDENT_REVIEW` | sem materialidade pendente | `PLANNING` | `LR-02` | finding retorna arquitetura |
| `ARCHITECTURE` | `MATERIAL_ARCHITECTURE_DECISION_REQUIRED` | `AUTOMATED_EVIDENCE` | materialidade publicada | `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | `GAT-01` | — |
| `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | `MATERIAL_ARCHITECTURE_APPROVED` | `HUMAN_DECISION` | gate atual favorável | `PLANNING` | fechar gate | — |
| `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | `MATERIAL_ARCHITECTURE_REWORK` | `HUMAN_DECISION` | feedback não vazio | `ARCHITECTURE` | registrar finding | nova revisão |
| `PLANNING` | `PROJECT_PLAN_ACCEPTED` | `INDEPENDENT_REVIEW` | módulos/planos autorizados | `IMPLEMENTATION` | `LR-02` | replanejar |
| `IMPLEMENTATION` | `IMPLEMENTATION_INTEGRATED` | `AUTOMATED_EVIDENCE` | outputs aceitos e integrados | `VALIDATION` | `LR-02` | reabrir por finding |
| `VALIDATION` | `VALIDATION_ACCEPTED` | `INDEPENDENT_REVIEW` | qualidade/segurança suficientes e sem risco material | `DELIVERY` | `LR-02` | — |
| `VALIDATION` | `MATERIAL_RISK_DECISION_REQUIRED` | `AUTOMATED_EVIDENCE` | risco material publicado | `WAITING_FOR_MATERIAL_RISK_DECISION` | `GAT-01` | — |
| `WAITING_FOR_MATERIAL_RISK_DECISION` | `MATERIAL_RISK_ACCEPTED` | `HUMAN_DECISION` | gate favorável | `DELIVERY` | fechar gate | — |
| `WAITING_FOR_MATERIAL_RISK_DECISION` | `MATERIAL_RISK_REWORK` | `HUMAN_DECISION` | feedback/finding | `IMPLEMENTATION` | registrar finding | novo ciclo |
| `VALIDATION` | `VALIDATION_REWORK_REQUIRED` | `INDEPENDENT_REVIEW` | findings registrados | `IMPLEMENTATION` | `LR-02` | novo ciclo |
| `DELIVERY` | `DELIVERY_ACCEPTED` | `HUMAN_DECISION` | release/operação/handover evidenciados | `DELIVERED` | `GAT-02` | — |
| `DELIVERY` | `DELIVERY_REWORK_REQUIRED` | `HUMAN_DECISION` | feedback/finding | `VALIDATION` | `GAT-02` | nova validação |
| `DELIVERED` | `EVOLUTION_REQUESTED` | `AUTOMATED_EVIDENCE` | necessidade rastreável | `EVOLUTION` | `LR-02` | — |
| `EVOLUTION` | `REDISCOVERY_REQUIRED` | `INDEPENDENT_REVIEW` | mudança exige descoberta | `ANALYSIS` | `LR-02` | — |
| `EVOLUTION` | `REPLANNING_REQUIRED` | `INDEPENDENT_REVIEW` | mudança planejável | `PLANNING` | `LR-02` | — |
| qualquer ativo | `PAUSE_PROJECT` | `HUMAN_DECISION` | motivo/evidência | `PAUSED` | `GAT-02` persiste origem | retomar origem exata |
| `PAUSED` | `RESUME_PROJECT_<ORIGIN>` | `HUMAN_DECISION` | origem persistida + impedimento removido | estado ativo de origem | `GAT-02` | — |
| qualquer ativo/`PAUSED` | `CANCEL_PROJECT` | `HUMAN_DECISION` | justificativa/evidência | `CANCELLED` | `GAT-02` | terminal preservado |

### Módulo

| Origem | Evento | Controle/autoridade | Guard | Destino | Side effect autorizado | Recuperação |
| --- | --- | --- | --- | --- | --- | --- |
| `IDENTIFIED` | `MODULE_DEFINITION_ACCEPTED` | `INDEPENDENT_REVIEW` | limite/necessidade/responsável | `DEFINED` | `LR-02` | rework de definição |
| `DEFINED` | `MODULE_ARCHITECTURE_ACCEPTED` | `INDEPENDENT_REVIEW` | requisitos/interfaces consistentes | `ARCHITECTED` | `LR-02` | rework de arquitetura |
| `DEFINED` | `MATERIAL_ARCHITECTURE_DECISION_REQUIRED` | `AUTOMATED_EVIDENCE` | materialidade publicada | `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | `GAT-01` | — |
| `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | `MATERIAL_ARCHITECTURE_APPROVED` | `HUMAN_DECISION` | gate atual | `ARCHITECTED` | fechar gate | — |
| `WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION` | `MATERIAL_ARCHITECTURE_REWORK` | `HUMAN_DECISION` | feedback | `DEFINED` | registrar finding | nova revisão |
| `ARCHITECTED` | `START_MODULE_PLANNING` | `ORCHESTRATOR` | contexto/baseline válidos | `PLANNING_IN_PROGRESS` | criar job em task responsável | recovery do job |
| `PLANNING_IN_PROGRESS` | `MODULE_PLAN_PROPOSED` | `AUTOMATED_EVIDENCE` | proposta válida e versionada | `WAITING_FOR_MODULE_PLAN_APPROVAL` | abrir único gate | retry preserva proposta anterior |
| `WAITING_FOR_MODULE_PLAN_APPROVAL` | `MODULE_PLAN_APPROVED` | `HUMAN_DECISION` | revisão/gate atuais | `PLANNED` | materializar WIs atomicamente | falha mantém gate aberto |
| `WAITING_FOR_MODULE_PLAN_APPROVAL` | `MODULE_PLAN_ADJUSTMENTS_REQUESTED` | `HUMAN_DECISION` | feedback não vazio | `PLANNING_IN_PROGRESS` | nova revisão imutável | retry do planning |
| `PLANNED` | `ELIGIBLE_WORK_ITEMS_AVAILABLE` | `AUTOMATED_EVIDENCE` | ao menos um WI elegível | `IMPLEMENTING` | `AUT-01` | reconciliação idempotente |
| `IMPLEMENTING` | `MODULE_IMPLEMENTATION_ACCEPTED` | `AUTOMATED_EVIDENCE` | todos os WIs necessários aceitos | `INTEGRATING` | `AUT-02/LR-02` | rework |
| `INTEGRATING` | `MODULE_INTEGRATION_ACCEPTED` | `INDEPENDENT_REVIEW` | contratos/fluxos integrados | `VALIDATING` | `AUT-02/LR-02` | rework para implementação |
| `INTEGRATING` | `MODULE_INTEGRATION_REWORK` | `INDEPENDENT_REVIEW` | finding | `IMPLEMENTING` | registrar finding | novo ciclo |
| `VALIDATING` | `MODULE_VALIDATION_ACCEPTED` | `INDEPENDENT_REVIEW` | requisitos/qualidade/segurança | `READY_FOR_DELIVERY` | `LR-02` | — |
| `VALIDATING` | `MODULE_VALIDATION_REWORK` | `INDEPENDENT_REVIEW` | finding | `IMPLEMENTING` | registrar finding | novo ciclo |
| `READY_FOR_DELIVERY` | `PROJECT_DELIVERY_ACCEPTED` | controle de entrega do projeto | projeto em `DELIVERED` | `DELIVERED` | `GAT-02/LR-02` | sem gate duplicado |
| `READY_FOR_DELIVERY` | `MODULE_REWORK_REQUIRED` | `INDEPENDENT_REVIEW` | finding | `IMPLEMENTING` | registrar finding | novo ciclo |
| `DELIVERED` | `MODULE_EVOLUTION_REQUESTED` | `AUTOMATED_EVIDENCE` | mudança rastreável | `EVOLVING` | `LR-02` | — |
| `EVOLVING` | `MODULE_REDEFINE` | `INDEPENDENT_REVIEW` | mudança de limite/requisito | `DEFINED` | `LR-02` | — |
| `EVOLVING` | `MODULE_REPLAN` | `INDEPENDENT_REVIEW` | mudança planejável | `PLANNED` | `LR-02` | — |
| qualquer ativo | `PAUSE_MODULE` | `HUMAN_DECISION` | motivo/evidência | `PAUSED` | `GAT-02` persiste origem | retomar origem exata |
| `PAUSED` | `RESUME_MODULE_<ORIGIN>` | `HUMAN_DECISION` | origem persistida + impedimento removido | estado ativo de origem | `GAT-02` | — |
| qualquer ativo/`PAUSED` | `CANCEL_MODULE` | `HUMAN_DECISION` | justificativa/evidência | `CANCELLED` | `GAT-02` | terminal preservado |

### Work item

| Origem | Evento | Controle/autoridade | Guard | Destino | Side effect autorizado | Recuperação |
| --- | --- | --- | --- | --- | --- | --- |
| `PLANNED` | `EXTERNAL_BLOCKER_IDENTIFIED` | `ORCHESTRATOR` | blocker ativo | `WAITING_FOR_EXTERNAL_INPUT` | persistir coleção de blockers | resolução auditável |
| `PLANNED` | `DEPENDENCIES_PENDING` | `ORCHESTRATOR` | predecessor não integrado | `WAITING_FOR_DEPENDENCIES` | `NONE` | `AUT-01` reavalia |
| `PLANNED` | `ELIGIBILITY_CONFIRMED` | `ORCHESTRATOR` | sem blocker/dependência pendente | `ELIGIBLE_FOR_DISPATCH` | `NONE` | `AUT-01` despacha |
| `WAITING_FOR_EXTERNAL_INPUT` | `EXTERNAL_BLOCKER_RESOLVED` | `HUMAN_DECISION` | resolução identificada; todos blockers resolvidos | `WAITING_FOR_DEPENDENCIES` ou `ELIGIBLE_FOR_DISPATCH` | registrar resolução, nunca job | `AUT-01` reavalia dependências |
| `WAITING_FOR_DEPENDENCIES` | `DEPENDENCIES_SATISFIED` | `ORCHESTRATOR` | todos predecessores `INTEGRATED` | `ELIGIBLE_FOR_DISPATCH` | `AUT-01` | reconciliação |
| `ELIGIBLE_FOR_DISPATCH` | `DISPATCH_WORK_ITEM` | `ORCHESTRATOR` | capacidade/idempotência | `DISPATCHED` | `AUT-01` cria job | recovery transacional |
| `DISPATCHED` | `PRODUCTION_STARTED` | `ORCHESTRATOR` | lease válido | `PRODUCING` | executor | retry/reconcile |
| `PRODUCING` | `OUTPUT_SUBMITTED` | `AGENT` | output/evidência vinculados | `OUTPUT_SUBMITTED` | `AUT-02/AUT-03` | — |
| `PRODUCING` | `PRODUCTION_BLOCKED` | `ORCHESTRATOR` | block tipado | `BLOCKED` | `REC-02` | assist/route |
| `PRODUCING` | `RECOVERABLE_FAILURE` | `ORCHESTRATOR` | causa recuperável | `RECOVERY_REQUIRED` | `REC-01` | retry/restart/resume |
| `OUTPUT_SUBMITTED` | `START_QA` | `ORCHESTRATOR` | evidência suficiente | `QA_IN_PROGRESS` | `AUT-02` cria job | recovery do handoff |
| `QA_IN_PROGRESS` | `QA_ACCEPTED` | `AUTOMATED_EVIDENCE` | matriz aprovada | `INDEPENDENT_REVIEW` | `AUT-02/AUT-03` | — |
| `QA_IN_PROGRESS` | `QA_REWORK_REQUIRED` | `AUTOMATED_EVIDENCE` | findings | `REWORK_REQUIRED` | `AUT-02` | novo dispatch corretivo |
| `INDEPENDENT_REVIEW` | `REVIEWER_UNAVAILABLE` | `ORCHESTRATOR` | nenhum reviewer elegível | `WAITING_FOR_INDEPENDENT_REVIEWER` | `REC-02` abre block | fallback/routing |
| `WAITING_FOR_INDEPENDENT_REVIEWER` | `REVIEWER_SELECTED` | `ORCHESTRATOR` | independência válida | `INDEPENDENT_REVIEW` | `AUT-03` | — |
| `INDEPENDENT_REVIEW` | `ACCEPT` | `INDEPENDENT_REVIEW` | decisão terminal/evidência | `ACCEPTED` | registrar work acceptance | — |
| `INDEPENDENT_REVIEW` | `REWORK` | `INDEPENDENT_REVIEW` | findings delimitados | `REWORK_REQUIRED` | `AUT-02/AUT-03` | dispatch corretivo |
| `INDEPENDENT_REVIEW` | `BLOCK` | `INDEPENDENT_REVIEW` | block tipado | `BLOCKED` | `REC-02` | assist/route |
| `INDEPENDENT_REVIEW` | `ESCALATE` | `INDEPENDENT_REVIEW` | materialidade/limite | `WAITING_FOR_ESCALATION` | `GAT-01` | decisão humana |
| `REWORK_REQUIRED` | `DISPATCH_CORRECTIVE_WORK` | `ORCHESTRATOR` | limite/política | `DISPATCHED` | `AUT-02` | re-review obrigatório |
| `BLOCKED` | `BLOCK_RESOLVED` | `ORCHESTRATOR` | resolução/evidência | `ELIGIBLE_FOR_DISPATCH` | `REC-02/AUT-01` | novo dispatch |
| `RECOVERY_REQUIRED` | `RECOVERY_SCHEDULED` | `ORCHESTRATOR` | ação pela causa | `DISPATCHED` | `REC-01` | reconciliação idempotente |
| `WAITING_FOR_ESCALATION` | `REWORK_AUTHORIZED` | `HUMAN_DECISION` | gate favorável | `REWORK_REQUIRED` | `GAT-01` | ciclo corretivo |
| `ACCEPTED` | `QUEUE_INTEGRATION` | `ORCHESTRATOR` | acceptance atual | `READY_FOR_INTEGRATION` | `AUT-02` | — |
| `READY_FOR_INTEGRATION` | `START_INTEGRATION` | `ORCHESTRATOR` | SHA/manifest congelados | `INTEGRATING` | `AUT-02` | recovery Git |
| `INTEGRATING` | `INTEGRATION_ACCEPTED` | `AUTOMATED_EVIDENCE` | merge/push evidenciados | `INTEGRATED` | `AUT-02` | reavaliar dependentes |
| `INTEGRATING` | `INTEGRATION_BLOCKED` | `ORCHESTRATOR` | causa tipada | `BLOCKED` | `REC-01/REC-02` | recovery específico |
| `INTEGRATED` | `INTEGRATED_FINDING_REOPENED` | `INDEPENDENT_REVIEW` | finding pertinente | `REWORK_REQUIRED` | `AUT-02` | novo ciclo |
| qualquer estado de trabalho ativo, exceto o checkpoint já aceito | `PAUSE_WORK_ITEM` | `HUMAN_DECISION` | motivo/evidência | `PAUSED` | `GAT-02` | retomar origem exata; `ACCEPTED` só é alcançado por `ACCEPT` |
| `PAUSED` | `RESUME_WORK_ITEM_<ORIGIN>` | `HUMAN_DECISION` | origem persistida + impedimento removido | estado ativo de origem | `GAT-02` | — |
| qualquer ativo/`PAUSED` | `CANCEL_WORK_ITEM` | `HUMAN_DECISION` | justificativa/evidência | `CANCELLED` | `GAT-02` | terminal preservado |

### Execução

| Origem | Evento | Controle/autoridade | Guard | Destino | Side effect autorizado | Recuperação |
| --- | --- | --- | --- | --- | --- | --- |
| `RECEIVED` | `VALIDATE_EXECUTION` | `ORCHESTRATOR` | solicitação presente | `VALIDATING` | `NONE` | — |
| `RECEIVED`/`VALIDATING` | `REJECT_EXECUTION` | `ORCHESTRATOR` | contexto inválido | `REJECTED` | registrar recusa | terminal sem efeito de negócio |
| `VALIDATING` | `DISPATCH_EXECUTION` | `ORCHESTRATOR` | contexto/escopo/transição válidos | `DISPATCHED` | criar dispatch | recovery transacional |
| `DISPATCHED` | `START_PRODUCTION` | `ORCHESTRATOR` | lease/runtime válidos | `PRODUCING` | executor | retry/reconcile |
| `PRODUCING` | `SUBMIT_OUTPUT` | `AGENT` | saída vinculada | `OUTPUT_SUBMITTED` | persistir referência | — |
| `OUTPUT_SUBMITTED` | `VALIDATE_EVIDENCE` | `AUTOMATED_EVIDENCE` | evidência suficiente | `EVIDENCE_REVIEW` | `AUT-03` | — |
| `EVIDENCE_REVIEW` | `START_INDEPENDENT_REVIEW` | `ORCHESTRATOR` | reviewer independente | `INDEPENDENT_REVIEW` | `AUT-03` | — |
| `EVIDENCE_REVIEW` | `REVIEWER_UNAVAILABLE` | `ORCHESTRATOR` | nenhum reviewer elegível | `WAITING_FOR_INDEPENDENT_REVIEWER` | `REC-02` | fallback/routing |
| `WAITING_FOR_INDEPENDENT_REVIEWER` | `REVIEWER_SELECTED` | `ORCHESTRATOR` | independência válida | `INDEPENDENT_REVIEW` | `AUT-03` | — |
| `INDEPENDENT_REVIEW` | `ACCEPT` | `INDEPENDENT_REVIEW` | decisão terminal/evidência | `ACCEPTED` | aplicar efeito de negócio uma vez | — |
| `INDEPENDENT_REVIEW` | `REWORK` | `INDEPENDENT_REVIEW` | findings | `REWORK_REQUIRED` | `AUT-03` | novo produce/re-review |
| `INDEPENDENT_REVIEW` | `BLOCK` | `INDEPENDENT_REVIEW` | block tipado | `BLOCKED` | `REC-02` | assist/route |
| `INDEPENDENT_REVIEW` | `ESCALATE` | `INDEPENDENT_REVIEW` | autoridade material | `WAITING_FOR_GATE` | `GAT-01` | decisão humana |
| `REWORK_REQUIRED` | `DISPATCH_REWORK` | `ORCHESTRATOR` | limite/política | `DISPATCHED` | `AUT-03` | re-review obrigatório |
| `BLOCKED` | `BLOCK_RESOLVED` | `ORCHESTRATOR` | resolução/evidência | `DISPATCHED` | `REC-02` | novo dispatch |
| `PRODUCING` | `RECOVERABLE_FAILURE` | `ORCHESTRATOR` | causa recuperável | `RECOVERY_REQUIRED` | `REC-01` | ação pela causa |
| `RECOVERY_REQUIRED` | `RECOVERY_SCHEDULED` | `ORCHESTRATOR` | retry/restart/resume válido | `DISPATCHED` | `REC-01` | reconciliação |
| `PRODUCING`/`RECOVERY_REQUIRED` | `TERMINAL_FAILURE` | `ORCHESTRATOR` | política esgotada, sem efeito aceitável | `FAILED` | registrar falha | gate somente se autoridade necessária |
| `WAITING_FOR_GATE` | `GATE_REWORK_APPROVED` | `HUMAN_DECISION` | gate atual favorável | `REWORK_REQUIRED` | `GAT-01` | novo ciclo |
| qualquer ativo | `PAUSE_EXECUTION` | `HUMAN_DECISION` | motivo/evidência | `PAUSED` | `GAT-02` | retomar origem exata |
| `PAUSED` | `RESUME_EXECUTION_<ORIGIN>` | `HUMAN_DECISION` | origem persistida + impedimento removido | estado ativo de origem | `GAT-02` | — |
| qualquer ativo/`PAUSED` | `CANCEL_EXECUTION` | `HUMAN_DECISION` | justificativa/evidência | `CANCELLED` | cancelar dispatch/lease | terminal preservado |

## Compatibilidade e seleção

- `PROJECT_DISCOVERY v1–v3`, `MODULE_DELIVERY v1`, `WORK_ITEM_DELIVERY v1`,
  `INTEGRATION_CANDIDATE v1` e contratos F4/F6 permanecem imutáveis.
- `PROJECT_DISCOVERY v4` e `MODULE_DELIVERY v2` são publicados com seleção
  funcional desabilitada até LR-02/GAT-01; não há migração de instância.
- `WORK_ITEM_DELIVERY v2` é vinculado à nova proposta de plano no momento de
  sua publicação e selecionado somente para os WIs materializados quando essa
  revisão for aprovada. Planos que já existiam antes da migration permanecem
  vinculados à v1 mesmo quando aprovados posteriormente.
- `ORCHESTRATION_EXECUTION v1` é publicado como contrato explícito; a seleção
  dos trabalhos reais fica para AUT-03.
- Linhas legadas recebem somente classificação consultável. Nenhuma linha muda
  workflow, versão ou estado. Ambiguidade resulta em `PRESERVE_LEGACY`.
- O projeto real da auditoria é somente leitura. Sua fixture isolada representa
  as classes `QA_IN_PROGRESS`, blocker externo + dependência e dependência sem
  blocker, sem promover nenhum desses registros.

## Verificação normativa

| Regra | Resultado |
| --- | --- |
| espera técnica, blocker, elegibilidade, produção, output, QA e review são distintos | conforme |
| `ACCEPT` é o único aceite técnico supervisionado | conforme |
| `REWORK`, `BLOCK`, recovery e escalada não são sinônimos | conforme |
| `MODULE_PLAN_APPROVAL` é único e não gera gate por WI | conforme |
| módulo nunca ultrapassa projeto | guard explícito nos contratos macro |
| entrega final é humana; módulo não duplica o aceite | conforme |
| pausa retoma origem exata; cancelamento é terminal e não é archive | conforme |
| gates universais de módulo/arquitetura não aparecem no fluxo ordinário novo | conforme |
| nenhuma ação humana implícita foi criada | conforme |
| scheduler/auto-dispatch não foi incluído | conforme; efeitos pertencentes a AUT-01 estão apenas declarados |
