# NAAMIVE — Transition Contract

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.3  
**Autoridade:** contrato normativo de transições do NAAMIVE  
**Deriva de:** `../00_NAAMIVE_CONSTITUTION.md`, `../lifecycle/01_LIFECYCLE_MODEL.md` e `../governance/01_GOVERNANCE_MODEL.md`

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** transições governadas de lifecycle e suas provas mínimas de validade

---

# 1. Objetivo

Este contrato define o que uma transição governada precisa provar para ser
considerada válida no NAAMIVE.

Ele não define endpoint, payload físico, tabela, event bus, linguagem ou banco.

Ele define a semântica mínima que qualquer implementação de transição deve
preservar.

---

# 2. Regra fundamental

Toda transição deve ser tratada como operação governada.

Uma mudança de estado somente é válida quando o sistema consegue provar:

```text
estado atual válido
+
intenção válida
+
baseline normativa aplicável
+
baseline/escopo atual
+
pré-condições satisfeitas
+
authority válida
+
evidência suficiente
+
findings tratados
+
continuidade posterior
=
transição autorizável
```

---

# 3. Identidade da transição

Toda tentativa de transição deve possuir identidade lógica.

Ela deve permitir distinguir:

```text
mesma intenção repetida tecnicamente
```

de:

```text
nova intenção de transição
```

A identidade lógica não depende do protocolo físico utilizado.

---

# 4. Elementos obrigatórios

Uma transição deve possuir, conforme aplicável:

- resource_id;
- resource_type;
- current_state;
- target_state;
- transition_intent_id;
- command/event;
- baseline_id ou equivalent;
- scope;
- `normative_baseline_ref`;
- principal;
- authority_reference;
- preconditions;
- evidence_refs;
- finding_refs;
- gate_result quando aplicável;
- causation_id;
- correlation_id;
- expected_version/generation;
- continuity_after_transition.

Os nomes físicos podem mudar.

A semântica não.

---

# 5. Estado atual

A transição deve verificar o estado canônico no momento da decisão.

Estado vindo de UI, cache, prompt ou memória de agente não é prova suficiente.

---

# 6. Estado alvo

O estado alvo deve existir no lifecycle normativo aplicável.

É proibido inventar estado em runtime.

---

# 7. Transição permitida

A implementação deve validar que a aresta:

```text
current_state → target_state
```

é permitida pela norma vigente.

---

# 8. Expected version

Toda transição concorrente deve validar versão, geração ou mecanismo equivalente.

Se o recurso mudou desde a leitura usada para decidir:

```text
fail-closed
```

e a tentativa deve ser tratada como obsoleta.

---

# 9. Baseline

Transições materiais devem declarar baseline.

A transition authority não é reutilizável para baseline incompatível sem
revalidação.

---

# 10. Scope

Toda transição deve conhecer o escopo governante do recurso.

Mudança de escopo material exige nova decisão.

---

# 11. Normative Baseline

Toda transição material deve registrar o `normative_baseline_ref` canônico que a
autorizou. A referência aponta para o certificado imutável com o conjunto
completo de normas aplicáveis; uma revisão escalar de documento não é suficiente.

Quando necessário para explicabilidade, a transição também pode registrar
`controlling_rule_ref`.

O servidor resolve a Normative Baseline aplicável. Um valor observado/projetado
pelo cliente pode ser usado para detectar staleness, mas nunca como seletor
autoritativo da norma.

---

# 12. Principal

Toda decisão material deve ser atribuída a principal verificável.

---

# 13. Authority

A authority deve ser verificada no instante de materialização da transição.

Authority expirada, revogada ou fora de escopo invalida a operação.

---

# 14. Preconditions

Pré-condições devem ser verificáveis.

Exemplos:

- parent em estado compatível;
- dependencies satisfeitas;
- blockers ausentes ou tratados;
- baseline atual;
- audit válida;
- gate aprovado;
- work item ready;
- execution claim válida.

---

# 15. Evidence

Quando a transição exigir evidence, deve existir cobertura suficiente do
baseline atual.

---

# 16. Findings

Finding bloqueador impede transição normal.

Risk acceptance isolada não libera blocker.

---

# 17. Gate

Quando gate existir, o resultado deve ser compatível com a transição.

```text
APPROVED
```

permite caminho normal.

```text
APPROVED_BY_EXCEPTION
```

permite apenas caminho excepcional explicitamente autorizado.

---

# 18. Continuidade posterior

A transição não deve publicar recurso ativo em estado sem continuidade.

Antes do commit autoritativo, deve ser possível provar a continuação esperada.

---

# 19. Atomicidade lógica

A implementação deve impedir situação em que:

```text
estado muda
mas
handoff/continuity necessária não existe
```

Quando não for possível atomicidade física, deve existir mecanismo durável e
recuperável que preserve equivalência lógica.

---

# 20. Idempotência

Repetir a mesma intenção de transição não pode gerar múltiplos efeitos
autoritativos.

---

# 21. Resultado de repetição

Retry da mesma transition intent deve resultar em um destes comportamentos:

- retornar o resultado autoritativo já consolidado;
- concluir a mesma operação pendente;
- detectar conflito;
- entrar em reconciliation.

Nunca duplicar efeito.

---

# 22. Causation

Toda transição material deve poder apontar sua causa.

Exemplos:

- user decision;
- gate approval;
- work completion;
- recovery;
- cancellation;
- supersession.

---

# 23. Correlation

Operações relacionadas devem poder ser correlacionadas de ponta a ponta.

---

# 24. Retornos de lifecycle

Retorno para estado anterior é uma nova transição.

Não significa apagar o estado ou evidência anteriores.

---

# 25. Invalidação descendente

Toda transição material que altere baseline, arquitetura, escopo ou intenção deve
classificar descendentes afetados como:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

---

# 26. Cancelamento

Cancelamento é transição material.

Deve incluir:

- descendants afetados;
- in-flight work;
- authorities revogadas;
- effects observados;
- reconciliation/compensation quando aplicável.

---

# 27. Pause

Pause preserva estado principal e intenção.

A transição de pause deve registrar processo de retomada.

---

# 28. Resume

Resume exige revalidação.

Nunca é simples remoção de flag.

---

# 29. Terminalidade

Estado terminal não pode ser reaberto por transição normal.

Novo trabalho exige nova intenção, sucessão, recovery permitido ou evolução.

---

# 30. Failure

Failure operacional não pode promover automaticamente lifecycle de negócio.

---

# 31. Recovery transition

Recovery não reescreve transition histórica.

Cria nova intenção operacional causal.

---

# 32. Reconciliation

Quando o sistema não consegue provar se a transição anterior ocorreu:

```text
não repetir cegamente
```

primeiro reconciliar.

---

# 33. Projection

A UI/API deve receber transitions autorizáveis já derivadas do estado canônico.

Cliente não inventa target_state.

---

# 34. Audit trail

Toda transição deve permitir recuperar:

- antes;
- depois;
- quem;
- por quê;
- authority;
- evidence;
- findings;
- gate;
- baseline;
- norma;
- timestamp;
- causalidade.

---

# 35. Falhas de contrato

Devem ser consideradas falhas de transição:

- stale version;
- invalid state;
- invalid target;
- missing authority;
- missing evidence;
- unresolved blocker;
- invalid baseline;
- missing continuity;
- normative baseline mismatch;
- duplicate conflicting intent.

---

# 36. Comportamento em falha

Falha de contrato não deve produzir mudança parcial autoritativa.

Quando efeito parcial já existir, o caso vai para reconciliation.

---

# 37. Invariantes

```text
state change possui causa
state change possui authority
state change respeita lifecycle
material change possui baseline
material state change possui normative_baseline_ref
active target possui continuity
terminal state não reabre
same intent não duplica efeito
```

---

# 38. Proibições

Não é permitido:

- state update direto sem contract;
- client escolher qualquer target_state;
- transition sem version check quando concorrência importa;
- transition material sem baseline;
- transition com blocker ignorado;
- transition que produz dead-end;
- retry duplicar efeito;
- reabrir terminal silenciosamente.

---

# 39. Itens deixados para implementação

Não define:

- HTTP;
- message broker;
- transaction engine;
- SQL;
- event sourcing;
- locking strategy;
- serialization format.

---

# 40. Princípio final

Transition Contract protege a mudança de realidade do sistema.

Se a transição não consegue provar que pode acontecer, ela não acontece.
