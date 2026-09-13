# NAAMIVE — Registro de PECs

**Status:** NON-NORMATIVE PROPOSAL REGISTER  
**Normative effect:** NONE  
**Escopo:** registro acumulativo de propostas de evolução futura do corpus normativo do NAAMIVE

---

## 1. Objetivo

Este registro reúne propostas de evolução futura da lei do NAAMIVE descobertas
durante self-hosting, implementação ou uso real.

PEC significa **Proposta de Emenda Constitucional**. O nome é intencional, mas
uma PEC pode afetar qualquer camada do corpus normativo, não somente
`00_NAAMIVE_CONSTITUTION.md`.

Uma PEC registrada:

```text
NÃO é lei
NÃO altera NB-0002
NÃO muda lifecycle atual
NÃO autoriza comportamento novo
NÃO pode prevalecer sobre norma ratificada
```

PECs permanecem backlog até futura revisão normativa formal. Quando houver
quantidade suficiente ou o momento adequado, elas poderão ser analisadas em
lote e, se aprovadas, materializadas nos documentos normativos apropriados e
em uma nova Normative Baseline, quando aplicável.

## 2. Índice

| PEC | Título | Status | Origem |
| --- | --- | --- | --- |
| PEC-001 | Human testing/acceptance no ValueIncrement e PR principal por Entrega de Valor | BACKLOG | self-hosting PRJ-001 |

Status permitidos:

```text
BACKLOG
UNDER_REVIEW
ADOPTED
REJECTED
WITHDRAWN
SUPERSEDED
```

`BACKLOG` significa apenas que a proposta está armazenada para revisão futura.

---

# PEC-001 — Human testing/acceptance no ValueIncrement e PR principal por Entrega de Valor

## Problema observado

O self-hosting mostrou que não exigir human gate de rotina em cada Work Item é
desejável.

Work Item é unidade de trabalho. Se uma WI encontra decisão material não
resolvida, isso normalmente evidencia problema upstream de planejamento,
definição ou arquitetura e não deve ser corrigido colocando aprovação humana em
cada WI.

Por outro lado, `ValueIncrement` / Entrega de Valor representa o primeiro nível
em que existe resultado integrado suficientemente próximo de valor utilizável
para human testing.

A lei vigente já possui:

```text
ValueIncrement
IMPLEMENTING
→ VALIDATING
→ READY_FOR_ACCEPTANCE
→ ACCEPTED
```

E também prevê, quando GitHub é usado:

```text
1 PR principal preferencialmente por ValueIncrement
1..N PRs quando necessário
PR MERGED != ValueIncrement ACCEPTED
```

Hoje, porém, a transição `READY_FOR_ACCEPTANCE → ACCEPTED` não exige
explicitamente human gate.

## Mudança candidata

Registrar para futura revisão:

```text
Work Item
→ sem human gate de rotina

ValueIncrement READY_FOR_ACCEPTANCE
→ human testing
→ human acceptance
→ ACCEPTED
```

Quando GitHub for utilizado, avaliar como padrão:

```text
1 ValueIncrement
→ candidate baseline da VI
→ 1 PR principal preferencial
→ validações automáticas / review / audit
→ human testing
→ human acceptance
→ autorização de merge/integração
```

## Candidate baseline

Avaliar também futura explicitação de:

```text
WI accepted
→ integra na candidate baseline do ValueIncrement

ValueIncrement accepted
→ candidate baseline fica elegível para integração no baseline superior
```

Isso evita interpretar integração de cada WI como obrigação de merge no
baseline principal antes do aceite da Entrega de Valor.

## Questões abertas

Não decidir agora. Apenas registrar:

- human acceptance acontece antes do merge ou autoriza o merge?
- como testar a VI antes do merge?
- qual ambiente será usado?
- como tratar uma VI que precise de vários PRs?
- qual evidence deve ser apresentada ao humano?
- rejeição humana retorna para `VALIDATING` ou `IMPLEMENTING`?
- como o aceite da VI se relaciona com `Module.READY_FOR_INTEGRATION`?
- haverá futuramente alguma classe de VI que dispense human gate?

## Documentos potencialmente afetados

Se PEC-001 for futuramente promovida, revisar pelo menos:

```text
lifecycle/09_VALUE_DELIVERY_MODEL.md
lifecycle/10_VALUE_INCREMENT_LIFECYCLE.md
governance/03_GATE_POLICY.md
governance/02_AUTHORITY_POLICY.md
contracts/01_TRANSITION_CONTRACT.md
contracts/05_AUTHORITY_CONTRACT.md
state/03_PROJECTION_MODEL.md
ui/02_ACTION_AND_DECISION_SURFACE_MODEL.md
implementation/02_INCREMENTAL_BUILD_PLAN.md
```

A análise normativa futura pode descobrir outros documentos afetados.

## Trigger para revisão

PEC-001 deve permanecer `BACKLOG` até ocorrer uma destas situações:

```text
NAAMIVE começar a executar VIs reais ponta a ponta;
fluxo real de PR por VI começar a ser implementado;
a ausência do human acceptance gerar problema concreto;
existirem PECs suficientes para justificar revisão normativa em lote.
```

Até lá:

```text
NB-0002 continua governando integralmente.
```
