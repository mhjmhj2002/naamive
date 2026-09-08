# NAAMIVE — Risk Policy

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** política normativa de risco do NAAMIVE  
**Deriva de:** `01_GOVERNANCE_MODEL.md`  
**Normas superiores:** `../00_NAAMIVE_CONSTITUTION.md` e `../lifecycle/01_LIFECYCLE_MODEL.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** identificação, avaliação, tratamento, aceitação, revalidação e escalonamento de riscos

---

# 1. Objetivo

Esta policy define como riscos são identificados, avaliados, mitigados, aceitos,
reavaliados e ligados a decisões governadas.

---

# 2. Princípio

Risco material não pode permanecer implícito.

Deve ser:

- identificado;
- descrito;
- atribuído;
- avaliado;
- tratado;
- aceito ou mitigado;
- rastreável.

---

# 3. Risk

Risk representa possibilidade de evento ou condição adversa afetar objetivo,
qualidade, segurança, continuidade, operação ou valor.

---

# 4. Dimensões mínimas

Risk deve considerar, conforme aplicável:

- likelihood;
- impact;
- detectability;
- reversibility;
- exposure;
- affected scope.

A fórmula física fica para policy operacional futura.

---

# 5. Classes de impacto

Risco pode contribuir para classificação:

```text
TRIVIAL
MATERIAL
CRÍTICA
```

Mas risk level e change impact não são necessariamente o mesmo atributo físico.

---

# 6. Owner

Todo risk material possui owner.

Risk sem owner é inconsistência de governança.

---

# 7. Identificação

Riscos podem ser identificados por:

- author;
- reviewer;
- auditor;
- authority;
- agent;
- executor;
- monitoramento;
- incident.

---

# 8. Tratamentos

Risk pode ser:

```text
AVOID
MITIGATE
TRANSFER
ACCEPT
MONITOR
```

Outros termos podem ser derivados, preservando semântica.

---

# 9. AVOID

Muda decisão para eliminar exposição.

---

# 10. MITIGATE

Reduz likelihood, impact ou exposure.

---

# 11. TRANSFER

Move parte da responsabilidade/exposição para terceiro, sem apagar risco
residual.

---

# 12. ACCEPT

Autoridade decide conscientemente conviver com risco residual.

---

# 13. MONITOR

Risk permanece sob observação com trigger explícito.

---

# 14. Risk acceptance

Aceitação de risco exige:

- authority;
- scope;
- baseline;
- `normative_baseline_ref`;
- description;
- residual risk;
- mitigation existente;
- validity;
- rationale.

---

# 15. Limite de authority

Nem toda authority pode aceitar qualquer risco.

Policies derivadas podem separar:

- product risk;
- security risk;
- operational risk;
- compliance risk;
- data risk;
- financial risk.

---

# 16. Risk acceptance != exception

Aceitar risco não significa permissão para violar gate.

---

# 17. Risk e blocker

Se finding é BLOCKING, risk acceptance isolada não libera avanço.

---

# 18. Risk e exception

Exception pode incluir risk acceptance, mas são decisões distintas.

---

# 19. Risk residual

Risk residual deve permanecer visível após mitigation.

---

# 20. Risk e Delivery

Delivery deve considerar riscos residuais relevantes.

---

# 21. Risk e baseline

Risk material deve referenciar baseline ou scope.

Mudança material pode:

- criar novo risk;
- alterar risk;
- invalidar acceptance anterior.

---

# 22. Revalidação

Risk acceptance deve ser revalidada quando:

- baseline muda;
- architecture muda;
- dependency muda;
- environment muda;
- likelihood/impact muda;
- norma muda;
- mitigation falha;
- prazo expira.

---

# 23. Expiração

Aceitação de risco pode expirar.

Risk crítico não deve ser aceito indefinidamente sem reavaliação quando contexto
puder mudar.

---

# 24. Trigger

Risk monitorado deve possuir trigger ou condição de reavaliação.

---

# 25. Escalonamento

Risk acima da authority atual deve ser escalado.

---

# 26. Risk crítico

Risk CRÍTICA pode exigir:

- review especializado;
- audit independente;
- authority humana;
- mitigation obrigatória;
- contingency;
- monitoring.

---

# 27. Contingency

Risk material pode exigir plano de contingência quando mitigation não elimina
exposição.

---

# 28. Risk e cancelamento

Cancelamento pode ser tratamento legítimo de risco quando exposição se torna
inaceitável.

---

# 29. Risk e pause

Pause pode ser usada enquanto risk é reavaliado.

---

# 30. Risk e recovery

Recovery deve reavaliar risk se causa da falha alterar segurança de nova
tentativa.

---

# 31. Risk e reconciliation

Efeito externo incerto é risk operacional e pode exigir escalation.

---

# 32. Risk e agent

Agents podem identificar, analisar e recomendar tratamento.

Aceitação material continua dependente de authority definida.

---

# 33. Risk e review/audit

Reviewer avalia qualidade do tratamento.

Auditor verifica se risk foi identificado, tratado e autorizado corretamente.

---

# 34. Risk register

A implementação futura deve permitir visão consolidada de riscos relevantes.

Este documento não define forma física.

---

# 35. Risk closure

Risk pode ser encerrado quando:

- condição deixou de existir;
- exposure foi removida;
- objeto terminou;
- foi superseded.

Histórico permanece.

---

# 36. Risk supersession

Mudança de baseline pode superseder risk anterior e criar novo risk vinculado.

---

# 37. Audit trail

Deve ser possível recuperar:

- risk;
- owner;
- baseline;
- evaluation;
- mitigation;
- acceptance;
- authority;
- expiration;
- revalidation.

---

# 38. Projeção

UI/API deve mostrar riscos materiais relevantes ao principal decisor.

---

# 39. Proibições

Não é permitido:

- risk material sem owner;
- acceptance sem authority;
- risk acceptance usada como exception;
- acceptance eterna sem revalidação quando contexto é mutável;
- esconder residual risk de Delivery;
- apagar histórico.

---

# 40. Cenários mentais

## 40.1 Security risk crítico

Escalar para authority apropriada.

## 40.2 Mitigation reduz risco

Atualizar residual risk; não apagar original.

## 40.3 Baseline muda

Reavaliar acceptance.

## 40.4 Risk blocker aceito

Continua blocker se não houver exception válida.

## 40.5 Delivery com residual risk

Authority deve conhecer e aceitar conforme policy.

---

# 41. Itens deixados para política operacional/contrato

Não define:

- scoring numérico;
- matriz 5x5;
- thresholds;
- SLA;
- UI;
- storage;
- API.

---

# 42. Critério de aprovação

Esta policy está pronta quando podemos derivar:

- identificação;
- owner;
- avaliação;
- mitigation;
- acceptance;
- residual risk;
- revalidation;
- expiration;
- escalation;
- relação com findings/exceptions/Delivery.

---

# 43. Princípio final

Risco governado não é risco eliminado.

É risco conhecido, tratado e decidido com autoridade apropriada.
