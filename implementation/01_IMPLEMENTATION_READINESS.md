# NAAMIVE — Implementation Readiness

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** critério de liberação para implementação  
**Deriva de:** toda documentação normativa e arquitetural

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** critérios de liberação documental e normativa antes do início da implementação

---

# 1. Objetivo

Definir quando o NAAMIVE pode começar a ser implementado.

---

# 2. Regra central

Código não começa porque a documentação "parece boa".

Começa quando a baseline documental foi auditada e ratificada.

---

# 3. Pré-condições

Antes de implementar:

- Constituição ratificada;
- Lifecycle ratificado;
- Governance ratificada;
- Contracts ratificados;
- State models aprovados;
- Architecture models aprovados;
- Orchestration models aprovados;
- Security models aprovados;
- API/UI models aprovados;
- Observability models aprovados;
- audit global sem P0/P1 aberto;
- uma Normative Baseline ratificada, com certificado imutável contendo membership
  completo, revisões/digests, escopo, precedência, vigência e supersessão;
- disposição explícita dos P2 remanescentes;
- toda instância/fatia inicial vinculável ao `normative_baseline_ref` efetivo.

---

# 4. P2

P2 pode ser aceito somente quando não obrigar implementação a inventar lei.

---

# 5. Technology baseline

Primeira fatia de código exige Technology Baseline aprovada.

---

# 6. MVP boundary

Escopo inicial deve ser explicitamente limitado.

---

# 7. No legacy dependency

Legacy archived não é requisito de compatibilidade salvo decisão governada.

---

# 8. Definition of Ready da primeira slice

A primeira transition implementada deve possuir:

- lifecycle;
- transition contract;
- authority;
- persistence;
- projection;
- API;
- UI/agent action se aplicável;
- tests;
- observability;
- recovery behavior.

---

# 9. Audit before code

Auditoria final da documentação deve tentar quebrar o modelo inteiro.

---

# 10. Ratification

Humano autorizado ratifica o corpus e produz o certificado imutável da
Normative Baseline efetiva. O certificado é a prova canônica de **quais revisões
exatas** governam a implementação.

---

# 11. Freeze

Freeze significa que o certificado da Normative Baseline não é alterado em
place. Mudança normativa posterior gera nova baseline e, para instâncias ativas,
migração explícita source → target quando aplicável.

---

# 12. Princípio final

Implementação começa quando não é mais necessário inventar regra para escrever
o primeiro teste.
