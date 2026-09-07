# NAAMIVE — Baseline and Supersession / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-04 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `state/04_BASELINE_AND_SUPERSESSION_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. ValueIncrement baseline

Toda decisão material de `ValueIncrement` deve ser vinculável à Business Baseline
avaliada e à Normative Baseline aplicável.

`ValueIncrement.ACCEPTED` significa aceite daquele valor na baseline identificada.

---

# 2. DeliveryTarget baseline

Cada versão material de Delivery Target deve declarar a Business Baseline sobre a
qual o compromisso foi decidido.

Mudança material:

```text
new version
supersedes old version
```

sem reescrever a versão anterior.

---

# 3. Membership validity

Mudança de:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

pode exigir:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

nos objetos dependentes.

---

# 4. Candidate baseline drift

Se:

```text
Delivery Target = DT-01 v3
Candidate Business Baseline = B42
```

e o baseline mudar para `B43`, evidências não continuam válidas por inércia.

---

# 5. Split e successor

Split deve preservar source baseline, successor baselines, decision, lineage e
efeito no target.

`ACCEPTED` não reabre; mudança posterior cria successor.

---

# 6. Current authoritative value

A agregação corrente deve distinguir:

```text
historical accepted value
current authoritative value for target/baseline
```

---

# 7. Regra de consolidação

Este conteúdo deve ser incorporado à revisão completa de
`state/04_BASELINE_AND_SUPERSESSION_MODEL.md` na candidata `NB-0002`.
