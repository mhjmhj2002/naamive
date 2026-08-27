---
task: GAT-01
document_type: mandatory-gate-catalog-prevalidation
status: VALIDATED
validated_at: 2026-08-22
---

# GAT-01 — Matriz normativa de gates

## Resultado da trava

Inventário concluído antes de migration, catálogo, API ou alteração de fluxo.
As fontes validadas foram `LIFECYCLE_COMPASS.md`, `PROJECT_LIFECYCLE.md`,
`MODULE_LIFECYCLE.md`, `ORCHESTRATION_PROTOCOL.md`,
`STATE_MACHINE_MODEL.md`, `GATE_POLICY.md`, a pré-validação LR-01, o plano da
Fase 6.5 e o contrato F6 de assurance.

Não há conflito normativo material. A autoridade condicional
`TECH_LEAD`/`REPOSITORY_OWNER` é derivada de F6-05; até GAT-03 ela é um contrato
de autoridade declarado e auditável, não uma identidade autenticada.

### Reconciliação documental dos gate codes publicados — 2026-08-27

O catálogo GAT-01 publicado já contém formas concretas, por escopo, para as
duas linhas normativas de materialidade abaixo. `SCOPE_ARCHITECTURE_POLICY` e
`ACCEPTED_RISK` não criam authority nova nem são aliases intercambiáveis dos
gates de projeto/módulo: são os gate codes de `EXECUTION` para a mesma
authority, condição e evidência normativas. Seus nomes de decisão e destinos
preservam a continuação específica desse escopo.

Esta reconciliação somente torna explícitos na matriz os codes já publicados
no catálogo v1 e preservados no v2; não altera o sentido histórico de GAT-01,
o catálogo runtime ou os workflows. REC-02 deve selecionar o code compatível
com o scope, conforme sua matriz de gates.

| Gate catalogado | Tipo | Condição publicada e evidência exigida | Autoridade/escopo | Decisões e consequência determinística | Continuação |
| --- | --- | --- | --- | --- | --- |
| `REGISTER_PROJECT` | humano ordinário | intake validado; revisão de intake, fontes e justificativa | `BUSINESS_INTAKE_AUTHORITY`, projeto | `APPROVE` registra projeto; `REWORK`/`REJECT` preservam a necessidade | `ANALYSIS` ou retorno à correção | 
| `PRODUCT_COMMITMENT` | humano ordinário | requisitos e módulos rastreáveis; revisão, escopo, investimento e riscos | `BUSINESS_OWNER`, projeto | `APPROVE` fecha o gate; `REWORK` registra feedback obrigatório | `ARCHITECTURE` ou `DEFINITION` |
| `MODULE_PLAN_APPROVAL` | humano ordinário | proposta atual validada e versionada; hashes JSON/Markdown, contexto e validação | `MODULE_PRODUCT_OWNER`, módulo | `APPROVE` materializa a revisão; `REWORK` registra feedback obrigatório | `PLANNED` ou novo planejamento |
| `DELIVERY_ACCEPTANCE` | humano ordinário, contrato publicado | release, operação e handover evidenciados | `BUSINESS_OWNER`, projeto | `APPROVE` entrega; `REWORK` registra achados | `DELIVERED` ou `VALIDATION` (execução funcional: GAT-02) |
| `MATERIAL_ARCHITECTURE` | condicional | `MATERIALITY_POLICY_MATCHED`; `policy_id`, `policy_version`, `material_impacts`, `alternatives` e `affected_boundaries` | `TECH_LEAD` ou `REPOSITORY_OWNER`, projeto/módulo | `APPROVE` fecha a decisão arquitetural material; `REWORK` registra achados arquiteturais | projeto segue a `PLANNING`; módulo a `ARCHITECTED`; rework retorna à arquitetura |
| `SCOPE_ARCHITECTURE_POLICY` | condicional | `MATERIALITY_POLICY_MATCHED`; `policy_id`, `policy_version`, `material_impacts`, `alternatives` e `affected_boundaries` | `TECH_LEAD` ou `REPOSITORY_OWNER`, execução | `APPROVE` aceita a decisão material delimitada; `REJECT` recusa a decisão | `RESUME_POLICY_PATH` retoma somente a transição publicada; `REWORK_REQUIRED` retorna a rework ou routing conforme o finding |
| `MATERIAL_RISK` | condicional | `MATERIAL_RISK_POLICY_MATCHED`; `policy_id`, `policy_version`, `residual_risk`, `impact` e `mitigations` | `TECH_LEAD` ou `REPOSITORY_OWNER`, projeto | `ACCEPT_RISK` aceita explicitamente o risco residual; `REWORK` registra achados | `DELIVERY` ou `IMPLEMENTATION` |
| `ACCEPTED_RISK` | condicional | `MATERIAL_RISK_POLICY_MATCHED`; `policy_id`, `policy_version`, `residual_risk`, `impact` e `mitigations` | `TECH_LEAD` ou `REPOSITORY_OWNER`, execução | `APPROVE` aceita explicitamente o risco residual; `REJECT` não o aceita | `RESUME_POLICY_PATH` prossegue somente no escopo aceito; `REWORK_REQUIRED` corrige e revalida |
| `SECURITY_COMPLIANCE` | condicional | `SECURITY_OR_COMPLIANCE_POLICY_MATCHED`; id/versão da política, aplicabilidade, achados e mitigação | `TECH_LEAD` ou `REPOSITORY_OWNER`, projeto/módulo/WI | `APPROVE_EXCEPTION` aceita a exceção; `REWORK` registra achados | fluxo material aplicável ou rework |
| `INDEPENDENCE_EXCEPTION` | condicional | `INDEPENDENCE_EXCEPTION_POLICY_MATCHED`; acceptance, política, expiração e evidência de indisponibilidade | `TECH_LEAD` ou `REPOSITORY_OWNER`, acceptance | `APPROVE` libera somente a exceção com expiração; `REJECT` mantém routing | review independente ou routing |
| `REWORK_ESCALATION` | condicional | `REWORK_LIMIT_OR_MATERIALITY_MATCHED`; decision/finding, round, limite e motivo | `TECH_LEAD` ou `REPOSITORY_OWNER`, WI/execução | `AUTHORIZE_REWORK`, `ACCEPT_RISK`, `CHANGE_SCOPE`, `CHANGE_ARCHITECTURE` ou `CLOSE` | cada opção informa próximo estado e retry/rework/resume |
| `ESCALATED_CLOSURE` | condicional | `ESCALATED_CLOSURE_POLICY_MATCHED`; block, tentativas, evidência e motivo | `TECH_LEAD` ou `REPOSITORY_OWNER`, block/execução | `APPROVE` ou `REJECT` fecha ou retorna ao routing | fechamento auditado ou retry/routing |

## Inventário e exclusões

`MODULE_APPROVAL`, `ARCHITECTURE_DECISION` e baseline tecnológico universais
são consumidores legados: não entram no fluxo ordinário novo. Decisões
históricas permanecem consultáveis, mas não são reinterpretadas.

Não abrem gate humano por si só: blocker externo, dependência técnica, retry,
restart, resume, QA, review independente, espera por reviewer,
`OUTPUT_SUBMITTED`, `EVIDENCE_REVIEW`, elegibilidade, merge, integração e
rework automático. A exceção somente ocorre quando uma das condições
catalogadas acima, com a evidência completa, for atendida.

Assim, o caminho ordinário sem materialidade segue por revisão independente;
QA aprovada, dependência satisfeita, `ACCEPT` e integração técnica não criam
gate humano. `WAITING_FOR_ESCALATION` só é projetado para
`REWORK_ESCALATION` ou `ESCALATED_CLOSURE`, ambos com motivo, condição,
evidência, autoridade, decisões, consequência, próximo estado e opções de
rework/retry/resume publicadas.

## Fronteiras

O catálogo publica o contrato de aceite de entrega, mas não executa o lifecycle
funcional de entrega, pausa, retomada ou cancelamento de GAT-02. Também não
autentica o ator: a verificação de identidade, RBAC e proteção contra spoofing
são responsabilidade de GAT-03.
