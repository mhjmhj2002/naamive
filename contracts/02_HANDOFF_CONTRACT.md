# NAAMIVE — Handoff Contract

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** contrato normativo de handoffs do NAAMIVE  
**Deriva de:** `../00_NAAMIVE_CONSTITUTION.md`, `../lifecycle/01_LIFECYCLE_MODEL.md` e `../governance/01_GOVERNANCE_MODEL.md`

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** handoffs governados e transferência durável de responsabilidade

---

# 1. Objetivo

Este contrato define o que significa transferir responsabilidade de forma
governada no NAAMIVE.

Handoff existe quando uma origem entrega contexto, responsabilidade, resultado
ou continuidade para um destino.

---

# 2. Princípio

```text
"enviei"
≠
"o destino assumiu"
```

Handoff só é válido quando a responsabilidade foi transferida de modo durável,
rastreável e recuperável.

---

# 3. Casos de handoff

Incluem:

- Need → Project;
- Project → Module;
- Project/Module → Work Item;
- Work Item → Execution;
- Execution → Work Item;
- Module → Project;
- Review → Audit;
- Audit → Authority;
- Validation → Delivery;
- Delivery decision → Delivered;
- recovery/reconciliation handoffs.

---

# 4. Elementos obrigatórios

Todo handoff material deve possuir, conforme aplicável:

- handoff_id;
- source;
- destination;
- object;
- intent_id;
- baseline;
- `normative_baseline_ref`;
- evidence_refs;
- finding_refs;
- authority_context;
- expected_destination_action;
- acceptance_condition;
- created_at;
- accepted_at;
- status;
- causation_id;
- correlation_id.

---

# 5. Source

A origem deve provar que possui authority para produzir o handoff.

---

# 6. Destination

O destino deve ser identificável.

Não é válido:

```text
"alguém depois pega"
```

---

# 7. Responsibility

Todo handoff deve dizer qual responsabilidade está sendo transferida.

---

# 8. Baseline

O handoff deve identificar Business Baseline/escopo e `normative_baseline_ref`.

Destino não pode assumir responsabilidade por contexto materialmente diferente
sem revalidação. Um handoff pendente não migra para nova Normative Baseline por
inferência: precisa ser `KEEP`, revalidado, superseded, revoked ou reconciled
conforme a migração governada.

---

# 9. Evidence package

O handoff deve carregar ou referenciar evidence suficiente para o próximo
estágio.

---

# 10. Findings

Findings relevantes devem acompanhar o handoff.

É proibido esconder blockers no boundary.

---

# 11. Authority context

Destino precisa saber qual authority é necessária para continuar.

---

# 12. Acceptance

Handoff só é considerado concluído quando:

- destino aceita explicitamente; ou
- mecanismo durável garante que a responsabilidade será retomada e processada
  pelo destino correto.

---

# 13. Pending handoff

Enquanto não aceito, o handoff deve permanecer observável.

---

# 14. Handoff sem destino

É inconsistência de continuidade.

---

# 15. Handoff perdido

Se origem registrou intenção mas destino não assumiu:

```text
recovery
```

deve ser possível sem duplicar a responsabilidade.

---

# 16. Idempotência

Repetir o mesmo handoff não pode criar múltiplas responsabilidades equivalentes.

---

# 17. Exactly-once lógico

Não é necessário exigir transporte físico exactly-once.

É necessário garantir:

```text
um único resultado autoritativo de responsabilidade
```

para a mesma intenção.

---

# 18. Restart

Restart entre origem e destino não pode perder handoff.

---

# 19. Concorrência

Dois destinos concorrentes só podem assumir quando a política permitir.

Caso contrário, apenas um deve se tornar autoritativo.

---

# 20. Handoff e transition

Quando transition depende de handoff, a operação deve ser logicamente atômica ou
recuperável.

---

# 21. Need → Project

Exige:

- Need ACCEPTED;
- baseline da Need;
- decision;
- authority;
- project creation intent;
- Project idempotente.

---

# 22. Project → Module

Exige:

- Project válido;
- responsabilidade de negócio;
- baseline arquitetural;
- ownership;
- intenção.

---

# 23. Project/Module → Work Item

Exige:

- owner;
- objective;
- scope;
- criteria;
- dependencies;
- impact;
- baseline.

---

# 24. Work Item → Execution

Exige:

- Work Item elegível;
- intent;
- baseline;
- authority;
- execution context;
- expected output.

---

# 25. Execution → Work Item

Exige:

- execution result;
- evidence;
- effect status;
- causal linkage;
- authority status;
- technical outcome.

---

# 26. Module → Project

Ao integrar, Module entrega:

- baseline;
- evidence;
- findings;
- risks;
- dependency satisfaction;
- integration result.

---

# 27. Review → Audit

Audit recebe:

- proposal;
- baseline;
- reviews;
- evidence;
- open findings;
- decision target.

---

# 28. Audit → Authority

Authority recebe:

- audit result;
- findings;
- residual risk;
- exceptions;
- evidence;
- recommendation;
- baseline.

---

# 29. Validation → Delivery decision

Deve existir pacote de readiness.

---

# 30. Delivery → Delivered

Após aceite, o Project só entra em DELIVERED quando o registro de Delivery e o
vínculo causal estiverem duráveis.

---

# 31. Rejeição

Handoff pode ser rejeitado pelo destino.

Rejeição deve produzir continuidade de retorno/rework.

---

# 32. Returned handoff

Destino pode devolver quando package é incompleto ou baseline inválido.

---

# 33. Expiração

Handoff material pode expirar quando baseline muda.

---

# 34. Supersession

Novo handoff pode superseder anterior.

O antigo permanece histórico.

---

# 35. Cancellation

Cancelamento invalida handoffs pendentes incompatíveis.

---

# 36. Stale handoff

Handoff baseado em baseline antigo não pode ser aceito sem revalidação.

---

# 37. Recovery

Recovery de handoff não reenvia cegamente.

Primeiro deve descobrir se destino já aceitou.

---

# 38. Reconciliation

Quando acceptance é incerta:

```text
reconcile before duplicate transfer
```

---

# 39. Projection

Handoffs pendentes devem ser observáveis para principals responsáveis.

---

# 40. Audit trail

Deve ser possível responder:

- source;
- destination;
- object;
- responsibility;
- baseline;
- evidence;
- findings;
- authority;
- created;
- accepted;
- result.

---

# 41. Invariantes

```text
handoff possui source
handoff possui destination
handoff possui responsibility
handoff material possui baseline
handoff concluído possui acceptance
handoff perdido é recuperável
retry não duplica responsibility
```

---

# 42. Proibições

Não é permitido:

- origem considerar concluído apenas por enviar mensagem;
- handoff sem destination;
- handoff sem baseline material;
- esconder findings;
- aceitar handoff stale sem revalidação;
- retry criar dupla responsabilidade.

---

# 43. Itens deixados para implementação

Não define:

- queue;
- outbox;
- inbox;
- Kafka;
- HTTP;
- transaction boundary;
- storage schema.

---

# 44. Princípio final

Handoff não é transporte.

É transferência governada de responsabilidade.
