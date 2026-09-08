# NAAMIVE — Legacy Reference and Reuse Policy

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.2  
**Autoridade:** política de consulta e eventual reaproveitamento do legado arquivado  
**Deriva de:** decisão de lifecycle reboot

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** consulta, reaproveitamento e limites de autoridade do legado arquivado

---

# 1. Objetivo

Impedir que o sistema anterior volte a se tornar norma por acidente.

---

# 2. Legacy location

O legado arquivado permanece como referência histórica.

---

# 3. Authority

Legacy possui:

```text
evidence value
```

e não:

```text
normative authority
```

---

# 4. Reuse

Código ou ideia antiga pode ser reutilizada apenas após validar conformidade com
a nova baseline.

---

# 5. No compatibility default

Compatibilidade não é requisito por padrão.

---

# 6. No copy-paste law

Não copiar:

- state machine antiga;
- STATUS.md authority;
- deprecated CLI;
- workflow assumptions;
- old gate semantics;

sem derivação atual.

---

# 7. Useful historical evidence

Legacy pode revelar:

- failure modes;
- data patterns;
- operational needs;
- UI expectations;
- test scenarios.

---

# 8. Security

Secrets/config antigos não devem ser restaurados cegamente.

---

# 9. Migration

Migração de dados só existe quando futuro Project/decision a definir.

---

# 10. Backup retention

Backup não deve ser apagado até nova versão ser formalmente considerada
substituta suficiente e decisão humana autorizar descarte.

---

# 11. Audit

Durante auditoria, legado pode ser usado para perguntar:

```text
o novo desenho evita falhas já observadas?
```

---

# 12. Princípio final

O legado pode ensinar.

Não pode mandar.
