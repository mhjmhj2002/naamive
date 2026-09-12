# Registro de revalidação — AUD9-001 / FND-011

**record_id:** BRR-PRJ001-010  
**status:** CANDIDATE FOR INDEPENDENT AUDIT  
**source_business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**target_business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**decision:** REVALIDATE  
**decision_authority_required:** human:manuel-hinojosa:project-owner — NOT EXERCISED  
**recorded_by:** agent:codex:naamive-aud9-remediation  
**independent_verification_required:** agent:codex:naamive-independent-audit / AUD-010  
**created_at:** 2026-09-12T11:18:00-03:00

## Decisão candidata e limite de autoridade

Este registro materializa o tratamento exigido por AUD9-001. Ele não aprova a
revalidação, não fecha FND-011 e não promove lifecycle. A decisão candidata é
que os objetos abaixo preservam escopo, estado, owner, obrigações de teste e
evidence da v0.5, exceto pela troca explícita do binding para a candidata v1.0.
Qualquer divergência encontrada por AUD-010 exige `REVOKE`, `RECONCILE` ou
sucessor apropriado; não há equivalência implícita entre baselines.

## Registros por objeto

Em cada linha, a evidência é o conteúdo reavaliado do próprio objeto, pinado
no manifesto v1.0, mais a preservação de AUD-009/FND-011. O resultado é
**CANDIDATE — pendente de AUD-010 e de decisão humana**, nunca uma aprovação.

| Objeto | Source → target | Decisão | Autoridade | Evidência específica | Resultado |
|---|---|---|---|---|---|
| `MODULE.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | estado `IDENTIFIED`, gate de Project e limites do Module inalterados | CANDIDATE |
| `VALUE_INCREMENT.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | estado `IDENTIFIED`, escopo e gate da VI inalterados | CANDIDATE |
| `VALIDATION_PLAN.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | critérios/obrigações de validação preservados | CANDIDATE |
| `WORK_ITEM_ASSURANCE_MATRIX.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | matriz de WI/teste/evidence preservada | CANDIDATE |
| `RISK_REGISTER.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | riscos, owners, tratamentos e gatilhos preservados | CANDIDATE |
| `DEC-001_BOOTSTRAP_STATE_RECONCILIATION.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | reconciliação e última verdade provável preservadas | CANDIDATE |
| `DEC-002_TIR_LIFECYCLE_PRECEDENCE.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | precedência de lifecycle/TIR preservada | CANDIDATE |
| `DEC-003_PROJECT_READ_SOURCE.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | fonte canônica de leitura preservada | CANDIDATE |
| `DEC-004_ACTIVITY_CENTER_PROJECTION_CONTRACT.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | contrato de projeção, watermark e rebuild preservado | CANDIDATE |
| `DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | mapping normativo/TB-140 e fail-closed preservados | CANDIDATE |
| `WI-001-workspace-foundation.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo PROJECT, critérios, testes e evidence preservados | CANDIDATE |
| `WI-002-principal-persistence.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo MODULE/VI, dependências e evidence preservados | CANDIDATE |
| `WI-003-login.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-004-server-side-session.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-005-authority-grants.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-006-session-bootstrap.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-007-authorized-project-list.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-008-project-selection.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-009-appshell.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-010-activity-center.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-011-sse-refetch.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-012-e2e-validation-evidence.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `WI-013-canonical-project-read-source.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | escopo, critérios e evidence preservados | CANDIDATE |
| `work-items/README.md` | v0.5 → v1.0 | REVALIDATE | Project Owner requerida | índice e regra de uso dos WIs preservados | CANDIDATE |

## Condições de verificação

AUD-010 deve confirmar que as 24 referências alvo são v1.0, que o manifesto
fixa este registro, os objetos e AUD-009, e que não há alteração de escopo,
estado, autoridade, critérios, riscos ou dependências além do binding
de baseline. `FND-011` permanece blocking até essa verificação independente.
