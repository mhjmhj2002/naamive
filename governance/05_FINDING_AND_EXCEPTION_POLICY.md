# NAAMIVE — Finding and Exception Policy

**Status:** RATIFIED  **Versão:** 0.4  
**Autoridade:** política normativa de findings e exceptions do NAAMIVE  
**Deriva de:** `01_GOVERNANCE_MODEL.md`  
**Normas superiores:** `../00_NAAMIVE_CONSTITUTION.md` e `../lifecycle/01_LIFECYCLE_MODEL.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** findings, severidade, tratamentos, risk acceptance, exception, expiração e fechamento

---

# 1. Objetivo

Esta policy define como findings são criados, classificados, tratados,
encerrados, reclassificados e excepcionalmente contornados.

---

# 2. Finding

Finding é um achado formal associado a:

- objeto;
- baseline;
- evidence;
- principal;
- severidade;
- consequência.

---

# 3. Severidade mínima

```text
BLOCKING
NON_BLOCKING
```

Níveis adicionais podem ser derivados depois.

---

# 4. BLOCKING

Impede avanço normal.

---

# 5. NON_BLOCKING

Não impede necessariamente avanço, mas permanece rastreável.

---

# 6. Ciclo de vida conceitual

Finding pode passar por:

```text
OPEN
IN_TREATMENT
RESOLVED
INVALIDATED
ACCEPTED_RISK
SUPERSEDED
```

Os nomes físicos podem mudar.

`EXCEPTION_COVERED` não é estado terminal do Finding. Quando uma exception
cobre um Finding em determinado gate/escopo/baseline, essa cobertura é uma
**relação separada** entre Finding, Exception e decisão. O Finding preserva seu
status próprio e sua severidade.

Para Finding `BLOCKING`, `ACCEPTED_RISK` também não significa fechado nem
non-blocking; apenas registra uma decisão de risco que pode coexistir com o
bloqueio.

---

# 7. OPEN

Finding existe e ainda não recebeu tratamento final.

---

# 8. IN_TREATMENT

Existe owner e ação de tratamento em andamento.

---

# 9. REMEDIATION

Corrige a causa.

Requer nova evidence.

---

# 10. INVALIDATION

Nova evidence prova que finding estava incorreto/inaplicável.

Finding original permanece histórico.

---

# 11. RECLASSIFICATION

Altera severidade.

Exige:

- evidence;
- authority;
- justification;
- independência quando aplicável.

---

# 12. RISK_ACCEPTANCE

Reconhece finding como verdadeiro e aceita seu risco.

Não apaga finding.

---

# 13. Regra crítica

```text
RISK_ACCEPTANCE != EXCEPTION
```

Risk acceptance não libera blocker por si só.

---

# 14. EXCEPTION

Exception permite desvio governado da regra normal.

---

# 15. Exception e blocker

Exception pode permitir avanço apesar de blocker somente quando:

- norma superior permite;
- authority adequada decide;
- risco é explícito;
- mitigação existe;
- validade é limitada;
- audit trail é preservado.

---

# 16. Exception não fecha finding

Finding permanece existente.

A exception apenas altera a consequência de gate dentro de escopo/tempo
específicos.

---

# 17. Exception não reclassifica

Severity permanece a mesma salvo decisão de reclassification separada.

---

# 18. Requisitos de exception

- finding/regra relacionada;
- requester;
- authority;
- scope;
- baseline;
- `normative_baseline_ref`;
- reason;
- risk;
- mitigation;
- compensatory controls;
- start;
- expiration;
- closure criteria;
- revalidation.

---

# 19. Expiração

Toda exception deve expirar ou possuir condição objetiva de encerramento.

Exception permanente é proibida por padrão.

---

# 20. Escopo

Exception deve dizer exatamente:

```text
qual regra
qual objeto
qual baseline
qual decisão
```

Ela não se propaga automaticamente.

---

# 21. Reuso

Exception anterior não pode ser reutilizada em novo baseline sem revalidação.

---

# 22. Descendentes

Exception no Project não libera automaticamente findings de Module ou Work Item.

Cobertura deve ser explícita.

---

# 23. Risk acceptance

Toda aceitação de risco deve possuir:

- risk;
- owner;
- authority;
- scope;
- baseline;
- validity;
- mitigation;
- review date quando aplicável.

---

# 24. Reclassificação bloqueadora

Blocker só deixa de bloquear por reclassification válida e independente quando a
nova evidence sustentar severidade menor.

---

# 25. Finding inválido

Invalidation exige prova.

Não basta discordância de authority.

---

# 26. Finding resolvido

Remediation resolve causa.

Pode exigir reaudit.

---

# 27. Finding superseded

Quando baseline muda e finding deixa de representar objeto atual, ele pode ser
superseded, mantendo relação causal com novo finding ou decisão.

---

# 28. Finding e baseline

Todo finding material deve referenciar baseline.

---

# 29. Finding e lifecycle

Finding pode provocar:

- BLOCKED;
- RETURNED;
- REWORK;
- REAUDIT;
- RISK_DECISION;
- EXCEPTION_REQUEST.

---

# 30. Finding e Work Item

Finding pode originar nova Work Item quando remediation exigir trabalho.

---

# 31. Finding e cancelamento

Cancelamento do objeto não apaga finding histórico.

---

# 32. Exception e cancelamento

Exception não autoriza continuar trabalho após cancelamento salvo regra superior
explicitamente permitir operação de segurança/reconciliation/compensation.

---

# 33. Exception e authority

Quem solicita exception não deve ser automaticamente quem concede.

---

# 34. Independence

Policy pode exigir principal distinto para:

- author do finding;
- requester;
- authority de exception.

---

# 35. Exception crítica

Exception CRÍTICA deve exigir controle reforçado.

Pode exigir:

- audit independente;
- segunda authority;
- prazo curto;
- monitoramento;
- plano de saída.

---

# 36. Repeated exceptions

Uso recorrente da mesma exception deve gerar signal de governance.

Pode indicar necessidade de:

- corrigir policy;
- corrigir processo;
- corrigir produto;
- rever classificação.

---

# 37. Exception normativa

Só existe se norma superior permitir.

Não pode "furar" Constituição por policy inferior.

---

# 38. Exception operacional

Pode contornar limitação técnica temporária, desde que preserve princípios
superiores.

---

# 39. Findings não bloqueadores

Podem ser aceitos como:

- debt;
- improvement;
- limitation;
- residual risk.

Mas continuam rastreáveis.

---

# 40. Fechamento

Finding só fecha por causa explícita compatível com sua severidade e tratamento:

- remediated com evidence suficiente;
- invalidated por nova evidence;
- superseded com vínculo causal;
- Finding `NON_BLOCKING` cujo risco residual possa ser encerrado pela policy;
- objeto terminal quando a policy permitir encerramento administrativo sem
  apagar o histórico.

Exception **não fecha** Finding. Risk acceptance **não fecha** Finding BLOCKING.
Quando um blocker é excepcionalmente contornado, apenas o gate/decision recebe
`APPROVED_BY_EXCEPTION`; a relação de cobertura registra exception, escopo,
baseline e validade.

---

# 41. Audit trail

Deve responder:

- quem criou;
- evidence;
- severity;
- owner;
- treatment;
- authority;
- exception;
- risk;
- baseline;
- timestamps.

---

# 42. Projeção

UI/API deve mostrar:

- finding aberto;
- severity;
- owner;
- blocker effect;
- treatment;
- exception;
- expiration;
- action required.

---

# 43. Proibições

Não é permitido:

- apagar finding;
- risk acceptance liberar blocker;
- exception sem prazo/escopo;
- downgrade sem evidence;
- exception automática por conveniência;
- reaproveitar exception em baseline incompatível;
- esconder blocker da UI.

---

# 44. Cenários mentais

## 44.1 Blocker e risk acceptance

Continua bloqueando.

## 44.2 Blocker e exception válida

Pode avançar por exception.

## 44.3 Baseline muda

Revalidar finding/exception.

## 44.4 Finding corrigido

Produzir evidence e reaudit quando exigida.

## 44.5 Authority discorda do finding

Discordância não invalida; precisa evidence/processo de invalidation.

---

# 45. Itens deixados para contrato futuro

Não define:

- schema;
- severity numeric;
- API;
- workflow físico;
- SLA;
- storage.

---

# 46. Critério de aprovação

Esta policy está pronta quando podemos derivar:

- finding;
- severity;
- remediation;
- invalidation;
- reclassification;
- risk acceptance;
- exception;
- expiration;
- baseline;
- audit trail.

---

# 47. Princípio final

Finding registra um problema.

Risk acceptance reconhece o risco.

Exception autoriza um desvio.

Essas três coisas nunca devem virar sinônimos.


---

# Affected scope, bloqueio e remediation

## Affected scope

Finding deve explicitar, conforme aplicável:

```text
affected_scope_type
affected_scope_ref
```

Exemplos:

```text
DEVELOPMENT_STEP
WORK_ITEM
VALUE_INCREMENT
MODULE
PROJECT
```

---

## NON_BLOCKING

`NON_BLOCKING` significa que o Finding não impede necessariamente o avanço do
affected scope atual.

Se exigir tratamento:

```text
persist Finding
append remediation RoadmapEntry
continue eligible work
```

---

## BLOCKING

`BLOCKING` impede avanço normal do affected scope.

Exige:

```text
GOVERNED_BLOCK continuity
owner
exit condition
remediation route
roadmap traceability
```

---

## Future dependency

Finding `NON_BLOCKING` para o trabalho corrente pode ser dependência de trabalho
futuro.

Nesse caso:

```text
future item remains ineligible until dependency satisfied
```

Se a consequência do Finding mudar materialmente, reclassification segue a
policy vigente e exige evidence/authority/justification aplicáveis.

---

## Não perder Finding no fim da execução

Fim de Execution/agent session não fecha Finding.

Roadmap e Finding permanecem duráveis até disposição governada.

---
