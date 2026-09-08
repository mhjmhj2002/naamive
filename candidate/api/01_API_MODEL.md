# NAAMIVE — API Model

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.2  
**Autoridade:** modelo arquitetural da API  
**Deriva de:** Contracts, State e Governance

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** superfície programática de commands, queries, authority, idempotência e erros

---

# 1. Objetivo

Definir princípios da superfície programática.

---

# 2. API não é source of truth

API transporta commands e queries.

Canonical state continua soberano.

---

# 3. Command endpoints

Recebem intenção.

Não recebem target state arbitrário quando a ação pode ser expressa por command
semântico.

---

# 4. Query endpoints

Exibem projections.

---

# 5. Action descriptors

API pode projetar actions autorizadas com descriptor canônico.

---

# 6. Versioning

Commands concorrentes devem carregar expected version quando necessário.

---

# 7. Idempotency

Commands materialmente repetíveis devem aceitar intention/idempotency identity.

---

# 8. Authentication

Protected API exige principal.

---

# 9. Authorization

Server valida authority.

---

# 10. Validation

Input schema não substitui business validation.

---

# 11. Error semantics

Erros devem distinguir:

- invalid input;
- unauthorized;
- forbidden;
- invalid state;
- stale version;
- blocker;
- dependency;
- conflict;
- reconciliation required;
- internal failure.

---

# 12. Correlation

Requests materialmente relevantes devem possuir correlation id.

---

# 13. Evidence upload/reference

API deve preservar origin e baseline.

---

# 14. Audit

Material commands geram audit trail.

---

# 15. Pagination

Read models grandes devem suportar paginação.

---

# 16. No hidden mutation

GET/query não deve mutar business state.

---

# 17. Invariants

```text
commands semantic
queries projection
server authoritative
idempotency supported
version conflicts explicit
```

---

# 18. Princípio final

API expõe capacidades do sistema.

Não inventa capacidades.
