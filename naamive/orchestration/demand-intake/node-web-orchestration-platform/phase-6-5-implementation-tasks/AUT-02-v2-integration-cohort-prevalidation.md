---
task: AUT-02
document_type: corrective-architecture-prevalidation
status: PREVALIDATION_READY_FOR_IMPLEMENTATION
implementation_status: NOT_IMPLEMENTED
contract: AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2
supersedes_for_new_executions: AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1
preserves: [AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1, RequiredWorkItemSet:v1]
discovered_by: TST-01
---

# AUT-02 v2 — pré-validação corretiva de IntegrationCohort

## Decisão e conflito resolvido

**PREVALIDATION: READY_FOR_IMPLEMENTATION.** Esta é uma correção aditiva de AUT-02 descoberta por TST-01; não é uma nova task e não altera registros nem a semântica histórica de `AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1`.

V1 exige um único plano aprovado e igualdade completa com `RequiredWorkItemSet:v1` antes de formar uma candidate. Isso impede que Persistência integre e libere Métrica enquanto Interface aguarda prioridade; dois planos `APPROVED` tampouco são válidos. Para novas execuções, v2 introduz `IntegrationCohort:v1`: depois de `ACCEPT`, um WI aceito e merged integra em uma fronteira determinística e seus dependentes são reavaliados automaticamente. A aprovação continua cobrindo o plano inteiro e não cria gates adicionais.

| Conceito | Autoridade em v2 |
| --- | --- |
| `RequiredWorkItemSet:v1` | Obrigação imutável completa; módulo/macro só completa quando todos os membros estiverem `INTEGRATED`. |
| `IntegrationCohort:v1` | Fronteira incremental determinística da candidate; somente membros prontos e desbloqueados. |
| Candidate v2 | Manifesto imutável de uma cohort, validado e integrado atomicamente para seus membros. |
| LR-02 | Única autoridade para completude de módulo/macro a partir do required set completo. |

## Membership

A cohort é calculada contra snapshot bloqueado da mesma `module_revision`, `module_round` e `module_plan_revision` atual. Cada membro deve ter lineage imutável válido, `QA PASS`, acceptance aceita, review `ACCEPT`, `MERGE_RECORDED` e ainda não estar `INTEGRATED`. Não pode existir candidate ativa incompatível, finding, rework, recovery, blocker, cancelamento, stale ou outro estado que invalide a integração.

Dependência técnica externa à cohort já deve estar `INTEGRATED`. Dependência intra-cohort é proibida: a cohort é uma fronteira DAG. A/B/C independentes podem integrar juntas; B que depende de A não entra com A enquanto A não integrar. A ordem é determinística por identidade de lineage; fato ausente ou ambíguo falha fechado.

## Identidade, concorrência e recovery

```text
candidate:v2:<module_revision_id>:<module_round_id>:<cohort_hash>
```

`cohort_hash` inclui pipeline/policy, plano/revision/round, fingerprint do required set e membros ordenados com lineage congelado. Candidate, manifesto, reservations de membros, evento, evidência e intenção de validação são atômicos.

O cálculo serializa projeto, módulo, plano, round e WIs. A migration deve impor reservation ativa única por WI: duas reconciliações não podem criar candidates ativas sobre o mesmo membro. Merges concorrentes formam uma cohort se estiverem visíveis no mesmo snapshot bloqueado ou cohorts sequenciais válidas. Reinício e replay reutilizam a mesma chave, manifesto e fencing, sem recompor cohort materializada.

Stale, blocker, finding, rework, recovery ou cancelamento antes do efeito torna a candidate `SUPERSEDED`/`NO_OP` ou aciona REC-01. A reavaliação sempre deriva de fatos canônicos. Ela nunca remonta, amplia ou altera uma cohort/candidate já materializada; work items dependentes já materializados pelo plano continuam sendo reavaliados quando integração, resolução de blocker ou outro fato autorizado altera sua elegibilidade.

| Corrida | Resultado v2 fail-closed |
| --- | --- |
| Dois merges independentes simultâneos | Uma cohort única se ambos aparecem no snapshot bloqueado; caso contrário, cohorts sequenciais. A reservation impede membership duplicado. |
| Integração de predecessor próxima ao `ACCEPT` do dependente | O dependente só entra se o snapshot bloqueado já observar predecessor `INTEGRATED`; do contrário fica fora e a reavaliação posterior cria nova cohort. |
| Blocker resolvido durante a geração | WI bloqueado fica fora do manifesto; resolução só gera reconciliação posterior. Se o fato invalida membro já selecionado antes do efeito, candidate é superseded. |
| Restart entre criação e `PRE_EFFECT` | O worker recupera a mesma candidate/intenção pelo idempotency key e fencing; não amplia nem substitui os membros congelados. |

## Pipeline e cenário TST-01

```text
ACCEPT -> MERGE_RECORDED -> REASSESS_INTEGRATION_COHORT
  -> candidate/cohort imutável -> validation -> PRE_EFFECT
  -> membros da cohort INTEGRATED atomicamente
  -> reavaliação automática de dependências + intenção LR-02
```

No cenário TST-01, um plano aprovado contém Persistência, Métrica e Interface. Persistência forma cohort unitária, integra e libera Métrica automaticamente; Interface permanece bloqueada apenas por `priority-group`. Cohorts posteriores tratam Métrica e Interface quando elegíveis. A completude macro exige o `RequiredWorkItemSet:v1` inteiro integrado.

## Compatibilidade e rollout

V1 permanece legível, recuperável e fail-closed para registros históricos. Não há conversão automática de candidate, manifesto ou execução v1. Novas plan revisions selecionam explicitamente v2; a versão é congelada na plan revision, nos WIs e copiada para a candidate/manifesto. Versão ausente ou desconhecida falha fechada. V1 continua reconhecível, mas não é reinterpretada como v2.

## Persistência esperada — não implementada aqui

Uma migration nova, sem reescrever migrations aplicadas, deve:

- congelar `integration_pipeline_version` em plan revision e work items, com classificação explícita de legado;
- persistir `integration_cohort_version`, `cohort_hash` e membros imutáveis no manifesto/candidate v2;
- criar reservations de membership (ou equivalente) com unicidade parcial para WI ativo, candidate, geração e fencing;
- indexar seleção por revision/round/plan/estado e registrar intents/eventos v2 idempotentes;
- impor, por checks/foreign keys, lineage pertencente ao plano/round congelados.

`065_phase_6_5_automatic_assurance_integration.sql` já oferece
`integration_candidates`, `integration_candidate_members`, intents, attempts,
`pipeline_version`, `policy_version`, manifest/hash e seus guardas de
imutabilidade como base de reutilização. A migration v2 deve ampliar os checks
v1 que hoje restringem versões, registrar o marker congelado na plan revision e
no WI e adicionar a reservation ativa. Tabelas existentes só podem ser
reutilizadas se estes invariantes — sobretudo a unicidade de reservation ativa
no banco — forem realmente impostos; caso contrário, uma tabela v2 é necessária.

## Critérios de certificação

A implementação v2 deve usar PostgreSQL e Git reais para provar o fluxo Persistência→integração→Métrica, Interface bloqueada e liberada, cohorts independentes, rejeição de dependência intra-cohort, replay, concorrência, crash/restart, stale/blocker/rework/recovery e macro apenas após o required set inteiro integrar. O critério 18 de TST-01 permanece bloqueado até a implementação e certificação PostgreSQL/Git sem SQL de atalho após dispatch.

## Relação com AUT-02 v1

A pré-validação v1 fica preservada como evidência histórica do contrato publicado e concluído. Este documento separado é necessário porque define uma versão normativa nova, rollout e invariantes de persistência ausentes em v1; editar v1 para reinterpretá-lo destruiria a auditabilidade do contrato anterior.
