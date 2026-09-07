# NAAMIVE — Agent Execution Model

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** modelo conceitual de execução por agentes  
**Deriva de:** Execution Lifecycle, Governance e Orchestration

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** participação governada de agents, contexto, tools, independência e execução

---

# 1. Objetivo

Definir como agents participam do NAAMIVE sem receber autoridade implícita.

---

# 2. Agent principal

Cada agent execution deve possuir principal identificável.

---

# 3. Agent role

Pode atuar como:

- author;
- reviewer;
- auditor;
- executor;
- recommender.

---

# 4. Role is not authority

Role descreve função.

Authority continua separada.

---

# 5. Context package

Agent deve receber contexto versionado:

- objective;
- scope;
- baseline;
- `normative_baseline_ref` server-derived;
- `controlling_rule_refs` quando necessários para a tarefa;
- evidence;
- constraints;
- authority;
- expected output;
- prohibited actions.

---

# 6. Context immutability

Durante uma execution, contexto base deve ser identificável.

Mudança material requer stale/restart/revalidation. Mudança da Normative
Baseline da instância também invalida o contexto até migração/revalidation
explícita. Agent nunca assume que `latest` é a norma aplicável.

---

# 7. Prompt is not law

Prompt operacional deriva das normas.

Não pode redefinir lifecycle.

---

# 8. Tool authority

Agent só usa tools explicitamente autorizadas.

---

# 9. Write isolation

Agent de audit não deve possuir write capability quando independência exigir
read-only.

---

# 10. Human gates

Agent não responde por humano.

---

# 11. Evidence

Agent deve produzir evidence suficiente para sua atividade.

---

# 12. Auditability

Registrar:

- model/provider quando relevante;
- principal;
- context version;
- tool calls relevantes;
- output;
- limitations;
- result.

---

# 13. Non-determinism

Outputs probabilísticos não podem ser tratados como prova única em decisão
crítica sem controls.

---

# 14. Retry

Retry cria nova Execution attempt.

---

# 15. Same agent independence

Nova sessão com mesmo principal não cria auditor independente.

---

# 16. Model changes

Troca de modelo pode alterar risk e deve ser tratada por Technology Baseline.

---

# 17. Cost controls

Policies podem limitar:

- reasoning level;
- attempts;
- model class;
- context size.

Cost não pode justificar bypass de law.

---

# 18. Failure

Tool/model failure segue Execution Lifecycle.

---

# 19. Hallucination defense

Agent deve operar fail-closed quando evidence/material context for insuficiente.

---

# 20. No silent invention

Decisão material ausente vira finding/decision request.

---

# 21. Secret handling

Secrets não devem entrar em prompt sem necessidade e proteção adequada.

---

# 22. External side effects

Agent não chama side effect fora de authority/Execution contract.

---

# 23. Invariants

```text
agent role != authority
prompt != law
agent context pins normative_baseline_ref
same principal != independent
material decision missing => escalate
```

---

# 24. Princípio final

Agent é participante governado do sistema.

Nunca é soberano.
