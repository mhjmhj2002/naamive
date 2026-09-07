# NAAMIVE — Evidence and Audit Contract

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** contrato normativo de evidence, review e audit do NAAMIVE  
**Deriva de:** `../governance/04_AUDIT_AND_REVIEW_POLICY.md` e `../governance/01_GOVERNANCE_MODEL.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** evidence, review, audit, independência, validade e vínculo decisório

---

# 1. Objetivo

Este contrato define como evidence, review e audit devem ser representadas
conceitualmente para sustentar decisões governadas.

---

# 2. Evidence

Evidence é prova referenciável ligada a objeto, baseline e finalidade.

---

# 3. Elementos de evidence

Toda evidence material deve possuir:

- evidence_id;
- object;
- baseline;
- `normative_baseline_ref` quando materialmente relevante;
- type;
- producer_principal;
- produced_at;
- content/reference;
- purpose;
- integrity reference quando aplicável;
- validity;
- supersession relation quando aplicável.

---

# 4. Baseline obrigatório

Evidence material sem baseline não deve sustentar decisão material.

---

# 5. Purpose

Evidence deve dizer o que pretende provar.

Exemplo:

```text
functional correctness
architecture compliance
security validation
user-flow validation
dependency satisfaction
delivery readiness
```

---

# 6. Sufficiency

Evidence existente pode ser insuficiente.

Sufficiency é decisão de review/audit/gate conforme criteria.

---

# 7. Evidence obsoleta

Mudança material deve classificar evidence como:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

---

# 8. Integrity

Evidence não deve ser silenciosamente substituída.

Correção cria nova versão/relação.

---

# 9. Review record

Todo review material deve possuir:

- review_id;
- object;
- baseline;
- reviewer principal;
- authority/context;
- specialization;
- criteria;
- evidence considered;
- findings;
- result;
- limitations;
- timestamp.

---

# 10. Audit record

Todo audit material deve possuir:

- audit_id;
- object;
- baseline;
- `normative_baseline_ref`;
- auditor principal;
- independence status;
- scope;
- criteria;
- evidence considered;
- review refs;
- findings;
- result;
- limitations;
- timestamp.

---

# 11. Audit results

Semântica mínima:

```text
PASS
PASS_WITH_FINDINGS
FAIL
```

---

# 12. PASS

Não existem blockers e readiness está suficientemente provada.

---

# 13. PASS_WITH_FINDINGS

Existem findings não bloqueadores.

---

# 14. FAIL

Existe blocker, inconsistência ou evidence insuficiente.

---

# 15. PASS proibido

É proibido PASS quando existe blocker aberto aplicável ao baseline.

---

# 16. Independence

Audit que exige independência deve registrar principal distinto do author.

---

# 17. Self-audit

Pode existir como evidence auxiliar.

Não satisfaz independent audit.

---

# 18. Limitations

Auditor deve registrar limitações relevantes.

---

# 19. Reuse

Audit anterior só pode ser reutilizada se houver coverage explícita de:

- same object;
- compatible baseline;
- same scope;
- same material decision;
- valid risks;
- applicable findings.

---

# 20. Revalidation

Mudança material exige revalidation.

---

# 21. Reaudit

Remediation material pode exigir nova audit.

---

# 22. Finding linkage

Todo finding deve apontar evidence ou ausência verificável de evidence.

---

# 23. Decision linkage

Toda decisão material deve poder apontar evidence/review/audit utilizados.

---

# 24. Authority linkage

Audit não cria approval authority.

---

# 25. Audit and exception

Exception deve permanecer separada da audit.

Auditor pode recomendar.

Authority decide.

---

# 26. Evidence package

Um gate material deve receber package coerente:

- object;
- baseline;
- criteria;
- evidence;
- reviews;
- audit;
- findings;
- risks;
- exceptions.

---

# 27. Partial evidence

Evidence parcial deve declarar scope limitado.

Não pode ser interpretada como cobertura global.

---

# 28. Contradictory evidence

Evidence contraditória exige reconciliation ou decisão explícita.

---

# 29. Missing evidence

Quando evidence obrigatória não existe:

```text
fail-closed
```

---

# 30. Derived evidence

Evidence produzida por agent deve manter origem e método conhecidos quando
relevante.

---

# 31. Human evidence

Decision humana também é evidence de authority/acceptance, mas não substitui
prova técnica ou factual exigida.

---

# 32. Immutable history

Review/audit finalizada não é reescrita.

Correção gera supersession.

---

# 33. Projection

UI/API deve permitir visualizar:

- result;
- baseline;
- findings;
- limitations;
- evidence references;
- auditor/reviewer;
- validity.

---

# 34. Audit trail

Deve ser possível reconstruir o conjunto de prova usado para cada decisão.

---

# 35. Invariantes

```text
material evidence possui baseline
audit possui scope
audit independente registra principal distinto
PASS não possui blocker aplicável
decision material aponta evidence
```

---

# 36. Proibições

Não é permitido:

- evidence sem origem;
- audit sem baseline;
- PASS com blocker;
- reuse de audit sem coverage;
- apagar audit antiga;
- authority inventar evidence faltante.

---

# 37. Itens deixados para implementação

Não define:

- file format;
- hash algorithm;
- object storage;
- schema;
- UI;
- signature technology.

---

# 38. Princípio final

Evidence sustenta afirmações.

Review avalia qualidade.

Audit prova readiness.

Decision usa essas provas — não as substitui.
