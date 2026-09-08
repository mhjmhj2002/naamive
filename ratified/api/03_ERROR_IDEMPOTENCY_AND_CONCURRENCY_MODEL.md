# NAAMIVE — Error, Idempotency and Concurrency Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo de erros, idempotência e concorrência de API  
**Deriva de:** Transition Contract e Transaction Model

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** erros, idempotência, concorrência, retry e unknown outcome na API

---

# 1. Objetivo

Definir respostas coerentes para conflito, repetição e falha.

---

# 2. Error classes

Conceitualmente:

```text
VALIDATION_ERROR
AUTHENTICATION_REQUIRED
AUTHORITY_DENIED
INVALID_STATE
STALE_VERSION
BLOCKED
DEPENDENCY_UNSATISFIED
CONFLICT
RECONCILIATION_REQUIRED
RATE_LIMITED
INTERNAL_ERROR
```

---

# 3. Error carries continuity

Quando possível, erro governado deve indicar próxima ação segura.

---

# 4. Idempotency key

Material command deve possuir intention identity persistente.

---

# 5. Same payload, different intent

Pode gerar nova operação quando semanticamente nova.

---

# 6. Same intent, same outcome

Não duplica efeito.

---

# 7. Version conflict

Retorna conflito explícito.

Client deve refresh/re-evaluate.

---

# 8. Retryable errors

Somente classes seguras para retry automático.

---

# 9. Unknown outcome

Não marcar retryable cegamente.

Retornar reconciliation required quando aplicável.

---

# 10. Rate limiting

Pode proteger sistema sem redefinir lifecycle.

---

# 11. Invariants

```text
stale write rejected
same intent deduplicated
unknown outcome not blindly retried
```

---

# 12. Princípio final

Erro também faz parte do contrato.

Falhar de forma ambígua é pior que falhar explicitamente.

---

# Stale command fencing

Commands materiais devem carregar contexto/version/watermark suficiente para detectar intenção stale.

```text
stale command
→ reject
→ refresh/refetch
→ re-decide when necessary
```

Resultado de executor stale/expired não pode publicar estado autoritativo.
