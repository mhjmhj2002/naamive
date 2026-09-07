# NAAMIVE — Projection Model

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** modelo conceitual de projeções  
**Deriva de:** Canonical State, Governance e Contracts

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** projeções derivadas, actions, continuity, conformance semântico e staleness

---

# 1. Objetivo

Definir como estado canônico é projetado para leitura, UI, agents e
orchestration.

---

# 2. Regra fundamental

```text
Projection != Source of Truth
```

Projection é consequência da verdade.

---

# 3. Tipos de projection

Podem existir:

- entity detail;
- lifecycle status;
- allowed actions;
- pending human decisions;
- eligible work;
- timeline;
- findings;
- risks;
- continuity;
- dashboard;
- audit view.

---

# 4. Reconstructability

Toda projection material deve poder ser reconstruída a partir de canonical
state/history.

---

# 5. Completeness

Se uma ação, espera, blocker ou decisão canônica necessária existe, projection
deve torná-la descobrível ao principal correto.

O canonical state/governance deriva um **Required Projection Set** para cada
recurso/contexto relevante. Cada obrigação pode possuir identidade determinística
(`projection_obligation_id`) contendo, conforme aplicável:

- recurso;
- intenção;
- tipo (`ACTION`, `WAIT`, `BLOCKER`, `DECISION`);
- principal/escopo destinatário;
- Business Baseline;
- `normative_baseline_ref`;
- geração/version atual.

A obrigação é canônica/derivada; a representação visual continua sendo projection.

---

# 6. Correctness e semantic conformance

Projection não pode mostrar ação que canonical authority nega.

Além de rebuild/lag, deve existir verificação semântica entre o Required
Projection Set e a projection produzida. O conformance check deve detectar:

```text
MISSING
DUPLICATED
CONTRADICTORY
UNAUTHORIZED_EXTRA
```

para ações, waits, blockers e decisões necessários.

Mismatch de conformance abre ou atualiza uma `Inconsistency` canônica do tipo
`PROJECTION_CONFORMANCE`, contendo expected/observed refs, `cause_ref`, owner,
baselines, continuity e escalation.

Uma projection pode estar com watermark atual e ainda assim estar semanticamente
errada; por isso lag/rebuild não satisfazem este requisito.

---

# 7. Allowed actions

Allowed actions são derivadas de:

- lifecycle state;
- conditions;
- authority;
- gates;
- findings;
- Business Baseline;
- `normative_baseline_ref`;
- concurrency version;
- continuity.

A projection deve carregar `normative_baseline_ref` server-derived e, quando
útil, `controlling_rule_ref`. O cliente nunca escolhe qual norma governa a ação.

---

# 8. No client inference

Cliente não deve montar ações apenas olhando string de state.

---

# 9. Human decisions

Projection deve mostrar:

- decisão;
- objeto;
- baseline;
- evidence;
- audit;
- findings;
- risk;
- authority requirement;
- deadline/escalation.

---

# 10. Eligible work

Orchestration pode consumir projection de eligibility, desde que a execução
revalide canonical state antes de claim/result.

---

# 11. Staleness

Projection pode ficar stale temporariamente.

Comando nunca confia somente nela.

---

# 12. Version

Projection deve carregar version/watermark que permita detectar staleness.

---

# 13. Timeline

Timeline é explicativa, não normativa.

---

# 14. Finding projection

Blockers devem estar visíveis.

---

# 15. Continuity projection

Todo recurso ativo deve mostrar próximo passo ou condição de saída, incluindo
`cause_ref` e `normative_baseline_ref` suficientes para explicar por que aquela
continuidade existe e sob qual norma.

---

# 16. Inconsistency e dead-end projection

Sistema deve conseguir projetar Inconsistency quando continuidade falta ou
quando o Required Projection Set diverge da projection efetivamente entregue.
A UI é consumidora dessa verdade; não cria nem fecha a Inconsistency.

---

# 17. Recovery projection

Deve mostrar recovery/reconciliation pendente.

---

# 18. Execution projection

Pode mostrar attempts, claim, stale/expired e outcome sem confundir com Work Item
state.

---

# 19. Project aggregation projection

Não usar contagem simples de Modules como regra de negócio.

---

# 20. Rebuild

Rebuild de projection não pode produzir novo fato de negócio.

---

# 21. Cache

Cache pode acelerar leitura, nunca governar transition.

---

# 22. Agents

Context package de agent pode ser projection especializada.

Antes de ação material, canonical state deve ser revalidado.

---

# 23. UI

UI deve usar action descriptors/projections, não hardcode de lifecycle law.

---

# 24. Observability

Lag de projection deve ser mensurável, mas também deve existir sinal de
**semantic conformance**. Missing/duplicated/contradictory required projection
deve produzir Inconsistency durável e alerta acionável mesmo com lag zero.

---

# 25. Invariantes

```text
projection derivada
projection reconstruível
projection não autoriza sozinha
missing canonical action = Inconsistency de projection/continuity
Required Projection Set possui conformance verificável
stale projection não vence canonical state
```

---

# 26. Proibições

Não é permitido:

- UI inventar botão;
- worker executar só porque projection disse READY sem revalidation;
- projection esconder blocker;
- timeline virar source de current state.

---

# 27. Princípio final

Projection explica e distribui a verdade.

Ela nunca cria a verdade.
