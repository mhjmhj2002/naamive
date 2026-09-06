# NAAMIVE — Command and Query Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** modelo de commands e queries  
**Deriva de:** API Model e Transition Contract

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** separação e semântica de commands, queries, intention, version e normative context

---

# 1. Objetivo

Separar intenção de mudança de leitura de estado.

---

# 2. Command

Command expressa:

```text
faça esta ação governada
```

---

# 3. Query

Query expressa:

```text
mostre a verdade/projeção atual
```

---

# 4. Command fields conceituais

- command_id;
- intention_id;
- principal;
- object;
- expected_version;
- baseline;
- `observed_normative_baseline_ref` quando o command nasce de uma projection;
- payload;
- correlation;
- causation.

---

# 5. Command handler

Deve:

- load canonical;
- resolver server-side o `normative_baseline_ref` governante;
- comparar eventual `observed_normative_baseline_ref` apenas como proteção contra
  staleness, nunca como seletor de norma;
- validate contract;
- validate authority;
- validate gate/findings;
- apply transition;
- persist history/continuity/handoff;
- return authoritative result.

---

# 6. Query handler

Lê projection/canonical conforme necessidade.

---

# 7. No command from state string

Preferir:

```text
AcceptNeed
PauseProject
CancelWorkItem
ApproveDelivery
```

a:

```text
SetState("ACCEPTED")
```

---

# 8. Command idempotency

Same intention retorna same authoritative outcome.

---

# 9. Async command

Pode retornar accepted/pending com tracking.

---

# 10. Sync command

Pode completar no request quando atomicidade e duração forem adequadas.

---

# 11. Human command

Decision humana usa mesmo contract de authority.

---

# 12. Agent command

Agent usa principal próprio.

---

# 13. Invariants

```text
command carries intent
query does not mutate
set-state generic forbidden
```

---

# 14. Princípio final

Commands falam a linguagem da intenção.

Queries falam a linguagem da observação.
