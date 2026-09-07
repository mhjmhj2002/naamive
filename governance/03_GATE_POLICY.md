# NAAMIVE — Gate Policy

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** política normativa de gates do NAAMIVE  
**Deriva de:** `01_GOVERNANCE_MODEL.md`  
**Normas superiores:** `../00_NAAMIVE_CONSTITUTION.md` e `../lifecycle/01_LIFECYCLE_MODEL.md`

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** gates de readiness, decisão humana ou automatizada, exceção, pause, cancelamento, Delivery e ratificação

---

# 1. Objetivo

Esta policy define quando e como gates controlam avanços do NAAMIVE.

Gate é uma condição de decisão sobre transição.

Gate não é estado.

---

# 2. Princípio

Um gate existe para impedir que uma transição material aconteça sem:

- critérios;
- evidência;
- autoridade;
- baseline;
- tratamento de findings;
- continuidade.

---

# 3. Tipos de gate

O NAAMIVE reconhece:

```text
READINESS_GATE
HUMAN_GATE
AUTOMATED_GATE
COMPOSITE_GATE
EXCEPTION_GATE
```

---

# 4. READINESS_GATE

Verifica se a etapa anterior produziu condições suficientes para avançar.

Não representa necessariamente decisão humana.

---

# 5. HUMAN_GATE

Exige decisão final de principal humano autorizado.

---

# 6. AUTOMATED_GATE

Pode ser resolvido automaticamente quando:

- criteria são objetivos;
- policy permite;
- não há obrigação humana;
- authority existe;
- evidence é verificável.

---

# 7. COMPOSITE_GATE

Combina múltiplos controles.

Exemplo:

```text
review
+
audit
+
human approval
```

---

# 8. EXCEPTION_GATE

Avalia pedido de exceção.

Nunca deve ser confundido com gate normal.

---

# 9. Estrutura mínima de gate

Todo gate deve possuir:

- objeto;
- transição;
- intenção;
- baseline;
- `normative_baseline_ref`;
- critérios;
- evidências requeridas;
- reviews aplicáveis;
- audit aplicável;
- findings;
- authority;
- resultado;
- validade.

---

# 10. Estados conceituais do gate

Gate pode estar:

```text
PENDING
READY_FOR_DECISION
DECIDED
INVALIDATED
```

Esses estados são conceituais e podem ser derivados em contrato posterior.

---

# 11. Resultados válidos

```text
APPROVED
REJECTED
RETURNED
BLOCKED
APPROVED_BY_EXCEPTION
```

---

# 12. APPROVED

Todos os critérios normais foram satisfeitos.

---

# 13. REJECTED

A autoridade decidiu não autorizar o avanço.

---

# 14. RETURNED

O objeto volta para estágio anterior para rework, discovery ou correção.

---

# 15. BLOCKED

Gate não pode ser decidido ou aprovado por condição ainda não resolvida.

---

# 16. APPROVED_BY_EXCEPTION

Avanço ocorre por exceção governada.

Isso deve permanecer distinguível de `APPROVED`.

---

# 17. Gate e baselines

Gate sempre avalia Business Baseline explícita e o `normative_baseline_ref`
canônico.

Mudança material da Business Baseline invalida ou exige revalidação do gate.
Migração de Normative Baseline também exige decisão explícita de compatibilidade
ou revalidação; gate nunca resolve policy como `latest`.

---

# 18. Gate e evidence

Evidence deve corresponder ao baseline avaliado.

Evidence obsoleta não pode sustentar approval.

---

# 19. Gate e findings

Finding bloqueador impede approval normal.

`RISK_ACCEPTANCE` não libera blocker.

Somente:

- remediation;
- invalidation;
- reclassification válida;
- exception governada;

podem remover ou contornar o efeito bloqueador.

---

# 20. Gate e risk acceptance

Risk acceptance pode ser parte da decisão, mas não equivale a exception.

---

# 21. Gate e exception

Exception deve ter gate próprio quando material.

---

# 22. Gate e authority

Authority deve ser verificada no instante da decisão.

---

# 23. Gate e independência

Quando audit independente for requisito do gate, autovalidação não satisfaz.

---

# 24. Gate e continuidade

Gate aprovado só deve produzir transição se o próximo estágio possuir continuidade.

---

# 25. Gate não deve criar dead-end

Se approval for válido mas o destino não puder assumir responsabilidade, o
handoff precisa ser recuperável.

---

# 26. Gate de Need Commitment

Controla:

```text
READY_FOR_COMMITMENT → ACCEPTED
```

Para Need MATERIAL ou CRÍTICA, exige decisão humana.

---

# 27. Gate de Product/Conception

Decisões materiais de produto devem passar por review/audit apropriados antes de
materialização.

---

# 28. Gate de Architecture

Arquitetura MATERIAL ou CRÍTICA exige:

- decisão documentada;
- review;
- audit de readiness;
- authority.

---

# 29. Gate de Planning

Plano MATERIAL ou CRÍTICA exige:

- trabalho suficientemente definido;
- dependências;
- criteria;
- readiness;
- authority.

---

# 30. Gate de Work Item readiness

Controla entrada em `READY`.

Não é obrigatório ser humano.

Deve verificar:

- objective;
- scope;
- acceptance criteria;
- dependencies;
- impact;
- baseline;
- findings;
- authority.

---

# 31. Gate de Work Item acceptance

Controla:

```text
IN_REVIEW → DONE
```

Execution success não substitui esse gate.

---

# 32. Gate de Module integration

Controla:

```text
READY_FOR_INTEGRATION → INTEGRATED
```

Deve verificar baseline, compatibilidade e dependências.

---

# 33. Gate de Project Validation

Controla entrada em fase de Delivery.

---

# 34. Gate de Delivery

Controla aceitação de Delivery e:

```text
Project.DELIVERY → Project.DELIVERED
```

Para Delivery MATERIAL ou CRÍTICA, exige audit independente e authority de
negócio.

---

# 35. Gate de pause

Pausa exige authority e tratamento de trabalho em voo.

---

# 36. Gate de resume

Resume exige revalidação de contexto.

---

# 37. Gate de cancelamento

Cancelamento exige:

- authority;
- descendants afetados;
- trabalho em voo;
- efeitos externos;
- reconciliation/compensation quando necessário.

---

# 38. Gate de exception

Exception gate exige:

- regra desviada;
- risco;
- justification;
- compensatory controls;
- expiration;
- authority distinta quando exigido.

---

# 39. Gate de ratificação normativa

Norma só entra em vigor após gate de ratificação.

---

# 40. Gates humanos esperados

Por padrão conceitual, decisões humanas são esperadas em:

- Need commitment MATERIAL/CRÍTICA;
- Product commitment material;
- Architecture MATERIAL/CRÍTICA;
- Plan MATERIAL/CRÍTICA;
- Risk acceptance material;
- Exception;
- Pause;
- Cancel;
- Delivery acceptance;
- Norm ratification.

A policy futura pode detalhar subtipos, sem enfraquecer a norma superior.

---

# 41. Gates automatizáveis

Podem incluir:

- checks objetivos;
- readiness técnico;
- presença de evidence;
- dependências satisfeitas;
- versões compatíveis;
- ausência de blocker.

Automated gate nunca substitui human gate obrigatório.

---

# 42. Gate composto e ordem

Quando múltiplos controles forem necessários, a ordem pode ser:

```text
review
→ audit
→ authority decision
```

Outras ordens são permitidas quando justificadas.

---

# 43. Reuso de gate

Gate anterior só pode ser reutilizado se:

- baseline compatível;
- scope compatível;
- decision intent compatível;
- authority ainda válida;
- evidence ainda válida.

---

# 44. Gate inválido

Gate torna-se inválido quando:

- baseline muda;
- authority expira;
- norma muda materialmente;
- evidence é invalidada;
- finding bloqueador surge;
- objeto é cancelado.

---

# 45. Gate concorrente

Dois gates incompatíveis sobre mesma transição não podem produzir dois resultados
autoritativos.

---

# 46. Idempotência

Repetição da mesma decisão deve produzir o mesmo resultado autoritativo.

---

# 47. Gate e UI

UI apresenta gate e ação autorizada.

UI não calcula se gate existe.

---

# 48. Falha de projeção

Gate pendente invisível ao responsável é falha de continuidade.

---

# 49. Audit trail

Todo gate deve permitir reconstruir:

- criteria;
- evidence;
- reviewers;
- auditor;
- findings;
- authority;
- decision;
- baseline;
- version;
- timestamp.

---

# 50. Proibições

Não é permitido:

- gate sem baseline;
- gate sem authority;
- blocker ignorado;
- risk acceptance usado como exception;
- audit dispensada por conveniência em MATERIAL/CRÍTICA;
- approval de baseline antigo;
- gate humano substituído por agent;
- approval sem continuidade posterior.

---

# 51. Cenários mentais

## 51.1 Auditor positivo, authority rejeita

Resultado:

```text
REJECTED
```

## 51.2 Blocker com risk acceptance

Resultado normal continua bloqueado.

## 51.3 Blocker com exception válida

Pode resultar em `APPROVED_BY_EXCEPTION`.

## 51.4 Baseline muda depois do gate

Gate deve ser revalidado ou invalidado.

## 51.5 Gate aprovado, handoff falha

Recovery do handoff; não duplicar decisão.

---

# 52. Itens deixados para contrato futuro

Não define:

- payload;
- storage;
- endpoint;
- event;
- exact status schema;
- timeout;
- UI component.

---

# 53. Critério de aprovação

Esta policy está pronta quando conseguimos derivar:

- tipos de gate;
- critérios mínimos;
- resultados;
- relação com findings;
- authority;
- audit;
- baseline;
- continuidade;
- gates humanos e automatizados.

---

# 54. Princípio final

Gate não existe para “dar OK”.

Ele existe para provar que uma transição é legítima.
