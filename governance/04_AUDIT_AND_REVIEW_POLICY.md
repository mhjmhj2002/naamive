# NAAMIVE — Audit and Review Policy

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** política normativa de review e audit do NAAMIVE  
**Deriva de:** `01_GOVERNANCE_MODEL.md`  
**Normas superiores:** `../00_NAAMIVE_CONSTITUTION.md` e `../lifecycle/01_LIFECYCLE_MODEL.md`

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** review, audit, independência, reutilização, baseline, resultados e reauditoria

---

# 1. Objetivo

Esta policy define quando review e audit são exigidos, como se diferenciam e
quando seus resultados podem ser reutilizados.

---

# 2. Distinção fundamental

```text
REVIEW
→ isso está bom?

AUDIT
→ há prova suficiente de que está pronto e conforme?
```

Review avalia qualidade.

Audit avalia prontidão e conformidade.

---

# 3. Review

Review pode avaliar:

- produto;
- UX;
- arquitetura;
- segurança;
- domínio;
- planejamento;
- código;
- testes;
- integração;
- operação.

---

# 4. Audit

Audit verifica:

- completude;
- consistência;
- rastreabilidade;
- baseline;
- evidence;
- findings;
- authority;
- independência;
- readiness;
- continuidade.

---

# 5. Audit não redesenha

Auditor pode apontar lacuna e recomendar correção.

Não deve silenciosamente substituir a proposta auditada.

---

# 6. Author não é auditor independente

Mesmo principal não satisfaz independência quando ela é exigida.

---

# 7. Reviewer pode ser author?

Para TRIVIAL, policy pode permitir.

Para MATERIAL/CRÍTICA, deve seguir critérios de segregação definidos para o
tipo de decisão.

---

# 8. Auditor pode ser reviewer?

Pode ser permitido em alguns casos, desde que:

- policy permita;
- independência do author seja preservada;
- risco seja compatível;
- não haja conflito de interesse.

---

# 9. Auditor pode ser authority?

Somente quando policy permitir e não houver exigência de segregação adicional.

Audit positivo nunca obriga approval.

---

# 10. Review obrigatório

Review é obrigatório quando a mudança for MATERIAL ou CRÍTICA e houver decisão
especializada relevante.

---

# 11. Audit obrigatório

Audit de readiness é obrigatório antes de avanço MATERIAL ou CRÍTICA.

---

# 12. Reuso de audit upstream

Audit anterior só pode ser reutilizado se cobrir explicitamente:

- mesmo objeto relevante;
- mesmo baseline ou baseline compatível;
- mesmo scope;
- mesma decisão material;
- riscos ainda válidos;
- findings ainda aplicáveis.

---

# 13. Reuso proibido

Não reutilizar audit apenas porque:

- foi recente;
- mesmo agent realizou;
- mesmo Project;
- mesmo nome de tarefa;
- baseline parece parecido.

---

# 14. Audit por baselines

Toda audit material deve declarar Business Baseline e `normative_baseline_ref`.
A audit histórica continua sendo interpretada sob a baseline normativa que a
governou, mesmo após nova norma ser ratificada.

---

# 15. Mudança de baseline

Mudança material deve classificar audit anterior:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

---

# 16. Mudança de scope

Scope materialmente alterado exige revalidação.

---

# 17. Mudança normativa

Mudança normativa pode invalidar audit anterior.

---

# 18. Mudança de authority

Se a decisão dependia de authority que expirou, audit pode continuar válida como
evidence, mas approval deve ser refeito.

---

# 19. Audit de Need

Need MATERIAL/CRÍTICA deve passar audit antes de `READY_FOR_COMMITMENT`.

---

# 20. Audit de Project Conception

Exigida antes de decisão material que autorize arquitetura quando a concepção
for MATERIAL/CRÍTICA.

---

# 21. Audit de Architecture

Obrigatória para arquitetura MATERIAL/CRÍTICA.

---

# 22. Audit de Planning

Obrigatória para plano MATERIAL/CRÍTICA.

---

# 23. Audit de Work Item

Work Item MATERIAL/CRÍTICA exige audit proporcional antes do avanço relevante,
salvo reutilização válida de audit upstream que cubra exatamente o mesmo
baseline/scope/decision.

---

# 24. Audit de Module

Module MATERIAL/CRÍTICA exige audit quando sua definição, integração ou mudança
autoriza decisão material.

---

# 25. Audit de Delivery

Delivery MATERIAL/CRÍTICA exige audit independente antes do aceite.

---

# 26. Audit normativa

Norma material deve poder ser auditada antes de ratificação.

---

# 27. Evidência mínima para audit

Conforme objeto:

- objetivo;
- scope;
- baseline;
- criteria;
- decisões;
- risks;
- dependencies;
- findings;
- reviews;
- authority context;
- continuity.

---

# 28. Finding de audit

Audit pode produzir:

- BLOCKING;
- NON_BLOCKING.

Severidade adicional pode ser definida depois.

---

# 29. Audit incompleta

Se evidence é insuficiente:

```text
não concluir PASS
```

Deve retornar finding ou condição de incompletude.

---

# 30. Audit e fail-closed

Quando auditor não consegue provar conformidade material:

```text
não recomenda avanço
```

---

# 31. Audit e exception

Auditor não concede exception só por identificar problema.

Exception depende de authority própria.

---

# 32. Audit e risk acceptance

Audit pode registrar risco residual.

Não aceita risco em nome da organização sem authority específica.

---

# 33. Review e finding

Review também pode produzir findings.

---

# 34. Review positivo não fecha audit

Mesmo review excelente não elimina audit obrigatória.

---

# 35. Audit positivo não fecha gate humano

Approval humano continua necessário quando exigido.

---

# 36. Independência

Independência deve ser avaliada por principal.

Abrir nova execução com mesma identidade não cria independência.

---

# 37. Conflito de interesse

Auditor com conflito de interesse não pode realizar audit independente quando a
policy proibir.

---

# 38. Audit por agent

Agent pode auditar quando:

- principal é elegível;
- tools/context são suficientes;
- policy permite;
- independência existe;
- limitation é declarada.

---

# 39. Audit humana

Pode ser exigida por policy para decisões críticas específicas.

---

# 40. Audit composta

Pode combinar agents/humanos especializados.

---

# 41. Resultado de review

Conceitualmente:

```text
ACCEPTABLE
NEEDS_REWORK
BLOCKING_FINDINGS
```

---

# 42. Resultado de audit

Conceitualmente:

```text
PASS
PASS_WITH_FINDINGS
FAIL
```

Os nomes físicos serão definidos em contrato futuro.

---

# 43. PASS

Não existem blockers e readiness é suficiente.

---

# 44. PASS_WITH_FINDINGS

Pode existir quando findings não bloqueadores permanecem.

---

# 45. FAIL

Existe blocker ou insuficiência material.

---

# 46. Reaudit

Após remediation material, pode ser exigida nova audit.

---

# 47. Reaudit proporcional

Não é obrigatório repetir análise inteira quando a mudança é estritamente local e
o auditor consegue provar que o restante do baseline permanece válido.

---

# 48. Audit trail

Deve registrar:

- auditor;
- scope;
- baseline;
- norma;
- evidence;
- findings;
- result;
- limitations;
- timestamp.

---

# 49. Limitações

Auditor deve declarar limitações materiais.

Limitação escondida invalida confiança no resultado.

---

# 50. Proibições

Não é permitido:

- audit sem baseline;
- self-audit independente;
- audit antiga reaproveitada sem coverage;
- PASS com blocker;
- auditor conceder exception sem authority;
- reviewer substituir authority;
- audit virar mera checklist sem análise quando risco é material.

---

# 51. Cenários mentais

## 51.1 Work Item crítica coberta por audit do Project

Só reutiliza se audit do Project cobriu explicitamente aquela decisão/baseline.

## 51.2 Baseline mudou após audit

Revalidar.

## 51.3 Auditor encontra blocker

FAIL ou equivalente.

## 51.4 Auditor e author são mesmo principal

Não satisfaz independência.

## 51.5 Review rejeita proposta antes da audit

Retornar para rework; audit pode nem iniciar.

---

# 52. Itens deixados para contrato futuro

Não define:

- payload;
- template;
- formato de relatório;
- tooling;
- armazenamento;
- API;
- severity numeric.

---

# 53. Critério de aprovação

Esta policy está pronta quando conseguimos derivar sem nova lei:

- quando review é obrigatório;
- quando audit é obrigatória;
- independência;
- reuso;
- baseline;
- reaudit;
- resultados;
- relação com findings/gates/authority.

---

# 54. Princípio final

Review melhora a proposta.

Audit protege a decisão.
