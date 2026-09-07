# NAAMIVE — Continuity and Recovery Contract

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** contrato normativo de continuity, recovery e reconciliation do NAAMIVE  
**Deriva de:** `../00_NAAMIVE_CONSTITUTION.md`, `../lifecycle/01_LIFECYCLE_MODEL.md` e `../lifecycle/06_EXECUTION_LIFECYCLE.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** continuity, failure, retry, recovery, reconciliation e compensation

---

# 1. Objetivo

Este contrato define como o NAAMIVE representa continuidade acionável e como
trata falhas, recovery, reconciliation e compensation.

---

# 2. Regra central

Nenhum recurso ativo pode existir sem continuação persistida e acionável.

---

# 3. Continuity record

Toda continuidade ativa deve possuir, conforme aplicável:

- resource;
- intent;
- `cause_ref`;
- continuity_type;
- owner;
- principal/authority;
- next_action ou exit_condition;
- preconditions;
- fallback;
- escalation;
- cadence/deadline;
- baseline;
- `normative_baseline_ref`;
- correlation.

`cause_ref` deve identificar a causa governante da continuity — por exemplo
Finding, dependency, failure, decision ou Inconsistency. `intent` descreve o que
deve continuar; não substitui a causa.

---

# 4. Tipos válidos

```text
AUTOMATIC_WORK
HUMAN_ACTION
GOVERNED_WAIT
GOVERNED_BLOCK
RECOVERY
RECONCILIATION
```

---

# 5. AUTOMATIC_WORK

Existe trabalho elegível e executor possível.

---

# 6. HUMAN_ACTION

Existe principal capaz de agir, authority e ação projetada.

---

# 7. GOVERNED_WAIT

Depende de fato futuro conhecido.

Deve possuir exit_condition e cadence/escalation.

---

# 8. GOVERNED_BLOCK

Existe impedimento conhecido, owner e saída.

---

# 9. RECOVERY

Existe plano governado de retomada após falha terminal ou handoff quebrado.

---

# 10. RECONCILIATION

Existe dúvida factual que precisa ser resolvida antes de repetir ou consolidar.

---

# 11. Continuidade nominal inválida

Labels como:

```text
WAITING
BLOCKED
RECOVERING
```

não satisfazem contrato sem campos acionáveis.

---

# 12. Dead-end

Recurso ativo sem continuity record válido é inconsistência.

---

# 13. Detection

A implementação futura deve permitir detectar dead-end. Toda discrepância
material detectada deve abrir ou vincular uma `Inconsistency` canônica, com
`cause_ref`, owner, baseline, `normative_baseline_ref`, treatment e escalation.

Inconsistency não é substituída pelo próprio continuity record: continuity é a
rota para tratar a discrepância.

---

# 14. Escalation

Continuidade sem progresso por tempo/cadência definida deve escalar quando
aplicável.

---

# 15. Fail-closed

Fail-closed deve materializar continuidade.

Não basta recusar ação e esquecer o recurso.

---

# 16. Failure record

Falha material deve registrar:

- execution;
- intent;
- cause;
- known effects;
- unknown effects;
- baseline;
- error class;
- retryability;
- timestamp.

---

# 17. Retry

Retry é permitido somente quando repetir é seguro.

---

# 18. Retry preconditions

- intent válida;
- authority válida;
- baseline atual;
- efeito anterior conhecido;
- policy permite;
- attempt limit permite.

---

# 19. Recovery

Recovery cria nova Execution causal.

Nunca ressuscita FAILED.

---

# 20. Recovery record

Deve possuir:

- failed_execution;
- new_execution;
- cause;
- correction;
- current authority;
- baseline;
- effect certainty;
- approval quando aplicável.

---

# 21. Reconciliation trigger

Reconciliation é obrigatória quando:

- efeito externo é incerto;
- handoff acceptance é incerta;
- estado canônico diverge do observado;
- stale executor pode ter produzido efeito;
- persistência falhou após efeito.

---

# 22. Reconciliation outcomes

```text
NO_EFFECT
EFFECT_CONFIRMED
PARTIAL_EFFECT
WRONG_EFFECT
UNKNOWN
```

---

# 23. NO_EFFECT

Pode permitir retry/recovery.

---

# 24. EFFECT_CONFIRMED

Pode permitir consolidar resultado se authority/causalidade ainda puderem ser
provadas.

---

# 25. PARTIAL_EFFECT

Pode exigir recovery, rework ou compensation.

---

# 26. WRONG_EFFECT

Exige tratamento governado e possivelmente compensation.

---

# 27. UNKNOWN

Mantém blocker/escalation.

Não autoriza retry cego.

---

# 28. Compensation

Compensation cria novo efeito governado.

Não apaga o anterior.

---

# 29. Cancellation

Cancelamento deve:

- revogar future authority;
- tratar in-flight work;
- registrar effects;
- iniciar reconciliation quando necessário.

---

# 30. Stale execution

Execution stale não pode publicar resultado autoritativo.

---

# 31. Expired execution

Execution expired não pode recuperar authority retroativamente.

---

# 32. Result late

Resultado tardio é historical evidence.

Só afeta estado após reconciliation.

---

# 33. Baseline change

Mudança material deve revalidar continuity e recovery plans.

---

# 34. Parent cancellation

Cancelamento de pai deve avaliar descendentes:

```text
REVOKE
CANCEL
RECONCILE
COMPENSATE
KEEP_FOR_SAFE_SHUTDOWN
```

conforme caso.

---

# 35. Handoff recovery

Antes de repetir handoff, descobrir se destination já assumiu.

---

# 36. Idempotência

Recovery/reconciliation commands devem ser idempotentes por intent.

---

# 37. Observabilidade

Deve ser possível visualizar:

- continuity_type;
- owner;
- next step;
- age;
- escalation;
- recovery state;
- reconciliation state.

---

# 38. Invariantes

```text
active resource possui continuity
continuity possui cause_ref
material inconsistency possui registro canônico
FAILED não ressuscita
unknown effect exige reconciliation
stale executor não publica
cancel revoga future authority
recovery preserva causalidade
```

---

# 39. Proibições

Não é permitido:

- WAITING sem exit;
- BLOCKED sem owner;
- retry cego com efeito incerto;
- FAILED → RUNNING;
- zombie executor publicar;
- cancelamento deixar authority futura;
- recovery sem baseline atual.

---

# 40. Itens deixados para implementação

Não define:

- retry count;
- backoff;
- queue;
- scheduler;
- heartbeat interval;
- lease duration;
- storage schema.

---

# 41. Princípio final

Continuity Contract garante que o sistema sempre saiba:

```text
o que acontece depois
```

Recovery Contract garante que falhar não destrua essa resposta.
