# NAAMIVE — Identity and Access Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.2  
**Autoridade:** modelo técnico de identidade e acesso  
**Deriva de:** Authority Policy e Authority Contract

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** identidade, autenticação, autorização técnica, grants, scope e revogação

---

# 1. Objetivo

Definir requisitos técnicos para provar principal e authority.

---

# 2. Authentication

Authentication prova identidade.

---

# 3. Authorization

Authorization prova capability contextual.

---

# 4. Separation

```text
authenticated != authorized
```

---

# 5. Principal identity

Human, agent, service e executor devem possuir identidade distinta.

---

# 6. Session

Session representa contexto autenticado, não authority permanente.

---

# 7. Grants

Grants são derivados da fonte canônica de authority.

---

# 8. Scope enforcement

Toda protected action valida scope server-side.

---

# 9. No client trust

Client claims não são prova.

---

# 10. Service-to-service

Serviços devem autenticar identidade própria.

---

# 11. Agent identity

Agent principal deve ser rastreável à configuração/runtime autorizado.

---

# 12. Delegation

Delegation deve ser explicitamente representada.

---

# 13. Revocation

Revocation deve produzir efeito em tempo compatível com risco.

---

# 14. Least privilege

Principals recebem apenas capabilities necessárias.

---

# 15. Human gate

Agent/service credential não satisfaz human gate.

---

# 16. Audit

Security decisions relevantes devem ser auditáveis.

---

# 17. Denial

Authorization denial não vaza dados sensíveis desnecessários.

---

# 18. Break-glass

Acesso emergencial, se existir, é exception governada com audit reforçado.

---

# 19. Invariants

```text
identity verified
authorization server-side
scope enforced
revocation effective
agent != human
```

---

# 20. Princípio final

Identidade diz quem é.

Authority diz o que pode fazer agora.
