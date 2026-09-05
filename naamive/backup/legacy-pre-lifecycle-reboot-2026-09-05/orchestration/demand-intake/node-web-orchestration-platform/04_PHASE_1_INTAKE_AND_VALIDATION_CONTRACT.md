---
document_type: intake-and-operation-contract
status: APPROVED_FOR_PHASE_1
created_at: 2026-07-30
scope: structured intake, VALIDATE_INTAKE, project repository binding
---

# Contrato de Intake e Validação — Fase 1

## Jornada e vínculo Git

`CREATE_PROJECT` recebe obrigatoriamente um clone Git local já válido. A tela
de criação coleta identificador, título, responsável de negócio, autor e caminho
do clone; a API resolve o caminho real e o rejeita se estiver fora de
`NAAMIVE_REPOSITORY_ROOTS`, não for um repositório Git, não tiver `origin`, não
tiver branch-base/SHA inicial ou tiver árvore suja sem confirmação explícita.

`BIND_REPOSITORY` não cria projeto nem aceita vínculo ausente: somente troca ou
corrige o vínculo de um projeto em `DRAFT`, com as mesmas validações. Projeto
fora de `DRAFT` não pode trocar clone. A jornada de aceite é criar com clone →
editar → submeter → validar → decidir registro.

## Modelo de API `PROJECT_INTAKE` v1

O corpo estruturado abaixo é a fonte normativa do formulário e da API. Strings
são aparadas, quebras de linha normalizadas para LF e listas removem itens vazios;
essa normalização ocorre antes do hash e da validação.

| Campo | Regra | Código de erro |
| --- | --- | --- |
| `project_id` | kebab-case, único | `INTAKE_PROJECT_ID_INVALID`, `INTAKE_PROJECT_ID_EXISTS` |
| `title`, `business_owner`, `submitted_by` | texto não vazio, sem placeholder | `INTAKE_REQUIRED` |
| `business_problem`, `desired_outcome` | texto não vazio | `INTAKE_REQUIRED` |
| `success_metrics`, `stakeholders`, `evidence_sources`, `assumptions`, `open_questions` | lista com ao menos um item significativo | `INTAKE_REQUIRED` |
| `known_constraints` | lista; pode conter a declaração explícita `Nenhuma restrição conhecida` | `INTAKE_REQUIRED` |

Cada erro inclui `code`, `field`, `message` seguro e, quando aplicável,
`details`; a API nunca devolve stack trace, caminho de host ou credencial.
Conteúdo de problema, resultado, métricas, stakeholders, restrições, evidências,
premissas e questões é de negócio: a política `INTAKE_TECHNOLOGY_DECISION`
rejeita decisões de tecnologia/arquitetura no valor textual, preservando a
paridade com o legado. A lista controlada inicial contém Python, Node,
JavaScript, TypeScript, Java, Angular, React, framework, banco de dados,
PostgreSQL, MySQL, MongoDB, cloud, AWS, Azure, GCP, OpenAI, modelo de IA,
arquitetura, microsserviço e deployment; mudanças nessa política criam versão
nova do contrato.

## Revisões imutáveis e evidência legível

`SAVE_INTAKE` atualiza somente o rascunho. `SUBMIT_INTAKE` cria uma
`intake_revision` imutável com `revision_id`, `project_id`, `schema_version: 1`,
payload normalizado, `structured_sha256`, `submitted_at` e `submitted_by`.
Também gera deterministicamente `PROJECT_INTAKE.md` com front matter YAML
(ids, versão, hashes e autoria) e as oito seções legíveis equivalentes ao
legado. O hash do Markdown/YAML é registrado junto da revisão.

As duas representações são gravadas no `ArtifactStore` antes da submissão ser
aceita e suas referências ficam no PostgreSQL. Edições futuras criam apenas
novo rascunho/revisão; a revisão submetida e validada nunca é alterada.

## `VALIDATE_INTAKE`

O job referencia exatamente `operation_id`, `project_id`, `revision_id`,
`workflow_definition`, `workflow_version` e a chave de idempotência
`validate-intake:<project_id>:<revision_id>`. A transação de submissão grava
estado, `INTAKE_SUBMITTED`, operação `ACCEPTED`/`QUEUED` e job `PENDING`.

| Resultado | Evento/efeito | Estado terminal |
| --- | --- | --- |
| `VALID` | grava relatório; emite `INTAKE_VALIDATED`; abre `REGISTER_PROJECT` | job `COMPLETED`, operação `SUCCEEDED` |
| `INVALID` | grava relatório com erros por campo; emite `INTAKE_REQUIRES_ADJUSTMENT` | job `COMPLETED`, operação `SUCCEEDED` |
| transitório | registra causa sanitizada e reagenda | job `RETRYABLE`, operação `QUEUED` |
| permanente | grava relatório de falha e emite `INTAKE_EXECUTION_FAILED` | job `FAILED`, operação `FAILED` |

Há no máximo quatro execuções: tentativa inicial e três retries. O retry usa
atraso de 5 s, 15 s e 30 s (`available_at`). `lease_expires_at` vencido permite outra
aquisição; antes de qualquer efeito o worker consulta a chave de idempotência e
o evento terminal da operação. Logo, restart ou lease vencido não duplicam
evento, gate, relatório ou transição. Toda linha e todo evento carregam
`correlation_id`, `causation_id`, `operation_id`, `job_id` e `revision_id`.

## Matriz de paridade do legado

| Controle legado | Contrato Node v1 |
| --- | --- |
| IDs kebab-case | `project_id` validado no comando de criação |
| metadados preenchidos | campos obrigatórios estruturados |
| oito seções Markdown | campos equivalentes + renderização Markdown/YAML |
| conteúdo significativo/sem placeholder | normalização e `INTAKE_REQUIRED` |
| proibição de decisão tecnológica | `INTAKE_TECHNOLOGY_DECISION` versionada |
| documento submetido preservado | `intake_revision` imutável + hashes/artefatos |
