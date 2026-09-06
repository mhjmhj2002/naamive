# NAAMIVE — Transaction and Consistency Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.2  
**Autoridade:** modelo arquitetural de atomicidade e consistência  
**Deriva de:** Transition, Handoff e Persistence Contracts

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** atomicidade, consistência, concorrência, fencing, idempotência e efeitos externos

---

# 1. Objetivo

Definir garantias de consistência necessárias ao runtime.

---

# 2. Consistência forte local

Mudanças de state, version e history da mesma aggregate boundary devem ser
atomicamente consistentes quando possível.

---

# 3. Logical transaction

Quando múltiplos stores/sistemas estiverem envolvidos, usar transação lógica
durável.

---

# 4. Outbox/inbox equivalence

A tecnologia pode usar outbox/inbox ou mecanismo equivalente.

O requisito é:

```text
state commit não perde handoff
handoff replay não duplica efeito
```

---

# 5. Optimistic concurrency

Toda command sobre recurso versionado deve validar expected version.

---

# 6. Fencing

Execução concorrente usa generation/fencing.

---

# 7. Idempotency

Toda operação material repetível possui intention key.

---

# 8. Exactly-once lógico

Não exigir exactly-once transport.

Exigir um único resultado autoritativo.

---

# 9. Read-your-writes

Fluxos humanos podem precisar enxergar imediatamente decisão recém tomada.

A tecnologia deve garantir UX coerente.

---

# 10. Projection eventual

Read models podem ser eventual-consistent.

Commands sempre revalidam canonical.

---

# 11. External effects

Efeito externo sem transação distribuída exige:

- idempotency;
- effect observation;
- reconciliation;
- compensation quando aplicável.

---

# 12. Timeout

Timeout não determina outcome.

---

# 13. Crash points

Arquitetura deve testar crash:

- before commit;
- after state commit;
- before publish;
- after external effect;
- before result persistence;
- after result persistence.

---

# 14. Restore

Restore não deve quebrar versions/idempotency.

---

# 15. Ordering

Quando ordering importa, deve ser explicitamente protegido.

---

# 16. Split brain

Dois writers não podem governar mesmo resource sem conflict detection.

---

# 17. Invariants

```text
no lost update
no lost handoff
no duplicate authoritative effect
stale writer loses
timeout does not invent outcome
```

---

# 18. Princípio final

Consistência não significa tornar tudo síncrono.

Significa nunca perder a capacidade de provar qual resultado é autoritativo.
