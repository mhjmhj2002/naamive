# NAAMIVE — Action and Decision Surface Model

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.4  
**Autoridade:** modelo das superfícies de ação e decisão  
**Deriva de:** UI Model, Gate Policy e Projection Model

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
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


---

# Surfaces de ValueIncrement e DeliveryTarget

## Novas decision surfaces

Devem existir, quando aplicável, surfaces para:

```text
aprovar ValueIncrementProposal
ajustar proposta
rejeitar proposta
abrir brainstorm
split
merge
alterar disposition
aprovar DeliveryTarget version
aceitar ValueIncrement
priorizar OPTIONAL sobre REQUIRED
```

---

## Proposal surface

Deve mostrar:

```text
Module
proposal
rationale
alternatives
dependencies
risk
criteria
agent recommendation
trade-offs
Business Baseline
normative_baseline_ref
```

---

## Split surface

Deve mostrar:

```text
source ValueIncrement
proposed successors
value statement de cada successor
required/optional effect
dependency effect
target-version effect
```

---

## Priority override

Se humano optar por executar OPTIONAL apesar de REQUIRED elegível, a surface deve
explicar:

```text
qual REQUIRED está sendo postergada
motivo
impacto
authority
consequence
```

A decisão deve ser persistida.

---

## Descriptor exactness

Action descriptors devem continuar server-derived.

UI não cria:

```text
APPROVE
SPLIT
CHANGE_DISPOSITION
PRIORITIZE_OPTIONAL
ACCEPT_VALUE
```

a partir de strings de estado.

---

## Invariantes

```text
proposal action != silent approval
priority override é governado
split decision é rastreável
payload binding é exato
double click é idempotente
```

---
