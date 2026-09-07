# NAAMIVE — Secrets and Trust Boundary Model

**Status:** RATIFIED  
**Versão:** 0.2  
**Autoridade:** modelo técnico de secrets e fronteiras de confiança  
**Deriva de:** Runtime Architecture e Identity Model

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** secrets, credentials, trust boundaries, validação e exposição mínima

---

# 1. Objetivo

Definir requisitos para secrets, credentials e dados cruzando boundaries.

---

# 2. Secrets

Secrets não são documentação.

Não devem ser commitados em repositório.

---

# 3. Secret classes

Podem incluir:

- API keys;
- DB credentials;
- signing keys;
- OAuth secrets;
- agent provider keys;
- external-system credentials.

---

# 4. Storage

Secrets devem usar secret store apropriado à Technology Baseline.

---

# 5. Rotation

Secrets materialmente sensíveis devem ser rotacionáveis.

---

# 6. Least exposure

Só componente necessário recebe secret.

---

# 7. Prompt safety

Secret não entra em prompt de agent salvo necessidade explícita e controlada.

---

# 8. Logs

Logs não devem expor secret.

---

# 9. Trust boundaries

Devem ser identificados:

- browser → API;
- API → persistence;
- orchestrator → worker;
- worker → agent provider;
- worker → external system;
- system → human.

---

# 10. Validation

Todo input que cruza boundary é não confiável por padrão.

---

# 11. External content

Conteúdo externo não ganha authority por ser retornado por tool/provider.

---

# 12. File handling

Arquivos devem ser tratados conforme origem, type e size.

---

# 13. Data classification

Dados sensíveis devem possuir controles proporcionais.

---

# 14. Invariants

```text
no secrets in repo
no secrets in logs
least exposure
boundary validation
```

---

# 15. Princípio final

Trust é concedida explicitamente.

Nunca herdada por conveniência.
