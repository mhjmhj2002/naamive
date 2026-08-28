---
task: UI-01-PREVALIDATION-01
parent_task: UI-01
document_type: prevalidation
status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: STATE_ACTION_PROJECTION:v1
depends_on: [AUT-01, REC-01, GAT-01, GAT-03, AUT-03, REC-02, GAT-02]
consumes_contracts: [WORK_ITEM_DELIVERY:v2/eligibility/v1, RECOVERY_POLICY:v1, AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1, REVIEWER_AND_BLOCK_RECOVERY:v1, DELIVERY_PAUSE_CANCELLATION:v1]
governs: [UI-01]
validated_at: 2026-08-28
---

# UI-01-PREVALIDATION-01 — Projeção única de estado e ações

## Decisão de desbloqueio

**PREVALIDATION_READY_FOR_IMPLEMENTATION.** UI-01 deve implementar somente o
contrato `STATE_ACTION_PROJECTION:v1`. Ele substitui a composição pública ad
hoc entre `projectDetail`, `phase3Detail`, `catalogGateProjection`,
`deliveryLifecycleProjection`, recovery e assurance por uma leitura canônica,
versionada e autorizada para um principal concreto.

Esta pré-validação fecha UI01-F01 a UI01-F09. Não altera lifecycle, catálogo de
gates, RBAC, scheduler, recovery, assurance, pause ou cancellation. Esses
contratos continuam sendo as autoridades dos fatos e comandos que a projeção
apenas torna legíveis.

UI-01 permanece `TO DO` até a implementação e sua matriz de evidências serem
concluídas. UI-02 continua dona de painéis especializados de parada; UI-01 é
dona da infraestrutura canônica que os alimenta.

## 1. Autoridade e precedência

Em caso de conflito, aplicar a seguinte ordem:

1. `GATE_POLICY.md`, `PROJECT_LIFECYCLE.md`, `MODULE_LIFECYCLE.md`,
   `ORCHESTRATION_PROTOCOL.md` e os workflows/versionamentos publicados;
2. contratos concluídos de LR-01/LR-02, AUT-01/AUT-02/AUT-03, REC-01/REC-02,
   GAT-01/GAT-02/GAT-03;
3. este contrato, somente para o schema público, capability read-only,
   leitura consistente, cursor, transporte SSE e ownership de renderização;
4. código e dados históricos apenas como evidência de compatibilidade, nunca
   como autorização para inferir nova ação.

O servidor é a autoridade de lifecycle, gates, recovery, atividade e
capabilities. A projeção é informativa e nunca substitui a revalidação no
comando. O navegador nunca calcula uma transição, elegibilidade, causa de
recovery, autoridade ou requisito de confirmação a partir de nomes de estado.

## 2. Leitura consistente, identidade e schema público

O endpoint canônico de UI-01 recebe o `project_id` selecionado e o principal já
autenticado. Ele constrói uma única resposta em uma transação read-only com
snapshot consistente. Todas as consultas de projeto, recursos, gates,
recovery, activity, stop e capability usam esse mesmo snapshot; não é válido
juntar resultados de consultas independentes que possam observar gerações
distintas.

`snapshot_now` é um único instante capturado uma vez para a construção da
projeção. Junto ao snapshot read-only do banco, ele forma a fronteira temporal
da observação. Toda decisão temporal nessa resposta — expiração de lease,
grant, credential/principal quando aplicável e outra expiração específica da
projeção — usa exatamente esse valor. Não é permitido consultar o relógio de
parede novamente em etapas diferentes da construção. `snapshot_now` é interno
por padrão e só pode ser exposto como diagnóstico explícito, nunca como uma
nova fonte de autoridade para o cliente.

`as_of_event_id` é o maior `events.id` do projeto visível no snapshot. É o
cursor monotônico dos fatos/eventos server-side e o valor `0` só é válido para
projeto sem evento. Ele não ordena requests concorrentes do cliente e não deve
exigir a criação artificial de evento somente para cercar uma corrida de GET.
Quando uma mutação autoritativa precisar ser observável publicamente, seu
contrato de origem continua responsável por persistir o fato/evento durável.
Uma resposta não pode usar relógio, ordem de fetch ou versão de recurso como
substituto do cursor factual.

O contrato público é allowlist. A implementação deve montar novos objetos com
os campos abaixo; aplicar `publicValue()` a um agregado interno é somente uma
defesa adicional e não implementa o contrato. Referências de evidência podem
ser publicadas por identidade/hash/classificação quando o principal possuir
leitura, mas nunca payload de provider, segredo, credential, transcript,
stdout/stderr de tentativa ou campos internos não listados.

```text
StateActionProjection:v1
  schema_version: "STATE_ACTION_PROJECTION:v1"
  project_id: string
  as_of_event_id: non-negative integer

  project:
    lifecycle_state: string
    canonical_state: string
    workflow_code: string | null
    workflow_version: integer | null
    legacy: boolean
    journey_status: string
    focus_resource_kind: PROJECT | MODULE | WORK_ITEM | EXECUTION | GATE | null
    focus_resource_id: string | null

  resources:
    modules: ModuleProjection[]
    work_items: WorkItemProjection[]
    gates: GateProjection[]
    delivery: DeliverySummary | null
    recovery: RecoverySummary[]
    assurance: AssuranceSummary[]

  activity:
    state: IDLE | QUEUED | RUNNING | RETRYABLE | WAITING_RECONCILIATION |
           PAUSED | CANCELLED | UNKNOWN
    running_count: non-negative integer
    queued_count: non-negative integer
    retryable_count: non-negative integer
    reconciliation_count: non-negative integer
    items: ActivityProjection[]

  stop:
    paused: StopRecordSummary | null
    cancelled: StopRecordSummary | null
    archived: boolean
    reconciliation_required: boolean

  cause:
    code: string | null
    resource_kind: PROJECT | MODULE | WORK_ITEM | EXECUTION | GATE | null
    resource_id: string | null

  next_action: NextActionSummary | null
  allowed_actions: ActionDescriptor[]
```

```text
ActivityProjection
  job_id: string | null
  resource_kind: PROJECT | MODULE | WORK_ITEM | EXECUTION
  resource_id: string
  kind: string
  state: QUEUED | RUNNING | RETRYABLE | WAITING_RECONCILIATION | UNKNOWN
  lease_expires_at: ISO-8601 instant | null
  heartbeat_at: ISO-8601 instant | null
  execution_or_attempt_id: string | null
```

Cada `ModuleProjection` e `WorkItemProjection` tem, no mínimo, identidade,
`lifecycle_state`, `canonical_state`, `workflow_code`, `workflow_version` e
`legacy`. `GateProjection` inclui identidade, `gate_code`, `status`, `version`,
scope, decisões publicadas e referências de evidência permitidas. O resumo de
delivery/recovery/assurance publica somente seu estado, identidade, geração ou
versão aplicável, cause/continuation e referências permitidas. `journey_status`
é um resumo explicitamente derivado; não substitui nem sobrescreve o estado de
nenhum recurso.

Portanto, é proibido usar o estado do último módulo como `project.lifecycle_state`,
`project.canonical_state`, `display_status` ou `status_reason` do projeto. Um
foco pode apontar para um módulo ou work item, mas seu tipo e identidade devem
ser explícitos. PROJECT, MODULE, WORK_ITEM e EXECUTION conservam identidades e
estados distintos, mesmo quando o agregador macro os relaciona.

## 3. Estados históricos e adapters

O adapter é selecionado exclusivamente pelo par persistido
`workflow_code`/`workflow_version` do recurso:

| Classificação | `legacy` | Estado legível | `allowed_actions` |
| --- | ---: | --- | --- |
| workflow/version atual publicado | `false` | adapter atual versionado | capabilities resolvidas normalmente |
| workflow/version legado conhecido | `true` | adapter legado explícito e versionado | somente capabilities explicitamente publicadas pelo adapter |
| workflow, versão ou mapeamento ausente/desconhecido | `true` | estado bruto + `journey_status=LEGACY_READ_ONLY` | `[]` |

Nenhum fallback pode criar ação por `state.includes(...)`, por texto de status,
por último evento ou por semelhança de nome histórico. Um adapter legado que
não consiga provar a semântica e a fence exigida também é read-only
fail-closed. A resposta deve preservar a leitura do registro histórico, sem
declarar que ele satisfaz o lifecycle corrente.

## 4. Activity truth e paradas

Cada `ActivityProjection` representa uma atividade concreta e nunca uma escolha
arbitrária de “job atual”. Uma atividade `RUNNING` significa atividade runtime
comprovada, e somente pode ser publicada quando o snapshot contém o
job/attempt correspondente com:

```text
job.status = LEASED
AND job.lease_expires_at > snapshot_now
```

`job_id`, `kind`, `lease_expires_at`, `heartbeat_at` e, quando necessário, a
identidade durável de execution/attempt vêm desse mesmo fato. Um heartbeat pode
enriquecer a mensagem; não substitui o lease. `operations.status = RUNNING`, o
nome do lifecycle ou uma operação sem attempt/lease nunca provam que um agente
está executando. Lease expirado não é `RUNNING` e não contribui para
`running_count`.

Os contadores são a cardinalidade de `items` na respectiva classificação. Uma
atividade ambígua/expirada/não classificável pode ser preservada como item
`UNKNOWN`, mas não aumenta os quatro contadores. A agregação não remove itens
de atividades concorrentes: dois jobs válidos de work items distintos resultam
em dois itens e `running_count = 2`.

| Fato runtime observado | `activity.state` | Nunca afirmar |
| --- | --- | --- |
| lease válido de job/attempt | `RUNNING` | — |
| job/intent enfileirado sem lease | `QUEUED` | que há agente executando |
| falha elegível para retry | `RETRYABLE` | que há agente executando |
| efeito/lease/handoff incerto que exige reconciliação | `WAITING_RECONCILIATION` | que há agente executando |
| pause ativo no escopo aplicável | `PAUSED` | continuidade automática normal |
| cancellation efetiva | `CANCELLED` | qualquer continuação pendente |
| lease expirado, sem lease ou correlação ambígua | `UNKNOWN` ou estado não-running derivável | que há agente executando |

`stop` é calculado do mesmo snapshot. Pause, cancellation, archive e
reconciliation exigida são fatos independentes da atividade e devem ser
mostrados separadamente; cancellation vence toda continuação ainda não
confirmada, conforme GAT-02. O `activity.state` agregado é somente um resumo
de apresentação, não altera o estado dos recursos ou itens, e é calculado na
seguinte precedência determinística:

1. cancellation efetiva: `CANCELLED`;
2. pause efetivo: `PAUSED`;
3. algum item exigindo reconciliação: `WAITING_RECONCILIATION`;
4. algum item com lease válido: `RUNNING`;
5. algum item retryable: `RETRYABLE`;
6. algum item queued: `QUEUED`;
7. evidência operacional ambígua, expirada ou não classificável: `UNKNOWN`;
8. ausência das condições anteriores: `IDLE`.

Itens podem continuar visíveis como observações históricas/runtime durante
pause ou cancellation, mas sua mera existência não cria continuação na UI.

## 5. Capability read-only e descritores de ação

`allowed_actions` é a lista ordenada de `ActionDescriptor`, não uma lista de
strings. Cada elemento é uma capability publicada e deve satisfazer a
interseção abaixo no snapshot da projeção:

```text
ação publicada para workflow/version atual ou adapter legado explícito
∩ lifecycle, gate, recovery, stop e fences atuais
∩ tipo de principal
∩ principal/grant ativos e não expirados
∩ role permitida
∩ project scope e resource scope
```

Criar `resolveCapability(principal, requirement)` como operação read-only, sem
escrever `auth_audit_records`. `authorize()` continua sendo a operação de
enforcement e auditoria no endpoint de comando. Ambas devem usar uma única
regra interna de matching de grants, incluindo principal ativo, tipo humano ou
service, action code, grant ativo, expiração, project scope, resource scope e
roles permitidas. Não é permitido chamar `authorize()` em GET apenas para
sondar capabilities, nem manter uma segunda matriz de roles em UI-01.

Principal de serviço só recebe descritores de ações de serviço publicadas no
seu contrato e nunca comandos humanos. Principal humano nunca recebe
`DELIVERY_EXECUTE`, `WORKER_EXECUTE` ou `AGENT_EXECUTE`. Ações automáticas de
AUT-01/AUT-02/AUT-03 são projetadas como atividade/continuação, não como
`START_DEVELOPMENT`, `SUBMIT_QA`, `MERGE` ou `INTEGRATE` clicáveis.

```text
ActionDescriptor
  code: string
  target:
    resource_kind: PROJECT | MODULE | WORK_ITEM | GATE | ACCEPTANCE | BLOCK | PAUSE
    resource_id: string
  command:
    method: POST
    href: same-origin API path
    idempotency_required: boolean
  expected:
    resource_version?: integer
    gate_version?: integer
    pause_version?: integer
    fence?: string
    as_of_event_id: integer
  confirmation:
    required: boolean
  input:
    schema: object | null
    required_fields: string[]
```

Somente descritores para comandos já publicados pelos contratos de origem são
válidos. Em particular, decisão de gate usa o catálogo GAT-01 e sua authority;
pause/resume/cancel usa GAT-02; recovery usa REC-01/REC-02. `href`, schema,
requisitos de dados, versão e fence são derivados pelo servidor de fatos
persistidos. O navegador não os completa por inferência. O endpoint revalida
principal, grant, scope, role, workflow, lifecycle, gate, pause/cancellation,
fence, versão e idempotência. Capability removida entre render e clique deve
falhar `403`; estado/fence/versão obsoleto deve falhar `409` ou outro erro
fail-closed publicado.

`next_action` é apenas a explicação resumida da continuação prioritária e não
uma autorização implícita. Se sua continuação for humana e o principal for
elegível, ele pode referenciar o `code` de um descritor presente; se não for,
deve informar a espera/autoridade sem expor comando.

## 6. API, SSE e fencing de respostas

UI-01 publica um único endpoint de detalhe para a projeção. Endpoints legados
podem permanecer para clientes compatíveis, mas o renderer novo não os combina
nem usa `?phase3=true`, gates, delivery, recovery ou assurance como fontes
paralelas. A migração remove a leitura concorrente depois que a projeção única
for adotada; uma resposta parcial não é aceitável.

O SSE conserva eventos como notificações, não como patch autoritativo de DOM.
Cada evento relevante solicita `refreshProjection()` coalescido. O cliente
mantém `selected_project`, `selection_generation`, `refresh_generation`,
`last_applied_refresh_generation`, `last_projection_seq`, um
`AbortController` para a request corrente e no máximo um refresh pendente.
Cada invocação de `refreshProjection()` incrementa `refresh_generation` e
captura `request_selection_generation` e `request_refresh_generation`.

Uma resposta somente pode ser aplicada se:

```text
response.project_id === selected_project
AND request_selection_generation === selection_generation
AND request_refresh_generation === refresh_generation
AND request_refresh_generation > last_applied_refresh_generation
AND response.as_of_event_id >= last_projection_seq
```

Após aplicação bem-sucedida, o cliente grava:

```text
last_applied_refresh_generation = request_refresh_generation
last_projection_seq = response.as_of_event_id
```

`as_of_event_id` cerca progressão factual server-side;
`selection_generation` cerca troca de projeto; `refresh_generation` cerca a
ordem de requests dentro da mesma seleção. Eles não são intercambiáveis. Assim,
uma resposta tardia de refresh mais antigo deve ser ignorada mesmo que tenha o
mesmo `as_of_event_id` — ou cursor maior — que a projeção já aplicada, pois
pode conter capability observada antes de expiração/revogação de grant.

Ao selecionar outro projeto, o cliente fecha o SSE anterior, aborta a request
anterior quando possível, incrementa `selection_generation`, zera o cursor da
seleção nova e ignora todas as respostas tardias. Eventos repetidos, replay e
reconnect podem produzir no máximo um refresh coalescido por ciclo; nunca
podem restaurar ação que a projeção posterior retirou. O cursor só avança após
uma resposta aplicada com sucesso. A implementação deve testar explicitamente
o caso A antigo terminar depois do caso B novo, inclusive quando ambos possuem
o mesmo cursor factual e B remove uma capability por expiração/revogação.

## 7. Ownership de renderização e segurança de DOM

Há exatamente um coordenador de detalhe:

```text
refreshProjection() -> renderProjection(projection)
                         -> renderProjectSummary()
                         -> renderModules()
                         -> renderWorkItems()
                         -> renderActivity()
                         -> renderGatesAndStops()
                         -> renderActions()
```

Sub-renderers recebem somente a projeção aplicada e são chamados
explicitamente pelo coordenador. É proibido reatribuir `renderProject`,
encadear wrappers, criar fetch dentro de sub-renderer ou usar
`MutationObserver` para refetch/reconciliação da projeção. Observers só podem
existir para acessibilidade/layout local sem I/O e sem modificar actions.

O renderer cria texto com `textContent` ou escaping explícito. Dados da
projeção, inclusive labels, reason, evidence summary e event type, não entram
em `innerHTML` interpolado. Cada refresh substitui a superfície de actions de
forma determinística; assim action removida desaparece, não duplica e não
reaparece por render tardio.

## 8. Matriz mínima obrigatória de implementação

Antes de certificar UI-01, testes unitários, PostgreSQL/API e browser real
devem provar pelo menos os casos abaixo. Fixtures devem usar facts persistidos,
não respostas fabricadas que ignorem as regras de capability.

| Área | Cobertura obrigatória |
| --- | --- |
| Projeção | workflow/estado canônico; legado conhecido; legado desconhecido read-only; estados separados de projeto/módulo/WI/execution; gate aberto/fechado; delivery, recovery, assurance; pause, cancel e archive |
| Capability | principal autorizado/não autorizado; resource scope; grant expirado/revogado; serviço sem ação humana; descriptor completo; confirmação/input; version/fence; grant removido entre render e clique (`403`); estado alterado (`409`/fail-closed) |
| Activity | lease válido é `RUNNING`; lease expirado não é ativo; queued, retryable, waiting reconciliation e paused não são running; operação RUNNING sem lease não inventa agente; dois leases válidos preservam dois itens e `running_count = 2`; atividade mista preserva itens e aplica a precedência agregada; pause/cancel vencem somente o resumo agregado |
| Caminho automático | não há botão Start Dev, QA, merge ou integração no caminho AUT-01/AUT-02; continuação automática é mostrada apenas como status |
| SSE/concurrency | cursor factual, replay, evento duplicado, refresh coalescido, completion fora de ordem, reconnect, troca de projeto, resposta tardia do projeto anterior e action obsoleta que não reaparece; A/B da mesma seleção e mesmo `as_of_event_id`, com B iniciado depois, aplicado primeiro e A descartado pelo `refresh_generation` |
| DOM/browser | único owner; nenhum botão duplicado; retirada de action some; atores com grants distintos veem capabilities distintas; comando real converge para nova projeção; nenhum loop de fetch por observer |
| Regressão | endpoints de comando continuam com enforcement/auditoria; leitura de projetos históricos permanece possível; APIs legadas mantidas somente enquanto houver cliente compatível |

Os testes de revalidação devem provar que a projeção não cria autoridade:
alterar grant, gate, version, fence ou stop após o GET e antes do POST não pode
permitir o efeito. A matriz deve registrar o inventário dos renderers, observers
e derivadores de action removidos/substituídos, a contagem de requests por SSE
coalescido e evidência DOM/browser correspondente.

Em particular, a matriz de capability deve executar: actor recebe ação; GET A
começa; grant expira ou é revogado; GET B começa sem a ação; ambos podem ter o
mesmo `as_of_event_id`; B é aplicado; A chega depois e é descartado por
`refresh_generation`; e o POST da ação previamente renderizada falha pela
autorização independente do servidor. A matriz de activity deve cobrir dois
leases válidos, mistura de `RUNNING`/`QUEUED`/`RETRYABLE`, expiração de um lease
antes de `snapshot_now`, pause e cancellation com itens preservados mas resumo
agregado em `PAUSED`/`CANCELLED`.

## 9. Resolução dos findings da auditoria

| Finding | Fechamento normativo neste contrato |
| --- | --- |
| UI01-F01 | Seções 1–2 definem `STATE_ACTION_PROJECTION:v1`, schema allowlist, snapshot e `as_of_event_id`. |
| UI01-F02 | Seção 5 exige capability por principal read-only compartilhando a regra de enforcement sem criar audit falso. |
| UI01-F03 | Seção 2 separa identities/estados e limita `journey_status` a resumo explícito. |
| UI01-F04 | Seção 4 define `RUNNING` por lease válido, distingue queue/retry/reconcile/pause/expired lease e preserva atividades concorrentes sem colapsá-las em um job arbitrário. |
| UI01-F05 | Seção 7 estabelece owner único, veda wrappers/observers de I/O e derivação client-side. |
| UI01-F06 | Seção 6 distingue `as_of_event_id` para fatos server-side, `selection_generation` para seleção e `refresh_generation` para ordem de requests, com abort, coalescing e regras de aplicação. |
| UI01-F07 | Front matter e UI-01 atualizado incluem AUT-03, REC-02 e GAT-02 como dependências. |
| UI01-F08 | Seção 3 define adapters versionados e fallback legado read-only fail-closed. |
| UI01-F09 | Seção 5 fecha `ActionDescriptor`, confirmação/input, expected version/fence e revalidação. |

## 10. Limites de escopo e aceite da pré-validação

Esta pré-validação não autoriza um novo estado global, uma API que exponha
payload interno, uma segunda matriz de roles, polling para simular progresso,
um comando humano para o pipeline automático nem continuação de provider.
Provider/runtime permanece efêmero conforme as regras do repositório; a UI só
observa fatos persistidos e referências permitidas.

Com este documento, a implementação pode começar sob
`PREVALIDATION_READY_FOR_IMPLEMENTATION`. O aceite de UI-01 somente ocorre
quando todos os requisitos de sua task e a matriz da seção 8 estiverem
implementados e validados.
