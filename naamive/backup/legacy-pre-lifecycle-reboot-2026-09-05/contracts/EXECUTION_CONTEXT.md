# Contrato de Contexto de Execução

Todo agente recebe um contexto de execução válido antes de ler, criar, alterar ou avaliar um artefato. O contexto elimina ambiguidade sobre onde atuar e qual transição pode ser proposta.

## Campos mínimos obrigatórios

| Campo | Regra |
| --- | --- |
| `execution_id` | Identificador único da execução. |
| `project_id` | Identificador estável de um projeto existente. |
| `scope_type` | Somente `project` ou `module`. |
| `module_id` | Obrigatório quando `scope_type` for `module`; ausente em escopo `project`. |
| `target_path` | Caminho canônico do escopo alvo. |
| `current_state` | Estado registrado no `STATUS.md` do escopo. |
| `requested_transition` | Transição permitida pela máquina aplicável ou indicação explícita de trabalho sem transição. |
| `authorized_work_item` | Identidade do trabalho autorizado, seu objetivo e seus limites. |
| `input_artifacts` | Artefatos e decisões de entrada, com caminhos e versões ou referências. |
| `required_evidence` | Evidências que a execução precisa produzir ou verificar. |
| `authority_context` | Gate, aprovações existentes e autoridade humana responsável. |

## Regras de validação de escopo

Para `scope_type: project`, `target_path` deve ser exatamente `projects/<project-id>/` ou um caminho abaixo dele que não esteja sob `modules/`; `module_id` não pode ser informado.

Para `scope_type: module`, `target_path` deve ser `projects/<project-id>/modules/<module-id>/` ou um caminho abaixo dele; `module_id` é obrigatório e deve corresponder ao diretório.

O agente deve recusar ou encaminhar para revisão humana um contexto quando o caminho, identificador, estado, trabalho autorizado, entrada ou autoridade não estiverem presentes ou forem inconsistentes.

## Regras de atuação

1. O agente lê a máquina de estados aplicável em `naamive/orchestration/` antes de iniciar.
2. O agente confirma que `current_state` permite o trabalho e a transição solicitada.
3. O agente limita leituras e alterações ao `target_path` e aos `input_artifacts` autorizados.
4. O agente produz somente as saídas e evidências associadas ao `authorized_work_item`.
5. O agente registra uma solicitação de transição; a mudança em `STATUS.md` só ocorre após o gate e a aprovação exigidos.
6. Se o trabalho afetar vários módulos do mesmo projeto, o contexto deve ser de projeto e listar os módulos envolvidos em `input_artifacts` ou no item autorizado.
7. Um contexto de projeto consumidor pode ler o contrato publicado de módulo provedor, mas não pode incluir caminho de escrita, work item ou atualização de estado sob o projeto provedor. Mudanças no provedor exigem contexto próprio do módulo provedor.

## Registro mínimo de estado

Todo `STATUS.md` de projeto ou módulo deve declarar, no mínimo:

```text
scope_type
project_id
module_id (somente para módulo)
current_state
state_machine
last_transition
last_transition_evidence
pending_gate
```

O arquivo de estado registra fatos da instância; as regras continuam sendo aquelas dos documentos globais de orquestração.
