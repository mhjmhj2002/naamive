# NAAMIVE — Baseline and Supersession Model

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.4  
**Autoridade:** modelo conceitual de baseline, validade e supersessão  
**Deriva de:** Constituição, Lifecycles, Governance e Contracts

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** Business Baseline, Normative Baseline, validade, revalidação e supersessão

---

# 1. Objetivo

Definir como o NAAMIVE identifica o contexto exato sobre o qual decisões,
evidências, audits e execuções são válidas.

---

# 2. Business Baseline e Normative Baseline

Este documento distingue explicitamente:

### Business Baseline

Conjunto identificável de versões, decisões e artefatos do produto/sistema.
`baseline` sem qualificador neste documento significa Business Baseline.

### Normative Baseline

Certificado imutável, identificado por `normative_baseline_ref`, que fixa o
conjunto completo e ordenado de normas ratificadas aplicáveis a uma instância ou
fato.

Business Baseline responde **qual realidade de produto/sistema foi avaliada**.
Normative Baseline responde **qual conjunto de leis governou a avaliação**.

---

# 3. Por que baseline existe

Evitar:

```text
validamos A
A mudou
continuamos usando validação de A
```

---

# 4. Baseline mínimo

Pode incluir:

- entity versions;
- scope;
- architecture decision set;
- plan;
- dependencies;
- norm version;
- relevant artifacts.

---

# 5. Baseline identity

Business Baseline deve possuir ID ou fingerprint determinístico.

Normative Baseline deve possuir identidade global própria e certificado
imutável. Seu membership deve conter, em ordem de precedência, identidade +
revisão/digest de cada documento, escopo/aplicabilidade, intervalo de eficácia,
supersessão e autoridade de ratificação.

---

# 6. Baseline material

Toda decisão MATERIAL/CRÍTICA deve declarar a Business Baseline aplicável e o
`normative_baseline_ref` que a governou.

---

# 7. Baseline compatibility

Duas Business Baselines podem ser compatíveis para determinada evidence e
incompatíveis para outra. Compatibilidade deve ser provada por escopo.

Duas Normative Baselines nunca são tratadas como equivalentes apenas porque
compartilham versões numéricas. Reuso entre elas exige regra explícita de
compatibilidade ou migração normativa governada.

---

# 8. Change classification

Mudança deve classificar objetos dependentes como:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

---

# 9. KEEP

Objeto continua válido sem nova ação.

---

# 10. REVALIDATE

Objeto pode continuar válido após verificação explícita.

---

# 11. SUPERSEDE

Novo objeto substitui anterior preservando history.

---

# 12. REVOKE

Objeto não pode produzir novos efeitos.

---

# 13. RECONCILE

Validade depende de descobrir efeito/fato atual.

---

# 14. Descendant impact

Mudança de Project pode afetar:

- Modules;
- Work Items;
- Executions;
- evidence;
- reviews;
- audits;
- handoffs;
- authorities;
- risks.

---

# 15. Module succession

Module INTEGRATED não reabre.

Correção material cria successor vinculado ao baseline anterior.

---

# 16. Work Item DONE

Não reabre.

Novo trabalho cria successor/rework item.

---

# 17. Execution

Attempt terminal nunca é superseded como se não existisse.

Nova attempt referencia anterior.

---

# 18. Audit

Audit antiga permanece histórica mesmo quando superseded.

---

# 19. Authority

Authority pode ser baseline-bound.

---

# 20. Delivery

Delivery referencia baseline entregue.

Evolution Need referencia Delivery/baseline predecessora.

---

# 21. Supersession chain

Deve ser possível navegar:

```text
v1 → v2 → v3
```

sem perder decisões anteriores.

---

# 22. Branching

Quando duas alternativas concorrentes existirem, apenas uma pode se tornar
authoritative para a mesma intenção.

---

# 23. Merge

Convergência de baselines exige decisão explícita.

Não existe merge sem avaliação de compatibilidade.

---

# 24. Revalidation record

Deve registrar:

- old baseline;
- new baseline;
- object;
- decision;
- authority;
- evidence;
- result.

---

# 24.1 Migração de Normative Baseline

Uma instância ativa permanece vinculada à Normative Baseline que legitimou seu
estado até existir migração explícita.

A migração deve registrar:

- source e target `normative_baseline_ref`;
- recursos afetados;
- diferenças relevantes;
- itens `KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou `RECONCILE`;
- authority e decisão;
- evidence e audit quando exigidas.

A ratificação de uma nova norma não equivale à migração automática de instâncias.

---

# 25. Proibições

Não é permitido:

- baseline implícito em decisão material;
- usar audit velha por conveniência;
- reabrir terminal;
- substituir history;
- successor sem vínculo causal;
- decisão material sem `normative_baseline_ref`;
- resolver instância ativa pela norma mais recente sem migração explícita.

---

# 26. Princípio final

Baseline responde:

```text
exatamente sobre qual realidade esta decisão foi tomada?
```


---

# Baseline, target e supersessão de valor

## ValueIncrement baseline

Toda decisão material de `ValueIncrement` deve ser vinculável à Business Baseline
avaliada e à Normative Baseline aplicável.

`ValueIncrement.ACCEPTED` significa aceite daquele valor na baseline identificada.

---

## DeliveryTarget baseline

Cada versão material de Delivery Target deve declarar a Business Baseline sobre a
qual o compromisso foi decidido.

Mudança material:

```text
new version
supersedes old version
```

sem reescrever a versão anterior.

---

## Membership validity

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

## Candidate baseline drift

Se:

```text
Delivery Target = DT-01 v3
Candidate Business Baseline = B42
```

e o baseline mudar para `B43`, evidências não continuam válidas por inércia.

---

## Split e successor

Split deve preservar source baseline, successor baselines, decision, lineage e
efeito no target.

`ACCEPTED` não reabre; mudança posterior cria successor.

---

## Current authoritative value

A agregação corrente deve distinguir:

```text
historical accepted value
current authoritative value for target/baseline
```

---
