# Tasks de implementação — Fase 6.5

Índice vivo da execução da Fase 6.5. Checkpoint em 23/08/2026:
`LR-01`, `GAT-01`, `GAT-03`, `AUT-01` e `REC-01` estão `DONE`; os dois findings
da auditoria de `9e9bdaf0` foram fechados. A próxima task serial é `LR-02A`,
ainda em `TO_DO`; ela desbloqueia LR-02.

Baseline histórica imutável:
`orchestration/audits/2026-08-22-lifecycle-conformance-audit.md`.

| Ordem serial | Task | Estado | Dependências diretas de execução |
| ---: | --- | --- | --- |
| 1 | [LR-01 — Publicar workflows aderentes v2](LR-01-publish-conformant-workflows-v2.md) | `DONE` | — |
| 2 | [GAT-01 — Catálogo server-side de gates e autoridade](GAT-01-server-side-gate-catalog.md) | `DONE` | LR-01 |
| 3 | [GAT-03 — Autenticação e RBAC](GAT-03-authentication-rbac.md) | `DONE` | GAT-01 |
| 4 | [AUT-01 — Scheduler transacional de elegibilidade](AUT-01-transactional-eligibility-scheduler.md) | `DONE` | LR-01, GAT-01, GAT-03 |
| 5 | [REC-01 — Recovery orientado pela causa](REC-01-cause-aware-recovery.md) | `DONE` | LR-01, AUT-01 |
| 6A | [LR-02A — Canonical Product Commitment Modules](LR-02A-canonical-product-commitment-modules.md) | `TO_DO` (pré-validação `READY_FOR_IMPLEMENTATION`) | LR-01, GAT-01, GAT-03, REC-01 |
| 6 | [LR-02 — Sincronizar macro-lifecycle](LR-02-synchronize-macro-lifecycle.md) | `TO_DO` (bloqueada por LR-02A) | LR-01, GAT-01, AUT-01, REC-01, LR-02A |
| 7 | [AUT-02 — Pipeline automático QA → review → merge → integração](AUT-02-automatic-qa-review-merge-integration.md) | `TO_DO` | AUT-01, REC-01, LR-02 |
| 8 | [AUT-03 — Ampliar F6 aos trabalhos reais](AUT-03-expand-phase6-assurance.md) | `TO_DO` | AUT-02 |
| 9 | [REC-02 — Recuperação de reviewer e blocks](REC-02-reviewer-and-block-recovery.md) | `TO_DO` | AUT-03, GAT-01 |
| 10 | [GAT-02 — Entrega, pausa e cancelamento](GAT-02-delivery-pause-cancellation.md) | `TO_DO` | LR-02, GAT-01, GAT-03 |
| 11 | [UI-01 — Projeção única de estado e ações](UI-01-single-state-action-projection.md) | `TO_DO` | AUT-01, REC-01, GAT-01, GAT-03 |
| 12 | [UI-02 — Superfícies completas de parada](UI-02-complete-stop-surfaces.md) | `TO_DO` | UI-01, REC-02, GAT-02 |
| 13 | [TST-01 — Suíte de conformidade do lifecycle](TST-01-lifecycle-conformance-suite.md) | `TO_DO` | todas as tasks funcionais |
| 14 | [DOC-01 — Reconciliar documentação F5/F6/F6.5](DOC-01-reconcile-phase5-phase6-docs.md) | `TO_DO` | TST-01 |

`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01` é a sequência serial concluída. A
dependência conceitual original de AUT-01 em LR-01 descreve o contrato de
lifecycle que ela consome; a fronteira final de execução também exige GAT-01 e
GAT-03, pois o scheduler opera sob catálogo de autoridade e identidade/RBAC
verificáveis. REC-01 preserva sua dependência conceitual em LR-01 e acrescenta
AUT-01 como fronteira funcional, pois recovery administra attempts e só pode
criar nova execução pela reservation transacional do scheduler.

Fonte canônica do planejamento:
[16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md](../16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md).

Uma task só passa a `DONE` com critérios, testes e evidências satisfeitos. A
Fase 7 permanece bloqueada até o aceite integral da Fase 6.5.
