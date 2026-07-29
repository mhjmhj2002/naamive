# Contrato de Resultado de Gate

Um resultado de gate determina se uma solicitação de transição pode ser aplicada. Ele pode resultar de evidência automatizada, revisão independente ou decisão humana, conforme a política aplicável.

## Campos mínimos

| Campo | Regra |
| --- | --- |
| `gate_decision_id` | Identificador único da decisão. |
| `transition_request_id` | Solicitação de transição analisada. |
| `gate_id` | Gate exigido pela máquina de estados. |
| `decision` | Somente `APPROVED`, `REJECTED` ou `REWORK_REQUIRED`. |
| `control_type` | Somente `AUTOMATED_EVIDENCE`, `INDEPENDENT_REVIEW` ou `HUMAN_DECISION`. |
| `decided_by` | Identidade do controle automatizado, revisor independente ou autoridade humana. |
| `authority_basis` | Critério, política, delegação ou aprovação que autoriza o resultado. |
| `evidence_reviewed` | Referências às evidências analisadas. |
| `rationale` | Justificativa auditável da decisão. |
| `decided_at` | Momento da decisão. |

## Efeito da decisão

`APPROVED` autoriza a orquestração a atualizar o `STATUS.md` e registrar a transição. `REJECTED` não altera o estado e encerra a execução. `REWORK_REQUIRED` não altera o estado e devolve o trabalho ao fluxo de retrabalho. `HUMAN_DECISION` é obrigatório apenas nos casos definidos pela [política de gates](../governance/GATE_POLICY.md).
