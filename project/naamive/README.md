# NAAMIVE — Self-hosted Project Workspace

**Canonical root:** `project/naamive/`  
**Project:** PRJ-001 — NAAMIVE MVP  
**Current Project lifecycle:** PLANNING  
**Planning Round 1:** COMPLETE  
**Business Baseline final da rodada:** `PBL-PRJ001-R1-v1.0`  
**Normative Baseline:** `NB-0002`  
**Last valid audit:** AUD-009 — historical FAIL  
**Audit phase:** CLOSED  
**Implementation:** NOT AUTHORIZED  

---

## Current governance truth

```text
Need NEED-001........... ACCEPTED
Project PRJ-001......... PLANNING
Module MOD-001.......... PLANNED
VI-001.................. PLANNED
DT-001 v1............... CURRENT
Roadmap v2.............. CURRENT
Work Items.............. 12 PROPOSED / 1 READY
WI-001................... READY
Readiness authority...... GRANTED / EXERCISED
Development Cycles...... 1 (DC-001)
Executions.............. 0
Validation.............. NOT EXECUTED
Delivery................ NOT DELIVERED
Implementation.......... NOT AUTHORIZED
```

A verdade operacional detalhada deve ser consultada em:

- `projects/PRJ-001-naamive-mvp/CURRENT_STATE.md`
- `projects/PRJ-001-naamive-mvp/EXECUTION_BOARD.md`
- `projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md`

Este README é uma visão resumida e não substitui os artefatos canônicos de estado,
autoridade ou lifecycle.

---

## Human approval T1–T6

Após o fechamento documental da Planning Round 1, o Project Owner exerceu uma
nova decisão humana explícita contra:

```text
business_baseline_ref... PBL-PRJ001-R1-v1.0
normative_baseline_ref.. NB-0002
```

Registro governado:

`projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_T1_T6.md`

A decisão materializou exatamente:

```text
T1  MOD-001       IDENTIFIED → DEFINED
T2  VI-001        IDENTIFIED → DEFINED
T3  VI-001        DEFINED → PLANNED
T4  MOD-001       DEFINED → PLANNED
T5  DT-001 v1     CANDIDATE / NOT CURRENT → CURRENT
T6  Roadmap v2    CANDIDATE / NOT CURRENT → CURRENT
```

Resultado corrente:

```text
MOD-001........... PLANNED
VI-001............ PLANNED
DT-001 v1......... CURRENT
Roadmap v2........ CURRENT
```

Essa decisão não promove Work Items, não cria Development Cycle, não cria
Execution e não autoriza implementação.

---

## Relação com a Planning Baseline v1.0

`PBL-PRJ001-R1-v1.0` permanece o snapshot documental final da Planning Round 1.

A aprovação T1–T6 é uma decisão posterior, tomada contra esse snapshot. Ela não
reescreve retroativamente a baseline histórica e não cria, por si só, uma nova
Planning Baseline.

Portanto, é esperado que o estado corrente do Project possa avançar além dos
estados registrados no snapshot de entrada, desde que exista decisão governada
posterior e rastreável.

---

## Fechamento documental da Planning Round 1

AUD-009 identificou a necessidade de revalidar 24 objetos materiais antes
vinculados à v0.5. A v1.0 materializou essa revalidação por objeto e estabilizou
a documentação da rodada.

Por decisão humana, a fase de auditoria da Planning Round 1 foi encerrada.

```text
Planning Round 1............. COMPLETE
Audit phase.................. CLOSED
Last valid audit............. AUD-009
Known blocking findings...... 0
Further audit required....... NO
Documentation................ STABLE
```

AUD-001..AUD-009 permanecem evidência histórica. O fechamento da rodada não
autoriza implementação e não deve ser reinterpretado como autorização implícita
para Work Items, Cycles ou Executions.

---

## Próximo limite governado

O fato de Module, Value Increment, DeliveryTarget e Roadmap estarem aprovados ou
correntes não significa que desenvolvimento possa começar.

O próximo avanço governado para WI-001 é avaliar/criar uma Execution válida
para DC-001 / WI-001.

Fluxo mínimo:

```text
Work Item READY
→ Development Cycle DC-001 CREATED
→ avaliar/criar Execution autorizada
```

Enquanto não houver Execution válida/autorizada:

```text
Implementation = NOT AUTHORIZED
```

Nenhum agente, commit, teste ou sucesso técnico pode substituir esse gate.

---

## Regras para agentes

Agentes que operarem neste workspace devem ler o `AGENTS.md` na raiz do
repositório antes da task.

Para tarefas mecânicas ou locais:

- trabalhar somente no escopo necessário;
- não criar subagentes sem autorização explícita;
- não transformar validação local em auditoria;
- não fazer crawl do repositório sem necessidade;
- preferir comandos simples e não interativos;
- parar quando os critérios da task estiverem satisfeitos.

Autoridade humana, normas, lifecycle, gates e baselines continuam controlados
pelos artefatos governados aplicáveis.

---

## Princípio operacional

```text
estado atual
+
evidência
+
autoridade
+
baseline
+
regra aplicável
=
próxima ação legítima
```

O NAAMIVE não avança porque um artefato existe, um agente terminou ou um comando
passou.

Ele avança quando a transição aplicável foi legitimamente autorizada e
materializada.
