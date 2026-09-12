# AUD-002 — Auditoria independente, destrutiva e adversarial da rodada 1 de planejamento

**Resultado:** `FAIL`  
**Data da auditoria:** 2026-09-11  
**Auditor:** Codex, contexto corrente de auditoria independente  
**Objeto:** candidata local de planejamento de `PRJ-001 / MOD-001 / VI-001`  
**Escopo de escrita:** exclusivamente este relatório

## Contexto, candidata e limitação de independência

Esta é uma nova auditoria de readiness, orientada a provar que a candidata não
está apta à decisão humana de promover `VI-001` de `DEFINED` para `PLANNED`.
Ela não aprova estado, implementação, decisão humana ou Delivery.

A candidata canônica auditada é exclusivamente:

```text
project/naamive/
```

Foram considerados os arquivos locais existentes, inclusive não commitados. Não
foram usados GitHub, rede, remoto, `fetch`, `pull` ou sincronização externa. A
árvore anteriormente problemática `project/naamive/project/naamive/` está
ausente nesta execução; ela não foi usada como fonte.

Há uma limitação material registrada como `AUD2-002`: a candidata não preserva
o principal autor do planejamento nem uma relação auditável entre autor e
auditor. Assim, este contexto foi separado para executar a análise, mas a
independência normativa não pode ser provada somente pelo workspace.

## Escopo e autoridades confrontadas

Foram lidos integralmente `AUDIT_REQUEST_CODEX.md`, `AUD-001`, os artefatos
enumerados na solicitação (Need, Project, Module, VI, DeliveryTarget, roadmap,
estado, board, política, plano de validação e WI-001..WI-012), e os artefatos
locais relacionados a activity, decisions, findings e manifest.

Foram confrontados, em particular:

- `governance/normative-baselines/NB-0002.md` (`IN FORCE`);
- Technology Baseline v0.10 e o manifest congelado 2.11;
- TIR v1.0, Implementation Foundation Contract e First Vertical Slice Plan;
- lifecycles de Project, Module, ValueIncrement, Work Item e Execution;
- Delivery Target, Development Roadmap, governança, gate, audit/evidence,
  authority e continuity/recovery.

Os sete hashes dos documentos do conjunto técnico congelado conferem com
`technology/10_TECHNOLOGY_BASELINE_2_11_FREEZE_MANIFEST.md`. Portanto, nenhum
finding decorre de mutação do conjunto técnico congelado.

## Metodologia

1. Leitura local e confronto de estados, ownership, hierarchy, gates,
   dependências, critérios, evidence e projections entre todos os artefatos da
   candidata.
2. Revalidação individual dos dez findings de `AUD-001`, exigindo evidência de
   resolução, e não apenas texto que anuncia uma correção.
3. Testes adversariais de restart/currentness, baseline, authority,
   continuidade, TIR versus lifecycle e decisão que um implementador teria de
   inventar.
4. Verificação de integridade do pacote. O `sha256sum --check` de
   `project/naamive/MANIFEST.md` falhou: `APPLY_README.md` diverge; os demais
   membros listados passaram.

## Revalidação de AUD-001

| Finding anterior | Classificação | Evidência concreta |
|---|---|---|
| AUD-001 | RESOLVED | WI-001 agora declara `Owner: PRJ-001` e `Governing scope: PROJECT`; WI-002..WI-012 declaram `Owner: MOD-001` e `Governing scope: MODULE`, mantendo `VI-001` apenas como referência. O índice de WIs confirma a mesma relação. |
| AUD-002 | PARTIALLY_RESOLVED | `MODULE.md` agora descreve capacidade de negócio, limites, atores, riscos e sucesso, mas ainda declara `Lifecycle state: IDENTIFIED`; `CURRENT_STATE.md` também o mantém `IDENTIFIED`, embora VI-001 filha já esteja `DEFINED`, decomposta em doze WIs. Não há decisão/evidence de `IDENTIFIED → DEFINED`. |
| AUD-003 | PARTIALLY_RESOLVED | `PROJECT.md` e `CURRENT_STATE.md` corrigiram o lifecycle para `PLANNING` e declaram impacto. Ainda não existe registro de transição/gate com intent, principal, authority ref, evidence refs, findings, versão e continuidade; a busca na candidata não encontra `normative_baseline_ref`. |
| AUD-004 | PARTIALLY_RESOLVED | `DELIVERY_TARGET.md` agora usa `REQUIRED_FOR_TARGET`, apresenta sets e `supersedes = none`. Faltam `created_at`, `normative_baseline_ref` canônico, referência verificável à decisão de criação e histórico de decisão; o nome de uma pessoa não substitui o proof de authority. |
| AUD-005 | STILL_OPEN | `ROADMAP.md` permanece uma sequência textual de 14 passos, sem `roadmap_id`, `scope_ref`, baseline, `normative_baseline_ref`, entries que referenciem fatos, versões, predecessor/supersedes ou continuity record. `EXECUTION_BOARD.md` admite ser projeção e seus “Wait ... planning/readiness” não fornecem causa, owner, saída, fallback, cadência ou escalada. |
| AUD-006 | STILL_OPEN | TIR ainda declara repetidamente `Implementation: AUTHORIZED FOR VS-01` e `Authority to start: APPROVED` (`readiness/00_TIR_INDEX.md`, `03_FIRST_VERTICAL_SLICE_PLAN.md`, `06_TIR_APPROVAL_RECORD.md`), enquanto a candidata mantém VI `DEFINED`, todos os WIs `PROPOSED` e proíbe Execution antes de `READY`. Nenhum registro local torna explícita a precedência operacional entre essas afirmações. |
| AUD-007 | PARTIALLY_RESOLVED | WI-007/008 agora citam consultas de Project e WI-010 exige watermark/fonte rastreável. Ainda não há Work Item ou decisão que defina source-of-truth de Project, current/history, fixture governada, fontes da `projection.activity_center`, regra de rebuild, invalidação/outbox, ownership e testes de recuperação. |
| AUD-008 | PARTIALLY_RESOLVED | Os WIs passaram a ter owner, intenção, impacto, critérios e evidence esperada. Todavia, a evidence esperada é o mesmo texto genérico nos 12 WIs; não há matriz WI → critérios → testes → evidence/review/audit, nem condições verificáveis por dependência. Os WIs materiais ainda não mostram fora de escopo e baseline/authority específicos que permitam sua futura readiness sem nova decisão. |
| AUD-009 | RESOLVED | A solicitação agora existe sob o caminho canônico exigido e `project/naamive/project/naamive/` não existe. Não foi encontrada árvore duplicada que possa substituir a candidata. |
| AUD-010 | STILL_OPEN | `AUDIT_REQUEST_CODEX.md` está `READY FOR AUDIT`, mas `CURRENT_STATE.md` ainda diz `NOT YET AUDITED BY CODEX` e `EXECUTION_BOARD.md` diz que a próxima ação é completar o pacote “before submitting ... audit”. Não há evento/continuidade que reconcilie esses fatos operacionais. |

**Totais de findings anteriores:** `RESOLVED = 2`; `PARTIALLY_RESOLVED = 5`;
`STILL_OPEN = 3`; `SUPERSEDED = 0`.

## Novos findings desta auditoria

### AUD2-001 — Manifesto da baseline de planejamento não fecha e cruza a fronteira canônica

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `project/naamive/MANIFEST.md`,
  `DELIVERY_TARGET.md` (baseline `self-hosted bootstrap Part 1 v0.2`) e a
  candidata como conjunto.
- **Regra/autoridade violada:** `NB-0002` §4 (conflito/currentness opera
  fail-closed); `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§2–8;
  `lifecycle/14_DEVELOPMENT_ROADMAP_MODEL.md` §§2–5 e 13.
- **Evidência encontrada:** `MANIFEST.md` declara o pacote “Part 1 v0.2” e
  inclui `APPLY_README.md`, que fica fora de `project/naamive/`. A verificação
  local do manifesto falhou especificamente para esse membro. O manifesto não
  inclui ele próprio, `AUD-001` nem qualquer relação de versão para a auditoria
  que condiciona a decisão; a candidata também não contém um
  `normative_baseline_ref` ou snapshot próprio para a baseline de planejamento.
- **Cenário concreto de falha:** uma decisão humana ou reauditoria referencia
  “Part 1 v0.2”, mas não consegue reconstruir qual conjunto exato de arquivos
  foi auditado. Alteração no arquivo externo pode trocar a baseline percebida
  sem mudança detectável na árvore canônica.
- **Remediação exigida:** criar, por decisão governada, um snapshot/manifest
  íntegro inteiramente dentro da árvore canônica, com escopo explícito,
  versionamento, currentness, hashes de todos os membros relevantes e relação
  clara com o gate/audits. Não reutilizar o manifesto falho como proof de
  baseline.

### AUD2-002 — Independência e autoria da rodada não são demonstráveis

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `AUDIT_REQUEST_CODEX.md`,
  `AGENT_EXECUTION_POLICY.md`, `activity/ACTIVITY_LOG.md`, `decisions/`,
  `findings/` e o futuro gate da rodada.
- **Regra/autoridade violada:** `governance/04_AUDIT_AND_REVIEW_POLICY.md`
  §§14, 16, 36–38 e 48; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md`
  §§9–10 e 16; `contracts/05_AUTHORITY_CONTRACT.md` §§2, 13 e 15.
- **Evidência encontrada:** a política apenas declara que o contexto produtor
  não deve ser auditor. Nenhum artefato da candidata identifica o principal
  autor do planejamento, auditor elegível, segregação, baseline auditado,
  critérios, evidence considerada ou timestamp. `decisions/` só possui um
  README, e `findings/` só possui template.
- **Cenário concreto de falha:** o mesmo principal produz as remediações e
  emite um `PASS` em outro contexto chamado “Codex”; após restart não há dado
  que permita detectar a autoauditoria nem provar que o audit cobriu a mesma
  candidata.
- **Remediação exigida:** materializar o registro de autoria e o gate/audit com
  principals, segregação verificável, scope, business baseline,
  `normative_baseline_ref`, critérios, evidence, findings, resultado,
  limitações e timestamp. Um rótulo de contexto não basta.

### AUD2-003 — Riscos materiais são apenas rótulos, sem tratamento governado

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `VALUE_INCREMENT.md`, `MODULE.md`,
  `PROJECT.md`, `VALIDATION_PLAN.md` e `findings/`.
- **Regra/autoridade violada:** `lifecycle/03_PROJECT_LIFECYCLE.md` §§9.2–9.5;
  `lifecycle/04_MODULE_LIFECYCLE.md` §§6.2 e 6.5;
  `governance/01_GOVERNANCE_MODEL.md` (registro de risco: descrição,
  probabilidade, impacto, owner, mitigação, status e validade);
  `governance/04_AUDIT_AND_REVIEW_POLICY.md` §27.
- **Evidência encontrada:** VI-001 lista cinco `RISK-VI001-*` e Module lista
  quatro riscos preliminares. Nenhum tem owner, probabilidade, mitigação,
  status, validade, decision/acceptance ou ligação a testes/evidence. O único
  plano de validação lista checks, mas não liga cada check a um risco.
- **Cenário concreto de falha:** o implementador de sessão ou grants descobre
  que rotação/revogação conflita com o contrato de autorização. Sem owner ou
  tratamento, ele escolhe entre reduzir segurança, ampliar escopo ou bloquear;
  qualquer escolha é uma decisão material não autorizada.
- **Remediação exigida:** registrar os riscos materiais com os campos
  governados, vincular mitigação a WI/critério/teste/evidence, e abrir Finding
  com boundary de stop para todo risco cuja mitigação ainda dependa de decisão.

### AUD2-004 — Projeção atual atribui disposição de DeliveryTarget a Module

- **Severidade:** P2
- **Blocking:** NO
- **Artefatos afetados:** `CURRENT_STATE.md` e, como fonte canônica de
  membership, `DELIVERY_TARGET.md`.
- **Regra/autoridade violada:** `lifecycle/11_DELIVERY_TARGET_MODEL.md` §§3,
  11, 12 e 15; `lifecycle/04_MODULE_LIFECYCLE.md` §§14–15 e 24.
- **Evidência encontrada:** `CURRENT_STATE.md` afirma `Module target
  disposition.. REQUIRED_FOR_TARGET`. O DeliveryTarget v1 atribui a disposição
  somente a `VI-001`, como exige o modelo de `DeliveryTargetMembership`; não
  existe membership de Module nem semântica normativa para esse campo.
- **Cenário concreto de falha:** uma futura projeção/agregação usa o label do
  Module para considerar capacidade satisfeita ou bloqueada, divergindo do
  conjunto real de Value Increments obrigatórias do target.
- **Remediação exigida:** remover ou renomear o campo como derivação explicada
  da membership de VI, com origem e regra de cálculo; não persistir
  `REQUIRED_FOR_TARGET` como fato intrínseco de Module.

## Totais, blockers e verdict

Os totais abaixo incluem os findings de `AUD-001` que permanecem aplicáveis
(inclusive `PARTIALLY_RESOLVED`) e os novos findings desta rodada; não contam
findings históricos integralmente resolvidos.

| Métrica | Total |
|---|---:|
| P0 | 0 |
| P1 | 10 |
| P2 | 2 |
| P3 | 0 |
| Findings bloqueadores | 10 |

**Blockers aplicáveis:** AUD-002, AUD-003, AUD-004, AUD-005, AUD-006,
AUD-007, AUD-008, AUD2-001, AUD2-002 e AUD2-003.

## Remediações objetivas necessárias

1. Fixar uma baseline de planejamento íntegra, canônica e verificável
   (`AUD2-001`) antes de solicitar decisão sobre a candidata.
2. Registrar autoria, independência, gate, authority, evidence e continuity da
   rodada; não presumir independência por nome de contexto (`AUD2-002`).
3. Completar o Module e materializar a transição governada
   `IDENTIFIED → DEFINED`, ou retornar a VI para estado compatível (`AUD-002`).
4. Materializar fatos de origem/transição do Project e VI, incluindo baseline,
   gate, authority, evidence, finding linkage e handoff (`AUD-003`).
5. Completar DT-001 com os metadados e decisão verificável que ainda faltam e
   corrigir sua projeção de Module (`AUD-004`, `AUD2-004`).
6. Substituir a lista textual por roadmap canônico versionado, com entries,
   dependências verificáveis e continuity acionável; derivar o board dele
   (`AUD-005`, `AUD-010`).
7. Registrar expressamente que TIR é pré-condição técnica, não autorização de
   lifecycle/Execution, e fazer todos os documentos locais refletirem a mesma
   regra (`AUD-006`).
8. Definir a fonte canônica de Project e o contrato completo de
   `projection.activity_center`, incluindo rebuild/invalidation/recovery
   (`AUD-007`).
9. Completar a matriz de cada WI material: escopo/fora de escopo, condição de
   dependência, critérios, testes, evidence e audit/readiness (`AUD-008`).
10. Converter os riscos listados em tratamento governado e bloquear somente os
    escopos que ainda dependam de decisão material (`AUD2-003`).
11. Após remediações materiais, produzir nova auditoria independente contra o
    novo snapshot. Este relatório não é aprovação e não pode ser reutilizado
    sem coverage explícita.

## Verdict final

FAIL

**VI-001 apta para aprovação humana:** NO

Este `FAIL` não promove estados, não concede aprovação, não autoriza
implementação e não altera a autoridade humana exigida para qualquer decisão
posterior.
