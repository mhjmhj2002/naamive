# NAAMIVE — Project Continuity

**Status:** LIVING PROJECT DOCUMENT  
**Natureza:** documento operacional de continuidade; não normativo  
**Arquivo:** `PROJECT_CONTINUITY.md`  
**Última atualização:** 2026-09-12  
**Branch ativa:** `lifecycle-reboot`  
**Normative Baseline vigente:** `NB-0002` — RATIFIED / IN FORCE  
**Technology Baseline:** `v0.10` — APPROVED / FROZEN  
**Project:** `PRJ-001 — NAAMIVE MVP`  
**Project lifecycle:** `PLANNING`  
**Implementation authority:** `GRANTED`
**Implementation:** `INDEPENDENT CODE REVIEW COMPLETED / NON_BLOCKING FINDING OPEN`

---

## 1. Propósito

Este arquivo existe para permitir que um novo chat, agente ou sessão retome o
NAAMIVE sem reconstruir a história inteira do lifecycle reboot.

Ele deve responder rapidamente:

```text
onde estamos?
qual baseline governa?
o que já foi aprovado?
o que ainda não foi autorizado?
qual é a próxima ação legítima?
o que não deve ser reaberto?
```

Este arquivo **não é normativo**.

Em caso de divergência:

```text
Normative Baseline vigente
> artefatos canônicos do Project
> decisões humanas governadas
> PROJECT_CONTINUITY.md
> documentação explicativa
```

---

## 2. Visão do produto

```text
Transforming Business Needs into Delivered Software
```

Princípio:

```text
necessidade de negócio primeiro
software como consequência
valor entregue como objetivo
```

Hierarquia operacional:

```text
Need
  ↓
Project
  ↓
Module
  ↓
ValueIncrement / Entrega de Valor
  ↓
Work Item
  ↓
Execution
```

As entidades possuem lifecycles próprios. Uma `Execution` falhar não altera
automaticamente o lifecycle do `Work Item`, `ValueIncrement`, `Module` ou
`Project`.

---

## 3. Leitura mínima ao retomar

Leia nesta ordem:

```text
1. PROJECT_CONTINUITY.md
2. AGENTS.md
3. project/naamive/README.md
4. governance/normative-baselines/NB-0002.md
5. project/naamive/projects/PRJ-001-naamive-mvp/CURRENT_STATE.md
6. project/naamive/projects/PRJ-001-naamive-mvp/EXECUTION_BOARD.md
7. project/naamive/projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_T1_T6.md
8. project/naamive/projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_WI001_READINESS.md
9. documentação específica da task atual
```

Não reconstruir a história de auditoria por padrão.

Abrir auditorias antigas apenas se uma task concreta exigir evidência histórica.

---

## 4. Estado normativo atual

Baseline vigente:

```text
NB-0002
Status................. RATIFIED / IN FORCE
Ratified at............ 2026-09-08T18:38:36-03:00
Membership............. 71 documentos normativos
Previous baseline...... NB-0001
```

`NB-0001` permanece imutável como evidência normativa histórica e continua
aplicável apenas onde a própria regra de baseline exigir histórico ou instância
não migrada.

Para o trabalho atual do NAAMIVE, a referência normativa é:

```text
normative_baseline_ref: NB-0002
```

Não tratar `NB-0002` como candidata. Ela já foi ratificada.

---

## 5. Technology Baseline

Arquivo:

```text
technology/01_TECHNOLOGY_BASELINE.md
```

Estado atual:

```text
Version................ v0.10
Status................. APPROVED / FROZEN
Derived from........... NB-0002
Audit 2.10............. COMPLETE
Remediation 2.10R...... COMPLETE
Verification 2.10V..... PASS
Human approval 2.11.... COMPLETE
Implementation......... governed by WI/Execution authority; technical result now awaiting review
```

A Technology Baseline define **como implementar**, mas não autoriza por si só o
início da implementação.

Não voltar para o antigo estado `v0.6 BRAINSTORM` ou `2.7 PAUSED`. Isso é
histórico obsoleto.

---

## 6. Technical Implementation Readiness

O Project atual referencia:

```text
TIR v1.0 — APPROVED
```

Essa aprovação representa envelope técnico/readiness e não substitui:

```text
Work Item readiness
+
authority aplicável
+
Development Cycle
+
Execution autorizada
```

Portanto:

```text
TIR APPROVED != IMPLEMENTATION AUTHORIZED
```

---

## 7. Planning Round 1 — fechamento

A Planning Round 1 foi concluída.

Estado terminal da rodada:

```text
Planning Round 1............. COMPLETE
Business Baseline............ PBL-PRJ001-R1-v1.0
Audit phase.................. CLOSED
Last valid audit............. AUD-009
Known blocking findings...... 0
Further audit required....... NO
Documentation................ STABLE
```

AUD-001..AUD-009 permanecem evidência histórica.

`AUD-009` é a última auditoria válida da Planning Round 1.

Não criar:

```text
AUD-010
AUD-011
nova auditoria da Planning Round 1
```

apenas para “confirmar de novo” o fechamento.

A auditoria já cumpriu seu papel.

---

## 8. Business Baseline PBL-PRJ001-R1-v1.0

`PBL-PRJ001-R1-v1.0` é o snapshot documental final da Planning Round 1.

Ela foi estabilizada após a remediação de AUD9-001 / FND-011, incluindo a
revalidação explícita dos objetos materiais anteriormente vinculados à v0.5.

A baseline:

```text
não autoriza implementação
não promove Work Item
não cria Development Cycle
não cria Execution
não cria Delivery
```

### Regra importante pós-fechamento

Decisões governadas posteriores podem alterar o **estado corrente** sem reescrever
retroativamente a Planning Baseline histórica.

Portanto:

```text
Planning Baseline v1.0
= snapshot de entrada da decisão posterior

estado corrente depois da decisão
!= obrigação de criar v1.1 apenas porque lifecycle/currentness avançou
```

Não criar `PBL-PRJ001-R1-v1.1` para materializar apenas a aprovação T1–T6.

---

## 9. Aprovação humana T1–T6

Depois do fechamento documental da Planning Round 1, o Project Owner exerceu
uma nova decisão humana explícita.

Authority:

```text
principal............... human:manuel-hinojosa:project-owner
role.................... NAAMIVE Project Owner
business_baseline_ref... PBL-PRJ001-R1-v1.0
normative_baseline_ref.. NB-0002
decision_input_commit... cf4f2c032d61835329db820d9490250927b6bfeb
gate_result............. APPROVED
```

Registro governado:

```text
project/naamive/projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_T1_T6.md
```

Transições aprovadas e materializadas:

```text
T1  MOD-001       IDENTIFIED → DEFINED
T2  VI-001        IDENTIFIED → DEFINED
T3  VI-001        DEFINED → PLANNED
T4  MOD-001       DEFINED → PLANNED
T5  DT-001 v1     CANDIDATE / NOT CURRENT → CURRENT
T6  Roadmap v2    CANDIDATE / NOT CURRENT → CURRENT
```

Resultado:

```text
MOD-001........... PLANNED
VI-001............ PLANNED
DT-001 v1......... CURRENT
Roadmap v2........ CURRENT
```

A antiga `ROUND_1_APPROVAL_CANDIDATE.md` é evidência histórica do estado anterior
em que a promoção ainda não havia sido exercida. Não reescrever esse artefato
para fingir que a decisão ocorreu dentro da rodada fechada.

---

## 10. Estado corrente do PRJ-001

Estado corrente após EX-003:

```text
Need NEED-001........... ACCEPTED
Project PRJ-001......... PLANNING
Module MOD-001.......... PLANNED
VI-001.................. PLANNED
DT-001 v1............... CURRENT
Roadmap v2.............. CURRENT
Work Items.............. 12 PROPOSED / 1 IN_REVIEW
Development Cycles...... 1 (DC-001)
Executions.............. 3 (EX-001 SUCCEEDED / HISTORICAL; EX-002 SUCCEEDED / HISTORICAL; EX-003 SUCCEEDED)
Validation.............. NOT EXECUTED
Delivery................ NOT DELIVERED
Implementation authority GRANTED
Code Review............... CR-WI001-01 FAIL / HISTORICAL; CR-WI001-02 FAIL / HISTORICAL; CR-WI001-03 PASS_WITH_FINDINGS
Acceptance................ NOT GRANTED
Implementation............ INDEPENDENT CODE REVIEW COMPLETED / NON_BLOCKING FINDING OPEN
Human approval.......... GRANTED — T1–T6
WI-001 readiness........ APPROVED / EXERCISED
```

Arquivos operacionais principais:

```text
project/naamive/projects/PRJ-001-naamive-mvp/CURRENT_STATE.md
project/naamive/projects/PRJ-001-naamive-mvp/EXECUTION_BOARD.md
project/naamive/projects/PRJ-001-naamive-mvp/DELIVERY_TARGET.md
project/naamive/projects/PRJ-001-naamive-mvp/ROADMAP.md
project/naamive/projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md
```

A materialização T1–T6 foi registrada no Activity Log como `A-029`; a decisão
humana de readiness de WI-001 foi registrada como `A-030`.

---

## 11. Limites da decisão de readiness de WI-001

A decisão humana de readiness de WI-001 promoveu exclusivamente
`WI-001 PROPOSED → READY`. A autorização posterior de `EXECUTE_WORK` foi
exercida por `EX-001`, que produziu resultado técnico. A decisão de readiness
não autorizou por si só:

```text
qualquer outro WI → READY
criação de Development Cycle
criação de Execution
início de implementação
Validation
Delivery
```

Estado corrente após `EX-003`:

```text
12 PROPOSED
1 IN_REVIEW (WI-001)
0 IN_PROGRESS
0 DONE
1 Development Cycle (DC-001)
3 Executions (EX-001 SUCCEEDED / HISTORICAL; EX-002 SUCCEEDED / HISTORICAL; EX-003 SUCCEEDED)
```

Não inferir autorização de implementação a partir de:

```text
MOD-001 PLANNED
VI-001 PLANNED
DT-001 CURRENT
Roadmap CURRENT
Technology Baseline APPROVED
TIR APPROVED
```

---

## 12. Próximo gate governado

O próximo avanço real é a disposition do finding não bloqueante
`CR-WI001-03-F001`, seguida de acceptance separado conforme lifecycle e
governança aplicáveis.

Fluxo esperado:

```text
WI-001 IN_REVIEW
→ disposition de CR-WI001-03-F001
→ decisão de aceite humana conforme aplicável
```

`EX-001 SUCCEEDED` não promove `WI-001` para `DONE`.

### Próxima ação recomendada

Após CR-WI001-03:

```text
registrar a disposition de CR-WI001-03-F001 e submeter o acceptance humano aplicável
```

Não reexecutar EX-001 nem conceder aceite por inferência.

---

## 13. Estado Git / checkpoint

Checkpoint que serviu como **input da decisão T1–T6**:

```text
cf4f2c032d61835329db820d9490250927b6bfeb
chore(agents): constrain agent scope and delegation
```

Esse hash é deliberadamente preservado em `HUMAN_APPROVAL_T1_T6.md` para tornar
reconstruível o snapshot exato sobre o qual a autoridade humana decidiu.

### Atenção para novo chat

O hash acima **não deve ser assumido como HEAD atual para sempre**.

No início da nova sessão execute:

```bash
git branch --show-current
git status --short
git log -1 --oneline
```

Se existir commit posterior contendo T1–T6, trate-o como novo checkpoint.

Se ainda houver working tree local, preserve as mudanças e não use
`reset`, `clean`, `checkout` destrutivo ou rebase para “voltar ao checkpoint”.

---

## 14. Arquivos materializados pela decisão T1–T6

Criado:

```text
project/naamive/projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_T1_T6.md
```

Alterados pela task:

```text
project/naamive/projects/PRJ-001-naamive-mvp/CURRENT_STATE.md
project/naamive/projects/PRJ-001-naamive-mvp/EXECUTION_BOARD.md
project/naamive/projects/PRJ-001-naamive-mvp/DELIVERY_TARGET.md
project/naamive/projects/PRJ-001-naamive-mvp/ROADMAP.md
project/naamive/projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md
project/naamive/projects/PRJ-001-naamive-mvp/modules/MOD-001-project-context/MODULE.md
project/naamive/projects/PRJ-001-naamive-mvp/modules/MOD-001-project-context/value-increments/VI-001-authenticated-project-context/VALUE_INCREMENT.md
```

Atualizado manualmente depois da task:

```text
project/naamive/README.md
```

Este próprio `PROJECT_CONTINUITY.md` deve ser atualizado/substituído junto com
o checkpoint de handoff.

---

## 15. Arquivos históricos que NÃO devem ser “corrigidos” retroativamente

Preservar como história:

```text
project/naamive/MANIFEST.md
project/naamive/BASELINE_CERTIFICATE.md
project/naamive/projects/PRJ-001-naamive-mvp/governance/PLANNING_BASELINE.md
project/naamive/projects/PRJ-001-naamive-mvp/governance/ROUND_1_APPROVAL_CANDIDATE.md
project/naamive/projects/PRJ-001-naamive-mvp/governance/CURRENT_CONTINUITY.md
project/naamive/projects/PRJ-001-naamive-mvp/audits/AUD-001..AUD-009
```

Esses artefatos descrevem snapshots e decisões históricas.

Não alterar seu significado apenas para refletir o estado corrente pós-T1–T6.

---

## 16. AGENTS.md — disciplina operacional atual

`AGENTS.md` foi ajustado para evitar auto-orquestração excessiva.

Regra essencial:

```text
um novo agente por task
= responsabilidade do operador/orquestrador humano
!= permissão para o worker criar subagentes
```

Por padrão o worker:

```text
recebe a task
→ executa o escopo
→ valida proporcionalmente
→ reporta
→ termina
```

Sem autorização explícita, não deve:

```text
criar subagente
delegar revisão
criar auditor para si mesmo
fazer falsification pass recursivo
crawlear o repo inteiro
transformar validação local em nova auditoria
```

### Comandos locais

Há um problema operacional observado com runners de IA: pipelines simples de
shell podem ficar presos em `Executing command...` apesar de a operação ser
trivial.

Preferir:

```bash
tail -n 20 arquivo.md
sed -n '1,80p' arquivo.md
git status --short
git diff --check
```

Evitar pipelines de inspeção desnecessários como:

```bash
tail ... | od ... | tail ...
```

Se um comando local simples de inspeção não retornar em poucos segundos:

```text
interromper
→ usar alternativa equivalente mais simples
→ continuar sem refazer etapas concluídas
```

---

## 17. Git safety

O humano controla operações de histórico:

```text
commit
push
merge
rebase
reset
clean
history rewrite
```

Agentes não devem executar essas ações sem instrução humana explícita.

Nunca usar comandos destrutivos para resolver divergência de contexto.

---

## 18. Legado

```text
legacy can teach
legacy cannot govern
```

O runtime/projeto anterior ao lifecycle reboot é referência histórica.

Não restaurar decisões antigas como autoridade atual apenas porque existiam no
legado.

A fonte de verdade para o fluxo atual é o corpus governado por `NB-0002` e os
artefatos canônicos do Project atual.

---

## 19. Decisões que não devem ser reabertas sem fato novo

Não reabrir por padrão:

```text
ratificação NB-0002
Technology Baseline v0.10
Planning Round 1
AUD-001..AUD-009
fechamento da audit phase
PBL-PRJ001-R1-v1.0
aprovação humana T1–T6
```

Fato novo material pode exigir nova decisão governada no nível correto, mas não
autoriza reescrever decisões históricas.

---

## 20. Handoff para novo chat/agente

Use este bloco como leitura rápida:

```text
Estamos continuando o NAAMIVE na branch lifecycle-reboot.

A Normative Baseline vigente é NB-0002 — RATIFIED / IN FORCE.
NB-0001 é histórica e imutável.

Technology Baseline v0.10 está APPROVED / FROZEN.
TIR v1.0 está APPROVED.
EX-001 e EX-002 são terminais/históricas; CR-WI001-01 e CR-WI001-02 permanecem
FAIL históricos. EX-003 produziu a segunda remediação; CR-WI001-03 comprovou
F003, F004 e CR-WI001-02-F001 como resolvidos. CR-WI001-03-F001 permanece
não bloqueante.

Planning Round 1 está COMPLETE.
Business Baseline final da rodada: PBL-PRJ001-R1-v1.0.
Audit phase: CLOSED.
Última auditoria válida: AUD-009.
Known blocking findings: 0.
Further audit required para essa rodada: NO.
Não criar nova auditoria da Planning Round 1.

Depois do fechamento da rodada, o Project Owner exerceu HUMAN_APPROVAL_T1_T6.

T1 MOD-001 IDENTIFIED → DEFINED
T2 VI-001 IDENTIFIED → DEFINED
T3 VI-001 DEFINED → PLANNED
T4 MOD-001 DEFINED → PLANNED
T5 DT-001 v1 CANDIDATE / NOT CURRENT → CURRENT
T6 Roadmap v2 CANDIDATE / NOT CURRENT → CURRENT

Estado corrente esperado:
Project = PLANNING
MOD-001 = PLANNED
VI-001 = PLANNED
DT-001 v1 = CURRENT
Roadmap v2 = CURRENT
12 Work Items = PROPOSED
1 IN_REVIEW (WI-001)
1 Development Cycle (DC-001)
3 Executions (EX-001 SUCCEEDED / HISTORICAL; EX-002 SUCCEEDED / HISTORICAL; EX-003 SUCCEEDED)
Implementation authority = GRANTED
Code Review = CR-WI001-01 FAIL / HISTORICAL; CR-WI001-02 FAIL / HISTORICAL; CR-WI001-03 PASS_WITH_FINDINGS
Acceptance = NOT GRANTED
Implementation = INDEPENDENT CODE REVIEW COMPLETED / NON_BLOCKING FINDING OPEN

A aprovação T1–T6 está registrada em:
project/naamive/projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_T1_T6.md

O decision_input_commit dessa aprovação é:
cf4f2c032d61835329db820d9490250927b6bfeb

Esse commit é o snapshot de entrada da decisão, não necessariamente o HEAD atual.
No começo da sessão confira git status e git log -1.

Próximo avanço governado:
Disposition de CR-WI001-03-F001, depois acceptance separado.

Não promova WI-001 automaticamente.
Não reexecute EX-001 terminal.
Não promova WI-001 para DONE sem review/audit/aceite aplicáveis.
Não reabra auditoria encerrada.
Não crie subagentes sem autorização explícita.
Humano controla commit/push/merge/rebase/reset/clean.
```

---

## 21. Manutenção deste arquivo

Atualizar quando houver:

```text
novo checkpoint/commit relevante
mudança de baseline normativa
nova decisão humana
mudança de lifecycle corrente
Work Item promovido para READY
Development Cycle criado
Execution criada
finding bloqueante
início autorizado de implementação
mudança material da próxima ação
```

Não transformar este arquivo em changelog infinito.

Manter somente:

```text
passado necessário
+
estado corrente
+
próxima ação
+
regras críticas de retomada
```

---

## 22. Estado atual em uma tela

```text
PROJECT..................... NAAMIVE / PRJ-001
BRANCH...................... lifecycle-reboot

NORMATIVE BASELINE.......... NB-0002
NB-0002 STATUS.............. RATIFIED / IN FORCE
TECHNOLOGY BASELINE......... v0.10 APPROVED / FROZEN
TIR......................... v1.0 APPROVED

PLANNING ROUND 1............ COMPLETE
BUSINESS BASELINE........... PBL-PRJ001-R1-v1.0
LAST VALID AUDIT............ AUD-009
AUDIT PHASE................. CLOSED
KNOWN BLOCKING FINDINGS..... 0
FURTHER ROUND-1 AUDIT....... NO

HUMAN APPROVAL T1–T6........ GRANTED / EXERCISED
MOD-001..................... PLANNED
VI-001...................... PLANNED
DT-001 v1................... CURRENT
ROADMAP v2.................. CURRENT

WORK ITEMS.................. 12 PROPOSED / 1 IN_REVIEW (WI-001)
DEVELOPMENT CYCLES.......... 1 (DC-001)
EXECUTIONS.................. 3 (EX-001 historical; EX-002 historical; EX-003 SUCCEEDED)
VALIDATION.................. NOT EXECUTED
DELIVERY.................... NOT DELIVERED
IMPLEMENTATION AUTHORITY.... GRANTED
IMPLEMENTATION.............. INDEPENDENT CODE REVIEW COMPLETED / NON_BLOCKING FINDING OPEN

DECISION INPUT COMMIT....... ef10e525164f16d14b7416eab4e2de781e35ccec
NEXT GOVERNED ACTION........ disposition de CR-WI001-03-F001; acceptance separado
```
