# AUTH-PRJ001-WI-READINESS-01 — Authority grant ativo para readiness de Work Items

**status:** ACTIVE  
**grant_kind:** delegated automated gate authority  
**authority_id:** AUTH-PRJ001-WI-READINESS-01  
**issued_by:** human:manuel-hinojosa:project-owner  
**issued_by_principal_type:** HUMAN  
**issued_by_role:** NAAMIVE Project Owner  
**issued_at:** 2026-09-13T19:53:57-03:00  
**valid_from:** 2026-09-13T19:53:57-03:00  
**expires_at:** none  
**normative_baseline_ref:** NB-0002  
**business_baseline_constraint:** PBL-PRJ001-R1-v1.0  
**decision_source:** explicit human approval  
**decision_text:** APPROVE AUTHORITY GRANT AS PROPOSED  
**source_candidate:** AUTH-PRJ001-WI-READINESS-01_CANDIDATE.md  
**source_candidate_commit:** 5b5ac3d440430439345ccc7616732c2bf02da8f6  
**source_candidate_git_blob:** ee956a65bce783c48f91975c8e7ad867976056af  
**source_candidate_sha256:** c56fd9dab9a9680f7dfb72132e9011175a6b3c9b48c6fab911ed263cd5ec62aa  
**revocation_status:** NOT REVOKED  
**controlling_rule_ref:** `governance/02_AUTHORITY_POLICY.md`; `governance/03_GATE_POLICY.md` §30; `contracts/05_AUTHORITY_CONTRACT.md`

## 1. Exercício humano e fonte bootstrap

O Project Owner exerceu explicitamente a decisão humana abaixo sobre a candidata identificada pelos commit, blob e digest acima:

```text
APPROVE AUTHORITY GRANT AS PROPOSED
```

Este registro materializa o grant aprovado como authority governada ativa. A `AUTH-PRJ001-WI-READINESS-01_CANDIDATE.md` permanece evidência histórica da proposta e não é retroeditada como se sempre tivesse sido um grant ativo.

No self-hosting documental atual, em que ainda não existem tabela canônica runtime de grants, autenticação criptográfica do principal de agente, serviço de authority ou registry runtime de revogação, este grant materializado junto com eventual registro explícito de revogação constitui a fonte governada bootstrap de authority. Isso não simula a existência desses componentes; a implementação futura deverá preservar a mesma semântica em fonte canônica.

## 2. Principal, ação e scope aprovados

```text
principal_id: agent:codex:gate:prj001-work-item-readiness
principal_type: AGENT
principal_role: delegated automated Work Item readiness gate authority

action: DECIDE_WORK_ITEM_READINESS_GATE
action_vocabulary_status: grant-specific identifier; not a new global normative action catalog

scope:
  project_id: PRJ-001
  object_type: WORK_ITEM
  eligible_object_set: Work Items pertencentes ao escopo planejado de PBL-PRJ001-R1-v1.0
  gate_type: READINESS_GATE
  transition: PROPOSED → READY
  decision_type: automated readiness decision only

object_constraints:
  business_baseline_constraint: PBL-PRJ001-R1-v1.0
  normative_baseline_constraint: NB-0002
```

O grant permite exclusivamente decidir um `READINESS_GATE` que materialize `WorkItem.PROPOSED → WorkItem.READY`, somente se todas as condições deste grant forem verdadeiras no instante da decisão. Ele não se estende a outro Project, objeto fora da PBL, outra transição ou outro tipo de gate.

Não permite acceptance de Work Item, criação de Development Cycle ou Execution, implementação, aceite de risco, concessão de exception, pause, cancelamento, gates de Module/Value Increment/Project, Delivery, ratificação normativa, mutação de baseline ou subdelegação.

## 3. Condições cumulativas de uso

Antes de cada decisão, o mecanismo de gate deve revalidar contra o estado canônico corrente, sem resolver policy por `latest` ou por declaração do principal, que todos os itens abaixo são verdadeiros:

1. o objeto existe, pertence ao scope do grant e está canonicamente `PROPOSED`;
2. objective, scope e acceptance criteria objetivos estão definidos;
3. dependencies estão satisfeitas e impact está classificado;
4. `PBL-PRJ001-R1-v1.0` está identificada, é compatível e o Work Item pertence ao seu escopo planejado;
5. `normative_baseline_ref` canônico ainda é `NB-0002`;
6. evidence é aplicável ao mesmo objeto, scope, baselines e intenção decisória;
7. não há findings bloqueadores;
8. todo finding não bloqueador recebeu tratamento compatível e rastreável;
9. para impacto `MATERIAL` ou `CRÍTICA`, existe audit independente aplicável, válida e proporcional quando exigida;
10. a transição não é um `HUMAN_GATE` obrigatório e a policy continua permitindo o gate automatizado;
11. a continuidade após `READY` existe e é acionável;
12. as constraints de segregation e conflito de interesse deste grant são satisfeitas;
13. o principal está verificavelmente ativo, o grant está ativo, não expirou, não foi revogado e action, scope, objeto e baselines conferem;
14. a decisão opera sobre a versão/geração canônica esperada, evitando decisão concorrente ou duplicada.

Se qualquer condição falhar, o resultado é `DENY / BLOCK`: não há aprovação discricionária, `APPROVED_BY_EXCEPTION`, aceitação de risco ou avanço implícito por este grant. A negação deve preservar continuidade tratável, como blocker, escalation ao Project Owner, authority alternativa ou re-delegation humana.

## 4. Segregação, delegação, validade e revogação

```text
delegation_chain:
  human:manuel-hinojosa:project-owner
  → agent:codex:gate:prj001-work-item-readiness
subdelegation: PROHIBITED

segregation_constraints:
  - o principal delegado é inelegível se for o principal lógico que escreveu a definição material submetida ao gate quando isso comprometer a independência aplicável
  - o principal delegado é inelegível se realizou a auditoria independente exigida
  - o principal delegado é inelegível se será o implementation agent
  - o principal delegado é inelegível se exerce authority incompatível no mesmo objeto
  - quando houver auditoria independente aplicável: AUDITOR != READINESS GATE AUTHORITY

validity_condition: active only while not revoked; PRJ-001,
                    PBL-PRJ001-R1-v1.0 and NB-0002 remain applicable;
                    and policy permits the automated readiness decision
```

Sessão, task ou contexto distintos não tornam o mesmo principal independente. Conflito detectado bloqueia a decisão; este grant não concede authority para criar exceção de independência.

Mudança material de scope, Business Baseline ou Normative Baseline obriga classificação rastreável (`KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE`, conforme aplicável) antes de novo uso; este grant não permite presumir compatibilidade.

O Project Owner pode revogar este grant por registro explícito e datado que referencie `AUTH-PRJ001-WI-READINESS-01`, identifique o principal revogador, o escopo da revogação e seu efeito. A revogação impede novos usos e torna novos gates `DENY`; não apaga nem invalida retroativamente decisões historicamente legítimas. Desfazer efeito passado exige decisão causal própria.

## 5. Não efeitos e continuidade

Esta materialização não decide gate nem altera lifecycle:

```text
GATE-WI003-01............ remains historically BLOCKED — AUTHORITY REQUIRED
WI-003................... remains PROPOSED
Development Cycle........ NOT CREATED
Execution................ NONE
Implementation........... NOT AUTHORIZED
```

O grant ativo cria somente a condição de authority para nova avaliação do readiness gate. A próxima ação legal exata é:

```text
nova avaliação do readiness gate de WI-003
```

Essa nova avaliação deverá usar:

```text
principal: agent:codex:gate:prj001-work-item-readiness
authority_id: AUTH-PRJ001-WI-READINESS-01
```

e revalidar no instante decisório estado canônico, PBL, `NB-0002`, evidence, audit, findings, segregação, revogação, condições cumulativas e continuidade. Esta task não executa essa reavaliação.
