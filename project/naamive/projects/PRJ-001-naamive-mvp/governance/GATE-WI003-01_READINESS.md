# GATE-WI003-01 — Readiness Gate da WI-003

**gate_id:** GATE-WI003-01  
**gate_type:** READINESS_GATE  
**gate_status:** DECIDED  
**gate_object:** WI-003 — Username / Password Login  
**governing_scope:** MODULE / MOD-001; Value Increment VI-001  
**transition_intent_id:** GATE-WI003-01 / WI-003 / PROPOSED-to-READY  
**requested_transition:** `PROPOSED → READY`  
**canonical_state_at_decision:** `PROPOSED`  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**Technology Baseline / TIR:** v0.10 — APPROVED / FROZEN; v1.0 — APPROVED  
**principal:** agent:codex:gate:GATE-WI003-01  
**principal_role_in_this_record:** executor da avaliação do gate; não é prova de authority  
**decided_at:** 2026-09-13T19:35:25-03:00  
**result:** BLOCKED — AUTHORITY REQUIRED  
**transition_materialized:** NO  

## 1. Objeto e limites

Este gate avalia exclusivamente a transição de readiness de WI-003. Não cria
Development Cycle, Execution, implementação, migration, código nem qualquer
avanço de WI-004, Module ou Project.

A aresta `PROPOSED → READY` existe no lifecycle de Work Item. Porém, sob o
Transition Contract §§2, 4 e 13 e o Gate Policy §§22 e 30, a sua
materialização requer authority válida no instante decisório, além dos demais
critérios abaixo.

## 2. Classificação da divergência de baseline e evidence

### FND-AUD-WI003-01-001

**origem:** `AUD-WI003-01_INDEPENDENT_READINESS_AUDIT.md`  
**estado de entrada:** OPEN / NON-BLOCKING  
**disposição deste gate:** **RESOLVED BY GATE CLASSIFICATION — KEEP**  
**classificação:** `KEEP` para a compatibilidade semântica entre a PBL fechada
e a evidence de readiness/auditoria corrente.  
**efeito:** a PBL histórica permanece imutável; a R2 e a audit continuam
evidence aplicável ao mesmo objeto, escopo, intenção e baseline de negócio.
Esta disposição trata somente a divergência de membresia; não aprova o gate.

| Referência | SHA-256 / conteúdo | Constatação |
|---|---|---|
| membro fechado da PBL | `f53e8928a87bae2942acdffa730b7825853cf832bcd31027560c5208bca011a7` | Registrado no `project/naamive/MANIFEST.md` para WI-003; é o conteúdo preservado do membro da PBL. |
| revisão auditada/corrente de WI-003 | `328977a761855f0468f5176ec7296d57c9baeef49dcfcb59a470c7ac36a15fc4` | Conferido no arquivo corrente e identificado pela `AUD-WI003-01` (input `5a2c33e66b03003cf0a8eeede5e9e9028e93e65f`). |
| baseline de negócio | `PBL-PRJ001-R1-v1.0`; manifesto `2bdbdfbea7767b463bee11d9c9d835559bace75466a2eb6b042c9ad507f5633b` | O digest do manifesto confere com o certificado de baseline; não foi alterado por este gate. |

O diff entre o membro fechado e a revisão corrente contém somente:

- a troca de wording de `applicable independent evidence` para
  `applicable independent audit`, que torna explícita a exigência de audit já
  aplicável a WI MATERIAL sob `NB-0002`; e
- a seção operacional que referencia DEC-009, R2 e o estado ainda `PROPOSED`.

O diff não altera Outcome, scope, out-of-scope, acceptance criteria,
dependência (`WI-002 = DONE`), impact (`MATERIAL`), business intent, owner,
nem o contrato material. DEC-009 é uma decisão governada separada, referida
pela projeção, e não uma alteração retroativa do membro da PBL.

Logo, não houve mudança material de Business Baseline, scope ou baseline
normativa que exigisse `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE`.
Pelas semânticas de Gate Policy §§17–18 e Audit and Review Policy §§14–17, a
evidence auditada permanece `KEEP`: a PBL fechada continua semanticamente
compatível com o objeto deste gate e com a evidence R2/AUD-WI003-01. A
classificação preserva, sem apagá-los, o hash PBL, o hash auditado, o diff, a
audit de origem e este gate de tratamento.

## 3. Verificação de readiness

| Critério obrigatório | Resultado | Evidence / fundamento |
|---|---|---|
| Objective | SATISFEITO | WI-003 define autenticação de credenciais humanas sem transformar login/client em authority. |
| Scope e out-of-scope | SATISFEITO | Sessão durável, cookies/tokens reutilizáveis, Grants e listagem de Projects permanecem em WI-004 ou fora da WI. |
| Acceptance criteria | SATISFEITO | Argon2id, erro genérico, rate limiting/delay conforme TIR e `POST /api/session/login` tipado estão definidos e auditados. |
| Dependencies | SATISFEITO | WI-002 está `DONE`; DEC-008 é `CURRENT / GOVERNED` e compatível. |
| Impact | SATISFEITO | `MATERIAL`; a audit independente proporcional foi exigida e realizada. |
| Baseline | SATISFEITO | `NB-0002`, `PBL-PRJ001-R1-v1.0`, Technology Baseline v0.10 e TIR v1.0 são os artefatos aplicáveis; a divergência de membre foi classificada `KEEP`. |
| DEC-009 | SATISFEITO | `CURRENT / GOVERNED / APPROVED`; fixa o contrato de autenticação e resolve `FND-WI003-RCP-001..004`, sem conceder readiness authority. |
| Findings | SATISFEITO | `blocking_findings = 0`; FND-AUD-WI003-01-001 era não bloqueante e recebeu a disposição rastreável acima. |
| Independent audit | SATISFEITO | `AUD-WI003-01` é `PASS WITH NON-BLOCKING FINDINGS`, sobre o mesmo objeto, scope e baselines; não foi repetida. |
| Authority | **NÃO SATISFEITO** | Não há grant/prova atual que autorize uma decisão de readiness para WI-003 neste escopo e baseline. |
| Continuity | SATISFEITO PARA BLOQUEIO | A rota posterior é acionável: obter authority válida e reavaliar este gate contra o estado canônico então vigente. |

## 4. Resolução de authority

Não foi localizada authority canônica válida para decidir ou aprovar o
readiness gate de WI-003 neste instante. Em particular:

- a designação de `AUD-WI003-01` é limitada a produzir evidência de audit e
  não implica approval;
- DEC-008 e DEC-009 decidem seus respectivos conteúdos, mas explicitamente
  não concedem readiness authority;
- `AUTHORITY_CONTEXT.md` é somente referência e declara não criar authority;
- a existência desta task, a identidade técnica do agente, capacidade de
  audit/review ou metadata declarada pelo principal não constituem grant.

Falta uma fonte governada que prove, para um principal verificável, a ação de
decidir/aprovar o Work Item readiness gate de WI-003, limitada a `MOD-001 /
VI-001 / WI-003`, a `PBL-PRJ001-R1-v1.0` e `NB-0002`, com validade temporal,
origem, revogação, cadeia de delegação e restrições de segregação verificáveis.
Não há `authority_id` aplicável a registrar.

Isso é exigido pela Authority Policy §§2–9, 15–17 e 21 e pelo Authority
Contract §§2, 4–9, 13–18, 20 e 26. Gate Policy §30 não obriga que a decisão
seja humana, mas não dispensa authority: uma concessão válida a agente para
gate automatizado ou uma decisão válida de outro principal autorizado seria
necessária. Este gate não inventa um human gate.

## 5. Decisão, efeito e continuidade

```text
GATE RESULT.................. BLOCKED — AUTHORITY REQUIRED
WI-003 lifecycle............. remains PROPOSED
WI-003 navigation............ remains DOING
FND-AUD-WI003-01-001......... RESOLVED BY GATE CLASSIFICATION — KEEP
PBL / R2 / AUD-WI003-01...... remain semantically applicable
Development Cycle............ NOT CREATED
Execution.................... NONE
Implementation............... NOT AUTHORIZED
```

Nenhuma transição foi materializada: não há authority reference, approval,
expected-version/estado canônico revalidado no instante de uma aprovação ou
handoff de `READY` a registrar. Portanto, não houve alteração em WI-003 nem
na projeção de `VI-001/STATUS.md`; não há roll-up para Module, Project ou
`PROJECT_CONTINUITY.md`.

A próxima ação legal exata é obter e registrar authority canônica válida para
a ação de decisão/aprovação deste readiness gate no objeto e baselines acima.
Após isso, uma nova avaliação do gate deve revalidar estado canônico,
authority, baseline/evidence e continuidade antes de poder materializar
`PROPOSED → READY`.

## 6. Rastreabilidade

- Work Item: `modules/MOD-001-project-context/value-increments/VI-001-authenticated-project-context/work-items/WI-003-login.md`
- PBL e manifesto: `project/naamive/MANIFEST.md`; `project/naamive/BASELINE_CERTIFICATE.md`
- Readiness R2: `governance/WI-003_READINESS_CANDIDATE_R2.md`
- Audit de origem do finding: `governance/AUD-WI003-01_INDEPENDENT_READINESS_AUDIT.md`
- Decisões: `decisions/DEC-008_WI002_PRINCIPAL_SEMANTICS.md`; `decisions/DEC-009_AUTHENTICATION_CONTRACT.md`
- Contexto de authority: `governance/AUTHORITY_CONTEXT.md`
- Regras aplicadas: Gate Policy §§17–24 e 30; Audit and Review Policy §§14–17; Authority Policy §§2–9, 15–17 e 21; Transition Contract §§2–18; Authority Contract §§2–28.
