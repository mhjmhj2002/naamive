---
document_type: phase-planning
status: IMPLEMENTATION_COMPLETE_VALIDATED
created_at: 2026-08-13
scope: normative planning and implementation of Phase 6
primary_roadmap: 01_DELIVERY_ROADMAP.md
related_protocol: ../../ORCHESTRATION_PROTOCOL.md
related_compass: ../../LIFECYCLE_COMPASS.md
---

# Planejamento da Fase 6 — Agent Supervision & Assurance

## Origem e objetivo

Testes práticos da Fase 5 revelaram duas lacunas: agentes podem declarar uma
execução bem-sucedida deixando partes autorizadas incompletas, e bloqueios hoje
exigem que o operador encontre manualmente outro agente para investigá-los.

Esta fase prepara a capacidade nativa de supervisionar toda execução delegada:
verificar de forma independente a completude antes do aceite, conduzir rework e
assistir bloqueios com diagnóstico, alternativas, roteamento e escalonamento.
O princípio obrigatório é:

```text
EXECUTION_SUCCEEDED != WORK_ACCEPTED
SELF_CHECK != INDEPENDENT_REVIEW
```

Uma execução bem-sucedida somente prova que o produtor terminou a tentativa e
submeteu uma saída; não autoriza a orquestração a tratá-la como trabalho aceito.
Na formulação histórica da Fase 6, essa capacidade seria implantada de modo
aditivo e opt-in, sem reinterpretar contratos ou execuções já certificados das
Fases 3, 4 e 5. As decisões abaixo registram essa fronteira e a fundação
normativa entregue pela Fase 6; elas não proíbem evolução posterior autorizada.
A auditoria posterior identificou que o fluxo operacional real permaneceu fora
da cobertura F6 em pontos relevantes. A Fase 6.5, por novos workflows e rollout
versionado, é responsável por integrar supervision/assurance a esses fluxos sem
reinterpretar execuções históricas concluídas.

## F6-01 — Micro-lifecycle universal

O lifecycle macro de projeto e módulo continua inalterado. Não haverá uma fase
macro artificial de auditoria. Cada trabalho delegado terá este micro-lifecycle:

```text
DISPATCH → PRODUCE → OUTPUT_SUBMITTED → INDEPENDENT_REVIEW → ACCEPTED
                                      └→ FINDINGS → REWORK_REQUIRED → PRODUCE

DISPATCH → PRODUCE → BLOCK → ASSIST / ROUTE / ESCALATE → novo dispatch ou resolução
```

Somente `ACCEPTED` encerra o trabalho delegado para a orquestração.
`OUTPUT_SUBMITTED` e sucesso técnico são fatos distintos de aceite. A modelagem
preserva `EVIDENCE_REVIEW`, gates e estados publicados: validação de evidência,
review de completude, review especializado, aceite técnico e decisão de gate são
controles diferentes e não devem ser colapsados.

## F6-02 — Work acceptance e Independent Work Assurance

Todo review é independente do produtor. O reviewer recebe um `review-package`
mediado e sanitizado: contrato do dispatch, atividade autorizada,
`input_artifacts`, `expected_outputs`, `required_evidence`,
`completion_criteria`, referências/hash/metadados de artefatos, evidência
sanitizada, decisões registradas e saída estruturada validada. Prompt, payload
bruto, stdout/stderr, segredos e caminhos internos continuam proibidos pela F4.
A classificação do pacote é o máximo dos componentes; egress, runtime e
permissões obedecem a essa classificação. Saída do produtor é dado não confiável:
instruções nela contidas não podem alterar papel, ferramentas, política ou
autoridade do reviewer.

Atividades delegáveis terão modos `PRODUCE` e `REVIEW`. A decisão de assurance
emitida por `REVIEW` é terminal: não gera novo dispatch de review. O reviewer
registra `ACCEPT`, `REWORK`, `BLOCK` ou `ESCALATE`; contestação é gate ou nova
decisão humana explicitamente aberta, nunca review automático do review.

Independência é verificável. A seleção persiste `independence_check`, comparando
produtor e candidato pela identidade congelada `(agent_id, agent_version,
runtime_id, configuration_version, policy_id, policy_version,
execution_context_hash)`. Reviewer tem `agent_id` distinto, não reutiliza o
contexto de produção e, por padrão, usa configuração de runtime distinta.
Exceção só pode dispensar a separação de runtime em classificação permitida;
nunca dispensa `agent_id` distinto nem permite auto-review. Exige gate humano
prévio, escopo, motivo, ator, política/versão e expiração auditados. Sem reviewer
elegível, `work_acceptance` transita formalmente para
`WAITING_FOR_INDEPENDENT_REVIEWER`; o workflow macro não muda, não há aceite e
abre-se block de assurance roteado ao operador.

## F6-03 — Findings, rework, re-review e limites

Findings são entidades rastreáveis, não texto perdido na resposta de LLM. A F6
estende a entidade canônica F3 `findings`, sem criar coleção paralela: migration
aditiva inclui `agent_execution_id`, `work_acceptance_id`, `review_id` e
`dispatch_id`, a origem `ASSURANCE_REVIEW`, e ajusta a
restrição exclusiva de alvo sem invalidar os alvos F3. Cada finding correlaciona
origem, execução/dispatch, projeto/módulo/work item, categoria, severidade,
descrição, requisito/critério, evidência, ação de rework, status, resolução e
evidência de resolução.

Rework é delimitado pelos findings e continua sujeito a execution context,
autoridade, `target_path`, ferramentas, evidências e gates. O produtor não pode
autoatestar correção: todo rework retorna a review independente. Para um
`work_item` F3, a decisão de rework, deduplicação, revalidação por QA e limite
de duas rodadas da F3 prevalecem. Finding F6 usa o mesmo plano corretivo e não
pode criar terceira rodada ou ciclo paralelo. Fora de F3, política F6 versionada
define limite e escala quando contador, fingerprint recorrente ou ausência de
progresso atingir o critério. Há, assim, uma única coleção de findings e uma
única regra de rework aplicável a cada alvo.

Para alvo `work_item` F3, a decisão `REWORK` do reviewer executa uma única
transição transacional: cria ou vincula o finding `ASSURANCE_REVIEW` à
`rework_decision` F3 deduplicada por finding/delivery/SHA, aplica o guard de uma
correção ativa por item/revisão e muda o item exclusivamente para
`REWORK_ELIGIBLE`. Se a decisão equivalente já existir, somente a vincula; não
cria dispatch ou decisão paralela. O corretivo autorizado segue o fluxo F3, e o
finding F6 só pode ser fechado pela revalidação QA aprovada da delivery posterior.
Limite atingido, finding crítico/recorrente ou guard rejeitado escala pelo gate
F3, sem dispatch corretivo F6 alternativo.

## F6-04 — Block management, assistência e escalonamento

`BLOCK` é distinto de `FAILED` e de texto livre. `work_blocks` é a fonte de
verdade do lifecycle de block de assurance; ele referencia, sem substituir, o
fato nativo de origem. `BLOCKED_NO_EXECUTOR_AVAILABLE` continua estado técnico
F4 e `INTEGRATION_BLOCKED` continua estado F3; ambos podem ter um único block
aberto correlacionado, deduplicado por `(source_type, source_id, block_code)`
enquanto ativo. O registro contém `block_id`, `execution_id`, `dispatch_id`,
alvo, categoria, sintomas, evidências, tentativas, causas suspeitas, severidade,
responsável, status, resolução escolhida e evidência.

Categorias iniciais: `TECHNICAL`, `REQUIREMENT_AMBIGUITY`,
`ARCHITECTURE_CONFLICT`, `DEPENDENCY`, `ENVIRONMENT`, `EXTERNAL_SERVICE`,
`TEST_FAILURE`, `SECURITY`, `POLICY` e `MISSING_INFORMATION`.

O lifecycle é `OPEN → DIAGNOSING → SOLUTION_PROPOSED → RESOLUTION_SELECTED →
RESOLVING → RESOLVED`, com `ESCALATED`, `PAUSED` e `CANCELLED`. `RESOLVED`
exige resolução e evidência; reabertura cria novo ciclo ligado ao anterior. O
block não muda sozinho job, operação ou workflow: a execução mantém estado F4 e
uma transição F3 só ocorre por ação já autorizada. Cancelamento encerra block e
execução associada; pausa preserva ambos e impede novo dispatch. A assistência
analisa evidências/tentativas, propõe alternativas com impactos, trade-offs e
confiança, recomenda opção e indica especialista ou decisão humana. Não muda
silenciosamente requisito, arquitetura, política ou decisão humana reservada.

## F6-05 — Ownership, routing e advisory especializado

O orquestrador controla lifecycle, routing, política de retry/rework, detecção
de loop, escalonamento e retorno ao fluxo normal. `governance-assurance`
verifica processo, autoridade, rastreabilidade e gates; não escolhe solução
técnica. Reviewer especialista avalia completude/correção. Advisory diagnostica
e propõe opções. QA continua responsável por qualidade, testes e aceitação.

O orquestrador pode selecionar reviewer elegível, criar dispatch corretivo já
delimitado por finding, pausar por segurança operacional e rotear/escalonar; não
pode escolher mudança de requisito, arquitetura, política, risco aceito ou
encerramento crítico. Especialista/advisory somente recomendam e evidenciam. QA
fecha finding F3 por revalidação. On-call Owner pode pausar, cancelar e
reconciliar; Tech Lead/dono do repositório decide exceção de independência,
mudança de escopo/arquitetura/política, risco aceito e fechamento escalado. São
gates auditados, nunca consequência automática de recomendação.

Routing inicial: ambiguidade para `requirements-engineering`, conflito
arquitetural para `solution-architecture`, integração para
`integration-engineering`, segurança para `security-assurance` e problema
operacional para papel aplicável. A necessidade de `engineering-advisor` fica
aberta: avaliar capability/task type antes de aumentar a taxonomia.

## F6-06 — Migração, handoff, operação e aceite

Quando uma política F6 é selecionada, a transação de criação do dispatch cria
também `work_acceptance=PENDING_PRODUCE`, correlacionado à execução. O handoff
F6 de sucesso substitui somente o caminho de sucesso desse dispatch. Após
tentativa validada, uma mesma transação persiste referência de saída sanitizada,
muda `agent_execution` de `RUNNING` para `OUTPUT_SUBMITTED`, muda
`work_acceptance` para `PENDING_REVIEW` e cria o dispatch idempotente de
`REVIEW`. Ela não chama `persistDiscoveryAgentOutcome`, não conclui job/operação
e não avança workflow. Apenas `ACCEPT` persiste efeito de negócio, marca
`work_acceptance=ACCEPTED`, conclui job/operação e promove workflow. `REWORK`,
`BLOCK` e `ESCALATE` preservam a saída e impedem promoção. Reconciliador que
encontrar sucesso segue o mesmo handoff.

Há handoff transacional equivalente para bloqueio F6. Antes de qualquer falha
terminal de job/operação ou promoção do projeto para falha, uma ocorrência
`BLOCKED_NO_EXECUTOR_AVAILABLE`, `POLICY_BLOCKED`, reconciliação ambígua ou
falha que a política classifique como bloqueável deve, na mesma transação,
persistir o fato técnico sanitizado, criar ou correlacionar o `work_block`
idempotente e mudar `work_acceptance` para `BLOCKED`. O job/operação ficam
`BLOCKED`, sem lease e sem avanço do workflow, para assistência, rota ou gate;
`RESOLVED` só libera o próximo dispatch autorizado. Falha não bloqueável segue
o tratamento de falha da política. Requests legados ou fora da política F6
mantêm exatamente a terminação F4 atual, inclusive falha imediata.

O contrato F4 certificado permanece para requests legados e fora de F6: seguem
em `SUCCEEDED`. Migration F6 é aditiva/versionada: amplia o estado de
`agent_execution` para `OUTPUT_SUBMITTED` e cria aceite/review/block, sem
reinterpretar linhas F4. Política publicada de assurance seleciona requests do
novo caminho; rollout inicial é opt-in e reversível para novos dispatches.

Esse rollout inicial documenta a coexistência histórica da Fase 6, não congela o
escopo do runtime. A Fase 6.5 pode publicar novas versões de workflow e contrato
e, pela `AUT-03`, selecionar jobs e handoffs reais para supervision/assurance.
Versões e execuções históricas continuam consultáveis sob sua semântica original;
somente novos dispatches selecionados pelo rollout corretivo passam ao contrato
novo.

Invariantes: no máximo um `REVIEW` ativo por aceite e uma decisão terminal por
versão; retry/restart usa as mesmas chaves idempotentes e não duplica finding ou
block; cancelamento vence novo dispatch; e a restrição F4 de uma tentativa
`DISPATCHED` por execução continua válida. Retenção mínima, índices por
alvo/estado/correlação, eventos auditáveis e projeções sanitizadas são parte da
migration.

Cenários E2E mínimos: sucesso produtor não avança antes de `ACCEPT`; reviewer
inelegível/ausente bloqueia sem autoaceite; rework F3 cria/vincula apenas a
decisão F3 e respeita duas rodadas; restart no handoff/review não duplica efeito;
falha bloqueável F6 cria block antes de bloquear job/operação; cancelamento
impede aceite/re-review; block F4 é correlacionado sem mudar estado técnico; e
decisão humana requerida não é executada pelo advisory.

Fundamentos rastreáveis permitem evolução posterior para análise de padrões e
histórico de blocks, taxas de completude por agente/runtime, seleção inteligente
de reviewer e antecipação de riscos. Isso não é escopo desta fase.

## Critérios de pronto do planejamento

- O roadmap contém Fase 6 nova, Fase 7 (entrega anterior) e Fase 8 (operação anterior), sem perda de escopo.
- O micro-lifecycle e a distinção entre sucesso de execução e aceite de trabalho estão documentados.
- A fronteira terminal de review, handoff transacional, independência verificável, coexistência F3/F4 e contexto seguro são normativos.
- Findings, rework, blocks, assistência, routing e escalonamento são entidades/processos rastreáveis.
- Ownership entre orquestrador, governance, especialista, advisory, QA e humano está delimitado.
- A implementação histórica preserva o comportamento certificado F4/F5 para
  dispatches fora da política F6 opt-in; a Fase 6.5 pode ampliar essa seleção em
  versões novas, sem reinterpretar execuções históricas.

## Questões para o detalhamento/implementação da Fase 6

1. Schema físico, nomes finais de APIs/projeções web e valores iniciais das políticas versionadas, obedecendo às decisões acima.
2. Matriz detalhada de routing por categoria e decisão sobre `engineering-advisor` como agente ou capability.
3. UX operacional para os ciclos já definidos, sem ampliar a autoridade estabelecida.
