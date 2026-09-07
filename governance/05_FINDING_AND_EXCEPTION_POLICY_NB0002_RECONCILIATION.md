# NAAMIVE — Finding and Exception Policy / NB-0002 Reconciliation

**Status:** BRAINSTORM — R2-02b APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `governance/05_FINDING_AND_EXCEPTION_POLICY.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Reconciliar Finding `BLOCKING/NON_BLOCKING` com Development Roadmap e
continuidade de agent development.

---

# 2. Affected scope

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

# 3. NON_BLOCKING

`NON_BLOCKING` significa que o Finding não impede necessariamente o avanço do
affected scope atual.

Se exigir tratamento:

```text
persist Finding
append remediation RoadmapEntry
continue eligible work
```

---

# 4. BLOCKING

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

# 5. Future dependency

Finding `NON_BLOCKING` para o trabalho corrente pode ser dependência de trabalho
futuro.

Nesse caso:

```text
future item remains ineligible until dependency satisfied
```

Se a consequência do Finding mudar materialmente, reclassification segue a
policy vigente e exige evidence/authority/justification aplicáveis.

---

# 6. Não perder Finding no fim da execução

Fim de Execution/agent session não fecha Finding.

Roadmap e Finding permanecem duráveis até disposição governada.

---

# 7. Consolidação

Este delta deve ser incorporado à revisão final de
`governance/05_FINDING_AND_EXCEPTION_POLICY.md`.
