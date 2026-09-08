# NAAMIVE — Canonical State Model

**Status:** RATIFIED  **Versão:** 0.4  
**Autoridade:** modelo normativo do estado canônico  
**Deriva de:** Constituição, Lifecycles, Governance e Contracts

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** verdade canônica atual, histórico, entidades governadas e Inconsistency

---

# 1. Objetivo

Definir o que constitui a verdade atual do NAAMIVE.

O modelo separa três camadas:

```text
NORMA
ESTADO CANÔNICO ATUAL
HISTÓRICO IMUTÁVEL
```

Nenhuma delas substitui as outras.

---

# 2. Norma

Norma define:

```text
o que pode acontecer
```

Está nos documentos ratificados.

A norma não é o estado de uma instância.

---

# 3. Estado canônico atual

Estado canônico responde:

```text
o que é verdade agora para esta instância?
```

Deve existir uma única representação autoritativa por fato atual.

---

# 4. Histórico imutável

Histórico responde:

```text
o que aconteceu para chegarmos aqui?
```

História não é reescrita para combinar com o estado atual.

---

# 5. Entidades canônicas

O estado deve representar, quando aplicável:

- Need;
- Project;
- Module;
- Work Item;
- Execution;
- Delivery;
- Gate;
- Finding;
- Risk;
- Authority;
- Delegation;
- Handoff;
- Evidence;
- Review;
- Audit;
- Continuity;
- Baseline;
- Normative Baseline;
- Inconsistency;
- Exception;
- Decision.

---

# 6. Identidade

Toda entidade governada possui identidade estável.

Identidade não deve depender de nome mutável.

---

# 7. Versão

Recursos mutáveis devem possuir versão ou geração canônica.

A versão protege:

- concorrência;
- stale writes;
- baseline;
- revalidation;
- idempotência.

---

# 8. State snapshot

O estado atual pode ser materializado como snapshot.

Snapshot deve ser derivável do histórico ou validável contra ele.

---

# 9. Estado de negócio versus estado operacional

Need, Project, Module e Work Item representam estado de negócio.

Execution representa estado operacional.

Falha operacional não altera automaticamente estado de negócio.

---

# 10. Condições transversais

BLOCKED e PAUSED devem ser representadas sem apagar o estado principal.

Exemplo:

```text
Project.state = IMPLEMENTATION
Project.control_condition = BLOCKED
```

A forma física pode variar, mas a semântica deve permanecer.

---

# 11. WAITING

WAITING da Need deve preservar:

- estado de origem;
- causa;
- exit condition;
- owner;
- retorno esperado.

---

# 12. Terminalidade

Estado terminal permanece terminal.

Correção futura ocorre por nova entidade, sucessão, evolução ou novo trabalho
conforme lifecycle.

---

# 13. Delivery

Delivery é registro governado criado após aceite de entrega.

`Project.DELIVERY` é fase decisória.

`Delivery` é o fato aceito que permite `Project.DELIVERED`.

---

# 14. Finding

Finding atual deve preservar severidade, status, baseline e consequência.

Histórico de reclassification/invalidation não pode desaparecer.

---

# 15. Risk

Risk atual deve preservar owner, avaliação, treatment, residual risk e validade.

---

# 16. Authority

Authority atual deve permitir responder:

```text
quem pode decidir o quê agora?
```

Grants históricos revogados permanecem no histórico.

---

# 17. Handoff

Handoff possui estado atual observável:

- pending;
- accepted;
- returned;
- superseded;
- invalidated.

Os nomes físicos podem variar.

---

# 18. Continuity

Todo recurso ativo deve apontar continuidade válida.

A continuidade canônica não pode existir apenas em log, chat ou memória de agent.

---

# 19. Baselines

O NAAMIVE distingue duas referências que não podem ser confundidas:

### Business Baseline

Identifica o conjunto de fatos, decisões, artefatos e versões do produto/sistema
sobre o qual uma decisão material foi tomada. Quando este documento usa
`baseline` sem qualificador, refere-se à Business Baseline.

### Normative Baseline

Identifica, por `normative_baseline_ref`, o certificado imutável contendo o
conjunto completo e ordenado de normas ratificadas aplicáveis à instância/fato.

Toda decisão material deve referenciar a Business Baseline aplicável e a
Normative Baseline que a governou. Alterar uma não altera silenciosamente a
outra.

---

# 20. Supersession

Quando baseline ou decisão é substituída:

```text
old permanece histórico
new torna-se current
```

A relação causal deve ser explícita.

---

# 21. Invalidação descendente

Mudança material em pai deve atualizar o status de validade de descendants
afetados.

Descendant localmente READY pode deixar de ser globalmente elegível.

---

# 22. Current truth de Work Item

Deve conter, no mínimo conceitual:

- owner;
- state;
- impact;
- baseline;
- blocker;
- criteria;
- dependency status;
- current intention;
- current authoritative result;
- continuity.

---

# 23. Current truth de Execution

Deve conter:

- Work Item;
- state;
- intention;
- attempt lineage;
- authority generation;
- claim status;
- effect certainty;
- result;
- stale/expired reason quando aplicável.

---

# 24. Single authoritative result

Para a mesma intenção lógica, deve existir no máximo um resultado autoritativo.

Resultados concorrentes não autoritativos podem permanecer como evidence.

---

# 25. Canonical decisions

Decisão material deve possuir registro próprio ou representação equivalente.

Não deve existir somente como alteração de status.

---

# 26. Canonical state e UI

UI lê projeção do estado canônico.

UI não se torna source of truth.

---

# 27. Canonical state e agents

Agent recebe contexto derivado do estado canônico.

Memória do agent não prevalece sobre estado corrente.

---

# 28. Canonical state e API

API valida comandos contra estado canônico.

Request não define a verdade.

---

# 29. Canonical state e projections

Projection pode ser reconstruída.

Canonical state não depende da projeção para existir.

---

# 30. Reconciliation

Quando estado canônico e mundo externo divergem, reconciliation decide qual fato
deve ser consolidado.

---

## 30.1 Inconsistency

`Inconsistency` é entidade canônica de primeira classe para representar uma
discrepância que viola ou ameaça uma invariável, um contrato, uma autoridade,
um handoff, uma continuity, uma projeção ou a correspondência entre o estado
canônico e um efeito observado.

Ela não é sinônimo de `Finding`, `Blocker`, log, alerta ou reconciliation. Esses
elementos podem causar, explicar ou tratar uma Inconsistency.

Toda Inconsistency deve possuir, conforme aplicável:

- `inconsistency_id` estável;
- tipo/classe da discrepância;
- recurso e escopo afetados;
- `cause_ref`;
- Business Baseline;
- `normative_baseline_ref`;
- status;
- owner responsável;
- `causation_id` e `correlation_id`;
- evidence associada;
- treatment atual;
- continuity e escalation;
- vínculos com reconciliation, recovery ou compensation quando existirem;
- instante de abertura;
- instante e causa de encerramento;
- relação de supersessão quando aplicável.

O lifecycle conceitual mínimo é:

```text
OPEN
→ INVESTIGATING
→ IN_TREATMENT
→ RESOLVED
→ CLOSED
```

`SUPERSEDED` pode substituir uma Inconsistency por outra sem apagar a anterior.
`RECONCILIATION`, `RECOVERY`, `COMPENSATION`, `REVALIDATION`, `CORRECTION` e
`ESCALATION` são modos de treatment, não desculpas para apagar a discrepância.

Uma Inconsistency só pode ser fechada quando sua resolução estiver persistida e
a invariável afetada tiver sido restabelecida ou uma decisão governada tiver
definido tratamento terminal permitido. O fechamento preserva toda causalidade e
histórico.

---

# 31. Invariantes

```text
uma verdade atual por fato
histórico não é apagado
terminal não reabre
projection não manda
agent memory não manda
request não manda
baseline material é explícito
fato material possui normative_baseline_ref
active resource possui continuity
inconsistency material não existe apenas em log
```

---

# 32. Proibições

Não é permitido:

- duas fontes concorrentes de state;
- STATUS.md paralelo ao banco canônico;
- UI possuir state oculto que governa lifecycle;
- job status redefinir business state;
- reescrever history;
- descendant operar sob baseline revogado;
- discrepância normativa/material existir apenas em log, Finding ou ticket ad-hoc;
- resolver fatos históricos contra a norma "latest" em vez da Normative Baseline vinculada.

---

# 33. Critério de aprovação

Este modelo está pronto quando persistência, API, UI e orchestration conseguem
ser derivados sem criar nova definição de verdade.

---

# 34. Princípio final

O estado canônico é a resposta única para:

```text
o que é verdade agora?
```


---

# Value Delivery e progresso interno no estado canônico

## Novas entidades canônicas first-class

`ValueIncrement` é entidade canônica first-class.

Deve possuir, conforme aplicável:

```text
stable id
owner Module
current lifecycle state
version/generation
impact
definition
criteria
continuity
Business Baseline
normative_baseline_ref
predecessor/successor lineage
current authority-relevant facts
```

`DeliveryTarget` também é entidade canônica first-class e versionada.

Deve possuir, conforme aplicável:

```text
stable id
Project owner
current authoritative version
scope statement
Business Baseline
normative_baseline_ref
authority/decision refs
supersession refs
```

---

## DeliveryTargetMembership é relação governada

A disposição de uma Entrega de Valor não pertence intrinsecamente à
`ValueIncrement`.

Ela pertence à relação entre:

```text
DeliveryTarget version
        ↕
ValueIncrement
```

A relação deve representar:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Exemplo:

```text
EV-X

DT-01 v1 → OUT_OF_TARGET
DT-02 v1 → REQUIRED_FOR_TARGET
```

---

## Um único Delivery Target autoritativo corrente por Project

No MVP:

```text
Project
→ exatamente 0..1 DeliveryTarget autoritativo corrente
```

Podem coexistir:

```text
historical versions
superseded versions
drafts
proposals
```

Mas somente **um** Delivery Target governa a candidatura corrente.

É inválido ter dois Delivery Targets autoritativos correntes para o mesmo Project
e a mesma intenção de candidatura.

---

## Estado atual versus histórico

O estado canônico atual responde:

```text
qual ValueIncrement está em qual estado agora?
qual Delivery Target/version governa agora?
qual disposition cada ValueIncrement possui nesse target?
```

O histórico responde:

```text
como chegamos aqui?
```

Alterar target, disposition, lifecycle state ou lineage não reescreve fatos
anteriores.

---

## Terminalidade

`ValueIncrement.ACCEPTED` permanece terminal.

Mudança material posterior cria successor.

`DeliveryTarget` superseded permanece histórico.

Nenhuma nova versão apaga a versão anterior.

---

## Relação hierárquica

```text
Need
  ↓
Project
  ├── DeliveryTarget
  │      └── DeliveryTargetMembership → ValueIncrement
  │
  └── Module
        └── ValueIncrement
              └── Work Item
                    └── Execution
```

`DeliveryTargetMembership` não muda ownership de `ValueIncrement`.

---

## Currentness

O sistema deve conseguir responder canonicamente:

```text
qual Delivery Target é authoritative_current?
qual versão governa a candidatura?
qual membership é vigente nessa versão?
qual baseline sustenta essa decisão?
```

Currentness não pode ser inferido apenas pelo maior número de versão.

---

## Continuidade

Todo `ValueIncrement` ativo deve possuir continuidade governada.

Todo `DeliveryTarget` corrente deve possuir continuidade compatível com o estado
do Project.

---

## Baselines

Decisões materiais sobre `ValueIncrement`, `DeliveryTarget` e memberships devem
referenciar:

```text
Business Baseline
normative_baseline_ref
```

---

## Inconsistency

Exemplos representáveis como inconsistência canônica:

```text
dois DeliveryTargets autoritativos correntes
ValueIncrement ativa sem continuidade
required membership sem ValueIncrement válida
target current apontando para versão superseded
projection divergente do target atual
accepted ValueIncrement reaberta
```

---

## Restart safety

Após restart completo, o canonical state deve permitir reconstruir:

```text
Project atual
Delivery Target corrente e versão
membership/disposition
ValueIncrement state
Module/Work Item/Execution lineage
continuity
baseline
pending human decisions
```

Nada necessário para responder essas perguntas pode depender apenas de memória.

---
