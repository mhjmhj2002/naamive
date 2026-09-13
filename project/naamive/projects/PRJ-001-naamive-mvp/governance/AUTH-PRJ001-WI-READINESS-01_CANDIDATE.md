# AUTH-PRJ001-WI-READINESS-01 — Candidata de authority grant para readiness de Work Items

**status:** CANDIDATE FOR HUMAN AUTHORITY GRANT  
**normative_effect:** NONE UNTIL APPROVED  
**authority_effect:** NONE UNTIL APPROVED  
**project_id:** PRJ-001  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**controlling_rule_ref:** `governance/02_AUTHORITY_POLICY.md`; `governance/03_GATE_POLICY.md` §30; `contracts/05_AUTHORITY_CONTRACT.md`  
**prepared_for:** human:manuel-hinojosa:project-owner — NAAMIVE Project Owner

## 1. Finalidade e não efeitos

Esta é uma proposta para o Project Owner conceder um grant reutilizável e limitado a decisões automatizadas de `READINESS_GATE` de Work Items de `PRJ-001`. Não é uma concessão, uma decisão de gate ou prova de exercício de authority.

Até existir decisão humana explícita e o registro de grant ativo descrito neste artefato:

```text
authority........................ NOT GRANTED
GATE-WI003-01.................... remains BLOCKED — AUTHORITY REQUIRED
WI-003........................... remains PROPOSED
Development Cycle................ NOT CREATED
Execution........................ NONE
Implementation................... NOT AUTHORIZED by this candidate
```

Em particular, esta candidata não reabre nem reavalia `GATE-WI003-01`, não materializa `PROPOSED → READY` para nenhum objeto e não altera a PBL, `NB-0002` ou qualquer policy.

## 2. Grant proposto

```text
authority_id: AUTH-PRJ001-WI-READINESS-01
grant_kind: delegated automated gate authority
issued_by (proposed): human:manuel-hinojosa:project-owner
issued_by_principal_type: HUMAN
issued_by_role: NAAMIVE Project Owner
issued_at: only upon explicit human approval
```

O `issued_by` identifica a origem proposta da delegação; não prova que o humano a exerceu. A decisão posterior deverá registrar principal humano, decisão, timestamp, snapshot/evidence considerados e `normative_baseline_ref: NB-0002`.

## 3. Principal delegado e ação

```text
principal_id: agent:codex:gate:prj001-work-item-readiness
principal_type: AGENT
principal_role: delegated automated Work Item readiness gate authority
action: DECIDE_WORK_ITEM_READINESS_GATE
action_vocabulary_status: grant-specific identifier; not a new global normative action catalog
```

O principal é lógico, estável e delimitado ao propósito do grant. Ele é distinto de `AUTHOR`, `IMPLEMENTER`, `REVIEWER` e `AUDITOR`; não se confunde com `agent:codex:gate:GATE-WI003-01`, que apenas executou a avaliação daquele gate e não prova authority.

A ação permite exclusivamente decidir um `READINESS_GATE` que materialize `WorkItem.PROPOSED → WorkItem.READY`, se todas as condições deste grant forem verdadeiras no instante da decisão.

Ela não permite acceptance de Work Item, criação de Development Cycle ou Execution, implementação, aceite de risco, concessão de exception, pause, cancelamento, gates de Module/Value Increment/Project, Delivery, ratificação normativa, mutação de baseline ou subdelegação.

## 4. Scope e constraints verificáveis

```text
project_id: PRJ-001
object_type: WORK_ITEM
eligible_object_set: Work Items pertencentes ao escopo planejado de PBL-PRJ001-R1-v1.0
gate_type: READINESS_GATE
transition: PROPOSED → READY
business_baseline_constraint: PBL-PRJ001-R1-v1.0
normative_baseline_constraint: NB-0002
decision_type: automated readiness decision only
```

O uso deve provar que o Work Item concreto pertence ao conjunto elegível da PBL, que a PBL e a baseline normativa continuam canonicamente aplicáveis e que a evidence cobre o mesmo objeto, scope e decisão. O grant não se estende a outros Projects, objetos fora da PBL, outra transição ou outro tipo de gate.

## 5. Condições cumulativas de uso

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
12. as constraints de segregation e conflito de interesse desta candidata são satisfeitas;
13. o principal está verificavelmente ativo, o grant está ativo, não expirou, não foi revogado e action, scope, objeto e baselines conferem;
14. a decisão opera sobre a versão/geração canônica esperada, evitando decisão concorrente ou duplicada.

Se qualquer condição falhar, o resultado é `DENY / BLOCK`: não há aprovação discricionária, `APPROVED_BY_EXCEPTION`, aceitação de risco ou avanço implícito por este grant. A negação deve preservar continuidade tratável, como blocker, escalation ao Project Owner, authority alternativa ou re-delegation humana.

## 6. Segregação e conflitos

Para o mesmo Work Item, o principal delegado é inelegível se for o principal lógico que:

- escreveu a definição material submetida ao gate quando isso comprometer a independência aplicável;
- realizou a auditoria independente exigida;
- será o implementation agent; ou
- exerce authority incompatível no mesmo objeto.

Em especial, quando houver auditoria independente aplicável:

```text
AUDITOR != READINESS GATE AUTHORITY
```

Sessão, task ou contexto distintos não tornam o mesmo principal independente. Conflito detectado bloqueia a decisão; este grant não concede authority para criar exceção de independência.

## 7. Delegação, validade e revogação

```text
delegation_chain:
  human:manuel-hinojosa:project-owner
  → agent:codex:gate:prj001-work-item-readiness
subdelegation: PROHIBITED
valid_from: only after explicit human approval and active-grant registration
expires_at: none
validity_condition: active only while not revoked; PRJ-001, PBL-PRJ001-R1-v1.0
                    and NB-0002 remain applicable; and policy permits the
                    automated readiness decision
```

Mudança material de scope, Business Baseline ou Normative Baseline obriga classificação rastreável (`KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE`, conforme aplicável) antes de novo uso; esta candidata não permite presumir compatibilidade.

O Project Owner pode revogar o grant por registro explícito e datado que referencie `AUTH-PRJ001-WI-READINESS-01`, identifique o principal revogador, o escopo da revogação e seu efeito. Em bootstrap, esse registro deverá ficar em artefato governado do Project e ser consultado no instante de cada decisão; a revogação torna novos gates `DENY`. Decisões historicamente válidas não são apagadas nem invalidadas retroativamente; desfazer efeito passado exige decisão causal própria.

## 8. Semântica de bootstrap e implementação futura

Ainda não há tabela canônica runtime de grants, autenticação criptográfica do principal de agente, serviço de authority, registry de revogação ou enforcement automatizado de produção. Enquanto o self-hosting for documental, a fonte governada bootstrap, caso aprovada, deve ser o grant ativo materializado por decisão humana explícita junto com seu eventual registro de revogação; esta candidata permanece somente proposta.

A implementação futura deverá materializar a mesma semântica em fonte canônica de authority: vincular principal autenticável ao `authority_id`, persistir grant, uso, delegation chain e revogação, e revalidar scope, estado, baselines, segregation e versão no ponto que materializa a decisão. UI, texto livre ou metadata declarada pelo agente não serão prova suficiente.

## 9. Riscos residuais

- A identidade de agente ainda não possui verificação criptográfica/runtime; a aprovação humana deverá definir a vinculação verificável aceitável para o bootstrap e a implementação futura deverá substituí-la por enforcement canônico.
- O grant é reutilizável; uma falha na revalidação por decisão amplia seu alcance operacional. As conditions cumulativas, scope de PBL e segregation são controles obrigatórios, não recomendações.
- Alterações de baseline, policy, escopo ou ownership podem tornar evidence ou authority obsoletas e devem bloquear novo uso até revalidação governada.

## 10. DECISÃO SOLICITADA AO PROJECT OWNER

| Item | Proposta para decisão |
| --- | --- |
| Principal delegado | `agent:codex:gate:prj001-work-item-readiness` (`AGENT`) |
| Action | `DECIDE_WORK_ITEM_READINESS_GATE` |
| Scope | `PRJ-001`; Work Items da `PBL-PRJ001-R1-v1.0`; `READINESS_GATE`; `PROPOSED → READY`; `NB-0002` |
| Condições | Todas as 14 condições cumulativas da seção 5, revalidadas no instante decisório |
| Segregação | Auditor, autor material quando aplicável e implementation agent são inelegíveis como gate authority do mesmo WI |
| Validade | Após aprovação; condicionada a grant ativo, PBL/NB/scope/policy aplicáveis; sem expiração fixa |
| Revogação | Project Owner registra revogação explícita; novos gates são negados; histórico legítimo é preservado |
| Não permite | Acceptance, execução, implementação, risco, exception, pause/cancel, gates superiores, Delivery, norma, baseline ou subdelegação |

```text
[ ] APPROVE AUTHORITY GRANT AS PROPOSED
[ ] REWORK REQUIRED
[ ] REJECT
```

Nenhuma opção está marcada por esta candidata. Somente instrução humana explícita do Project Owner pode selecionar uma delas e criar efeito de authority.
