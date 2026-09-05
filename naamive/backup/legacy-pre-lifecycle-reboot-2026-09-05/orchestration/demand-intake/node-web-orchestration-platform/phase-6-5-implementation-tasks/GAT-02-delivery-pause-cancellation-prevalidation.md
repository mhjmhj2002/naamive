---
task: GAT-02-PREVALIDATION-01
parent_task: GAT-02
document_type: prevalidation
status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: DELIVERY_PAUSE_CANCELLATION:v1
depends_on: [LR-02, GAT-01, GAT-03, AUT-03]
consumes_contracts: [EffectiveRequiredModuleSet:v1, ASSURANCE_EXPANSION_TO_REAL_WORK:v1]
conceptual_guardrails: [REC-02]
governs: [PROJECT_DISCOVERY:v4, MODULE_DELIVERY:v2]
validated_at: 2026-08-27
---

# GAT-02-PREVALIDATION-01 — Contrato de entrega, pausa e cancelamento

## Decisão de desbloqueio

**PREVALIDATION_READY_FOR_IMPLEMENTATION.** GAT-02 deve implementar somente
DELIVERY_PAUSE_CANCELLATION:v1. O contrato fecha GAT02-01 a GAT02-10 sem
alterar fatos históricos. DELIVERY_ACCEPTANCE é o único gate humano de
entrega, com as decisões já catalogadas APPROVE e REWORK.

## 1. Autoridade documental

Precedência normativa, em ordem:

1. GATE_POLICY.md, PROJECT_LIFECYCLE.md, MODULE_LIFECYCLE.md,
   STATE_MACHINE_MODEL.md e ORCHESTRATION_PROTOCOL.md;
2. planejamento da Fase 6.5 e transições publicadas por LR-01;
3. contratos de GAT-01/GAT-03, LR-02/LR-02A, AUT-01, REC-01, AUT-02, AUT-03 e
   REC-02;
4. este contrato, somente para a fronteira reservada a GAT-02;
5. runtime, migrations e API como evidência de compatibilidade e legado, nunca
   como fonte capaz de substituir a norma.

Não há conflito material aberto: GAT-01 publica DELIVERY_ACCEPTANCE, LR-01
reserva as transições, LR-02 define EffectiveRequiredModuleSet:v1 e AUT-03
publica a fronteira de Assurance. Este contrato distingue o subject produtor de
PREPARE_DELIVERY_PACKAGE do subject de Assurance: o primeiro é o snapshot de
preparação; o segundo é o package final. Assim, a linha release reservada por
AUT-03 continua usando DeliveryPackage:v1 quando cria
AssuranceDispatchSnapshot:v1, sem transformar o package ainda inexistente em
subject do job produtor. ARCHIVED, cancelamento de acceptance de Assurance e
APIs legadas não são CancellationRecord:v1 e não recebem semântica retroativa.

## 2. Invariantes

- EXECUTION_SUCCEEDED != RELEASE_TECHNICALLY_ACCEPTED != DELIVERY_ACCEPTANCE
  APPROVE != DELIVERED.
- A autoridade humana aceita o mesmo package_id, content_hash,
  delivery_revision e normative_generation tecnicamente aceitos.
- Módulo não possui gate de entrega próprio: sua entrega deriva somente do
  commit de entrega do projeto.
- Pause impede efeitos normativos novos; não equivale a cancelamento ou
  rollback de efeito já emitido.
- CANCELLED vence toda continuação ainda não confirmada.
- Mesma idempotency key com payload normativo canônico idêntico converge;
  mesma key com payload distinto falha fechado.

## 3. DeliveryPreparationSnapshot:v1

### Identidade, campos e congelamento de input

Antes de qualquer job, GAT-02 persiste o snapshot imutável e reconstruível dos
inputs de preparação:

    preparation_snapshot_id, preparation_key, project_id, delivery_revision,
    normative_generation, workflow_code, workflow_version,
    product_commitment_revision_id, effective_required_module_set_hash,
    committed_module_set, participants, artifact_input_references,
    validation_integration_lineage, policy_id, policy_version, policy_hash,
    input_hash, created_at, source_operation_id, correlation_id

committed_module_set é o snapshot ordenado de todas as
CommittedModuleObligation:v1 com required=true: generation, module_key,
referência física quando houver, estado e lineage. participants deve ser
exatamente esse conjunto, com módulo físico, revisão corrente,
READY_FOR_DELIVERY e evidence de integração/validação. Obrigação sem módulo,
módulo CANCELLED, estado diverso ou evidence ausente impede a criação do
snapshot; nunca é omitida por conveniência.

    normative_generation = SHA-256(canonical(
      project_id, workflow_code, workflow_version, product_commitment_revision_id,
      EffectiveRequiredModuleSet:v1, participant module/revision/integration lineage,
      artifact/input refs e hashes
    ))
    preparation_key =
      delivery-preparation:v1:<project_id>:<delivery_revision>:<normative_generation>
    input_hash = SHA-256(canonical(all normative preparation inputs))

O snapshot não contém release_evidence, operation_evidence, handover_evidence,
assurance_snapshot_id, acceptance_id, a decisão de Assurance ou o gate humano:
esses fatos ainda não existem. O banco deve impor unicidade de preparation_key;
mesma key com input_hash divergente falha fechado. O snapshot é imutável,
versionado, replay-safe e stale-detectable; retry, restart e replay recuperam a
mesma identidade e o mesmo input hash.

### Staleness da preparação

Antes de criar a intenção do job e antes de materializar seu efeito, o servidor
relê sob lock workflow/version, commitment corrente, obligation ledger e
módulos. Se required-set, participante, generation, revision, lineage, policy,
pause, cancellation ou finding bloqueante divergir antes do package final, o
snapshot fica stale. O job pode preservar evidência bruta de tentativa, mas não
produz package nem outro efeito normativo; a continuação exige nova preparation
generation. O significado do snapshot antigo nunca é recalculado.

## 4. PREPARE_DELIVERY_PACKAGE, DeliveryPackage:v1 final e Assurance

### Job, subject e contexto

O job nasce exclusivamente quando reavaliação LR-02 constata projeto DELIVERY,
não pausado/cancelado, com required-set inteiro elegível, e o
DeliveryPreparationSnapshot:v1 já foi persistido. GAT-02 persiste o snapshot e
outbox/intenção do job na mesma transação; AUT-01 agenda, reserva e executa essa
intenção. UI, advisory, gate humano e reconciler não podem criar o job por conta
própria.

    subject_kind = DeliveryPreparationSnapshot:v1
    subject_id = preparation_snapshot_id
    release_generation = normative_generation
    job_key = prepare-delivery-package:v1:<preparation_key>
    fingerprint = SHA-256(canonical(
      preparation_key, input_hash, effective_required_module_set_hash,
      workflow_code, workflow_version, policy_id, policy_version, policy_hash
    ))

O worker recebe somente o snapshot e as referências persistidas de input. Não
recebe nem reutiliza conversation/thread/session/chat history, transcript,
resposta anterior ou qualquer estado opaco de provider. Toda tentativa é
efêmera. Retry, restart e replay mantêm subject, generation e fingerprint; não
recalculam seu significado com policy ou required-set atual.

Outputs permitidos são release_evidence, operation_evidence, handover_evidence,
artefatos por referência/hash ou finding/block tipado. Texto livre de agente não
adiciona ou remove participante. Os outputs de sucesso são persistidos contra a
identidade do snapshot antes de qualquer package; para a mesma preparation key,
payload canônico de outputs divergente falha fechado.

### DeliveryPackage:v1 final

Somente depois de outputs bem-sucedidos e persistidos, GAT-02 materializa o
manifesto final imutável:

    package_id, delivery_package_key, project_id, delivery_revision,
    normative_generation, preparation_snapshot_id, workflow_code,
    workflow_version, product_commitment_revision_id,
    effective_required_module_set_hash, committed_module_set, participants,
    final_artifacts, release_evidence, operation_evidence, handover_evidence,
    policy_id, policy_version, policy_hash, content_hash, created_at,
    source_operation_id, correlation_id, preparation/output lineage references

content_hash é SHA-256 do manifesto final canonicalizado completo, excluindo
somente timestamp e campos técnicos de tentativa/projeção. Arrays usam ordem
lexical por module_key e artefato. O banco deve impor unicidade de
delivery_package_key e de (project_id, delivery_revision), onde:

    output_hash = SHA-256(canonical(final artifacts + release/operation/handover
      evidence refs and hashes))
    delivery_package_key = delivery-package:v1:<project_id>:<delivery_revision>:
      <normative_generation>:<output_hash>

O package não contém assurance_snapshot_id, acceptance_id nem estado mutável de
Assurance. A partir da criação, nenhum campo do manifesto nem seu content_hash
pode mudar. Mesmo snapshot e mesmos outputs canônicos convergem no mesmo
package; mudança normativa exige nova delivery_revision e package.

### Staleness do package

Após o package, a staleness é independente: required-set, participante,
generation, revision, lineage, policy, pause, cancellation ou finding
bloqueante divergente torna o package stale para efeitos futuros; ele não é
mutado, rehashado nem reinterpretado. Uma nova revisão cria novo snapshot e
package. GAT-02 é dona da sequência de preparação/package; LR-02 continua dona
do required-set.

### Assurance técnica

AUT-03 seleciona Assurance somente para o package final, com
AssuranceDispatchSnapshot:v1 congelado:

    subject_kind = DeliveryPackage:v1
    subject_id = package_id
    assurance_dispatch_key =
      assurance-dispatch:v1:DeliveryPackage:v1:<package_id>:<normative_generation>
    acceptance_key =
      assurance-acceptance:v1:DeliveryPackage:v1:<package_id>:<normative_generation>:
      <policy_id>:<policy_version>

AssuranceDispatchSnapshot:v1 e acceptance_id pertencem à AUT-03 e referem o
package externamente; não entram no manifesto nem no content_hash do package.
ACCEPT técnico publica RELEASE_TECHNICALLY_ACCEPTED(package_id, content_hash,
delivery_revision, normative_generation, acceptance_id) e mantém o projeto em
DELIVERY. REWORK cria finding ligado ao package, preserva-o e exige nova
revision; BLOCK e ESCALATE seguem AUT-03/REC-02 e somente gates GAT-01
compatíveis. Nenhuma dessas decisões abre DELIVERY_ACCEPTANCE nem promove a
entrega.

Assurance sobre QA, review, recovery, routing, specialist, gate executor ou
outro job de assurance é proibida. Antes de todo efeito, package/hash/lineage
devem coincidir; caso contrário persiste STALE_ASSURANCE_SUBJECT sem efeito.

## 5. Gate DELIVERY_ACCEPTANCE e REWORK

GAT-02 usa somente o gate GAT-01 DELIVERY_ACCEPTANCE: scope PROJECT, condição
DELIVERY_OPERATION_HANDOVER_EVIDENCE, evidence release_evidence,
operation_evidence e handover_evidence, authority BUSINESS_OWNER, decisões
APPROVE e REWORK.

A abertura exige o fato externo RELEASE_TECHNICALLY_ACCEPTED para o package
final exato e congela no gate record:
package_id, package_hash, delivery_revision, normative_generation e
acceptance_id, além das três evidências catalogadas. GAT-03 autoriza
DECIDE_CATALOG_GATE somente a principal autenticado BUSINESS_OWNER no projeto e
recurso do package. Gate version e idempotency key são obrigatórias; hash,
generation, pause/cancellation e stale state são revalidados na abertura e
decisão.

**Rejeição de entrega é somente a decisão catalogada REWORK.** Não existe
REJECT. REWORK exige findings, retorna projeto a VALIDATION, preserva
package/gate/decision como histórico e torna package/gate anteriores stale.
AUT-02/F3/REC-01 derivam o owner da correção; GAT-02 não atribui produtor.
Correção e revalidação produzem nova package revision e novo gate.

## 6. Transação DELIVERY para DELIVERED, crash e replay

APPROVE só é válido, sob lock, se:

    project.state == DELIVERY
    existe RELEASE_TECHNICALLY_ACCEPTED para o package/content_hash exatos
    gate package/hash/revision/generation == technical acceptance exata
    acceptance.state == ACCEPTED para o package exato
    EffectiveRequiredModuleSet == package.committed_module_set
    todo participante está READY_FOR_DELIVERY, corrente e não cancelado
    não há PauseRecord ativa nem CancellationRecord terminal aplicável
    não há finding, generation, lineage ou policy stale

Em uma transação de banco, confirma-se decisão, estado/versão do projeto, o
vínculo de entrega de cada obligation do required-set congelado, todos e somente
os módulos participantes de READY_FOR_DELIVERY para DELIVERED, package,
audit/event e intent/outbox. Falha em uma linha faz rollback total.

    delivery_transition_key =
      delivery-transition:v1:<project_id>:<package_id>:<content_hash>

PROJECT = DELIVERED só existe depois desse commit. MODULE = DELIVERED só existe
para participante da obligation required=true do package, no mesmo commit e sem
gate duplicado. Projeto entregue com obligation requerida pendente ou módulo
participante não entregue é inválido e exige reconciliação.

| Situação | Regra |
| --- | --- |
| snapshot criado, job não criado | reconciler cria somente a intenção/job da preparation_key congelada; input divergente falha fechado |
| job criado, não executado | scheduler reutiliza a mesma job_key, subject, generation e fingerprint |
| job executado, outputs persistidos, package não materializado | reconciler materializa somente o package determinístico do snapshot e output_hash persistidos |
| package criado, Assurance não iniciada | AUT-03 reserva somente o dispatch do package final pela key congelada |
| Assurance criada, sem acceptance | replay converge no mesmo AssuranceDispatchSnapshot/acceptance; não recria package |
| technical acceptance persistida, gate não aberto | reconciler abre somente DELIVERY_ACCEPTANCE do package/hash/acceptance exatos |
| gate aberto, sem decisão | preserva-o; replay retorna o mesmo gate |
| tentativa de decisão iniciada, commit coordenado não confirmado | decisão e transição não ficam confirmadas; gate permanece aberto/current; retry usa a mesma version/idempotency key conforme contrato; se o commit foi confirmado, decisão/transição são fatos persistidos e apenas a entrega de outbox pode precisar de replay |
| módulos atualizados sem projeto | impossível pelo commit único; RECONCILE_REQUIRED, sem completar silenciosamente |
| replay de decisão | mesmo payload retorna decisão/transição; payload diferente falha fechado |

## 7. PauseRecord:v1 e resume

    PauseRecord:v1 =
    pause_id, resource_kind (PROJECT|MODULE), resource_id, project_id,
    previous_active_state, workflow_code, workflow_version, normative_generation,
    reason, evidence, actor_id, authority_role, created_at, version,
    idempotency_key, status (ACTIVE|RESUMED|SUPERSEDED), pause_fence

previous_active_state é gravado antes da transição e nunca inferido depois. Há
uma única pausa ativa por recurso. pause_fence é monotônico e todo handler de
efeito deve revalidá-lo.

| Ação | Role permitida | Scope |
| --- | --- | --- |
| PAUSE_PROJECT, RESUME_PROJECT | ON_CALL_OWNER | projeto atribuído |
| PAUSE_MODULE, RESUME_MODULE | ON_CALL_OWNER | projeto e módulo atribuídos |
| CANCEL_PROJECT, CANCEL_MODULE | BUSINESS_OWNER | seção 8 |

BUSINESS_OWNER, OPERATOR, TECH_LEAD, REPOSITORY_OWNER, agente e service
principal não recebem pause/resume por inferência. ON_CALL_OWNER não recebe
cancelamento ou decisão de gate por essa role. GAT-03 autentica principal e
verifica role/scope no servidor.

Pausa atomiza record, estado PAUSED, version/fence, audit/event e invalidação de
intents. Scheduler não cria job/reservation; fila não inicia; retry, handoff,
reviewer dispatch, assurance, recovery, specialist, gate opening/decision e
outbox não criam efeito normativo enquanto pausa estiver ativa. Gate já aberta
é preservada e decisão durante pausa é recusada sem efeito.

Leases/running recebem pedido cooperativo de stop e fence. Se concluírem
tecnicamente, podem gravar attempt/evidence bruta, mas acceptance, promoção,
integração, gate e próximo dispatch ficam em RECONCILE_REQUIRED até resume.
Fila e reservation ainda não iniciadas podem ser canceladas/liberadas de modo
auditável. Pause não desfaz efeito externo; ele usa a seção 10.

    ResumeRecord:v1 =
    resume_id, pause_id, expected_pause_version, actor_id, authority_role,
    impediment_removed_evidence, idempotency_key, resolved_at, result

Resume não restaura cegamente a origem. Sob lock exige pausa/fence ativos,
recurso e parent não cancelados, parent ativo para módulo, workflow/version e
generation válidos, package/gate/acceptance não stale, policy/dependencies
válidas e job/lease compatível. Se tudo passa, resolve a pausa e restaura
estado anterior; se não, mantém PAUSED, persiste
RESUME_RECONCILIATION_REQUIRED e cria somente intenção de reconciliar.

## 8. CancellationRecord:v1, required-set e precedência

    CancellationRecord:v1 =
    cancellation_id, resource_kind (PROJECT|MODULE), resource_id, project_id,
    reason, evidence, actor_id, authority_role, created_at, version,
    idempotency_key, status (TERMINAL), cancellation_fence,
    parent_cancellation_id nullable, obligation_resolution nullable

CANCEL_PROJECT e CANCEL_MODULE são decisões de negócio explicitamente
concedidas somente a BUSINESS_OWNER no scope correto. ON_CALL_OWNER pode operar
recovery publicado, mas não cancela. Não há privilege por role genérica, header
ou payload.

CANCEL_PROJECT só é permitido de estado ativo ou PAUSED; não é comando para
DELIVERED/ARCHIVED. Ele atomiza record/fence, projeto CANCELLED, audit/event,
invalidação de intents e records derivados para todo módulo não terminal.
Módulos já cancelados ficam históricos. Nada é apagado: jobs, deliveries,
packages, gates, findings e evidence permanecem consultáveis.

CANCEL_MODULE só é permitido de estado ativo ou PAUSED e exige projeto ativo.
Se obligation é required=true, a mesma
transação deve conter obligation_resolution explícita: required=false,
obligation generation, motivo/evidence e decisão/ator; CancellationRecord,
módulo CANCELLED e reavaliação LR-02. Sem isso falha fechado: não é possível
cancelar módulo e continuar fingindo que obrigação não bloqueia delivery.
Snapshot de commitment aprovado não é reescrito. Módulo sem obligation requerida
pode ser cancelado sem modificar required-set. Reintrodução futura de chave
retirada cria nova obligation generation conforme LR-02.

| Situação | Consequência |
| --- | --- |
| projeto pausado, módulo ativo | módulo preserva estado, mas effective_paused=true; não nasce efeito novo |
| projeto ativo, módulo pausado | projeto segue; módulo fica pausado |
| projeto cancelado, módulo ativo/pausado | record derivado e módulo não terminal torna-se CANCELLED |
| módulo cancelado, projeto ativo | projeto segue; obligation requerida é retirada na mesma decisão |
| projeto entregue, módulo pendente | inválido; RECONCILE_REQUIRED, nunca promoção automática |
| módulo entregue derivado | só participante do package aceito muda no mesmo commit |
| resume de módulo com projeto pausado | rejeitado sem resolver pausa do módulo |
| resume de módulo com projeto cancelado | terminalmente rejeitado |
| resume de projeto com módulo cancelado | só se demais guards passam; módulo não revive e obligation já é não requerida |

REMOVED de commitment continua required conforme LR-02 até resolução GAT-02
persistida. required=false é fato novo auditável, não alteração retroativa de
revisão aprovada.

## 9. Cancellation fence e efeitos em voo

Depois de CancellationRecord terminal, scheduler, reservation, job, retry,
execution, reviewer, assurance, recovery, specialist, gate wait, package,
decisão de delivery, pause/resume, reconciler, handoff e integração não podem
criar efeito normativo para o recurso. Cada handler relê cancellation_fence sob
lock antes do write. Tentativa anterior é evidência histórica, mas não promove.

Todo efeito fora da transação local usa ExternalEffectRecord:v1:

    NOT_STARTED → IN_FLIGHT → RECONCILED
                         └→ EFFECT_UNKNOWN → RECONCILE_REQUIRED → RECONCILED

Antes da chamada: gravar IN_FLIGHT, target/fingerprint esperado, tentativa e
fences. Depois: observar remoto, gravar evidence e reconciliar. Crash, timeout
ou cancellation sem observação definitiva é EFFECT_UNKNOWN; retry cego é
proibido.

Cancellation impede NOT_STARTED, mas não desfaz efeito remoto já emitido. Efeito
que conclui após cancellation é APPLIED_AFTER_CANCELLATION: reconciler preserva
evidence, faz compensação idempotente somente se publicada ou escala operador.
Recurso permanece CANCELLED; efeito externo não aceita entrega nem faz resume
implícito.

## 10. Idempotência, locking e concorrência

| Operação | Key |
| --- | --- |
| preparation snapshot | delivery-preparation:v1:<project>:<revision>:<generation> |
| prepare job | prepare-delivery-package:v1:<preparation-key> |
| final package | delivery-package:v1:<project>:<revision>:<generation>:<output-hash> |
| assurance | keys AUT-03 da seção 4 |
| gate opening | delivery-gate:v1:<package_id>:<content_hash>:<generation> |
| gate decision | delivery-gate-decision:v1:<gate_id>:<version>:<decision> |
| delivery transition | delivery-transition:v1:<project_id>:<package_id>:<content_hash> |
| pause/resume | pause:v1:<resource>:<expected-version>:<payload-hash> / resume:v1:<pause>:<version>:<payload-hash> |
| cancellation | cancellation:v1:<resource>:<payload-hash> |
| external reconciliation | external-reconcile:v1:<effect-id>:<attempt> |
| finding | delivery-finding:v1:<package-id>:<rule-or-fingerprint> |

Lock order: project → current ProductCommitmentRevision → obligation ledger
(lexical module_key) → modules (mesma ordem) → preparation snapshot → package
→ acceptance/gate → pause/cancellation/external effect → intent/outbox. SKIP
LOCKED seleciona somente intents; handlers relêem invariantes sob lock.
Version/fence mismatch é conflito, não last-write-wins.

| Corrida | Winner / resultado |
| --- | --- |
| APPROVE × REWORK | primeira decisão terminal da gate version vence; outra falha por versão |
| APPROVE × CANCEL | cancel primeiro invalida approval; approval confirmado inclui toda delivery e torna cancel posterior inválido em DELIVERED |
| APPROVE × PAUSE | pause primeiro bloqueia approval; approval confirmado torna pause inválida em DELIVERED |
| PAUSE × CANCEL | cancel prevalece terminalmente; pause anterior fica histórica |
| RESUME × CANCEL | cancel prevalece; resume não resolve record após fence divergente |
| duplicatas | mesma key/payload retorna registro; payload divergente falha fechado |
| gate × package stale | falha STALE_DELIVERY_PACKAGE, sem promoção |
| reconciler × operador | lock/fence decide; reconciler converge fato, não substitui decisão humana |
| duas deliveries | unique transition key e locks permitem uma única; outra converge no commit |

## 11. Archive, delete, legado e projeção

CANCELLED != ARCHIVED != DELETE.

- CANCELLED é lifecycle terminal GAT-02 e preserva fatos.
- ARCHIVED é classificação administrativa legada. CANCELLED ou DELIVERED pode
  ser arquivado somente após todos ExternalEffectRecord estarem reconciliados e
  por comando administrativo separado; archive não muda lifecycle histórico.
- Instância legada ARCHIVED é PRESERVE_LEGACY. GAT-02 não cria retroativamente
  package/pause/cancellation record e falha fechado se faltar identidade.
- Delete nunca remove evidence normativa, decision, record, obligation ou
  lineage. Retention existente continua mínima; purge exige outro contrato.

Projeção futura mínima: lifecycle state/version, effective_paused,
previous_active_state, cancellation/fence, package/hash/revision atual,
technical acceptance, gate de delivery, required-set/participantes,
reconciliação externa e allowed_actions calculada no servidor. UI-01/UI-02
somente consumirão esses fatos.

## 12. Matriz obrigatória de testes futura

| Grupo | Casos mínimos |
| --- | --- |
| delivery | preparation snapshot creation/replay/stale, job/output persistence, final package creation/replay/stale, assurance, approve, rework, stale decision, crash/replay, dois decisores e atomicidade projeto+módulos |
| pause/resume | todo estado ativo; queue/lease/running; review, assurance, recovery, specialist, gate e delivery; parent pausado/cancelado e resume stale |
| cancellation | projeto/módulo required ou não; queue/lease/running; review, assurance, recovery, specialist, gate, handoff, approve/cancel, pause/cancel e resume/cancel |
| external effect | todos os estados, crash, reconciliation, compensação e aplicação após cancellation |
| obligations/legacy | REMOVED, required=false autorizado, reintrodução, archived, ativo sem records e sem package |
| RBAC | permitido/negado, resource/projeto errado, header spoofed, principal revogado; limites distintos de ON_CALL e BUSINESS_OWNER |
| idempotência | replay, payload divergente, concorrência, outbox/reconciler e restart |

Persistência e concorrência usam PostgreSQL real. Implementação deve provar que
pause/cancel não criam efeito posterior e que decisão humana nunca aceita
package/hash diferente do tecnicamente aceito.

## 13. Fechamento dos findings

| Finding | Estado | Contrato |
| --- | --- | --- |
| GAT02-01 DeliveryPackage e assurance | CLOSED | Seções 3–4 |
| GAT02-02 transação DELIVERY para DELIVERED | CLOSED | Seção 6 |
| GAT02-03 REJECT vs REWORK | CLOSED | Seção 5 |
| GAT02-04 project/module cancellation | CLOSED | Seção 8 |
| GAT02-05 pause/resume | CLOSED | Seção 7 |
| GAT02-06 efeitos em voo | CLOSED | Seção 9 |
| GAT02-07 idempotência/concorrência | CLOSED | Seção 10 |
| GAT02-08 RBAC | CLOSED | Seções 5, 7 e 8 |
| GAT02-09 archived/delete/legacy | CLOSED | Seção 11 |
| GAT02-10 contexto PREPARE_DELIVERY_PACKAGE | CLOSED | Seção 4 |

Não existe DECISÃO ARQUITETURAL NECESSÁRIA aberta. GAT-02 permanece
funcionalmente TO_DO até implementação aditiva de persistence, runtime,
API/projection e da matriz de testes acima.
