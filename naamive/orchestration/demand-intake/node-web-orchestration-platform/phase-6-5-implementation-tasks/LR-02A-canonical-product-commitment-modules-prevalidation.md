---
task: LR-02A
document_type: prevalidation
status: READY_FOR_IMPLEMENTATION
created_at: 2026-08-23
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# LR-02A — Pré-validação de módulos canônicos do compromisso de produto

## Resultado e autoridade

**READY_FOR_IMPLEMENTATION.** Uma nova `ProductCommitmentRevision` com itens
normalizados é a autoridade. Não há decisão anterior pendente. A implementação
será aditiva e reutilizará os padrões de revisões imutáveis já existentes, sem
reutilizar uma entidade semanticamente inadequada.

| Alternativa auditada | Resultado |
| --- | --- |
| `intake_revisions` | Revisão imutável da solicitação inicial, não dos requisitos/módulos do discovery. |
| `artifacts`/metadata de `product-commitment-review` | Apenas evidência: `persistDiscoveryAgentOutcome` grava resultado/metadata sem schema de módulos, chave estável, revisão ou FK para `modules`. |
| `module_revisions`/`modules` | Surge depois da materialização manual e não pode autorizar sua própria criação. |
| Nova `ProductCommitmentRevision` + itens | **Escolhida**: snapshot correto, versionado e consultável antes do gate. |

`PRODUCT_COMMITMENT_MODULES:v1` é a versão do contrato. Artefatos de análise,
requisitos e review permanecem referência de evidência, nunca fonte a ser
interpretada pela LR-02. A conclusão desta pré-validação não desbloqueia LR-02:
ela permanece `PREVALIDATION_BLOCKED` até LR-02A ser implementada e auditada.

## Modelo persistido e imutabilidade

```text
product_commitment_revisions
  id UUID PK; project_id TEXT FK projects; revision_number BIGINT
  contract_version PRODUCT_COMMITMENT_MODULES:v1
  status DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | SUPERSEDED
  source_intake_revision_id UUID FK intake_revisions
  source_requirements_artifact_id UUID FK artifacts; source_requirements_sha256
  source_review_artifact_id UUID FK artifacts; source_review_sha256
  canonical_sha256; supersedes_revision_id self FK; approved_gate_id UUID FK gates
  created_at, approved_at, created_by
  UNIQUE(project_id, revision_number); UNIQUE(project_id, canonical_sha256)

product_commitment_modules
  id UUID PK; product_commitment_revision_id UUID FK; module_key; ordinal
  payload JSONB; source_evidence JSONB
  UNIQUE(product_commitment_revision_id, module_key)
  UNIQUE(product_commitment_revision_id, ordinal)

product_commitment_module_materializations
  product_commitment_module_id UUID FK; project_id TEXT FK projects
  product_commitment_revision_id UUID FK; module_key
  module_id UUID FK modules; module_revision_id UUID FK module_revisions
  materialization_operation_id UUID FK operations; materialized_at
  UNIQUE(product_commitment_module_id)
  UNIQUE(project_id, product_commitment_revision_id, module_key)
```

Revisões `APPROVED` e `SUPERSEDED` são imutáveis. `approved_gate_id` e os
artefatos devem pertencer ao mesmo projeto, por guard/trigger. A única mudança
permitida é a transição de status/lineage publicada e transacional; mudança de
conteúdo cria outra revisão.

## Schema e identidade de `candidate_modules`

`candidate_modules` é conjunto identificado por `module_key`, não sequência de
negócio. O hash ordena por `module_key`; `ordinal` só oferece apresentação
estável.

| Campo | Regra v1 |
| --- | --- |
| `module_key` | Obrigatório; regex existente `^[a-z0-9]+(?:-[a-z0-9]+)*$`; minúsculo; único na revisão. |
| `name`, `objective` | Obrigatórios, strings normalizadas e não vazias; máximo 500/2.000 caracteres. |
| `scope`, `out_of_scope`, `dependencies`, `acceptance_criteria` | Obrigatórios e arrays; até 100 itens, dependências até 30. |
| `source_evidence` | Objeto obrigatório de refs canônicas (`requirement_refs`, `artifact_refs`), IDs/hashs do mesmo projeto; listas vazias são válidas. |

Esses campos são o subconjunto normativo que `materializeModule()` já copia
para `module_revisions`; LR-02A passa a validá-los integralmente, pois hoje o
runtime valida apenas `module_key`. Campos críticos desconhecidos são rejeitados.
O mesmo `module_key` em revisão sucessora identifica evolução lógica; chave nova
identifica módulo novo. Não há unicidade global histórica por projeto.

Dependências usam somente `module_key` da mesma revisão. O servidor rejeita
ausente, duplicada, autorreferência e ciclo (DAG v1). Elas ordenam planejamento
futuro, mas não bloqueiam a criação idempotente de todos os registros.

## Requisitos, baseline, zero e optionalidade

Não existe tabela `requirements_revision`: `DEFINE_PRODUCT_REQUIREMENTS` gera
artefato `product-requirements`, correlato à `intake_revisions.id` do job. Para
v1, a lineage canônica é `source_intake_revision_id` mais
`source_requirements_artifact_id/sha256`. A chave GAT-01 já publicada,
`requirements_revision_id`, recebe o `source_intake_revision_id`, acompanhada
dos IDs/hashs do artefato e da revisão de compromisso; isso não finge que há
uma entidade de requisitos inexistente.

Não há módulo optional no domínio atual; todos os itens v1 são required e o
campo não existe. `candidate_modules=[]` é inválido, pois GAT-01 já trata array
vazio como evidence ausente. A technology baseline permanece autoridade do
projeto/revisão de baseline: não é copiada para candidato e LR-02 a selecionará
pelo workflow de projeto aplicável.

## Lifecycle, gate, rework e security

| Transição | Regra |
| --- | --- |
| `DRAFT → PENDING_APPROVAL` | Serviço valida schema, lineage, conjunto, hash e referências; persiste revisão+itens+evidência e abre gate. |
| `PENDING_APPROVAL → APPROVED` | Decisão GAT-03 autorizada no gate GAT-01 atual; na mesma transação grava `approved_gate_id`, `approved_at` e evento. Só este estado é consumível por LR-02. |
| `PENDING_APPROVAL → REJECTED` | Rework preserva snapshot, feedback e gate; não materializa. |
| `REJECTED → SUPERSEDED` + nova revisão | Novo output validado cria ID/número novos com `supersedes_revision_id`. |
| `APPROVED → SUPERSEDED` | Só por revisão sucessora aprovada e política explícita; não cancela nem modifica módulos já materializados. |

O gate referencia `product_commitment_revision_id` e `canonical_sha256` na
evidência `candidate_modules`. O request de decisão não aceita módulos: ele
contém apenas decisão, razão/evidência e versão do gate. O servidor relê a
revisão `PENDING_APPROVAL` ligada ao gate e recusa hash/revisão divergentes.
Service principal cria proposta; só humano autenticado/autorizado por GAT-03
decide. Módulo removido de revisão futura é apenas lineage: não é apagado,
arquivado nem cancelado implicitamente.

Discovery atual produz `ANALYZE_PRODUCT_NEED`, `DEFINE_PRODUCT_REQUIREMENTS` e
`REVIEW_PRODUCT_COMMITMENT`; `persistDiscoveryAgentOutcome` persiste os
artefatos `product-need-analysis`, `product-requirements` e
`product-commitment-review`. LR-02A adiciona o pipeline:

```text
resultado do agente (proposta não confiável)
→ validação/canonicalização server-side
→ ProductCommitmentRevision + itens
→ referência/hash no gate PRODUCT_COMMITMENT
→ decisão humana → APPROVED
```

## Hash, atomicidade, eventos e concorrência

O canonical JSON cobre versão, intake revision, artefato/hash de requisitos e
itens ordenados por `module_key`; normaliza strings e ordena coleções que são
conjuntos (`dependencies` e refs). A ordem de `scope`, `out_of_scope` e
critérios é preservada, pois seu conteúdo é parte do contrato. `canonical_sha256`
é SHA-256 desse JSON: reordenar módulos não muda hash, alterar campo normativo
muda.

Criação usa a chave
`product-commitment-revision:<project_id>:<source_intake_revision_id>:<canonical_sha256>`
e unique project/hash. Ela bloqueia projeto/revisão e retorna a mesma linha em
replay. Aprovação bloqueia gate+revisão e usa a idempotência GAT-01; versão
stale ou segunda decisão não muda snapshot. Escritores concorrentes convergem
no índice quando o conteúdo é igual; conteúdo diferente cria revisões distintas.

Eventos novos são `PRODUCT_COMMITMENT_REVISION_CREATED`,
`PRODUCT_COMMITMENT_READY_FOR_APPROVAL`, `PRODUCT_COMMITMENT_APPROVED`,
`PRODUCT_COMMITMENT_REJECTED` e `PRODUCT_COMMITMENT_SUPERSEDED`. `events` é
audit trail suficiente para essas mudanças de banco; o outbox/reconciliador de
materialização continua com LR-02. Unidades atômicas:

```text
revision + items + hash + evidence/gate reference + event
gate decision + revision APPROVED/approved_gate_id + event
```

Não há side effect externo na transação.

## Contrato entregue a LR-02

LR-02 lê somente itens da revisão `APPROVED`, identificados por
`project_id + product_commitment_revision_id + module_key`. A chave de intent é
`materialize:<project_id>:<revision_id>:<module_key>`. Após criar módulo e
primeira `module_revision`, grava exatamente uma linha em
`product_commitment_module_materializations`; replay encontra a linha e não
redigita nem recria A/B quando C ficou pendente. A lineage, e não title/name,
liga candidato → módulo → revisão → operation.

Se a mesma chave lógica voltar em nova revisão aprovada, LR-02 consulta o
lineage e só cria evolução/revisão mediante política explícita; nunca
sobrescreve a linha anterior. Essa política é consumo futuro de LR-02, não
implementação de LR-02A.

## Legado, rollout e testes

Projetos/revisões sem `PRODUCT_COMMITMENT_MODULES:v1` permanecem
`PRESERVE_LEGACY`; não há parsing retrospectivo de Markdown/metadata. O
contrato acompanha a seleção explícita de `PROJECT_DISCOVERY:v4`, sem flag
própria e sem ativar os rollouts v4/v2.

| Grupo | Cobertura obrigatória |
| --- | --- |
| Schema | válido; key inválida/duplicada; obrigatório ausente; dependência ausente/própria/cíclica; campos críticos extras. |
| Revision | criação, replay, imutabilidade após aprovação, rejeição, supersession e rework com IDs distintos. |
| Gate/RBAC | gate referencia revisão/hash; payload adulterado é ignorado/rejeitado; approve/reject, versão stale e duas decisões concorrentes. |
| Hash | determinístico, módulos reordenados equivalentes, mudança normativa altera hash. |
| Materialization | um/vários módulos, replay parcial, duplicate key, mesma identidade em revisão sucessora e lineage preservado. |
| Legado/concurrency | artefato histórico intocado; dois writers, dois approvals e replays em PostgreSQL real. |

## Condição para desbloquear LR-02

Após LR-02A implementar e auditar tabelas/constraints, validação, gate binding,
revisão imutável, hash, events e materialization lineage acima, a pré-validação
LR-02 pode mudar de `PREVALIDATION_BLOCKED` para `READY_FOR_IMPLEMENTATION`.
Antes disso, LR-02 e AUT-02 não iniciam.
