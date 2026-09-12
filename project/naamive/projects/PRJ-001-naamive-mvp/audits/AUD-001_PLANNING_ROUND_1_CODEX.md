# AUD-001 — Auditoria independente e adversarial da rodada 1 de planejamento

**Resultado:** `FAIL`  
**Data da auditoria:** 2026-09-10  
**Auditor:** Codex, contexto independente de auditoria  
**Objeto:** candidata local de planejamento de `PRJ-001 / MOD-001 / VI-001`  
**Escopo de escrita desta execução:** somente este relatório

## Contexto e delimitação

Esta foi uma auditoria destrutiva de readiness. O objetivo foi procurar prova de
que a candidata não está segura para a transição `VI-001 DEFINED → PLANNED`, e
não confirmar coerência aparente.

O único arquivo local encontrado com a solicitação foi
`project/naamive/project/naamive/projects/PRJ-001-naamive-mvp/AUDIT_REQUEST_CODEX.md`.
Contudo, ele manda auditar e escrever o relatório em caminhos sob
`project/naamive/projects/PRJ-001-naamive-mvp/`. Esta auditoria seguiu esses
caminhos explicitamente enumerados para a candidata e para o destino obrigatório
do relatório. A existência de uma segunda árvore divergente é registrada em
`AUD-009` e não foi usada para substituir silenciosamente a candidata auditada.

Não foram usados GitHub, remoto, web, fetch, pull ou sincronização externa. Não
foi modificado nenhum artefato da candidata.

## Escopo auditado

- `project/naamive/{README.md,MANUAL_OPERATING_MODEL.md,GAP_PROTOCOL.md,BOOTSTRAP_DECISION.md,need/NEED-001.md}`;
- `PRJ-001`: Project, roadmap, DeliveryTarget, estado atual, Execution Board e
  política de agentes;
- `MOD-001`, `VI-001`, plano de validação e WI-001 a WI-012;
- a solicitação de auditoria e as divergências locais entre as duas árvores.

## Autoridades e fontes confrontadas

- `governance/normative-baselines/NB-0002.md` — `IN FORCE`;
- Technology Baseline v0.10 e seu freeze manifest;
- TIR v1.0, Implementation Foundation Contract e First Vertical Slice Plan;
- lifecycles de Project, Module, ValueIncrement, Work Item, Development Cycle e
  Execution;
- Delivery Target, Development Roadmap, governance, finding/audit/evidence e
  continuity/recovery.

Como verificação de integridade local, os hashes dos membros consultados de
`NB-0002` conferem com o certificado; também conferem os quatro hashes do
manifest congelado da Technology Baseline v0.10. Portanto, os findings abaixo
não decorrem de alteração local não controlada dessas autoridades.

## Metodologia

1. Leitura integral da solicitação localizada e dos artefatos da candidata
   indicados por ela, incluindo os do working tree não commitado.
2. Leitura e confronto das regras aplicáveis nas autoridades locais, respeitando
   a precedência `NB-0002 > Technology Baseline > TIR > planejamento`.
3. Teste adversarial de estados, ownership, hierarchy, dependências, gates,
   evidências, authority, restart/recovery, DeliveryTarget e consistência de
   projeções.
4. Comparação local das duas árvores de planejamento, exclusivamente para
   detectar ambiguidade de candidata; nenhuma delas foi alterada.

## Findings

### AUD-001 — Work Items de VI-001 usam owner/scope normativamente inválido

- **Severidade:** P0
- **Blocking:** YES
- **Artefatos afetados:** `WI-002` a `WI-012`, `EXECUTION_BOARD.md`,
  `VALUE_INCREMENT.md` e o índice de Work Items.
- **Regra/autoridade violada:** `NB-0002`, `lifecycle/05_WORK_ITEM_LIFECYCLE.md`
  §§2 e 4.3; `lifecycle/01_LIFECYCLE_MODEL.md` §13.5; e
  `lifecycle/23_CROSS_LIFECYCLE_MODEL.md` §2. Work Item possui exatamente um
  owner governante: Project ou Module. No caminho de Module, ela referencia uma
  ValueIncrement; ValueIncrement não a substitui como owner. A Technology
  Baseline não pode redefinir lifecycle, e a norma prevalece em eventual
  conflito.
- **Evidência encontrada:** WI-002 a WI-012 declaram
  `Governing scope: VALUE_INCREMENT: VI-001` (por exemplo, WI-002:6,
  WI-012:6). Nenhuma delas declara owner `MODULE`; `EXECUTION_BOARD.md` também
  as apresenta como trabalho de VI. O lifecycle vigente determina explicitamente
  `Project or Module`, nunca ambos nem ValueIncrement como owner.
- **Cenário concreto de falha:** um executor promove WI-005 a `READY` usando
  VI-001 como owner; uma mudança material no Module ou no Project não tem owner
  normativo inequívoco contra o qual revalidar baseline, authority e
  descendentes. Outra implementação pode seguir TB-39 e persistir
  `VALUE_INCREMENT` como scope; a reconciliation não saberá qual regra de
  invalidação de owner aplicar.
- **Remediação exigida:** corrigir o plano para que WI-002..WI-012 tenham
  `owner/governing scope = MODULE: MOD-001` e uma referência separada a
  `VI-001`; manter WI-001 como `PROJECT: PRJ-001` se ela for realmente
  transversal. Registrar a interpretação de precedência e revisar dependências,
  gates e futura modelagem física para preservar essa relação.

### AUD-002 — Hierarquia declarada está incompatível com os estados atuais

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `MODULE.md`, `VALUE_INCREMENT.md`, `CURRENT_STATE.md`,
  `ROADMAP.md` e todos os Work Items.
- **Regra/autoridade violada:** `lifecycle/04_MODULE_LIFECYCLE.md` §§5–7,
  35 e seção “Module DEFINED → identificar/decompor ValueIncrements → Module
  PLANNED”; `lifecycle/10_VALUE_INCREMENT_LIFECYCLE.md` §§2 e 5.
- **Evidência encontrada:** `MODULE.md:3` e `CURRENT_STATE.md:8` afirmam que
  MOD-001 está `IDENTIFIED`. Ao mesmo tempo, `VALUE_INCREMENT.md:3` afirma que
  a filha VI-001 já está `DEFINED`, possui 12 Work Items e um plano de
  validação; `MODULE.md:33-62` já declara a decomposição e limites. O Module
  não informa classificação de impacto, disposição obrigatória/opcional,
  atores, riscos, dependências materiais ou questões abertas, que são conteúdo
  mínimo de sua definição.
- **Cenário concreto de falha:** a aprovação da VI permitiria planejar trabalho
  em um Module que formalmente ainda não tem responsabilidade, limites e
  classificação definidos. Um implementador teria de decidir se uma lacuna é
  do Module, da VI ou do Project, podendo burlar a revalidação exigida em mudança
  de parent/baseline.
- **Remediação exigida:** completar a definição do Module, classificá-lo e
  registrar transição/handoff governado `IDENTIFIED → DEFINED`; só então manter
  a decomposição de VIs e produzir o plano de Module adequado. Não alterar o
  estado por edição implícita.

### AUD-003 — O estado e o gate de planejamento do Project não são fatos
governados verificáveis

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `NEED-001.md`, `PROJECT.md`, `CURRENT_STATE.md`,
  `ROADMAP.md`, `VALUE_INCREMENT.md` e `EXECUTION_BOARD.md`.
- **Regra/autoridade violada:** `lifecycle/03_PROJECT_LIFECYCLE.md` §§2, 4, 5,
  9 e 29; `governance/01_GOVERNANCE_MODEL.md` §§ de classificação e gate;
  `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§3–4 e 10.
- **Evidência encontrada:** `PROJECT.md:3` chama o estado de `ACTIVE`, que não
  é estado principal do lifecycle (o documento usa em separado `Current phase:
  PLANNING`). Need, Project, Module e VI não registram classificação de impacto
  nem `normative_baseline_ref` como fato da instância. O “Current human gate” em
  `CURRENT_STATE.md:21-38` só contém dois rótulos de resultado; não identifica
  objeto/versão do plano, principal e autoridade, critérios, baseline,
  evidências mínimas, findings, decisão/handoff ou continuidade resultante.
  A mera lista de inputs em `PROJECT.md:12-18` não é vínculo de baseline da
  instância nem evidence de transição anterior.
- **Cenário concreto de falha:** dois humanos avaliam versões diferentes do
  plano; um registra “APPROVE PLAN” e outro interpreta que a autorização TIR já
  basta. Não há como provar qual baseline e qual autoridade governaram
  `DEFINED → PLANNED`, nem como revalidar os descendentes se o plano mudar.
- **Remediação exigida:** substituir a representação informal por um registro
  manual governado de estado/phase e gate: lifecycle principal correto,
  classificação, Business Baseline, `normative_baseline_ref`, decisão de origem,
  autoridade/principal, critérios/evidências/findings e continuity/handoff.
  Preservar história de bootstrap como evidence de origem, sem fabricá-la.

### AUD-004 — DT-001 v1 não atende ao mínimo normativo de DeliveryTarget

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `DELIVERY_TARGET.md`, `PROJECT.md`,
  `CURRENT_STATE.md` e `VALUE_INCREMENT.md`.
- **Regra/autoridade violada:** `lifecycle/11_DELIVERY_TARGET_MODEL.md` §§2,
  3, 12, 13 e 15; `lifecycle/03_PROJECT_LIFECYCLE.md` planejamento de valor e
  target.
- **Evidência encontrada:** `DELIVERY_TARGET.md` só contém state, Project e uma
  tabela com `VI-001 | REQUIRED` (linhas 1–15). A disposição canônica é
  `REQUIRED_FOR_TARGET`, `OPTIONAL_FOR_TARGET` ou `OUT_OF_TARGET`, não
  `REQUIRED`. Faltam target name, scope statement, conjuntos required/optional/
  out-of-target, baseline reference, `normative_baseline_ref`, decision
  authority, created_at, supersedes_ref e history. As referências abreviadas a
  `REQUIRED` se repetem em Project, Current State e VI.
- **Cenário concreto de falha:** em uma candidatura futura, alguém interpreta
  `REQUIRED` como label informativa, inclui uma VI opcional sem registrá-la ou
  reduz compromisso editando v1. O escopo histórico da Delivery não poderá ser
  reconstruído nem bloqueado deterministicamente.
- **Remediação exigida:** materializar DT-001 v1 com todos os campos mínimos e
  a disposição canônica de membership; harmonizar todas as projeções. A decisão
  deve vincular baseline, authority e versionamento; mudança de composição deve
  criar versão/decisão governada, não editar v1.

### AUD-005 — ROADMAP e board não materializam continuidade acionável

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `ROADMAP.md`, `EXECUTION_BOARD.md`,
  `CURRENT_STATE.md` e `AGENT_EXECUTION_POLICY.md`.
- **Regra/autoridade violada:** `lifecycle/14_DEVELOPMENT_ROADMAP_MODEL.md`
  §§2–5, 13–19; `contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md` §§2–15;
  `lifecycle/03_PROJECT_LIFECYCLE.md` §29.
- **Evidência encontrada:** `ROADMAP.md:3-35` declara somente `State: CURRENT`,
  `Version: 1` e nove passos textuais. Não tem scope_ref, Business Baseline,
  `normative_baseline_ref`, currentness/histórico, roadmap entries referenciando
  fatos canônicos, condições verificáveis de dependência, owner, causa,
  fallback, escalada ou cadência. O board tem “Next Action” genérica, como
  “Wait WI-001 planning/readiness” (`EXECUTION_BOARD.md:107-118`), mas não o
  record de continuidade obrigatório. Ele mesmo declara ser apenas
  projeção/control artifact (`:31-34`).
- **Cenário concreto de falha:** após restart ou troca de agente, WI-002 fica
  aguardando uma readiness que ninguém possui como ação atribuída; um finding
  futuro pode ser anotado no board sem remediation entry, `GOVERNED_BLOCK` ou
  rota de saída. O sistema/manual não detecta dead-end e o agente precisa usar
  memória da conversa.
- **Remediação exigida:** definir um roadmap manual canônico para VI-001,
  versionado e ligado ao baseline, com entries para Work Items, decisão humana e
  remediações; cada dependência precisa de resultado/condição, impacto,
  responsável e fallback. Persistir continuity com `cause_ref`, next action/
  exit condition, authority, escalada e cadência. O board deve derivar desse
  registro.

### AUD-006 — TIR “autorizou” VS-01 sem amarração explícita ao gate de
Project/VI ainda pendente

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `readiness/00_TIR_INDEX.md`,
  `readiness/01_TECHNICAL_IMPLEMENTATION_READINESS.md`,
  `readiness/03_FIRST_VERTICAL_SLICE_PLAN.md`, `readiness/06_TIR_APPROVAL_RECORD.md`,
  `PROJECT.md`, `CURRENT_STATE.md` e `EXECUTION_BOARD.md`.
- **Regra/autoridade violada:** ordem de autoridade da TIR §1; NB-0002 §4;
  `lifecycle/03_PROJECT_LIFECYCLE.md` §9.5; `lifecycle/10_VALUE_INCREMENT_LIFECYCLE.md`
  §6.4; `lifecycle/05_WORK_ITEM_LIFECYCLE.md` §§4.4, 5 e 7.
- **Evidência encontrada:** TIR index e First Vertical Slice Plan afirmam
  “Implementation: AUTHORIZED FOR VS-01” e “Authority to start: APPROVED”. Já
  `PROJECT.md:46-50`, `CURRENT_STATE.md:21-40` e
  `EXECUTION_BOARD.md:362-391` mantêm Project em PLANNING, VI em DEFINED e
  proíbem execução antes de audit + approval + readiness individual. Nenhum
  artefato resolve expressamente a relação: TIR é readiness técnica, mas não
  cria Work Item READY/Execution nem substitui a transição de Project/VI.
- **Cenário concreto de falha:** um agente lê o artefato TIR como a autoridade
  humana suficiente para iniciar WI-001; outro o lê como apenas parâmetro
  técnico. As duas ações são plausíveis nos arquivos locais e produzem avanço ou
  bloqueio arbitrário.
- **Remediação exigida:** registrar decisão de precedência e gate explícito:
  TIR aprovado é pré-condição técnica para VS-01, mas somente a combinação de
  Project/Module/VI em estado compatível, Work Item READY, authority e demais
  checks cria Execution elegível. Referenciar essa decisão em roadmap, gate e
  cada readiness review.

### AUD-007 — Não há trabalho que defina a fonte canônica de Project e a
derivação do Activity Center exigidas pela própria jornada

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** `WI-002`, `WI-007`, `WI-008`, `WI-010`, `WI-011`,
  `VALIDATION_PLAN.md`, `VALUE_INCREMENT.md` e
  `readiness/03_FIRST_VERTICAL_SLICE_PLAN.md`.
- **Regra/autoridade violada:** Technology Baseline TB-20, TB-26–29, TB-63–66,
  TB-75–79 e TB-139; TIR First Vertical Slice Plan §§3, 7 e 8; princípio de não
  inventar decisão material de `lifecycle/03_PROJECT_LIFECYCLE.md` §9.3.
- **Evidência encontrada:** WI-007 exige `GET /api/projects` e WI-008 exige
  `GET /api/projects/:projectId`, mas suas dependências (WI-005/006/007) só
  produzem identity/session/grant e não definem o modelo canônico mínimo de
  Project, sua persistência/history, fixture governada ou contrato de leitura.
  WI-010 exige `projection.activity_center` e watermark, sem definir fontes
  canônicas, eventos/versões de origem, rebuild trigger, ownership ou testes de
  derivação. O TIR exige que a query respeite current state e que a projection
  seja rebuildable; a exclusão de “Project lifecycle mutation” não responde como
  o Project canônico somente-leitura existe.
- **Cenário concreto de falha:** o implementador cria tabela/ad hoc fixture ou
  usa a projeção como verdade para fazer a lista funcionar. Outra pessoa cria
  Activity Center a partir de logs/board. Ambas parecem cumprir endpoints, mas
  violam ownership, history e “projection != truth”, e não se recuperam após
  rebuild/restart.
- **Remediação exigida:** decompor e aprovar explicitamente o mínimo read-only
  canônico de Project (ownership, current/history, fixtures, consulta e
  authorization) e a especificação da projection Activity Center (fontes,
  watermark, invalidação/outbox, rebuild, staleness e testes). Atribuir cada
  resultado a Work Item e dependências antes de sua readiness.

### AUD-008 — Todos os Work Items PROPOSED carecem de conteúdo mínimo e não
suportam readiness/auditoria material

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** WI-001 a WI-012, `EXECUTION_BOARD.md` e
  `VALIDATION_PLAN.md`.
- **Regra/autoridade violada:** `lifecycle/05_WORK_ITEM_LIFECYCLE.md` §§4.3,
  5, 5.1, 6.2 e 7; `governance/04_AUDIT_AND_REVIEW_POLICY.md` §§11–14 e 23;
  `lifecycle/13_WORK_ITEM_DEVELOPMENT_INTERNAL_LIFECYCLE.md` §§5, 10 e 13.
- **Evidência encontrada:** todos os WIs têm state, Project/Module, um
  “Governing scope”, dependências e outcome, mas nenhum declara owner explícito,
  motivo, intenção de negócio, relação com plano, classificação de impacto,
  baseline/normative ref, fora de escopo ou evidência esperada. O texto
  “Process gate” é idêntico e genérico. A validation plan lista gates globais,
  enquanto WI-004..WI-011 não alocam os testes locais/integrados e evidence
  necessários; WI-012 concentra gates finais, apesar de o board proibir adiar
  testes para uma task genérica (`EXECUTION_BOARD.md:189-197`).
- **Cenário concreto de falha:** na readiness de WI-004, o agente escolhe quais
  testes de rotação, CSRF, expiration, integration e audit são “aplicáveis”; em
  WI-010 escolhe a evidence de rebuild. Como não há impacto declarado, também
  pode omitir a audit independente obrigatória para item MATERIAL/CRÍTICO. A
  promoção a READY passa a depender de decisão nova do executor.
- **Remediação exigida:** completar cada WI com o conteúdo mínimo de PROPOSED e
  uma matriz WI → acceptance → testes → evidence → review/audit. Na readiness,
  incluir authority, baseline corrente, decisões fechadas, dependências com
  condição verificável e findings. Manter WI-012 como consolidação de Validation,
  não como substituto de teste/evidence local.

### AUD-009 — A solicitação e a candidata local apontam para duas árvores
divergentes, sem decisão de currentness

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:**
  `project/naamive/project/naamive/projects/PRJ-001-naamive-mvp/AUDIT_REQUEST_CODEX.md`,
  ambas as árvores `project/naamive/...` e
  `project/naamive/project/naamive/...`.
- **Regra/autoridade violada:** `NB-0002` §4 (conflito opera fail-closed);
  Technology Baseline TB-24, TB-41–42; `lifecycle/14_DEVELOPMENT_ROADMAP_MODEL.md`
  §§2–5 e 13; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§2–8.
- **Evidência encontrada:** o caminho exigido pelo usuário e pelo escopo do
  pedido não contém `AUDIT_REQUEST_CODEX.md`; a solicitação só existe em árvore
  aninhada. As árvores possuem conteúdo diferente: por exemplo, a cópia aninhada
  muda `PROJECT.md` de `State: ACTIVE` para `Lifecycle state: PLANNING`, muda
  DeliveryTarget para `REQUIRED_FOR_TARGET` e altera os WIs para owner MODULE.
  Não há artefato que declare qual árvore é candidata current, qual supersede a
  outra, baseline, decision authority ou lineage.
- **Cenário concreto de falha:** um auditor aprova a cópia corrigida e um
  implementador executa a cópia externa ainda inválida; os dois alegam ter usado
  “PRJ-001 / VI-001”. A evidence/audit não identifica o mesmo objeto e baseline,
  impossibilitando reuso válido.
- **Remediação exigida:** antes de nova auditoria, escolher por decisão governada
  uma única árvore canônica, registrar baseline/currentness/supersession e
  remover a ambiguidade por procedimento controlado. O próximo pedido de audit e
  o destino do relatório devem apontar para a mesma candidata.

### AUD-010 — O estado “pronto para submeter” conflita com a própria solicitação
de auditoria já emitida

- **Severidade:** P2
- **Blocking:** NO
- **Artefatos afetados:** `EXECUTION_BOARD.md` e
  `project/naamive/project/naamive/projects/PRJ-001-naamive-mvp/AUDIT_REQUEST_CODEX.md`.
- **Regra/autoridade violada:** `MANUAL_OPERATING_MODEL.md` §§1–2 e 7;
  `lifecycle/14_DEVELOPMENT_ROADMAP_MODEL.md` §§3 e 18.
- **Evidência encontrada:** `EXECUTION_BOARD.md:395-400` diz que a próxima ação
  é completar/revisar o pacote “before submitting” para a auditoria, enquanto a
  solicitação existente tem status `READY FOR AUDIT` e exige o relatório desta
  rodada. A board se apresenta como fato/projeção operacional, não como exemplo.
- **Cenário concreto de falha:** um restart reproduz estado anterior e alguém
  submete duas vezes ou conclui que a auditoria ainda não começou, criando
  atividade/evidência contraditória.
- **Remediação exigida:** depois de resolver a currentness de AUD-009, atualizar
  o fato operacional de forma governada para refletir a fase real da auditoria,
  com referência a este audit e sem declarar aprovação antecipada.

## Totais e blockers

| Métrica | Total |
|---|---:|
| P0 | 1 |
| P1 | 8 |
| P2 | 1 |
| P3 | 0 |
| Findings bloqueadores | 9 |

**Blockers:** AUD-001 a AUD-009. Em especial, AUD-001 impede que qualquer
readiness ou Execution futura determine o owner normativo de WI-002..WI-012;
AUD-002 a AUD-006 impedem provar que uma transição de planejamento é válida; e
AUD-007 a AUD-009 deixam decisões materiais, evidências e a própria candidata
ambíguas.

## Remediações necessárias, em ordem objetiva

1. Eleger a única candidata canônica e registrar currentness/supersession
   (AUD-009).
2. Corrigir ownership/guiding scope dos WIs conforme NB-0002, sem tratar VI
   como owner (AUD-001).
3. Completar o Module, registrar sua transição governada para `DEFINED` e então
   preservar a decomposição de VI de forma válida (AUD-002).
4. Formalizar estado, classification, baseline, authority, gate e handoff do
   Project/VI; distinguir TIR técnico de autoridade lifecycle (AUD-003 e
   AUD-006).
5. Completar e versionar DT-001 v1 com dispositions canônicas e metadata
   obrigatória (AUD-004).
6. Materializar roadmap/continuity canônicos e derivar o board deles (AUD-005).
7. Decompor a fonte canônica read-only de Project e a derivação/rebuild do
   Activity Center (AUD-007).
8. Completar cada WI PROPOSED e a matriz de testes/evidências/auditoria antes de
   qualquer readiness (AUD-008).
9. Reconciliar a projeção de atividade de auditoria depois da decisão de
   currentness (AUD-010).
10. Submeter a candidata remediada a nova auditoria independente; este relatório
    não pode ser reutilizado como PASS, pois scope, baseline e remediações terão
    mudado materialmente.

## Verdict final

FAIL

**VI-001 apta para aprovação humana:** NO

Este `FAIL` não registra aprovação, promoção de estado ou autorização de
implementação. Uma auditoria futura só poderá emitir `PASS` se não houver
blocker aplicável ao baseline e à candidata canônica então identificada.
