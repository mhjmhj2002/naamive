# Tasks de implementação — Fase 6.5

Status inicial de todas as tasks: `TO DO`. Este diretório prepara a execução;
nenhuma correção funcional da Fase 6.5 foi iniciada.

Baseline imutável:
`orchestration/audits/2026-08-22-lifecycle-conformance-audit.md`.

| Ordem serial recomendada | Task | Dependências diretas |
| ---: | --- | --- |
| 1 | [LR-01 — Publicar workflows aderentes v2](LR-01-publish-conformant-workflows-v2.md) | — |
| 2 | [GAT-01 — Catálogo server-side de gates e autoridade](GAT-01-server-side-gate-catalog.md) | LR-01 |
| 3 | [GAT-03 — Autenticação e RBAC](GAT-03-authentication-rbac.md) | GAT-01 |
| 4 | [AUT-01 — Scheduler transacional de elegibilidade](AUT-01-transactional-eligibility-scheduler.md) | LR-01 |
| 5 | [REC-01 — Recovery orientado pela causa](REC-01-cause-aware-recovery.md) | LR-01 |
| 6 | [LR-02 — Sincronizar macro-lifecycle](LR-02-synchronize-macro-lifecycle.md) | LR-01, GAT-01 |
| 7 | [AUT-02 — Pipeline automático QA → review → merge → integração](AUT-02-automatic-qa-review-merge-integration.md) | AUT-01, REC-01, LR-02 |
| 8 | [AUT-03 — Ampliar F6 aos trabalhos reais](AUT-03-expand-phase6-assurance.md) | AUT-02 |
| 9 | [REC-02 — Recuperação de reviewer e blocks](REC-02-reviewer-and-block-recovery.md) | AUT-03, GAT-01 |
| 10 | [GAT-02 — Entrega, pausa e cancelamento](GAT-02-delivery-pause-cancellation.md) | LR-02, GAT-01, GAT-03 |
| 11 | [UI-01 — Projeção única de estado e ações](UI-01-single-state-action-projection.md) | AUT-01, REC-01, GAT-01, GAT-03 |
| 12 | [UI-02 — Superfícies completas de parada](UI-02-complete-stop-surfaces.md) | UI-01, REC-02, GAT-02 |
| 13 | [TST-01 — Suíte de conformidade do lifecycle](TST-01-lifecycle-conformance-suite.md) | todas as tasks funcionais |
| 14 | [DOC-01 — Reconciliar documentação F5/F6/F6.5](DOC-01-reconcile-phase5-phase6-docs.md) | TST-01 |

Fonte canônica do planejamento:
[16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md](../16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md).

Execute uma task por vez ou apenas os ramos explicitamente independentes. Uma
task só passa a `DONE` com seus critérios, testes e evidências satisfeitos. A
Fase 7 permanece bloqueada até o aceite integral da Fase 6.5.
