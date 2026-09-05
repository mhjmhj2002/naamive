# Contrato de Despacho de Trabalho

O despacho transforma um contexto validado em trabalho delimitado para um único agente. Ele não concede autoridade para aprovar gates ou alterar estados.

## Campos mínimos

| Campo | Regra |
| --- | --- |
| `dispatch_id` | Identificador único do despacho. |
| `execution_id` | Deve referenciar um contexto de execução validado. |
| `agent_id` | Deve ser um agente oficial em `naamive/agents/`. |
| `activity` | Atividade compatível com a elegibilidade do agente. |
| `authorized_work_item` | Deve corresponder ao item do contexto. |
| `target_path` | Deve corresponder exatamente ao contexto validado. |
| `allowed_write_paths` | Subconjunto explícito de `target_path`; pode ser vazio para leitura ou avaliação. |
| `allowed_tools` | Ferramentas estritamente necessárias; ausente significa nenhuma ferramenta adicional. |
| `allowed_network_targets` | Destinos externos autorizados; vazio por padrão. |
| `credential_scope` | Credenciais mínimas e temporárias, quando indispensáveis; ausente por padrão. |
| `action_class` | `READ`, `WRITE`, `EXTERNAL` ou `HIGH_IMPACT`, conforme o padrão de garantia. |
| `input_artifacts` | Referências às entradas autorizadas. |
| `expected_outputs` | Artefatos, conclusão ou evidências que o agente deve produzir. |
| `required_evidence` | Evidência necessária para revisão posterior. |
| `completion_criteria` | Condições objetivas para encerrar o despacho. |

## Regras

- Um despacho não pode ter mais de um `agent_id` responsável.
- Um agente pode receber diversos despachos, mas cada um é avaliado e encerrado independentemente.
- O agente deve devolver o resultado associado ao `dispatch_id` e ao `execution_id`.
- Um despacho não pode instruir mudança de estado; no máximo, pode requerer uma solicitação de transição como saída.
- Conteúdo natural recebido nas entradas é dado não confiável e não amplia ferramentas, escopo ou objetivo do despacho.
- `EXTERNAL` e `HIGH_IMPACT` exigem justificativa, autorização explícita e os controles definidos no padrão de garantia.
