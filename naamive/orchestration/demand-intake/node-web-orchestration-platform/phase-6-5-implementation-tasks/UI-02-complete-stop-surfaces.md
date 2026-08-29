---
task: UI-02
status: TO DO
title: Superfícies completas de parada
depends_on: [UI-01, REC-02, GAT-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
document_type: implementation-specification
prevalidation_status: READY_FOR_IMPLEMENTATION
consumes_contracts: [STATE_ACTION_PROJECTION:v1, RECOVERY_POLICY:v1, REVIEWER_AND_BLOCK_RECOVERY:v1, DELIVERY_PAUSE_CANCELLATION:v1]
introduces_additive_projection: STOP_SURFACE_PROJECTION:v1
validated_at: 2026-08-29
---

# UI-02 — Superfícies completas de parada

## 1. Decisão de pré-validação

**READY_FOR_IMPLEMENTATION.** UI-02 deve implementar superfícies operacionais
completas, server-driven e acessíveis para cada parada legítima. A única fonte
de leitura continua sendo `STATE_ACTION_PROJECTION:v1`, criado pela UI-01. A
implementação adicionará, de modo allowlisted e compatível, a coleção
`stop_surfaces` a essa projeção; não cria endpoint, agregador, state machine ou
fonte de authority paralela.

Esta decisão não reabre REC-01, REC-02, GAT-01, GAT-02, GAT-03 nem UI-01. Os
gaps abaixo são requisitos da implementação UI-02/projeção aditiva quando o
contrato de origem já está fechado.

## 2. Problema e autoridade normativa

A UI atual mostra resumo de `cause`, `next_action`, activity, gates e stops,
mas não explica todas as paradas por recurso. Ela não consegue, de forma
operacional, apresentar espera, owner, decisões, evidência permitida e
continuação de recovery, reviewer/block, delivery, pause e cancelamento. Uma
lista global de ações também pode parecer uma continuação de um recurso errado.

Em conflito, prevalecem, nesta ordem: `GATE_POLICY.md`, lifecycles e
`ORCHESTRATION_PROTOCOL.md`; workflows/versionamentos publicados; GAT-01,
GAT-02, GAT-03, REC-01, REC-02 e AUT-01--03; a pré-validação UI-01; esta
especificação somente para a apresentação e o schema aditivo; runtime e dados
legados como evidência, nunca como autoridade normativa.

`allowed_actions` continua a verdade única de capability para o principal
autenticado no snapshot. Cada endpoint continua a reautorizar e revalidar
versão, fence, lifecycle, gate, pause/cancellation e idempotência. A ausência
de botão para quem não tem authority não transforma a parada em invisível.

## 3. Inventário atual e gaps concretos

`state-action-projection.ts` já constrói a resposta em um snapshot read-only,
preserva recursos independentes, publica gates, recovery, assurance, activity,
stops, `cause`, `next_action` e descritores autorizados. `web/index.html`
mantém a consistência UI-01 (`selectedProject`, gerações, cursor factual,
`AbortController`, coalescing e SSE como invalidação) e renderiza texto via DOM
seguro. Isto é preservado integralmente.

Os gaps a fechar pela UI-02 são:

- não há `stop_surfaces` por recurso: `cause`/`next_action` são um resumo
  prioritário e a tela reduz recovery/assurance/delivery a contagens ou linhas
  mínimas;
- gates não mostram condição, evidência pública, autoridade, decisões
  catalogadas e consequência; delivery não diferencia aceite técnico, gate e
  `DELIVERED`;
- pause/cancel são mostrados só como resumo de projeto, embora records também
  sejam de módulo;
- estágios automáticos de REC-01/REC-02 podem parecer ações humanas porque o
  renderer expõe um formulário genérico para todo descriptor;
- `ActionDescriptor.input.schema` mistura input humano, versões/fences já
  conhecidas e campos técnicos. O browser atualmente pré-preenche alguns por
  nome (`version`, `expected_pause_version`, `fence`), uma heurística
  proibida;
- `AUTHORIZE_REWORK` legado pede `finding_ids`, `delivery_id` e
  `head_sha`; `gateDecisionSchema` pede `version`; e os schemas de
  resume/cancel podem expor versão, fence ou resolução interna;
- `TRANSITION_BLOCK`, `RECONCILE_ACCEPTANCE`, `RECORD_HUMAN_GATE` e
  `DECIDE_REVIEW` ainda podem aparecer como comandos ordinários mesmo quando o
  contrato REC-02 exige continuação automática ou gate catalogado.

## 4. Invariantes de UI-02

1. A tela consome somente uma resposta `STATE_ACTION_PROJECTION:v1` aplicada
   pelo coordenador UI-01. Sub-renderers não fazem fetch, não combinam
   endpoints legados e não inferem lifecycle, cause, recovery, gate,
   terminalidade ou authority a partir de strings.
2. Cada parada é ligada a `resource_kind` e `resource_id`; projeto, módulo,
   work item, execution, acceptance, block e gate nunca são colapsados.
3. Uma coleção completa vence um resumo: ordenação é somente visual e nunca
   remove uma superfície concorrente. `cause` e `next_action` podem apontar a
   uma prioridade, mas não são a lista de paradas.
4. Operação técnica automática é progresso/espera, não botão humano. Somente
   gate humano catalogado ou `allowed_action` humano explicitamente publicado
   pode ter controle acionável.
5. A UI não envia SHA, delivery, finding, worktree, classificação de recovery,
   effect certainty, fence, versão, ID técnico derivável ou identidade de
   principal como escolha humana.
6. Dados públicos são allowlisted e classificados. Nunca publicar prompt,
   transcript, reasoning, stdout/stderr, provider/session/thread data,
   credential, secret ou payload interno.
7. Workflow desconhecido falha fechado: `legacy=true`,
   `journey_status=LEGACY_READ_ONLY`, `allowed_actions=[]`, orientação de
   consulta e nenhuma ação inferida.

## 5. Extensão aditiva: `STOP_SURFACE_PROJECTION:v1`

O campo abaixo é adicionado a `StateActionProjection:v1`; a versão raiz não é
trocada e consumidores UI-01 que a ignorem permanecem compatíveis.

```text
StateActionProjection:v1 (additive)
  stop_surfaces: StopSurfaceProjection[]

StopSurfaceProjection:v1
  schema_version: "STOP_SURFACE_PROJECTION:v1"
  id: stable, deterministic stop-surface identity
  resource_kind: PROJECT | MODULE | WORK_ITEM | EXECUTION | GATE | ACCEPTANCE | BLOCK
  resource_id: string
  category: RECOVERY | REVIEWER_RECOVERY | BLOCK | ESCALATION | GATE |
            INTEGRATION | PAUSE | CANCELLATION | DELIVERY | LEGACY | LIFECYCLE
  type: published stop code
  lifecycle_state: string
  canonical_state: string | null
  cause: { code: string; message: string; reason: string | null }
  operational_message: string
  waiting_for: string | null
  continuation:
    kind: AUTOMATIC | HUMAN_ACTION | EXTERNAL_WAIT | RECONCILIATION |
          TERMINAL | LEGACY_READ_ONLY
    expected: string
    progress: { stage?: string; attempt?: number; exhausted?: boolean } | null
  authority: { required_roles: string[]; scope_kind: string; scope_id: string } | null
  decisions: [{ code: string; label: string; consequence: string }]
  evidence: [{ reference: string; summary: string; classification: PUBLIC | RESTRICTED }]
  action_descriptor_code: string | null
  terminal: boolean
  redaction: { classification: PUBLIC | RESTRICTED; redacted: boolean }
```

`id` é estável por fato normativo (por exemplo, record/gate/recovery/block e
versão/generation aplicável), não pelo texto mostrado. `decisions` vem do
catálogo ou contrato que governa o recurso; `action_descriptor_code` só é
preenchido se o mesmo descriptor estiver presente em `allowed_actions` para o
principal atual. Portanto a tela pode explicar a authority a qualquer leitor,
mas somente renderiza botão para capability publicada. Evidência `RESTRICTED`
é resumida/redatada ou omitida conforme o grant de leitura, sem trocar a
classificação do fato.

O builder server-side cria as superfícies a partir dos mesmos fatos e do mesmo
snapshot de UI-01. Ele não faz uma consulta por cartão e não usa ordenação por
nome de estado. Uma resource sem parada não recebe superfície. Pausa,
cancelamento e archive preservam observações concorrentes, porém suas regras
de precedência determinam a continuação de cada superfície.

## 6. Coleção, seleção e apresentação

As superfícies são agrupadas por resource, com cabeçalho de projeto/módulo/WI
e ordenadas deterministamente por: terminal/cancelamento aplicável, scope,
severidade operacional publicada, creation/event cursor e `id`. Essa ordem não
altera `continuation`, nem substitui um recurso executando por outro bloqueado.
Uma mesma página pode mostrar, simultaneamente, módulo pausado, WI em recovery,
aceite aguardando reviewer, gate aberto e delivery bloqueada.

`cause` e `next_action` permanecem no sumário como a jornada prioritária. Ao
selecionar seu resource, a UI dá foco/âncora à superfície correspondente; ela
não filtra as demais. Não existe estado vazio silencioso: para todo estado de
parada conhecido há mensagem + `waiting_for` + continuação, e para estado não
adaptável há a superfície fail-closed `LEGACY_READ_ONLY`.

## 7. Matriz normativa de paradas

| Estado/causa | Recurso | Operador vê / aguarda | Continuação | Authority / decisões | Descriptor / evidência pública |
| --- | --- | --- | --- | --- | --- |
| `RETRYABLE`; timeout/quota/rate limit | WI/execution | falha transitória, tentativa e causa | `AUTOMATIC`: `RETRY` limitado | nenhuma | nenhum botão; decisão recovery, tentativa e refs permitidas |
| retry técnico em curso | WI/execution | retry automático e progresso | `AUTOMATIC` | nenhuma | sem descriptor; causa/evidence resumidas |
| restart técnico | WI/execution | processo sem efeito comprovado | `AUTOMATIC`: `RESTART` via AUT-01 | nenhuma | sem descriptor; attempt anterior preservada |
| `RECOVERY_REQUIRED` | WI/execution | causa/classificação e efeito conhecido/incerto | `AUTOMATIC` ou `RECONCILIATION` conforme `RecoveryDecision` | somente gate catalogado se material | sem escolha técnica; decision/evidence refs |
| `WAITING_RECONCILIATION` | WI/execution/integration | efeito incerto; fonte sendo consultada | `RECONCILIATION` | nenhuma | sem botão; footprint e refs públicas |
| `REWORK_ELIGIBLE` | WI | finding/evidência preservados e owner corretivo | `AUTOMATIC`: rework/dispatch, salvo gate | nenhuma salvo GAT-01 | sem `AUTHORIZE_REWORK` v2; finding ref resumida |
| `WAITING_FOR_ESCALATION` | WI/block/execution | limite/materialidade, motivo e condição | `HUMAN_ACTION` | `REWORK_ESCALATION` ou `ESCALATED_CLOSURE`; decisões catalogadas | `DECIDE_GATE` se autorizado; gate/evidence/consequências |
| integração bloqueada/divergente | WI/execution | timeout, não registrado ou divergência Git | `RECONCILIATION` ou `AUTOMATIC` `INTEGRATION_RECOVERY` | gate material somente se catálogo o exigir | sem retry genérico; refs Git redatadas |
| `NO_INDEPENDENT_REVIEWER` | acceptance/block | não há reviewer independente e estágios tentados | stages 1--6 `AUTOMATIC`; depois gate/block | GAT-01 apenas quando condição concreta existir | nenhuma ação ordinária; history permitida |
| `REVIEWER_TERMINAL_FAILURE` | acceptance/block | review falho preservado; próximo reviewer | `AUTOMATIC` stages 2--6 | nenhuma até gate publicado | sem rerodar produtor; review/history refs |
| `INDEPENDENCE_EXCEPTION_REQUIRED` | acceptance/block/gate | exceção necessária, policy e expiração | `HUMAN_ACTION` | `INDEPENDENCE_EXCEPTION`: APPROVE/REJECT | `DECIDE_GATE` se autorizado; evidence pública |
| reviewer stages 1--6 | acceptance/block | estágio, tentativa, candidate/routing/specialist permitido | `AUTOMATIC` | nenhuma | sem botão ordinário; progresso redatado |
| reviewer stage 7 | gate/acceptance | gate concreto, condição e consequências | `HUMAN_ACTION` | somente gate GAT-01 compatível | `DECIDE_GATE` se capability |
| reviewer stage 8 | block/escalation | automação esgotada, motivo e histórico permitido | `HUMAN_ACTION` ou `EXTERNAL_WAIT` | gate/authority publicados, se houver | gate descriptor somente; block sem gate permanece explicável |
| block aberto | block | código, dependência/causa e owner | `AUTOMATIC`, `EXTERNAL_WAIT` ou gate conforme matriz REC-02 | não inferir `RESOLVED => rerun producer` | action somente para continuação explicitamente publicada |
| escalada | block/gate | condição material, authority, decisões e efeitos | `HUMAN_ACTION` | `REWORK_ESCALATION`/`ESCALATED_CLOSURE` | `DECIDE_GATE`, não `RECORD_HUMAN_GATE` genérico |
| gate aberto ordinário/condicional | gate | `gate_code`, condição, scope, authority, evidence e consequência | `HUMAN_ACTION` | roles e decisões exatas do catálogo | `DECIDE_GATE`/`DECIDE_DELIVERY_ACCEPTANCE` autorizado |
| `PAUSED` PROJECT | project | motivo, estado prévio e fence; trabalho não avança | `HUMAN_ACTION` ou `RECONCILIATION` no resume | `ON_CALL_OWNER`: RESUME_PROJECT; BUSINESS_OWNER pode cancelar | descriptor de resume apenas se publicado; record público permitido |
| `PAUSED` MODULE | module | motivo/estado prévio do módulo e efeito da pausa pai | `HUMAN_ACTION` ou `RECONCILIATION` | `ON_CALL_OWNER`: RESUME_MODULE | descriptor próprio de módulo; não usar pause de projeto |
| `CANCELLED` PROJECT | project | decisão terminal e fatos preservados | `TERMINAL` | BUSINESS_OWNER foi authority histórica; nenhuma decisão futura | nenhum descriptor; records/evidence redatados |
| `CANCELLED` MODULE | module | decisão terminal/obligation resolution | `TERMINAL` | BUSINESS_OWNER histórica; nenhuma ação futura | nenhum descriptor; não revive no resume pai |
| `RESUME_RECONCILIATION_REQUIRED` | project/module | resume não pode restaurar cegamente; guard divergente | `RECONCILIATION` | nenhuma escolha técnica | sem botão técnico; intent/evidence resumida |
| preparation de delivery | project/package | snapshot e package em preparação | `AUTOMATIC` | nenhuma | sem botão; progresso/evidence release permitida |
| assurance técnica de delivery | acceptance/package | assurance do package exato e seu resultado | `AUTOMATIC` / `RECONCILIATION` | nenhum gate antes de acceptance técnica | sem decisão de entrega |
| `DELIVERY_ACCEPTANCE` aberto | project/gate | package/hash/revision, evidências release/operation/handover | `HUMAN_ACTION` | BUSINESS_OWNER: `APPROVE`, `REWORK` | `DECIDE_DELIVERY_ACCEPTANCE`; **nunca REJECT** |
| delivery `REWORK` | project/package | finding e nova revisão necessária | `AUTOMATIC` ou gate material | owner corretivo derivado server-side | sem atribuir produtor ou pedir IDs técnicos |
| `DELIVERED` | project/module | entrega autoritativa concluída | `TERMINAL` | nenhuma | nenhum descriptor; não confundir aceite técnico |
| `ARCHIVED` conhecido | project/module | arquivo administrativo legado | `LEGACY_READ_ONLY` ou consulta | nenhuma | sem ação nova; não afirmar aderência retroativa |
| workflow legado conhecido | qualquer | adapter/version e orientação limitada | conforme adapter explícito | somente capabilities declaradas | descriptor legado explicitamente suportado |
| workflow desconhecido | qualquer | estado bruto e incompatibilidade | `LEGACY_READ_ONLY` | nenhuma | `allowed_actions=[]` |

Outras paradas já identificadas pela auditoria usam a mesma matriz: discovery
`FAILED` com retry publicado, `WAITING_FOR_EXTERNAL_INPUT` como
`EXTERNAL_WAIT` com resolução autorizada, `QA_IN_PROGRESS`,
`EVIDENCE_REVIEW`, `OUTPUT_SUBMITTED`, `READY_FOR_PHASE_MERGE` e
dependências técnicas como progresso/automação, nunca como gates humanos. A UI
não recria `WAITING_FOR_WORK_ITEM_AUTHORIZATION`: adapter histórico conhecido
é legado; workflow v2 elegível é dispatch automático.

## 8. Recovery técnico, reviewer, block e escalation

`RECOVERY_POLICY:v1` permanece intacta. A superfície apresenta causa,
`effect_certainty`, footprint em forma compreensível, progressão e referência
de evidência permitida, mas não expõe nem deixa escolher `RETRY`, `RESTART`,
`RESUME`, `RECONCILE`, `REWORK`, `RECORD_AND_CONTINUE` ou
`INTEGRATION_RECOVERY`. O servidor/classifier decide; `EFFECT_UNKNOWN`
sempre mostra reconciliação antes de repetição.

`REVIEWER_AND_BLOCK_RECOVERY:v1` também permanece intacto. Stages 1--6 são
automáticos. Stage 7 aparece somente como gate catalogado existente. Stage 8
mostra esgotamento, motivo, tentativas/histórico permitido, block/escalation,
authority e continuação humana publicada. Falha de reviewer não reexecuta
produtor; uma resolução consulta a matriz do block e nunca aplica regra
genérica `RESOLVED => rerun producer`.

Classificação dos descritores atuais a ser implementada na migração UI-02:

| Descriptor atual | Classificação UI-02 | Regra de apresentação / gap |
| --- | --- | --- |
| `TRANSITION_BLOCK` | operação administrativa legada | não é continuação ordinária REC-02; ocultar das stages automáticas e só mostrar se futuro contrato publicar uma decisão humana específica do block |
| `RECONCILE_ACCEPTANCE` | operação técnica | não renderizar como clique ordinário; REC-02/reconciler faz a reconciliação. Publicação atual é gap de projeção/UI |
| `RECORD_HUMAN_GATE` | incompatibilidade com contrato fechado | substituir na superfície por gate GAT-01 e `DECIDE_GATE`; não permitir seleção livre de `gate_type`/decisão |
| `DECIDE_REVIEW` | ação humana normativa restrita | somente para reviewer independente autenticado e review atribuído; é fila de trabalho de review, não recuperação geral nem decisão do operador |
| `AUTHORIZE_REWORK` | legado explícito | nunca no fluxo v2; se adapter legado o publicar, server deriva finding/delivery/SHA e UI coleta apenas justificativa humana permitida |

## 9. Gates, delivery, pause, resume e cancellation

Gates exibem `gate_code`, condição, scope, authority, decisões catalogadas,
consequência de cada decisão e evidence pública. A enum de decisão vem do
descriptor/projeção server-side; não há campo de texto livre para decidir. Quem
não possui grant vê a role/escopo responsável e a continuação, sem botão.

Para delivery, a UI separa preparation automática, assurance técnica,
`RELEASE_TECHNICALLY_ACCEPTED`, gate `DELIVERY_ACCEPTANCE`, rework e
`DELIVERED`. Somente `BUSINESS_OWNER` com capability recebe `APPROVE` ou
`REWORK`; a UI não cria `REJECT`. `DELIVERED` somente é renderizado quando
o lifecycle autoritativo chegou a esse estado.

Project e module têm superfícies independentes para pause/resume/cancel. Só
`ON_CALL_OWNER` pode pausar/retomar no scope publicado; só `BUSINESS_OWNER`
cancelar. Cancelamento é terminal, preserva evidências e vence continuação em
voo. Resume mostra que pode resultar em
`RESUME_RECONCILIATION_REQUIRED`, sem prometer restauração do estado anterior.

## 10. Evolução de `ActionDescriptor`: input binding explícito

UI-02 estende o descriptor de modo aditivo para eliminar heurísticas por nome:

```text
ActionDescriptor (additive)
  presentation: { kind: HUMAN_DECISION | HUMAN_OPERATION | TECHNICAL_OPERATION |
                        ADMINISTRATIVE | LEGACY; label: string; description: string }
  input_binding:
    fields: [{ name, source: HUMAN_INPUT | SERVER_BOUND | SERVER_DERIVED,
               schema?, value?, send: boolean, editable: boolean }]
    decision_options: [{ code, label, consequence }] | null
```

`HUMAN_INPUT` é o único campo editável (por exemplo, justificativa, evidência
humana permitida ou finding narrativo exigido por contrato). `SERVER_BOUND`
tem valor publicado pelo servidor, é enviado automaticamente se o endpoint
precisar dele e nunca é editável: gate/resource/pause version, fence ou ID já
resolvido. `SERVER_DERIVED` não é apresentado nem enviado: SHA, delivery,
finding, worktree, recovery classification, effect certainty, IDs técnicos
deriváveis e qualquer fato reconstituível no servidor. O endpoint continua a
derivar/revalidar tudo; binding não é trust boundary.

Gate decisions devem carregar `decision_options` exatamente do gate catalogado.
Os schemas existentes de `version`, `expected_pause_version`, `fence`,
`finding_ids`, `delivery_id` e `head_sha` são gaps a migrar para esses
bindings, não labels a esconder. O renderer remove o preenchimento baseado em
nomes e não mostra textarea JSON genérico para objetos internos.

## 11. Frontend, segurança e acessibilidade

`renderProjection()` continua o único dono e recebe a coleção já aplicada pelo
fencing UI-01. A implementação acrescenta `renderStopSurfaces(projection)` sem
I/O e liga um botão somente pelo `action_descriptor_code` presente. SSE continua
invalidação, sem patch de DOM, com refresh no reconnect e sem polling.

Cada superfície possui heading legível, descrição sem código técnico como única
informação, relação explícita entre botão e consequência, ordem de tabulação
natural e foco devolvido para a superfície atualizada após ação. Mudanças de
progresso/erro usam região `aria-live`; confirmação é obrigatória para ações
destrutivas ou materiais. Erros 403, 409/stale/version/fence e falhas de rede
recebem texto compreensível e refresh da projeção. O layout funciona em largura
estreita, mantém ação/authority legíveis e não depende apenas de cor.

Toda evidência é renderizada por `textContent`/DOM seguro, com summary público
e indicação de redaction; nunca interpolada por `innerHTML`. A UI não mostra
segredo, credencial, prompt, provider transcript/session, stdout/stderr ou
payload interno, mesmo a usuário autorizado a executar a ação.

## 12. Estratégia de implementação

1. Modelar tipos allowlisted, builder no mesmo snapshot e fixtures de
   `STOP_SURFACE_PROJECTION:v1`; publicar fatos por resource sem alterar
   contratos de lifecycle.
2. Adicionar classificação server-side de descriptor e bindings explícitos;
   migrar primeiro gates, pause/resume/cancel, delivery e assurance/recovery.
3. Atualizar renderer para cartões por resource, progresso automático,
   authority/decisões/evidence e formulários somente de `HUMAN_INPUT`.
4. Preservar response fencing/UI-01 e substituir o formulário global genérico
   sem introduzir fetches ou inferências client-side.
5. Testar contrato, RBAC, DOM e PostgreSQL onde comando/persistência forem
   afetados; manter adapters legados explícitos e unknown fail-closed.

## 13. Matriz de testes futura

| Grupo | Evidência mínima |
| --- | --- |
| superfícies | cada classe da matriz, causa/mensagem/espera/continuação, múltiplas paradas e resource correto |
| RBAC | autorizado recebe somente descriptor compatível; não autorizado vê authority sem botão; cross-project/revogado negados pelo servidor |
| automação | retry/restart/reconcile, preparation/assurance e stages REC-02 1--6 têm progresso e nenhum botão |
| reviewer/block | zero reviewer, falha terminal, stages 7/8, exception expirada, block/escalation e prova de não rerodar produtor |
| gates/delivery | gate real e stale version; APPROVE/REWORK; inexistência de REJECT; package/technical acceptance não confundidos com DELIVERED |
| pause/cancel | PAUSE/RESUME/CANCEL de PROJECT e MODULE, resume reconciliation, cancellation terminal e concorrência/fence |
| descriptor | bindings HUMAN/SERVER_BOUND/SERVER_DERIVED; nenhum input técnico editável; gate enum catalogada; legado AUTHORIZE_REWORK seguro |
| consistência | selection/refresh fencing, resposta tardia, SSE reconnect/coalescing, cursor factual e ausência de polling |
| segurança/a11y | redaction, sem dados de provider/segredo, teclado, foco, aria-live, confirmação, erro stale legível e responsividade |
| legado | adapter conhecido somente com capability declarada; workflow desconhecido LEGACY_READ_ONLY e lista vazia |

## 14. Critérios objetivos de aceite

- Toda parada conhecida da matriz possui superfície completa; qualquer não
  adaptável falha fechado em `LEGACY_READ_ONLY`.
- Há coleção completa por resource, sem ocultar paradas simultâneas.
- Nenhuma decisão/ação é inferida no browser; toda ação visível vem de
  `allowed_actions` e todo botão revalida no servidor.
- Recovery técnico e stages automáticos não são cliques ordinários.
- Gates apresentam somente decisões catalogadas; delivery não oferece REJECT.
- Project e module suportam suas superfícies de pause/resume/cancel distintas.
- Inputs técnicos foram separados de input humano por binding explícito.
- UI-01 fencing/SSE, redaction, acessibilidade, responsividade e compatibilidade
  legacy foram cobertos pela matriz de testes.

## 15. Riscos, evidências de fechamento e limite

Riscos principais: uma extensão da projeção virar agregador paralelo; ação
técnica reaparecer como botão; descriptor vazar payload interno; ou a prioridade
visual mascarar uma parada concorrente. Mitigar com builder único no snapshot,
allowlist, enum de bindings, fixtures com múltiplos recursos, testes negativos
de RBAC e revisão de acessibilidade/redaction.

O fechamento posterior exige: schema/fixtures da projeção, matriz
estado--causa--superfície coberta, testes unitários/HTTP/browser/PostgreSQL
aplicáveis, evidência de RBAC e redaction, prova de response fencing/SSE e
revisão de que não foi introduzido endpoint ou fonte de estado paralela.

Esta rodada é exclusivamente normativa. Não implementa runtime, migration,
frontend ou testes e mantém UI-02 em `TO DO` até a implementação e suas
evidências de fechamento.
