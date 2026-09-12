# DEC-007 — WI-001 baseline reconciliation

**Status:** CURRENT / GOVERNED DECISION
**Impact:** MATERIAL
**object:** WI-001 — Repository / Workspace Foundation
**classification:** RECONCILE
**historical_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**current_revision:** `dc5190b950fade8ee61d7901850e24708d385483` — WI-001-workspace-foundation.md corrente após DEC-006 e a preparação de readiness
**decision_authority:** human:manuel-hinojosa:project-owner
**decision_timestamp:** 2026-09-12T17:19:00-03:00
**Implementation:** NOT AUTHORIZED

## Decisão

Reconhecer como `RECONCILE` a relação entre a revisão corrente de `WI-001` e a
cobertura histórica de `PBL-PRJ001-R1-v1.0`.

O manifesto histórico registra `WI-001-workspace-foundation.md` como membro da
baseline, com digest `04516d3ad8ab25ded15103644141efe7595497d9804a6f1dbdbc648bedfed167`.
A revisão corrente não é declarada como conteúdo originalmente contido nesse
snapshot.

## Fundamentação

Após a baseline histórica, DEC-006 explicitou para WI-001 as obrigações já
aprovadas de health e structured logging, e a preparação de readiness tornou
essa alocação rastreável. A intenção original, owner, governing scope e
dependências de WI-001 permanecem; não houve inclusão de regra de negócio.

## Efeito e limites

`PBL-PRJ001-R1-v1.0` permanece um snapshot histórico imutável. Esta decisão não
o reescreve, não cria PBL v1.1 e não reconcilia outros membros.

A revisão corrente de WI-001 pode prosseguir para o gate de readiness, sujeita
ao tratamento dos findings aplicáveis e à authority do gate. Esta decisão não
concede essa authority, não promove WI-001 e não autoriza implementação.
