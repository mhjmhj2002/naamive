# Contrato de Solicitação de Transição

Uma solicitação de transição é a proposta verificável de mudança de estado. Ela é criada após o trabalho e antes de qualquer atualização de `STATUS.md`.

## Campos mínimos

| Campo | Regra |
| --- | --- |
| `transition_request_id` | Identificador único da solicitação. |
| `execution_id` | Execução que produziu ou verificou as evidências. |
| `scope_type`, `project_id`, `module_id` | Devem coincidir com o contexto de execução. |
| `state_machine` | Máquina normativa aplicável. |
| `from_state` | Deve coincidir com o estado atual registrado. |
| `to_state` | Deve ser destino permitido pela máquina. |
| `trigger` | Evento ou conclusão de trabalho que motivou a solicitação. |
| `evidence` | Referências às evidências mínimas exigidas pelo gate. |
| `required_gate` | Gate definido pela transição ou decisão excepcional registrada. |
| `requested_by` | Agente ou autoridade que propõe a transição. |
| `requested_at` | Momento do registro da solicitação. |

## Regras

- A solicitação não altera estado por si só.
- Uma solicitação com estado de origem divergente deve ser rejeitada e exige novo contexto.
- A mudança só é autorizada pela decisão de gate correspondente.
- Transições para `PAUSED` ou `CANCELLED` exigem motivo e decisão humana registrada.
