# NAAMIVE — Observability Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `observability/01_OBSERVABILITY_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Adicionar sinais necessários para distinguir:

```text
alive
operationally active
functional progress
```

em ValueIncrement/Internal Phase/Work Item/Execution.

---

# 2. Três relógios

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

# 3. ALIVE não significa PROGRESS

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

# 4. Long-running activity

Toda atividade potencialmente longa deve permanecer compreensível.

É proibido depender apenas de:

```text
spinner
RUNNING
```

sem contexto funcional suficiente.

---

# 5. Functional progress events

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

# 6. Stalled progress

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

# 7. OPTIONAL starvation versus REQUIRED starvation

Deve ser observável quando:

```text
REQUIRED elegível não executa por tempo excessivo
OPTIONAL foi priorizada por decisão humana
```

A decisão de prioridade deve ser correlacionável.

---

# 8. Projection / Activity Center health

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

# 9. Restart

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

# 10. Alerts

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

# 11. Invariantes

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

# 12. Consolidação

Este delta deve ser incorporado à revisão final de
`observability/01_OBSERVABILITY_MODEL.md`.
