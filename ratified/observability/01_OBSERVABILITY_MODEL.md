# NAAMIVE — Observability Model

**Status:** RATIFIED  **Versão:** 0.4  
**Autoridade:** modelo arquitetural de observabilidade  
**Deriva de:** Runtime, Continuity e Execution

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** sinais de lifecycle, continuity, execution, handoff, projection conformance e governança

---

# 1. Objetivo

Definir sinais necessários para detectar falha, dead-end, atraso e inconsistência.

---

# 2. Signals

```text
logs
metrics
traces
lifecycle health
continuity health
execution health
projection lag
projection semantic conformance
inconsistency backlog
reconciliation backlog
```

---

# 3. Lifecycle health

Métricas devem permitir contar recursos:

- por state;
- blocked;
- paused;
- waiting;
- no continuity;
- stale too long.

---

# 4. Execution health

- running age;
- failed count;
- retry count;
- stale result attempts;
- lease/claim expiry;
- recovery rate.

---

# 5. Continuity health

Detectar active resource sem actionable continuation e continuity cuja
`cause_ref` não possa ser resolvida. A discrepância deve abrir/vincular
Inconsistency canônica e possuir owner/escalation.

---

# 6. Handoff health

- pending age;
- retry;
- lost/uncertain handoff;
- acceptance latency.

---

# 7. Projection health

- rebuild failures;
- lag;
- stale watermark;
- conformance entre Required Projection Set e projection observada;
- required action/wait/blocker/decision ausente;
- duplicidade;
- contradição;
- ação extra que canonical authority não permite.

Conformance semântico é obrigatório mesmo quando projector está atualizado. Ao
detectar mismatch, o sistema cria/atualiza Inconsistency
`PROJECTION_CONFORMANCE`, emite sinal acionável e preserva escalation até
restabelecer a projeção correta.

---

# 8. Governance health

- pending human gates;
- blockers age;
- exceptions near expiration;
- authorities expiring.

---

# 9. Risk health

- riscos CRÍTICOS abertos;
- expired acceptance;
- mitigation overdue.

---

# 10. Correlation

Logs/traces devem carregar correlation/causation quando material.

---

# 11. Sensitive data

Observability não deve expor secrets.

---

# 12. Alerts

Alertas devem ser acionáveis e, quando representarem discrepancy governada,
referenciar a Inconsistency canônica em vez de substituir seu registro.

---

# 13. SLO/SLA

Valores concretos ficam para Technology/Operations baseline.

---

# 14. Invariants

```text
dead-end detectable
zombie detectable
handoff lag detectable
projection lag detectable
projection semantic omission/duplication/contradiction detectable
material inconsistency durable and observable
```

---

# 15. Princípio final

Se o sistema pode entrar em um estado ruim, deve existir sinal capaz de revelar
isso.


---

# Heartbeat, atividade operacional e progresso funcional

## Três relógios

Devem ser distintos:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

Semântica:

```text
heartbeat
→ executor está vivo?

operational activity
→ há atividade técnica?

functional progress
→ o processo avançou semanticamente?
```

---

## ALIVE não significa PROGRESS

É válido observar:

```text
heartbeat................. NOW
operational activity...... NOW
functional progress....... 52 min ago
```

Isso pode ser classificado como:

```text
ALIVE_NO_PROGRESS
```

ou semântica equivalente.

Não implica cancelamento automático.

---

## Long-running activity

Toda atividade potencialmente longa deve permanecer compreensível.

É proibido depender apenas de:

```text
spinner
RUNNING
```

sem contexto funcional suficiente.

---

## Functional progress events

Progresso funcional deve representar avanço semântico, por exemplo:

```text
critério analisado
Work Item concluída
baseline atualizada
step interno concluído
ValueIncrement entrou em VALIDATING
```

Não:

```text
loop tick
token recebido
arquivo aberto
heartbeat emitido
```

---

## Stalled progress

Métricas devem permitir detectar:

```text
alive + no functional progress
active + no continuity
running age excessive
functional step age excessive
pending human decision age
required ValueIncrement starvation
```

Limiares concretos pertencem à Technology/Operations baseline.

---

## OPTIONAL starvation versus REQUIRED starvation

Deve ser observável quando:

```text
REQUIRED elegível não executa por tempo excessivo
OPTIONAL foi priorizada por decisão humana
```

A decisão de prioridade deve ser correlacionável.

---

## Projection / Activity Center health

Deve ser possível detectar:

```text
Activity Center stale
missing ValueIncrement
wrong DeliveryTarget version
missing functional progress
duplicated current work
projection conformance mismatch
```

---

## Restart

Após restart:

```text
last known functional progress
current lifecycle state
continuity
```

devem permanecer disponíveis.

Heartbeat naturalmente volta a ser produzido por nova Execution/claim quando
aplicável.

---

## Alerts

Alertas devem ser acionáveis.

Exemplo:

```text
Execution alive
no functional progress for threshold
ValueIncrement IMPLEMENTING
WI IN_PROGRESS
continuity exists
```

Não tratar como falha automaticamente; sinalizar investigação/escalation conforme
policy.

---

## Invariantes

```text
heartbeat != operational activity
operational activity != functional progress
alive != progressing
dead-end detectable
zombie detectable
required starvation detectable
silent long-running activity detectable
```

---
