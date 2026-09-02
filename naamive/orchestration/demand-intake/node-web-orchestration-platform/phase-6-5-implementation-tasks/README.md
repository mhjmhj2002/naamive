# Tasks de implementação — Fase 6.5

Índice vivo da execução da Fase 6.5. **Encerramento certificado em 01/09/2026:**
todas as tasks listadas, incluindo LR-02A, estão `DONE`; TST-01 fechou 20/20
critérios e DOC-01 reconciliou a
documentação vigente sem alterar a auditoria baseline. A certificação manual do
operador em `npm run e2e` registrou 139 testes, 132 `PASS`, exatamente 7
`KNOWN_BASELINE`, 0 falhas novas, 0 skipped, 0 cancelled e 0 todo. A Fase 7 está
documentalmente desbloqueada; seus próprios requisitos continuam independentes.

Checkpoint histórico em 24/08/2026:
`LR-01`, `GAT-01`, `GAT-03`, `AUT-01`, `REC-01`, `LR-02A`, `LR-02` e `AUT-02` estão
`DONE`; os dois findings da auditoria de `9e9bdaf0` foram fechados. LR-02
entregou o agregador macro versionado, intents/outbox recuperáveis, materialização
pela `COMMITTED_MODULE_EVOLUTION_POLICY:v1` e o ledger reconstruível
`CommittedModuleObligation:v1`. `LR-02-FIX-01` fixou a seleção do workflow na
criação da instância e impediu reclassificação por rollout tardio. `AUT-02`
implementou o contrato
[`AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1`](AUT-02-automatic-qa-review-merge-integration-prevalidation.md).
`AUT-02-FIX-01` substituiu cardinalidade por igualdade de identidade canônica
do `RequiredWorkItemSet:v1`. `AUT-02-FIX-02` persiste e protege a identidade
`PlanWorkItem → WorkItem` em `work_items.plan_work_item_id`; o required-set
observado não depende mais do `payload` mutável. A dívida independente
[`MIG-FIX-01`](MIG-FIX-01-gate-catalog-fresh-migration-compatibility.md) também
está `DONE`: a cadeia fresh 049/051 e o upgrade histórico foram validados sem
reescrever migrations aplicadas.
`AUT-03` está `DONE`: `068_phase_6_5_assurance_expansion.sql` e a camada
`AssuranceDispatchSnapshot:v1` implementam seleção fechada, snapshot de
policy/version/hash, idempotência de dispatch/acceptance e o vínculo de
development com a acceptance AUT-02 já canônica. Planning mantém a acceptance
técnica separada de `MODULE_PLAN_APPROVAL`; QA/integration são evidence-only;
release continua reservado a GAT-02. `REC-02` está `DONE`: a reabertura de
auditoria foi fechada com F-01 a F-04 em `PASS`, após alinhar a authority de
`INDEPENDENCE_EXCEPTION`, a retomada pelo gate, o fail-closed por expiração e
a máquina auditável de stages. A certificação incluiu migrations fresh 001–072,
second migrate, focused/regressões de REC-02, GAT-01, GAT-03 e AUT-03, build e
`git diff --check`. Os aggregates foram executados manualmente pelo operador,
pois a limitação conhecida do ambiente Codex está documentada em `AGENTS.md`;
somente as quatro baselines Inventory e três baselines Phase4 foram observadas,
sem regressão nova da REC-02 e sem alterar a retry policy.
O checkpoint de 26/08 reforçou o selector fechado, a convergência concorrente
de dispatch e o fencing de planning antes de `PLAN_TECHNICALLY_ACCEPTED`;
fresh migrate e second migrate passaram. A validação agregada foi concluída:
`npm test` teve apenas os quatro failures históricos autorizados de inventory
(`FAILED` esperado versus `RETRYABLE` atual); `npm run e2e` registrou 117/110/7/0.
Além desses quatro, os três failures reproduzíveis de `phase4.e2e` foram
classificados como preexistentes e fora do caminho AUT-03: embora
`AgentExecutionService` compartilhe `createAcceptance()`, policies legadas com
selectors vazios já selecionam essas execuções para Assurance; AUT-03 não
introduziu essa seleção nem alterou a causa observada. Build e `git diff --check`
passaram. A divergência de planning
`ELIGIBLE_FOR_DISPATCH` versus `DISPATCHED` foi classificada como teste legado
desatualizado: o workflow LR-01 e AUT-01 exigem auto-dispatch quando há
capacidade; o planning focused E2E agora passa integralmente (13/13).

O finding LR-02A-FIX-01 foi fechado pela migration 062: compromissos aprovados
podem evoluir por troca atômica da revisão corrente, mantendo uma única
`APPROVED`, uma única proposta pendente e todo o histórico imutável.

Checkpoint em 28/08/2026: `GAT-02` está `DONE` sob aceite focado da tarefa.
Migration, build e a matriz focada de entrega, package, assurance, gates,
atomicidade, concorrência, pause/resume, cancellation, fencing, reconciler e
HTTP/RBAC passaram, sem gap funcional ou de testes focados remanescente. O
operador executou manualmente `npm test`: 124/132 testes passaram; as 8 falhas
agregadas legadas foram diferidas, sem bloquear este aceite: quatro em
`inventory.e2e` (`FAILED` esperado versus `RETRYABLE` atual), três em
`phase4.e2e` (estado legado e cleanup por
`work_acceptances_execution_id_fkey`) e uma em `macro-lifecycle.e2e`
(`COMMITTED_MODULE_OBLIGATION_MATERIALIZATION_INVALID`). Esta última permanece
uma incompatibilidade/regressão não resolvida e não foi provada como não
relacionada a GAT-02; a investigação foi adiada por decisão do operador.

Baseline histórica imutável:
`orchestration/audits/2026-08-22-lifecycle-conformance-audit.md`.

| Ordem serial | Task | Estado | Dependências diretas de execução |
| ---: | --- | --- | --- |
| 1 | [LR-01 — Publicar workflows aderentes v2](LR-01-publish-conformant-workflows-v2.md) | `DONE` | — |
| 2 | [GAT-01 — Catálogo server-side de gates e autoridade](GAT-01-server-side-gate-catalog.md) | `DONE` | LR-01 |
| 3 | [GAT-03 — Autenticação e RBAC](GAT-03-authentication-rbac.md) | `DONE` | GAT-01 |
| 4 | [AUT-01 — Scheduler transacional de elegibilidade](AUT-01-transactional-eligibility-scheduler.md) | `DONE` | LR-01, GAT-01, GAT-03 |
| 5 | [REC-01 — Recovery orientado pela causa](REC-01-cause-aware-recovery.md) | `DONE` | LR-01, AUT-01 |
| 6A | [LR-02A — Canonical Product Commitment Modules](LR-02A-canonical-product-commitment-modules.md) | `DONE` | LR-01, GAT-01, GAT-03, REC-01 |
| 6 | [LR-02 — Sincronizar macro-lifecycle](LR-02-synchronize-macro-lifecycle.md) | `DONE` | LR-01, GAT-01, AUT-01, REC-01, LR-02A |
| 7 | [AUT-02 — Pipeline automático QA → review → merge → integração](AUT-02-automatic-qa-review-merge-integration.md) | `DONE` | AUT-01, REC-01, LR-02 |
| 8 | [AUT-03 — Ampliar F6 aos trabalhos reais](AUT-03-expand-phase6-assurance.md) | `DONE` | AUT-02 |
| 9 | [REC-02 — Recuperação de reviewer e blocks](REC-02-reviewer-and-block-recovery.md) | `DONE` | AUT-03, GAT-01 |
| 10 | [GAT-02 — Entrega, pausa e cancelamento](GAT-02-delivery-pause-cancellation.md) | `DONE` | LR-02, GAT-01, GAT-03 |
| 11 | [UI-01 — Projeção única de estado e ações](UI-01-single-state-action-projection.md) | `DONE` | AUT-01, REC-01, GAT-01, GAT-03, AUT-03, REC-02, GAT-02 |
| 12 | [UI-02 — Superfícies completas de parada](UI-02-complete-stop-surfaces.md) | `DONE` | UI-01, REC-02, GAT-02 |
| 13 | [TST-01 — Suíte de conformidade do lifecycle](TST-01-lifecycle-conformance-suite.md) | `DONE` | todas as tasks funcionais |
| 14 | [DOC-01 — Reconciliar documentação F5/F6/F6.5](DOC-01-reconcile-phase5-phase6-docs.md) | `DONE` | TST-01 |

`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01 → LR-02A → LR-02 → AUT-02` é a sequência serial concluída. A
dependência conceitual original de AUT-01 em LR-01 descreve o contrato de
lifecycle que ela consome; a fronteira final de execução também exige GAT-01 e
GAT-03, pois o scheduler opera sob catálogo de autoridade e identidade/RBAC
verificáveis. REC-01 preserva sua dependência conceitual em LR-01 e acrescenta
AUT-01 como fronteira funcional, pois recovery administra attempts e só pode
criar nova execução pela reservation transacional do scheduler.

Fonte canônica do planejamento:
[16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md](../16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md).

Uma task só passa a `DONE` com critérios, testes e evidências satisfeitos. Esse
aceite integral foi alcançado; a Fase 7 está desbloqueada pela Fase 6.5, sem
que isso elimine suas próprias decisões, gates ou requisitos de execução.

## Correções pós-certificação

Findings descobertos depois da certificação histórica da Fase 6.5 são tratados
como correções próprias, sem reabrir ou reescrever as tasks certificadas.

- [GAT-03-FIX-01 — Conceder acesso project-scoped ao criador do projeto](GAT-03-FIX-01-project-creator-rbac-grants.md) — `P1`, bloqueante do fluxo manual ponta a ponta.
