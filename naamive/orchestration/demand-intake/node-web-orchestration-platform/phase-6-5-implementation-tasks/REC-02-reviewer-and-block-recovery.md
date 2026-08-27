---
task: REC-02
status: IN_PROGRESS
title: Recuperação de reviewer e blocks
depends_on: [AUT-03, GAT-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
contract: REVIEWER_AND_BLOCK_RECOVERY:v1
prevalidation_status: READY_FOR_IMPLEMENTATION
---

# REC-02 — Recuperação de reviewer e blocks

## Reabertura de auditoria — 27/08/2026

REC-02 foi reaberta por findings pós-commit e permanece `IN_PROGRESS`. Esta
reabertura não altera o contrato `REVIEWER_AND_BLOCK_RECOVERY:v1`; ela exige
que o runtime volte a aderir a ele antes de novo aceite.

| Finding | Correção documental exigida | Critério de fechamento |
| --- | --- | --- |
| F-01 | `INDEPENDENCE_EXCEPTION` deve ter `gate_records`/`gate_decisions` do catálogo GAT-01 como authority canônica; `assurance_human_gates` só pode permanecer em fluxos legados que não sejam REC-02. | Dispatch e decisão do review consomem e revalidam o mesmo gate catalogado. |
| F-02 | Diferenciar espera de gate humano da escalada terminal e retomar a mesma `recovery_key` após `APPROVE`. | A aprovação cria somente o review/dispatch permitido; não cria producer rerun, acceptance, gate ou recovery novos. |
| F-03 | A expiração deve persistir o fail-closed antes de retornar `INDEPENDENCE_EXCEPTION_EXPIRED`. | Sem `review_decision`; review inutilizável, acceptance em espera e block deduplicado persistidos. |
| F-04 | Persistir e tornar auditável a máquina 1–8: retry, reviewer, runtime, role, assistance/routing, specialist, gate e escalada. | Restart evidencia estágio, esgotamento, tentativas, candidate set e candidato selecionado, sem loop. |

Nesta fase documental não se executam testes, migrations ou comandos de build.
REC-02 só pode retornar a `DONE` após uma fase de desenvolvimento e validação
autorizada produzir as evidências previstas na seção de critérios de aceite.

## Contrato normativo

A implementação de REC-02 deve obedecer exclusivamente ao contrato
`REVIEWER_AND_BLOCK_RECOVERY:v1`.

REC-02 consome a fronteira persistida por AUT-03 para recuperação de reviewer e
blocks. Ela não recria snapshots, acceptances ou subjects e não reinterpreta
histórico com policy corrente.

A unidade canônica de recovery é a acceptance já existente e sua identidade
histórica congelada. Há exatamente duas formas canônicas de `recovery_key`:

```text
# snapshot-backed / AUT-03
recovery_key =
  reviewer-recovery:v1:<acceptance_id>:<normative_generation>

# legado sem AssuranceDispatchSnapshot:v1
recovery_key =
  reviewer-recovery:v1:<acceptance_id>:legacy:<policy_id>:<policy_version>
```

Para acceptance snapshot-backed, a identidade é composta por `acceptance_id`,
`assurance_dispatch_snapshot_id`, `subject_kind`, `subject_id`,
`normative_generation`, `policy_id` e `policy_version` persistidos por AUT-03.
Ela sempre usa a primeira forma e nunca a forma legacy.

Para acceptance legada sem `AssuranceDispatchSnapshot:v1`, a identidade
histórica é formada exclusivamente por `acceptance_id` e pelo `policy_id` e
`policy_version` originalmente vinculados. Ela sempre usa a segunda forma,
nunca inventa `normative_generation` e nunca recebe snapshot retroativo.
`subject_kind`, `subject_id` e `normative_generation` podem legitimamente não
existir nesse caso.

Policy corrente nunca entra na identidade legacy nem pode reinterpretar essa
recovery. Se `policy_id` ou `policy_version` originalmente vinculados não
puderem ser determinados de modo inequívoco, REC-02 falha fechado: não cria
`recovery_key` nem recupera automaticamente a acceptance.

Retry, restart, redelivery, reconciler e troca de reviewer usam exatamente a
mesma `recovery_key` e não criam nova recovery identity. REC-02 nunca cria nova
acceptance para a mesma identidade histórica e nunca altera os fatos
snapshot-backed ou a policy/version originalmente vinculada ao legado.

Neste contrato, "recovery generation" é o escopo lógico identificado pela
`recovery_key`: para snapshot-backed, é a `normative_generation` congelada;
para legado, é a identidade histórica legacy e não introduz um campo
`normative_generation` inexistente.

## Objetivo e problema corrigido

Eliminar limbos de reviewer indisponível ou falho e transformar retry, seleção de
reviewer alternativo, fallback de runtime, assistance, routing, especialista e
escalada em um fluxo autônomo, determinístico, idempotente e auditável.

REC-02 corrige especificamente:

- ausência inicial de reviewer independente;
- falha temporária e falha terminal de reviewer;
- blocks de reviewer sem continuação operacional;
- resolução genérica de block que poderia reenfileirar o produtor errado;
- assistance/routing registrados sem execução efetiva;
- ausência de regra fechada para troca de reviewer;
- ausência de semântica completa para expiração de `INDEPENDENCE_EXCEPTION`;
- reconciliação histórica aberta demais.

## Contexto já publicado por AUT-03

AUT-03 já persiste a fronteira necessária para REC-02:

- `WAITING_FOR_INDEPENDENT_REVIEWER`;
- `NO_INDEPENDENT_REVIEWER`;
- `REVIEWER_TERMINAL_FAILURE`;
- `INDEPENDENCE_EXCEPTION_REQUIRED`;
- `work_blocks` correlacionados com acceptance, snapshot, subject, generation,
  policy/version e correlation;
- retry/lease para indisponibilidade temporária;
- falha terminal sem `ACCEPT` implícito;
- `INDEPENDENCE_EXCEPTION` catalogado por GAT-01.

REC-02 deve consumir esses fatos. Não deve inventar uma segunda acceptance,
substituir a authority de Assurance, reexecutar o produtor por falha de reviewer
nem reinterpretar uma execução histórica usando uma policy atual.

## Invariantes

- reviewer nunca é o produtor;
- `producer.agent_id != reviewer.agent_id` permanece obrigatório mesmo sob
  `INDEPENDENCE_EXCEPTION`;
- uma acceptance normativa permanece única durante todo o recovery;
- retry temporário reutiliza o mesmo review e a mesma identidade de reviewer;
- falha terminal preserva o review falho e cria nova versão de review para o
  próximo reviewer;
- falha terminal cria/correlaciona block antes de deixar a acceptance em espera;
- reviewer falho terminalmente não pode ser selecionado de novo para a mesma
  recovery generation, salvo regra explícita futura;
- assistance, routing e specialist são advisory/evidence-only;
- advisory nunca decide `ACCEPT`, `REWORK`, `BLOCK`, `ESCALATE`, gate, requisito,
  arquitetura, risco ou promoção de lifecycle;
- resolução reenfileira somente a continuação publicada para o block code;
- block de reviewer nunca reroda o produtor apenas porque foi resolvido;
- `STALE_ASSURANCE_SUBJECT` nunca é contornado por troca de reviewer;
- retry/restart/reopen não duplica block, review, dispatch ou decisão terminal;
- policy nova não captura nem reinterpreta recovery existente;
- `CANCELLED` vence qualquer continuação concorrente;
- recursive assurance é proibido para recovery, assistance, routing, specialist,
  retry, reconcile e gate executors;
- escalada humana usa somente gates já publicados em GAT-01;
- automação esgotada termina em block/gate explícito, nunca em limbo.

## Semântica de review e versionamento

### Falha temporária de reviewer

Falha temporária reutiliza:

- mesma acceptance;
- mesmo `assurance_review`;
- mesma `review.version`;
- mesma reviewer identity;
- mesmo dispatch identity quando recuperável;
- attempts/lease/`available_at` já existentes.

A falha temporária apenas torna o job novamente elegível a retry segundo a
política publicada. Não cria nova review version.

A transição temporária → terminal ocorre somente quando o retry budget aplicável
for esgotado ou quando a falha for classificada como terminal.

REC-02 não altera a política global de retry.

### Falha terminal de reviewer

Quando o reviewer falha terminalmente:

- o review anterior permanece histórico e imutável;
- a acceptance continua `WAITING_FOR_INDEPENDENT_REVIEWER`;
- `REVIEWER_TERMINAL_FAILURE` permanece correlacionado;
- o reviewer entra na failure history da recovery generation;
- o próximo reviewer usa nova `assurance_review.version`;
- o novo review possui nova reviewer identity e novo dispatch de review;
- acceptance, subject, generation e policy/version permanecem os mesmos.

`review.version` incrementa somente quando existe troca normativa de reviewer
após falha terminal/esgotamento do reviewer anterior. Retry temporário não
incrementa versão.

## RecoveryStrategySnapshot:v1

A implementação deve persistir ou projetar de forma durável uma visão canônica
`RecoveryStrategySnapshot:v1`. A identidade persistida é condicional e não
pode preencher artificialmente dados ausentes:

- para recovery snapshot-backed, persiste `recovery_key`, `acceptance_id`,
  `assurance_dispatch_snapshot_id`, `subject_kind`, `subject_id`,
  `normative_generation`, `policy_id` e `policy_version` do snapshot AUT-03;
- para recovery legado, persiste `legacy = true`, `recovery_key`,
  `acceptance_id`, `policy_id` original e `policy_version` original;
  `subject_kind`, `subject_id` e `normative_generation` podem permanecer
  ausentes por contrato e não podem ser inferidos ou criados retroativamente.

Em ambos os casos, contém no mínimo:

- `current_stage`;
- `exhausted_stages`;
- reviewer failure history;
- candidate set considerado;
- candidato selecionado;
- attempts por estágio;
- referência a assistance/routing/specialist, quando houver;
- referência a gate humano, quando houver;
- timestamps de criação/atualização.

O snapshot de recovery é restart-safe e idempotente. Se o schema atual suportar
esses invariantes de maneira robusta, pode ser reutilizado. Migration só deve ser
criada durante implementação caso exista invariável estrutural que não possa ser
representada adequadamente.

## Estratégia normativa de recovery

A ordem de recovery é fechada e deve ser retomada do último estágio persistido
após restart.

### Stage 1 — Retry do mesmo reviewer

Aplicável somente a falhas temporárias/retryable.

- mesma review version;
- mesma reviewer identity;
- mesmo dispatch recuperável;
- respeita attempts, lease e próxima elegibilidade;
- ao esgotar budget, classifica como falha terminal e avança.

### Stage 2 — Reviewer alternativo no policy set congelado

Selecionar reviewer independente ainda não terminalmente falho para a mesma
recovery generation lógica, identificada pela mesma `recovery_key`. Para
snapshot-backed, ela corresponde à `normative_generation` persistida; para
legado, não adiciona nem presume `normative_generation`.

A nova seleção cria nova review version e novo dispatch de review, mantendo a
mesma acceptance.

### Stage 3 — Runtime alternativo permitido

Tentar runtime alternativo permitido pela policy congelada da acceptance,
respeitando classificação, configuração e independência.

Policy corrente não substitui a policy/version congelada.

### Stage 4 — Reviewer role alternativo publicado

Tentar outro reviewer role publicado pela matriz versionada
`REVIEWER_AND_BLOCK_RECOVERY:v1`, ainda elegível sob a policy congelada.

Não inventar role novo em runtime.

### Stage 5 — Assistance / routing

Despachar advisory para identificar uma continuação permitida. Assistance e
routing não decidem acceptance nem gate.

### Stage 6 — Specialist

Quando a categoria exigir expertise distinta, despachar specialist
`ASSURANCE_RECOVERY_SPECIALIST`.

### Stage 7 — Gate humano catalogado

Abrir somente o gate publicado correspondente à condição concreta.

### Stage 8 — Escalada terminal governada

Quando todas as alternativas automáticas aplicáveis estiverem esgotadas,
persistir block/escalada final com motivo, histórico de tentativas e continuação
humana publicada.

Nenhum estágio pode voltar automaticamente a estágio já marcado como esgotado
na mesma recovery generation, salvo retry explicitamente previsto no próprio
estágio. Isso impede loops infinitos.

## Seleção determinística de reviewer

A seleção não pode escolher:

- mesmo `agent_id` do produtor;
- mesma identidade produtora;
- reviewer terminalmente falho na mesma recovery generation;
- runtime não autorizado pela policy congelada;
- runtime incompatível com classification;
- configuração de runtime inelegível.

Reviewer roles pertencem exclusivamente a este contrato versionado e à sua
matriz de reviewer; a assurance policy não possui nem introduz
`reviewer_roles`. A policy congelada limita somente runtimes elegíveis,
configuração, classification e as demais constraints já publicadas.

Um candidato só é elegível na interseção de:

- reviewer role publicado pela matriz REC-02;
- runtime/configuração permitido pela policy congelada;
- classification compatível;
- independence check válido; e
- reviewer ainda não esgotado para a recovery generation lógica da mesma
  `recovery_key`.

Role priority vem do contrato REC-02; elegibilidade de runtime vem da policy
congelada; nenhum dos dois substitui o independence check. Policy atual nunca
altera a candidate ordering de recovery existente. Se um role publicado não
possuir runtime/configuração elegível na policy congelada, ele é inelegível
naquela recovery.

Entre candidatos elegíveis, a implementação deve usar ordenação estável e
determinística. Ordem normativa:

1. prioridade do reviewer role publicada pela matriz REC-02;
2. `quality_tier`;
3. runtime name;
4. runtime id;
5. configuration version;
6. `agent_id`;
7. `agent_version`.

A candidate list considerada e o resultado dos independence checks devem ser
persistidos/auditáveis.

## Matriz normativa de continuação por block

| Block code | Owner | Continuação REC-02 | Reexecuta produtor? |
| --- | --- | --- | --- |
| `NO_INDEPENDENT_REVIEWER` | REC-02 | continuar estratégia de reviewer; reviewer/runtime alternativo; assistance/routing; specialist; eventual `INDEPENDENCE_EXCEPTION`/escalada | não |
| `REVIEWER_TERMINAL_FAILURE` | REC-02 | preservar review falho; registrar failure history; criar nova review version para próximo reviewer | não |
| `INDEPENDENCE_EXCEPTION_REQUIRED` | REC-02 + GAT-01/GAT-03 | aguardar somente `INDEPENDENCE_EXCEPTION`; após approval válido, retomar reviewer selection | não |
| `STALE_ASSURANCE_SUBJECT` | REC-01 / owner do subject | geração antiga permanece bloqueada; produzir/reconciliar novo subject conforme owner | não |
| `ASSURANCE_REWORK` / finding F3 | F3/AUT-01 | seguir corrective work publicado | somente pelo owner F3/AUT-01 |
| material architecture | GAT-01 | gate material aplicável e continuação publicada | não por REC-02 |
| material risk | GAT-01 | gate de risco aplicável e continuação publicada | não por REC-02 |
| rework exhaustion | GAT-01 | `REWORK_ESCALATION` | não por REC-02 |
| escalated closure | GAT-01 | `ESCALATED_CLOSURE` | não por REC-02 |

Não existe regra genérica `RESOLVED => rerun producer`.

A futura implementação de resolução de block deve consultar esta matriz antes de
qualquer requeue.

## NO_INDEPENDENT_REVIEWER

Quando não existir reviewer independente elegível:

- acceptance permanece `WAITING_FOR_INDEPENDENT_REVIEWER`;
- block `NO_INDEPENDENT_REVIEWER` permanece aberto e deduplicado;
- REC-02 executa a estratégia de recovery;
- candidatos/runtimes alternativos são tentados de forma determinística;
- se aplicável, pode chegar a `INDEPENDENCE_EXCEPTION`;
- se não houver continuação automática ou gate publicado, permanece blocked com
  motivo explícito.

Nunca rerodar produtor.

## REVIEWER_TERMINAL_FAILURE

Quando o reviewer falhar terminalmente:

- manter o review falho como evidência histórica;
- registrar reviewer identity/failure na recovery history;
- acceptance permanece `WAITING_FOR_INDEPENDENT_REVIEWER`;
- block `REVIEWER_TERMINAL_FAILURE` permanece correlacionado;
- selecionar o próximo reviewer determinístico;
- criar nova review version;
- criar novo dispatch de review;
- manter a mesma acceptance, subject, generation e policy/version.

Nunca rerodar produtor apenas por falha do reviewer.

## AssistanceProposal:v1

Assistance é advisory-only.

### Input

- recovery identity;
- acceptance identity;
- block code/category;
- evidence sanitizada;
- failed reviewer history;
- candidate set já considerado;
- allowed continuation set.

### Output

- recommendation;
- evidence;
- suggested role;
- suggested runtime/capability;
- suggested category;
- confidence;
- rationale.

Assistance não pode:

- decidir acceptance;
- decidir gate;
- materializar plano;
- alterar subject/generation;
- alterar policy;
- integrar work item;
- encerrar block autonomamente.

Assistance não pode ser selecionada por Assurance.

## RoutingDecision:v1 e matriz de reviewer

Routing é uma decisão determinística de próxima atividade ou role
advisory/specialist, não uma decisão de acceptance nem uma delegação de
authority de review.

### A. Routing roles para advisory/specialist

Esta matriz recomenda a próxima atividade/role de routing:

| Categoria | Routing role |
| --- | --- |
| `REQUIREMENT_AMBIGUITY` | `requirements-engineering` |
| `ARCHITECTURE_CONFLICT` | `solution-architecture` |
| `DEPENDENCY` | `integration-engineering` |
| `EXTERNAL_SERVICE` | `integration-engineering` |
| `SECURITY` | `security-assurance` |
| `TECHNICAL` | `engineering-operations` |
| `ENVIRONMENT` | `engineering-operations` |
| `TEST_FAILURE` | `engineering-operations` |
| `POLICY` | `governance-assurance` |
| `MISSING_INFORMATION` | `requirements-engineering` |

Routing só pode selecionar roles publicados. Não cria role novo e não decide
acceptance. Um routing role pode recomendar uma atividade, mas não é, por essa
razão, reviewer elegível: specialist/advisory roles não ganham authority de
review por aparecerem nesta matriz.

### B. Reviewer roles elegíveis para independent review

Somente os roles fechados abaixo, publicados por
`REVIEWER_AND_BLOCK_RECOVERY:v1`, podem ser selecionados como reviewer
independente. A prioridade é parte desta matriz — menor número vence — e
preserva a ordem de candidatos reviewer já publicada pelo runtime atual.

| Prioridade | Reviewer role publicado |
| --- | --- |
| 1 | `governance-assurance` |
| 2 | `quality-assurance` |
| 3 | `security-assurance` |
| 4 | `requirements-engineering` |
| 5 | `solution-architecture` |
| 6 | `integration-engineering` |

Não há reviewer role implícito fora desse conjunto. Em particular,
`engineering-operations` pode ser um routing role para categorias técnicas,
ambientais ou de teste, mas não recebe authority de Assurance por esse motivo.
Um role presente nas duas matrizes continua sujeito a runtime/configuração da
policy congelada, classification, independence check e exhaustion da recovery;
a presença na matriz de routing por si só não o torna elegível.

## Specialist dispatch

O job kind canônico de especialista para REC-02 é:

```text
ASSURANCE_RECOVERY_SPECIALIST
```

Subject:

```text
RecoveryCase:v1
```

A dispatch identity deve ser derivada da `recovery_key`, stage e specialist role
selecionado.

### Input

- recovery identity;
- category;
- block evidence sanitizada;
- assistance/routing references;
- failed reviewer history;
- allowed continuation set.

### Output

- `SpecialistRecommendation:v1`;
- findings/evidence;
- recommended continuation;
- rationale.

Specialist é evidence producer/advisory-only. Não decide acceptance, não aprova
gate e não pode ser selecionado novamente por Assurance.

## Gate matrix

REC-02 usa somente gates existentes no catálogo GAT-01.

| Condição | Gate permitido |
| --- | --- |
| exceção de independência | `INDEPENDENCE_EXCEPTION` |
| arquitetura material em execução | `SCOPE_ARCHITECTURE_POLICY` |
| arquitetura material em escopo de projeto/módulo | `MATERIAL_ARCHITECTURE` |
| risco material em execução | `ACCEPTED_RISK` |
| risco material em projeto | `MATERIAL_RISK` |
| rework esgotado/materialidade | `REWORK_ESCALATION` |
| fechamento de escalada | `ESCALATED_CLOSURE` |

Não existe `RECOVERY_OVERRIDE`.

Se a condição não possuir gate publicado compatível com o scope, REC-02 falha
fechado e mantém o block.

## INDEPENDENCE_EXCEPTION

Mesmo com exceção:

```text
producer.agent_id != reviewer.agent_id
```

continua obrigatório.

A exceção pode relaxar somente a dimensão de runtime/configuração explicitamente
permitida pela policy e pelo gate.

Semântica de expiração:

1. gate expirado antes do reviewer dispatch: não pode ser usado;
2. gate válido no dispatch: o review persiste a referência ao gate utilizado;
3. antes da decisão terminal do review, a validade do gate deve ser revalidada;
4. se o gate expirar antes da decisão, a decisão não pode produzir efeito e a
   acceptance volta a `WAITING_FOR_INDEPENDENT_REVIEWER` com
   `INDEPENDENCE_EXCEPTION_REQUIRED`;
5. restart após expiração não reutiliza gate vencido.

A authority da exceção deve estar válida tanto no dispatch quanto no momento em
que a decisão técnica produziria consequência.

## Reconciliação histórica

REC-02 pode reconciliar somente rows que satisfaçam todos os critérios
aplicáveis.

### Elegíveis

- acceptance em `WAITING_FOR_INDEPENDENT_REVIEWER`;
- sem decisão terminal válida;
- não `CANCELLED`;
- policy/version originalmente vinculada ainda referenciável;
- quando existir AUT-03 snapshot, subject/generation devem coincidir com ele.

### Legado sem `AssuranceDispatchSnapshot:v1`

- não criar snapshot retroativo;
- não selecionar sob policy AUT-03 atual;
- usar somente policy/version originalmente vinculada à acceptance;
- preservar comportamento histórico e evidência existente.

### Não elegíveis

- `ACCEPTED`;
- `CANCELLED`;
- `REWORK_REQUIRED` com corrective owner F3 ativo;
- `ESCALATED` aguardando gate humano;
- stale subject;
- review já terminalmente decidido.

Policy atual nunca reinterpreta acceptance histórica.

## Cancellation e concorrência

`CANCELLED` possui precedência sobre recovery.

Se cancellation ocorrer durante:

- retry;
- reviewer selection;
- assistance;
- routing;
- specialist;
- gate wait;
- restart/reconcile;

nenhum novo review, dispatch, job, assistance, specialist ou gate pode ser
criado depois do cancelamento.

A implementação deve revalidar acceptance/recovery sob lock antes de criar
qualquer continuação.

## Idempotência

A implementação deve possuir keys determinísticas para:

```text
recovery case
review replacement
assistance dispatch
routing decision
specialist dispatch
gate opening
recovery resume
```

Regra universal:

- mesma key + mesma identidade/payload canônico → retorna o existente;
- mesma key + identidade ou payload divergente → fail closed.

Nenhum `ON CONFLICT` pode atualizar silenciosamente identidade normativa.

## Componentes prováveis

Worker, `assurance.ts`, reviewer selector, runtime policies, `work_blocks`,
recovery strategy, assistance proposals, routing matrix, specialist dispatch,
gates GAT-01, reconciler e projeções.

## Dependências e restrições

Depende de AUT-03 e GAT-01.

Preserva fatos F3/F4/AUT-02/AUT-03 nativos. Não inventa papel sem
responsabilidade distinta, não usa reconcile manual como caminho ordinário e não
antecipa GAT-02.

REC-02 não altera policy histórica, não altera retry policy global e não cria
gate fora do catálogo publicado.

## Estratégia de implementação e compatibilidade

A implementação deve:

1. identificar/abrir o recovery case canônico;
2. carregar a identidade congelada da acceptance;
3. retomar o último recovery stage persistido;
4. executar apenas a continuação permitida;
5. persistir cada tentativa e resultado antes de avançar;
6. usar nova review version somente após falha terminal/troca normativa de
   reviewer;
7. preservar mesma review version para retry temporário;
8. impedir seleção de reviewer já esgotado;
9. despachar assistance/routing/specialist somente quando o estágio exigir;
10. abrir somente gate catalogado;
11. respeitar cancellation/stale antes de qualquer efeito;
12. encerrar sempre com reviewer ativo, block/gate explícito ou terminal
    governado — nunca em limbo.

## Critérios de aceite

REC-02 só pode ser considerada concluída quando a implementação provar:

- zero reviewer converge para recovery explícito;
- reviewer temporariamente indisponível converge por retry sem nova review;
- reviewer terminalmente falho converge por reviewer replacement;
- acceptance permanece única durante todo o recovery;
- history de reviews é imutável;
- nova review version é determinística;
- reviewer selecionado é sempre independente conforme policy/gate;
- reviewer terminalmente falho não entra novamente na mesma generation;
- resolução de block retoma a continuação correta;
- falha de reviewer não reroda produtor;
- assistance/routing/specialist são efetivamente despachados quando aplicáveis;
- assistance/routing/specialist permanecem advisory-only;
- recursive assurance é impossível;
- gates usados são somente os publicados por GAT-01;
- `INDEPENDENCE_EXCEPTION` respeita expiração no dispatch e na decisão;
- `agent_id` distinto permanece obrigatório;
- cancellation vence qualquer recovery concorrente;
- restart/replay retomam o mesmo recovery case;
- idempotency replay converge no mesmo registro;
- idempotency divergente falha fechado;
- histórico não é reinterpretado por policy atual;
- snapshot-backed usa somente a recovery key com `normative_generation`;
- legado usa somente a recovery key com policy original, sem snapshot ou
  generation retroativos;
- identidade de policy legacy ausente ou ambígua falha fechado sem recovery
  automática;
- reviewer role vem da matriz REC-02, nunca de campo inexistente da policy;
- routing role não concede authority de reviewer;
- seleção de reviewer prova a interseção de matriz REC-02, policy congelada,
  classification, independence e exhaustion;
- stale subject não é promovido;
- automação esgotada termina em block/gate explícito;
- nenhuma parada fica sem motivo, authority, evidência e continuação.

## Testes obrigatórios

Usar PostgreSQL real para cobrir, no mínimo:

- zero reviewers;
- reviewer inelegível;
- reviewer temporariamente indisponível;
- transição de temporário para terminal;
- reviewer terminalmente falho;
- reviewer alternativo;
- runtime alternativo;
- role alternativo permitido;
- seleção determinística;
- reviewer esgotado não selecionado novamente;
- ausência de loop;
- mesma review version no retry temporário;
- nova review version após falha terminal;
- mesma acceptance em todas as versões;
- duplicate/redelivery;
- lease recovery;
- restart entre recovery stages;
- concorrência de dois workers;
- assistance dispatch;
- `AssistanceProposal:v1`;
- routing por cada categoria publicada;
- `RoutingDecision:v1`;
- specialist dispatch;
- `ASSURANCE_RECOVERY_SPECIALIST`;
- `SpecialistRecommendation:v1`;
- advisory tentando decidir acceptance → fail closed;
- recursive assurance sobre recovery/advisory → fail closed;
- `INDEPENDENCE_EXCEPTION` válida;
- exception expirada antes do dispatch;
- exception expirada durante review antes da decisão;
- restart após expiração;
- mesmo runtime sob exception com `agent_id` distinto;
- mesmo `agent_id` do produtor mesmo com exception → fail closed;
- continuation matrix para cada block code;
- `RESOLVED` de reviewer block não reroda produtor;
- stale subject não é retomado por REC-02;
- gate opening idempotente;
- gate incompatível/não catalogado → fail closed;
- cancellation durante retry;
- cancellation durante reviewer selection;
- cancellation durante assistance/specialist;
- cancellation durante gate wait;
- idempotency replay;
- idempotency key com payload/identity divergente;
- recovery histórico com snapshot AUT-03;
- recovery legado sem snapshot;
- recovery legado com policy original ausente/ambígua → fail closed sem
  recuperação automática;
- retry/restart/redelivery/troca de reviewer preservam a mesma `recovery_key`
  nas formas snapshot-backed e legacy;
- `RecoveryStrategySnapshot:v1` snapshot-backed contém subject/generation, e
  o legacy contém somente flag/identity policy histórica sem preenchê-los;
- nenhuma policy atual reinterpretando legado;
- policy sem `reviewer_roles` continua válida e não pode publicar authority de
  reviewer por esse campo;
- seleção aplica a matriz fechada de reviewer roles e a interseção com runtime,
  configuração e classification da policy congelada;
- role publicado sem runtime elegível na policy congelada é inelegível;
- ordenação por prioridade REC-02, quality tier, runtime name/id,
  configuration version, agent id/version;
- routing para `engineering-operations` não permite dispatch de independent
  review;
- nenhuma acceptance duplicada;
- nenhuma decisão terminal duplicada;
- E2E de recovery completo sem limbo.

## Riscos e evidências esperadas

Riscos:

- loop de reviewers;
- auto-review;
- rerun indevido do produtor;
- advisory executando decisão;
- gate genérico não catalogado;
- gate expirado ainda produzindo consequência;
- policy nova reinterpretando histórico;
- nova acceptance criada durante recovery;
- stale subject sendo promovido;
- cancellation perdendo corrida para recovery.

Evidências esperadas:

- `RecoveryStrategySnapshot:v1` ou projeção estrutural equivalente;
- recovery key determinística;
- reviewer failure history;
- candidate lists e independence checks;
- review versions imutáveis;
- block lifecycle e continuation code;
- assistance/routing/specialist dispatches;
- gate ids e decisions auditados;
- idempotency/replay/concurrency PostgreSQL;
- reconciliação histórica sem policy reinterpretation;
- E2E sem limbo.

## Estado da task

`REC-02` está `IN_PROGRESS` após a reabertura de auditoria de 27/08/2026.

Os findings F-01 a F-04 exigem desenvolvimento e uma nova certificação
autorizada. Evidências históricas anteriores não certificam a implementação
reaberta nem substituem a validação PostgreSQL, build e verificações de diff
da rodada posterior.

AUT-03 permanece `DONE`.
GAT-02 permanece `TO_DO`.
