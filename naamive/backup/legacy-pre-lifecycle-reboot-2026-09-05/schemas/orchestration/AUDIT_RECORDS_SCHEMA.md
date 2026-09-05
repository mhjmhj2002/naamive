---
schema_name: naamive-orchestration-audit-records
format_version: 1
runtime_validator: naamive_runtime.audit_schema
---

# Schema de Registros de Auditoria da Orquestração

Os registros em `naamive/registries/orchestration/<project-id>/` são imutáveis e devem usar `format_version: 1`. O runtime valida estes campos antes de persistir cada fato.

| Tipo (`record_type`) | Campos obrigatórios adicionais |
| --- | --- |
| `execution_event` | `execution_id`, `project_id`, `scope_type`, `state`, `occurred_at` |
| `transition_request` | `transition_request_id`, `execution_id`, `project_id`, `scope_type`, `from_state`, `to_state`, `evidence`, `required_gate`, `requested_by`, `requested_at` |
| `gate_decision` | `gate_decision_id`, `transition_request_id`, `gate_id`, `decision`, `control_type`, `decided_by`, `authority_basis`, `evidence_reviewed`, `rationale`, `decided_at` |
| `idempotency_index` | `idempotency_key`, `transition_request`, `recorded_at` |

`scope_type` aceita somente `project` ou `module`; decisões aceitam somente `APPROVED`, `REJECTED` ou `REWORK_REQUIRED`; controles aceitam somente `AUTOMATED_EVIDENCE`, `INDEPENDENT_REVIEW` ou `HUMAN_DECISION`.

Uma evolução incompatível exige novo `format_version`, atualizador de leitura e testes de migração. O registro já gravado não é alterado.
