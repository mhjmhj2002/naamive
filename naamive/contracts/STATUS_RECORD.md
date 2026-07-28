# Contrato de Registro de Status

Este contrato define como uma instância de projeto ou módulo comunica seu estado sem transformar a máquina global em texto solto ou perder auditabilidade.

## Dois artefatos complementares

Cada escopo materializado possui:

| Artefato | Responsabilidade |
| --- | --- |
| `STATUS.md` | Painel atual, legível por pessoas e consumível pelo runtime através de front matter YAML. É uma projeção do estado mais recente. |
| `STATUS_HISTORY.md` | Histórico cronológico, append-only, de cada transição já registrada. É a trilha de auditoria. |

O `STATUS.md` não substitui a máquina em `naamive/orchestration/` e o histórico não autoriza transições que a máquina global não permita.

## Front matter obrigatório

O `STATUS.md` inicia e termina o front matter com `---`. Para projetos, os campos mínimos são:

```yaml
format_version: 2
scope_type: project
project_id: <project-id>
current_state: <estado-da-maquina-global>
state_category: active | paused | terminal
state_machine: naamive/orchestration/PROJECT_LIFECYCLE.md
transition_sequence: <inteiro-positivo>
last_transition_id: <identificador-estavel>
last_transition_from: <estado-origem>
last_transition_to: <estado-destino>
last_transition_at: <ISO-8601-UTC>
last_transition_actor: <identidade-responsavel>
last_transition_reason: <justificativa>
last_transition_evidence: <caminho-ou-referencia>
pending_gate: <gate-id-ou-none>
history_path: STATUS_HISTORY.md
```

Para módulos, `scope_type` é `module` e a identidade inclui `project_id` e `module_id`. O estado deve estar na máquina de módulo aplicável.

## Regras de atualização

- Cada transição incrementa `transition_sequence` exatamente uma vez.
- `last_transition_*` descreve a mesma transição que encerra a sequência no histórico.
- A linha no histórico inclui número, instante UTC, origem, destino, tipo de controle, responsável, justificativa e evidência.
- Entradas históricas não são reordenadas, removidas nem reescritas. Correções são uma nova entrada rastreável.
- O painel expõe estado atual, categoria, gate pendente, próxima ação e última transição em linguagem clara.
- O runtime valida a identidade do escopo pelo caminho antes de interpretar ou alterar o registro.
- Estado terminal não é retomado por edição manual; qualquer evolução exige fluxo e autorização definidos pela máquina aplicável.

## Migração de formato legado

Um `STATUS.md` YAML sem front matter é legado. O comando abaixo preserva o estado atual, gera o painel versão 2 e inicia a trilha com uma entrada `MIGRATED`:

```text
naamive status --project <project-id> --migrate
```

Migração de formato não é uma transição de negócio, não altera o estado atual e não substitui evidências existentes.

## Exclusão definitiva

O estado `CANCELLED` é o único pré-requisito de status para exclusão definitiva. O runtime remove o diretório do projeto e as entradas canônicas de intake que o referenciam. A ação exige confirmação explícita repetindo o `project_id`; não produz transição nova, pois remove a própria trilha de auditoria do projeto.
