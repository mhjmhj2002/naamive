# NAAMIVE — Action and Decision Surface Model

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** modelo das superfícies de ação e decisão  
**Deriva de:** UI Model, Gate Policy e Projection Model

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** action descriptors, decision surfaces, input binding, authority e normative context

---

# 1. Objetivo

Definir o contrato conceitual de uma ação humana ou operacional apresentada na
UI.

---

# 2. Action descriptor

Deve possuir, conforme aplicável:

- action_id;
- label;
- object;
- intention type;
- authority requirement;
- baseline;
- `normative_baseline_ref` server-derived;
- `controlling_rule_ref` quando útil;
- `projection_obligation_id` quando a action satisfaz obrigação canônica;
- expected version;
- required inputs;
- evidence requirements;
- blockers;
- consequence;
- governing normative context;
- endpoint/command reference futuro.

---

# 3. Canonical source

Descriptor vem de projection governada. `normative_baseline_ref` é resolvida
pelo backend e não pode ser escolhida pelo browser.

---

# 4. Human decision surface

Deve mostrar:

- decision question;
- alternatives;
- recommendation;
- evidence;
- audit;
- findings;
- risk;
- exception;
- baseline;
- consequences.

---

# 5. Input binding

Campos necessários devem ser explicitamente definidos.

UI não deve inferir payload de schema genérico incompatível com action.

---

# 6. Disabled action

Quando action existe mas está temporariamente indisponível, explicar condition.

---

# 7. Hidden action

Quando principal não possui capability, pode ser ocultada, mas decisões
obrigatórias do responsável não podem desaparecer por erro de projection.

---

# 8. Destructive action

Cancel/exception/risk acceptance devem ter linguagem inequívoca.

---

# 9. Idempotency

Double click não duplica command intent.

---

# 10. Invariants

```text
descriptor exact
payload binding exact
normative_baseline_ref server-derived
required projection obligation traceable
command semantic
double click safe
```

---

# 11. Princípio final

A superfície de ação é a tradução fiel de uma capability canônica.
