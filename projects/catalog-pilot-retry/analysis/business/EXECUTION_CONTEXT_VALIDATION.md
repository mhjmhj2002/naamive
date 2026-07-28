# Validação do Contexto de Execução

## Resultado

Análise de negócio não iniciada. O contexto recebido não satisfaz os campos mínimos obrigatórios dos contratos de execução e despacho, e esses contratos determinam recusa ou encaminhamento para revisão humana quando o contexto é incompleto.

## Identificação disponível

- `project_id`: `catalog-pilot-retry`
- `agent_id`: `business-analysis`
- `authorized_work_item`: `analyze-business-need`
- `allowed_write_paths`: `projects/catalog-pilot-retry/analysis/business/`
- `input_artifacts`: `projects/catalog-pilot-retry/need/BUSINESS_NEED.md`

## Campos ausentes ou não validados

### Contexto de execução

- `execution_id`
- `scope_type`
- `target_path` canônico
- `current_state`
- `requested_transition`
- objetivo e limites completos do `authorized_work_item`
- `required_evidence`
- `authority_context`

### Despacho de trabalho

- `dispatch_id`
- vínculo do `execution_id` com um contexto validado
- `activity`
- `allowed_tools`
- `allowed_network_targets`
- `credential_scope`
- `action_class`
- `expected_outputs`
- `required_evidence`
- `completion_criteria`

## Impacto

Sem `current_state`, `state_machine` e `requested_transition`, não é possível confirmar que o trabalho e uma eventual transição são permitidos. Sem identificadores, evidências exigidas, critérios de conclusão e autoridade, também não é possível devolver um resultado contratualmente associado à execução e ao despacho.

## Evidência consultada

- Instruções do agente: `naamive/agents/business-analysis/AGENT.md`
- Contrato: `naamive/contracts/EXECUTION_CONTEXT.md`
- Contrato: `naamive/contracts/WORK_DISPATCH.md`
- Entrada autorizada, apenas para confirmar disponibilidade e escopo declarado: `projects/catalog-pilot-retry/need/BUSINESS_NEED.md`

## Encaminhamento necessário

Solicita-se revisão humana e reenvio de um contexto de execução e despacho completos e consistentes. Nenhuma transição de estado é solicitada nesta execução.
