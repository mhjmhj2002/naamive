# AUTH-PRJ001-WI-EXECUTION-01 — Candidata de authority reutilizável para orquestração de Execution

**status:** CANDIDATE FOR HUMAN AUTHORITY GRANT
**normative_effect:** NONE UNTIL APPROVED
**authority_effect:** NONE UNTIL APPROVED
**authority_id:** AUTH-PRJ001-WI-EXECUTION-01
**grant_kind:** delegated Work Item execution orchestration authority
**project_id:** PRJ-001
**business_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**controlling_rule_ref:** `governance/02_AUTHORITY_POLICY.md`; `contracts/05_AUTHORITY_CONTRACT.md`; `lifecycle/06_EXECUTION_LIFECYCLE.md`
**prepared_for:** human:manuel-hinojosa:project-owner — NAAMIVE Project Owner

## 1. Finalidade e não efeitos

Esta é a proposta de uma única authority reutilizável, limitada a autorizar a
criação/orquestração de Executions de Work Items elegíveis de `PRJ-001`. Não é
grant ativo, não cria Execution, não altera lifecycle, não inicia código e não
autoriza `WI-003` por si só.

```text
AUTH-PRJ001-WI-EXECUTION-01... NOT GRANTED
WI-003........................ READY
DC-003........................ CREATED
Execution..................... NONE
Implementation................ NOT AUTHORIZED by this candidate
```

## 2. Grant proposto

```text
authority_id: AUTH-PRJ001-WI-EXECUTION-01
grant_kind: delegated Work Item execution orchestration authority
issued_by (proposed): human:manuel-hinojosa:project-owner
issued_by_principal_type: HUMAN
issued_by_role: NAAMIVE Project Owner
delegated_principal: agent:codex:orchestrator:prj001-work-item-execution
delegated_principal_type: AGENT
action: AUTHORIZE_WORK_ITEM_EXECUTION
action_vocabulary_status: grant-specific identifier; not a new global normative action catalog
issued_at: only upon explicit human approval
```

O principal delegado poderá apenas decidir/orquestrar a criação de uma
Execution concreta quando todas as condições desta candidata forem verdadeiras
no instante do uso. Isso não lhe concede authority de gate, acceptance,
exception, risco, pause, cancelamento, Delivery, ratificação ou mutação de
baseline.

## 3. Scope e constraints verificáveis

```text
project_id: PRJ-001
object_type: WORK_ITEM / EXECUTION
eligible_object_set: Work Items pertencentes ao escopo planejado de PBL-PRJ001-R1-v1.0
project_lifecycle_constraint: IMPLEMENTATION
business_baseline_constraint: PBL-PRJ001-R1-v1.0
normative_baseline_constraint: NB-0002
decision_type: authorize an Execution-specific orchestration attempt only
```

O grant não alcança outro Project, Work Item fora da PBL, baseline incompatível,
ou ação distinta. Uma decisão de Execution deve registrar o Work Item, Cycle,
intenção, tentativa/causalidade, principal executor esperado, baselines,
authority chain e versão/geração esperada.

## 4. Condições cumulativas de uso

Antes de autorizar/criar uma Execution, a orquestração deve revalidar contra o
estado canônico, sem resolver policy por `latest` ou por declaração do
principal, que:

1. `PRJ-001` está em `IMPLEMENTATION`;
2. a Work Item pertence à PBL coberta;
3. a WI está `READY`, ou `IN_PROGRESS` somente quando retry/recovery for legal;
4. existe Development Cycle válido para a passagem atual;
5. objective, scope e acceptance criteria permanecem válidos;
6. dependencies estão satisfeitas;
7. baseline de WI, owner, PBL e NB continua compatível;
8. não existe blocker incompatível;
9. não existe pendência `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE`;
10. não há resultado autoritativo já consolidado que invalide a tentativa;
11. a policy de retry/recovery permite a tentativa;
12. o principal de implementação é específico da Work Item/Cycle e verificável;
13. o grant está ativo, não expirou, não foi revogado e action/scope/baselines conferem;
14. idempotência, concorrência e fencing impedem tentativa duplicada incompatível;
15. segregation e ausência de conflito de interesse são satisfeitas;
16. há continuidade tratável depois da Execution; e
17. a ordem e o limite de uma Work Item por vez do MVP permitem a tentativa.

Se qualquer condição falhar, o resultado é `DENY / BLOCK`, sem avanço
discricionário. A negação deve preservar continuidade, como blocker,
escalation, authority alternativa, re-delegation humana, recovery ou
reconciliation conforme aplicável.

## 5. Principal de implementação e segregação

Para cada Work Item:

```text
1 Work Item
→ 1 implementation agent/context
→ testes/evidência específicos
→ review/audit separado quando exigido
```

O implementation agent não aprova seu próprio readiness, não audita seu próprio
resultado quando independência for exigida, não decide acceptance gate, não
altera NB/PBL/TB/TIR, não inventa decisão material e não atravessa gap material.
O orquestrador é inelegível quando acumular papel incompatível exigindo
segregação no mesmo objeto.

## 6. Delegação operacional limitada

```text
delegation_chain:
  human:manuel-hinojosa:project-owner
  → agent:codex:orchestrator:prj001-work-item-execution
subdelegation: PERMITTED ONLY for an Execution-specific implementation principal
```

Se a authority operacional para o executor constituir subdelegação, ela só pode
ser produzida no limite exato deste grant e deve: preservar a cadeia causal;
vincular Work Item, Cycle e Execution; não ampliar scope, action ou baseline;
ser reconstruível; ser revogável; e expirar/terminar com a Execution ou a
condição equivalente. Ela não concede authority de gate, acceptance, exception,
risk acceptance, pause, cancel ou Delivery.

## 7. Lifecycle, validade e revogação

Uma Execution futura deve respeitar integralmente:

```text
CREATED
→ ELIGIBLE
→ RUNNING
→ SUCCEEDED / FAILED / CANCELLED
```

`CREATED` não executa efeito. `ELIGIBLE → RUNNING` exige claim/fencing e nova
revalidação de authority, principal, versão e intenção. Retry/recovery é nova
tentativa causal; uma `FAILED` não é ressuscitada.

```text
validity_condition: active only while not revoked; PRJ-001 remains in a
                    compatible IMPLEMENTATION context; PBL-PRJ001-R1-v1.0,
                    NB-0002 and controlling policies remain applicable
expires_at: none
```

Mudança material de scope, PBL, NB, owner ou policy exige disposição governada
antes de novo uso (`KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE`,
conforme aplicável). Revogação explícita impede novos usos, não apaga decisões
historicamente legítimas e exige decisão causal própria para desfazer efeitos
passados.

## 8. Semântica bootstrap e decisão solicitada

Enquanto não há fonte runtime canônica de grants, identidade criptográfica,
registry de revogação e enforcement automatizado, uma eventual materialização
deve registrar a decisão humana, o grant ativo e eventual revogação em fonte
governada do Project. A implementação futura deverá preservar essa semântica em
fonte canônica, com revalidação no ponto decisório.

| Item | Proposta para decisão |
|---|---|
| Principal | `agent:codex:orchestrator:prj001-work-item-execution` (`AGENT`) |
| Action | `AUTHORIZE_WORK_ITEM_EXECUTION` |
| Scope | `PRJ-001`; WIs da `PBL-PRJ001-R1-v1.0`; `WORK_ITEM / EXECUTION`; `Project.IMPLEMENTATION`; `NB-0002` |
| Condições | As 17 condições cumulativas da seção 4, revalidadas a cada uso |
| Subdelegação | Apenas authority operacional Execution-specific, nos limites da seção 6 |
| Validade | Após aprovação; enquanto grant, contexto, PBL, NB e policy forem compatíveis |
| Não permite | Gate, acceptance, exception, risco, pause/cancel, Delivery, norma ou baseline |

```text
[ ] APPROVE PRJ-001 WORK ITEM EXECUTION AUTHORITY AS PROPOSED
[ ] REWORK REQUIRED
[ ] REJECT
```

Nenhuma opção está marcada. Uma única decisão humana explícita poderá ativar
este grant reutilizável; cada uso posterior continua sujeito à revalidação
objetiva e não requer approval humana por Work Item.
