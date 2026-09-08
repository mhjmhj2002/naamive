# NAAMIVE — Authority Contract

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** contrato normativo de prova de authority do NAAMIVE  
**Deriva de:** `../governance/02_AUTHORITY_POLICY.md` e `../governance/01_GOVERNANCE_MODEL.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** prova técnica e semântica de authority para ações governadas

---

# 1. Objetivo

Este contrato define a prova mínima de authority necessária para ações governadas.

---

# 2. Authority grant

Uma authority deve possuir, conforme aplicável:

- authority_id;
- principal_id;
- principal_type;
- action;
- scope;
- object constraints;
- issued_by;
- issued_at;
- valid_from;
- expires_at ou validity condition;
- `normative_baseline_ref`;
- baseline constraint;
- delegation_chain;
- revocation status;
- segregation constraints.

---

# 3. Principal verification

O principal deve ser autenticável por mecanismo confiável.

O contrato não define a tecnologia.

---

# 4. Action

Authority deve ser específica o suficiente para impedir extrapolação.

---

# 5. Scope

Scope deve ser verificável.

Exemplos:

- project_id;
- module_id;
- work_item_id;
- system scope;
- norm scope.

---

# 6. Object constraints

Authority pode ser limitada por:

- impact;
- environment;
- risk class;
- object type;
- lifecycle phase;
- decision type.

---

# 7. Validity

Authority deve estar válida no instante do uso.

---

# 8. Expiration

Authority expirada não pode ser usada.

---

# 9. Revocation

Authority revogada não pode ser usada.

---

# 10. Delegation chain

Toda delegação deve ser reconstruível.

---

# 11. Delegation bounds

Nenhum elo pode ampliar authority.

---

# 12. Subdelegation

Só existe quando permitida.

---

# 13. Normative Baseline

Authority material deve registrar `normative_baseline_ref` e ser revalidada
contra o certificado normativo canônico da instância no instante do uso.

`controlling_rule_ref` pode ser persistido quando necessário para explicar a
regra específica que sustentou ou limitou o grant.

---

# 14. Baseline constraint

Quando authority depende de baseline, o uso deve provar compatibilidade.

---

# 15. Segregation

O contrato deve permitir verificar:

- author != auditor;
- requester != exception authority;
- outras regras de segregation.

---

# 16. Conflict of interest

Quando policy exigir, principal conflitado deve ser inelegível.

---

# 17. Human authority

Gate humano exige principal_type compatível.

Agent não pode satisfazer apenas alterando metadata.

---

# 18. Agent authority

Agent pode possuir grants próprios.

---

# 19. Service authority

Service pode executar operações técnicas em escopo explícito.

---

# 20. Approval proof

Approval material deve registrar:

- authority_id;
- principal;
- object;
- baseline;
- decision;
- timestamp;
- `normative_baseline_ref`.

---

# 21. Risk acceptance proof

Deve registrar authority específica para risco.

---

# 22. Exception proof

Deve registrar authority específica para exception.

---

# 23. Cancellation proof

Deve registrar authority específica para cancelamento.

---

# 24. Delivery proof

Delivery acceptance deve registrar authority de negócio adequada.

---

# 25. Ratification proof

Norm ratification deve registrar authority normativa.

---

# 26. Revalidation

Antes do uso, verificar:

- principal ativo;
- authority ativa;
- scope;
- action;
- object;
- baseline;
- norm;
- revocation;
- segregation;
- conflict constraints.

---

# 27. Denial

Se qualquer condição falhar:

```text
DENY
```

---

# 28. Denial não é dead-end

A negação deve produzir continuidade quando a ação era necessária:

- escalation;
- alternate authority;
- re-delegation;
- wait;
- blocker.

---

# 29. Idempotência

Repetir mesma approval intent não deve criar decisões duplicadas.

---

# 30. Concurrency

Decisões concorrentes devem operar sobre expected version/generation.

---

# 31. Projection

Capabilities projetadas devem derivar de authority canônica atual.

---

# 32. UI

Botão visível não é prova de authority.

---

# 33. Audit trail

Deve ser possível reconstruir:

- grant;
- use;
- delegation;
- revocation;
- decision;
- principal;
- scope;
- baseline;
- norm.

---

# 34. Invariantes

```text
authority possui principal
authority possui action
authority possui scope
revoked authority não decide
expired authority não decide
delegation não amplia authority
human gate não é satisfeito por agent
```

---

# 35. Proibições

Não é permitido:

- self-declared role;
- authority sem issuer/origin;
- authority sem scope;
- authority revogada reutilizada;
- client afirmar privilege;
- auditor usar audit grant como delivery approval;
- agent assumir human grant.

---

# 36. Itens deixados para implementação

Não define:

- JWT;
- OAuth;
- session;
- RBAC table;
- ACL;
- ABAC engine;
- cryptographic token;
- identity provider.

---

# 37. Princípio final

Authority Contract não pergunta:

```text
"o ator consegue executar?"
```

Pergunta:

```text
"o ator consegue provar que pode decidir esta ação, neste objeto, agora?"
```
