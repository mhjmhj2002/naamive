# NAAMIVE — Activity Center Runtime Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  
**Escopo:** runtime de UI para atividade longa, roadmap, Phase Cycle e explainability

---

# 1. Activity Center

Toda atividade governada potencialmente longa deve possuir superfície persistente capaz de distinguir:

```text
Project macro phase
internal phase step
Module
ValueIncrement
Work Item
Execution
```

# 2. Roadmap e Phase Cycle Plan

A UI pode inspecionar Phase Cycle Plan, Development Roadmap, decisões, findings, remediações, dependências e continuity. O browser é consumidor de projection, nunca supervisor.

# 3. Falha persistente

Falha material deve permanecer consultável com objeto afetado, causa, último progresso funcional, continuity e allowed next actions. Toast efêmero não é suficiente.

# 4. Três relógios

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

`ALIVE != PROGRESS`.

# 5. Histórico local e timeline global

Histórico local de fase/atividade, timeline global do Project e estado corrente são projeções distintas.

# 6. Action descriptors

Allowed actions são server-derived. Browser não habilita transição a partir de string de estado, contagem ou inferência local.

# 7. Atualização responsiva

A experiência deve ser suficientemente responsiva para acompanhamento humano. SSE, WebSocket, polling ou equivalente pertencem à Technology Baseline.

# 8. Acessibilidade

Status, prioridade e blocking não podem depender somente de cor.
