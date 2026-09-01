---
task: F5-23
status: DONE
---

# F5-23 — Decomposição autônoma e auditável do plano de módulo

## Nota aditiva de reconciliação F6.5 — 2026-09-01

F5-23 entregou a decomposição validada, snapshots e o gate único do plano como
evolução de F5-22. Sua entrega histórica não incluiu, por si só, a conformidade
transversal posterior de lifecycle, assurance, recovery, UI e integração. A
Fase 6.5 conectou novos work items ao `WORK_ITEM_DELIVERY:v2`, ao scheduler e
aos handoffs de assurance versionados; a certificação dessa expansão está em
TST-01. Esta nota preserva a autoria e a evidência de F5-23 sem reescrever seu
escopo histórico.

## Contexto

F5-22 criou o ciclo de proposta, revisão e aprovação única, mas o fallback
atual de `PLAN_MODULE_WORK_ITEMS` produz um único WI genérico. A proposta para
`registro-de-solicitacoes` ilustra o problema: ela mistura persistência,
histórico/status, API, interface e medição de primeira resposta, com
allowlist `src`, critério genérico e somente `npm test` como QA.

Uma proposta estruturalmente válida não é suficiente. O planejamento deve
decompor o escopo aprovado em unidades implementáveis, dependentes e
auditáveis. Este é um requisito de qualidade da proposta, não uma autorização
humana adicional.

## Objetivo

Fazer com que o agente de planejamento receba contexto sanitizado completo e
gere uma decomposição real. O fallback só pode representar falha controlada;
nunca pode abrir automaticamente uma proposta genérica aprovada por engano.

## Implementar

1. Construir contexto sanitizado e versionado para `PLAN_MODULE_WORK_ITEMS`.
   Permitir somente campos versionados da definição/revisão do módulo,
   arquitetura aprovada, Technology Baseline aprovada, critérios de aceite,
   escopo, fora de escopo, dependências de negócio, feedback da rodada
   anterior e proposta anterior. Cada critério deve receber ou preservar um
   `criterion_id` estável na revisão do módulo. Nunca incluir segredos, paths
   absolutos, conteúdo de arquivos, instruções executáveis, nem texto não
   confiável fora de campos explicitamente rotulados como dados de referência.
   Limitar tamanho de cada campo/lista, remover caracteres de controle e
   persistir `context_schema_version`, versão do sanitizador e hash do contexto
   enviado; a mesma política de sanitização e limites aplica-se à resposta e às
   evidências publicadas.
2. Criar schema de resposta `module-plan/v1`, distinto do contrato de
   discovery, e rejeitar campos adicionais. A resposta deve conter
   `schema_version`, `work_items`, `criterion_coverage`, `risks` e `gaps`.
   Cada WI deve conter `work_item_id` lógico estável e único, `title`,
   `objective`, `inputs`, `output`, `acceptance_criteria`, `allowlist`,
   `denylist`, `depends_on_ids`, `criterion_ids`, `qa_matrix`, `risks` e,
   quando aplicável, `allowlist_exception` e `cohesion_justification`. A
   resposta também deve declarar `business_dependency_coverage`.
   Cada entrada de `business_dependency_coverage` contém `dependency_id`,
   `classification`, `work_item_ids`, `blocked_work_item_ids` e
   `justification`; `classification` é estritamente
   `COVERED_BY_WORK_ITEMS`, `EXTERNAL_BLOCKER` ou `NOT_APPLICABLE`.
   `criterion_coverage` deve mapear cada `criterion_id` do módulo para um ou
   mais `work_item_id`. Títulos não são identidade nem referência de
   dependência. Ao materializar, persistir o ID lógico no payload do work item
   e preservar a versão do schema e os hashes do contexto e da validação.
3. Orientar o agente a decompor por capacidade e fronteira verificável, não
   por camadas artificiais. Um WI pode agrupar trabalho coeso, mas não pode
   esconder múltiplas capacidades relevantes sem justificativa explícita.
4. Implementar validação semântica determinística além do contrato estrutural:
   - todo `criterion_id` do módulo precisa constar em `criterion_coverage` e
     em pelo menos um WI; o validador rejeita IDs desconhecidos, omitidos ou
     divergentes entre os dois locais;
   - dependências devem apontar para `work_item_id` existente, ser acíclicas e
     respeitar `business_dependency_coverage`: cada dependência de negócio é
     classificada como coberta por WI, externa/bloqueante ou não aplicável, com
     justificativa. IDs ausentes, duplicados ou não pertencentes à revisão do
     módulo invalidam a proposta. `COVERED_BY_WORK_ITEMS` exige ao menos um WI
     em `work_item_ids` e `blocked_work_item_ids` vazio;
     `NOT_APPLICABLE` exige ambas as listas vazias; `EXTERNAL_BLOCKER` exige
     `work_item_ids` vazio e ao menos um WI existente em
     `blocked_work_item_ids`. Dependência externa não pode ser materializada
     como WI elegível, deve gerar bloqueio explícito na projeção e impedir o
     agendamento dos WIs bloqueados até resolução auditável;
   - derivar capacidades do escopo e dos critérios por regras versionadas
     (`persistence`, `history/status`, `api`, `ui`, `metric`, entre outras
     declaradas). Um WI que cubra mais de uma capacidade somente é aceito se a
     lista de capacidades, a justificativa de coesão e o risco forem válidos;
     uma proposta de WI único para duas ou mais capacidades independentes é
     rejeitada. Módulos com uma única capacidade podem ter um único WI;
   - allowlist não pode ser raiz ampla (`src`, `.`, ou equivalente), glob nem
     prefixo que cubra o repositório. Exceção exige `allowlist_exception`,
     justificativa, risco e aprovação explícita do validador; denylist continua
     obrigatória e não pode conflitar;
   - aplicar uma matriz versionada capacidade → QA mínimo: `persistence` exige
     teste de integração em banco isolado; `api` exige integração HTTP ou E2E;
     `ui` exige E2E ou teste de interface; fluxos críticos exigem E2E. A matriz
     registra comandos, diretório relativo, timeout, ambiente necessário e os
     `criterion_ids` exercitados. Teste unitário é exigido quando houver regra
     de domínio isolável;
   - saída e critérios do WI precisam ser verificáveis e não usar textos
     genéricos como “módulo implementado” ou “funcionalidade entregue”.
5. Quando contrato, sanitização ou validação semântica falhar, não criar
   revisão nem gate. Em transação própria e atômica, persistir relatório
   JSON/Markdown sanitizado, hash, `validator_version`, erros por regra e
   referência ao job; publicar evento de rejeição sem expor a resposta bruta.
   Depois retornar erro tipado para que o job seja retryável, sem reverter a
   evidência. Após esgotar retry, marcar somente job/operação como falho,
   emitir evento e projeção explícitos com ação de nova tentativa e manter a
   última revisão/gate legíveis e inalterados. `PLAN_MODULE_WORK_ITEMS` não
   pode transicionar projeto ou módulo para estado global de falha por essa
   condição; na primeira rodada sem revisão anterior, a projeção deve informar
   “planejamento falhou, sem proposta disponível”.
6. Remover a proposta genérica como resultado normal do fallback. O adaptador
   controlado de testes deve ser selecionado somente por configuração de teste
   explicitamente negada em produção e fornecer fixtures completas,
   determinísticas, versionadas e sujeitas ao mesmo schema e validação
   semântica. Em produção, indisponibilidade, timeout ou resposta inválida do
   agente deve falhar fechado: nunca substituir a chamada por fixture ou
   proposta genérica.
7. Criar o comando idempotente `RETRY_MODULE_PLAN`, exclusivo do operador, para
   nova tentativa após falha terminal. Exigir `project_id`, `module_id`,
   `failed_operation_id` e `idempotency_key`; aceitar somente operação
   `PLAN_MODULE_WORK_ITEMS` terminalmente falha do mesmo módulo, sem job de
   planejamento pendente/em execução nem gate aberto. Criar atomicamente nova
   operação e job, com `retry_of_operation_id`, a mesma revisão/baseline e o
   contexto da rodada falha; publicar `MODULE_PLAN_RETRY_REQUESTED`. Repetição
   da chave retorna a mesma operação e uma origem já reintentada por outra chave
   falha com conflito.
8. Antes de `APPROVE_MODULE_PLAN` materializar qualquer WI, recarregar a revisão
   atual e reexecutar contrato e validação semântica com a
   `validator_version` registrada. Confirmar `schema_version`, hash canônico do
   payload e hashes de contexto/validação. Se a versão do validador não estiver
   disponível ou a validação falhar, falhar fechado: não fechar gate, não
   aprovar nem materializar WIs; persistir evidência
   `MODULE_PLAN_APPROVAL_VALIDATION_FAILED` e manter a revisão legível.
9. Preservar integralmente as garantias de F5-22: revisões imutáveis, feedback
   como contexto da próxima rodada, idempotência, gate único e nenhuma
   materialização parcial.

## Cenário mínimo de aceite

Para `registro-de-solicitacoes`, a proposta deve separar, quando aplicável:

- modelo/persistência da solicitação e histórico;
- API REST para registrar, consultar e atualizar status;
- interface operacional de registro e acompanhamento;
- cálculo/consulta do tempo de primeira resposta;
- cobertura unitária, integração PostgreSQL e E2E dos fluxos críticos.

Isso é exemplo de resultado esperado, não lista rígida: outra decomposição é
aceitável se demonstrar a mesma rastreabilidade, coesão e cobertura.

## Critérios de aceite

1. Uma proposta de WI único que mistura duas ou mais capacidades independentes
   derivadas pelas regras versionadas é rejeitada semanticamente e não abre
   gate; um módulo de capacidade única permanece elegível para um único WI.
2. A proposta válida demonstra cobertura de 100% dos `criterion_id` do
   módulo, dependências acíclicas e compatíveis com a matriz de negócio, e QA
   compatível com a matriz versionada de capacidades.
3. Feedback de ajuste altera o contexto da nova rodada e pode levar a uma
   decomposição diferente, sem alterar a revisão anterior.
4. Falha, timeout, contrato inválido e validação semântica inválida não criam
   proposta/gate parcial, não substituem a última revisão válida nem movem o
   projeto/módulo para falha global; o operador recebe evidência sanitizada e
   uma ação de nova tentativa.
5. `RETRY_MODULE_PLAN` só reintenta uma operação terminal pertinente, é
   idempotente, preserva o contexto e rejeita origem já reintentada, job ativo
   ou gate aberto.
6. A aprovação revalida a proposta persistida com a versão registrada; hash ou
   validador indisponível, contrato ou semântica inválidos impedem
   materialização e preservam o gate aberto.
7. Testes unitários cobrem schema fechado, IDs lógicos, cobertura, ciclo,
   capacidade/coerência, allowlist e matriz de QA; testes integração/worker
   cobrem retry, evidências sanitizadas, falha terminal sem transição global e
   duas rodadas; E2E cobre proposta gerada, solicitação de ajustes, nova
   tentativa e a projeção sem proposta após falha inicial.

## Correções pendentes identificadas em auditoria

As correções abaixo são parte obrigatória desta task. Elas não substituem os
requisitos anteriores e devem ser entregues com testes automatizados.

| Correção | Status |
| --- | --- |
| 1. Snapshot único de contexto | DONE |
| 2. IDs de critérios como dado versionado | DONE |
| 3. Aprovação em duas etapas e evidência durável | DONE |
| 4. Bloqueio externo operacional | DONE |
| 5. Retry a partir do snapshot falho | DONE |
| 6. Matriz de QA declarativa e versionada | DONE |
| 7. Cobertura de testes F5-23 | DONE |

1. **[DONE] Snapshot único de contexto.** Construir uma vez o contexto sanitizado da
   rodada, persistir seu payload, versão e hash antes da invocação do agente e
   usar exatamente esse snapshot tanto na chamada quanto na validação e na
   persistência da proposta. Arquitetura, baseline, feedback e proposta
   anterior não podem ser recarregados de forma divergente entre essas etapas.

2. **[DONE] IDs de critérios como dado versionado.** Na criação ou revisão do módulo,
   todo critério deve receber e persistir `criterion_id` estável no payload da
   revisão. A aprovação deve reutilizar esses IDs, sem reconstruí-los por
   posição ou texto.

3. **[DONE] Aprovação em duas etapas e evidência durável.** Executar a revalidação
   antes da transação de materialização e confirmar `schema_version`, hash
   canônico do payload, `context_hash`, `validation_hash` e
   `validator_version`. Em qualquer falha, gravar em transação própria o
   artefato JSON/Markdown e o evento
   `MODULE_PLAN_APPROVAL_VALIDATION_FAILED`; somente depois devolver erro.
   A revisão e o gate devem permanecer abertos e legíveis.

4. **[DONE] Bloqueio externo operacional.** Ao materializar a proposta, projetar cada
   WI listado em `blocked_work_item_ids` como bloqueado, com a dependência e a
   justificativa auditáveis. `START_DEVELOPMENT` deve rejeitar esses WIs até
   uma resolução também auditável da dependência externa; eles não podem ser
   tratados como elegíveis por estados ou APIs subsequentes.

5. **[DONE] Retry a partir do snapshot falho.** `RETRY_MODULE_PLAN` deve copiar a
   revisão, baseline e snapshot de contexto da operação terminal indicada,
   jamais montar contexto a partir do estado corrente. A chave de idempotência
   é obrigatória no transporte e a origem somente pode gerar um retry.

6. **[DONE] Matriz de QA declarativa e versionada.** Substituir verificações ad-hoc
   por uma matriz versionada capacidade → QA mínimo. Ela deve exigir:
   integração de banco isolado para `persistence`; integração HTTP ou E2E para
   `api`; E2E ou interface para `ui`; E2E para fluxo crítico; e unitário para
   regra de domínio isolável. Cada entrada deve registrar comando, diretório
   relativo, timeout, ambiente e `criterion_ids` exercitados.

7. **[DONE] Cobertura de testes F5-23.** Adicionar testes unitários para os contratos
   acima; integração/worker para falha, retry e duas rodadas; e E2E para
   proposta, ajuste, retry, bloqueio externo e projeção sem proposta na falha
   inicial. A suíte completa deve terminar sem falhas.

## Pendências da auditoria de implementação

Os itens abaixo foram identificados após a declaração de conclusão da task e
foram todos resolvidos, com cobertura de testes automatizados proporcionais ao
risco.

| Pendência | Status |
| --- | --- |
| 8. Revalidação integral no snapshot persistido | DONE |
| 9. Sanitização e limites da resposta/evidências | DONE |
| 10. Evidência durável para falha de planejamento | DONE |
| 11. Retry com revisão e baseline da origem | DONE |
| 12. Transporte obrigatório e autorização de operador no retry | DONE |
| 13. Projeção explícita da falha inicial de planejamento | DONE |
| 14. Schema fechado em profundidade | DONE |

8. **[DONE] Revalidação integral no snapshot persistido.** Antes de aprovar,
   revalidar contra o snapshot de contexto persistido para a proposta e
   confirmar `schema_version`, hash canônico do payload, `context_hash`,
   `validation_hash` e `validator_version`. A aprovação não pode reconstruir
   o contexto a partir do estado corrente nem materializar quando algum desses
   valores não corresponder ao registro da rodada.

9. **[DONE] Sanitização e limites da resposta/evidências.** Aplicar à resposta
   do agente e a toda evidência publicada a mesma política versionada de
   sanitização e limites do contexto: remover caracteres de controle, limitar
   campos/listas, rejeitar conteúdo inválido e impedir que texto não confiável
   seja persistido sem tratamento.

10. **[DONE] Evidência durável para falha de planejamento.** Quando contrato,
    sanitização ou validação semântica falhar, persistir em transação própria,
    antes do retry/retorno, relatório JSON e Markdown sanitizados com hash,
    `validator_version`, erros por regra e referência ao job. O evento de
    rejeição não pode expor a resposta bruta; a operação terminal deve manter
    ação explícita de `RETRY_MODULE_PLAN`.

11. **[DONE] Retry com revisão e baseline da origem.**
    `RETRY_MODULE_PLAN` deve criar a nova operação e job usando a mesma
    revisão, Technology Baseline e snapshot de contexto da operação terminal
    indicada, sem consultar ou herdar baseline/revisão do estado atual do
    módulo.

12. **[DONE] Transporte obrigatório e autorização de operador no retry.**
    Exigir `Idempotency-Key` no endpoint de retry, sem gerar chave aleatória
    como fallback, e garantir que o comando seja exclusivo do operador
    autorizado. Cobrir ausência de chave e tentativa não autorizada.

13. **[DONE] Projeção explícita da falha inicial de planejamento.** Expor na
    projeção e na interface o estado “planejamento falhou, sem proposta
    disponível” na primeira rodada sem revisão válida, incluindo uma ação
    auditável de nova tentativa. A projeção deve incluir o job/operação de
    planejamento, sem alterar projeto ou módulo para falha global.

14. **[DONE] Schema fechado em profundidade.** Definir e aplicar contrato
    fechado para todos os níveis de `module-plan/v1`, não somente o objeto de
    topo. Validar tipos, campos permitidos, limites e conteúdo de work items,
    QA, riscos, gaps, coberturas de critérios e dependências de negócio antes
    de persistir a proposta.

## Pendências remanescentes da segunda auditoria

| Pendência | Status |
| --- | --- |
| 15. Recalcular hash do conteúdo do snapshot na aprovação | DONE |
| 16. Persistir revisão de origem na operação e job de retry | DONE |
| 17. Evidência completa para falha de agente | DONE |

15. **[DONE] Recalcular hash do conteúdo do snapshot na aprovação.** Durante
    `APPROVE_MODULE_PLAN`, recalcular o hash canônico do conteúdo do snapshot
    persistido, excluindo seu próprio campo de hash, e confrontá-lo com o
    `context_hash` registrado. Não basta comparar o hash da revisão com o
    campo interno do snapshot: qualquer alteração conjunta de payload e hash
    deve ser detectada e impedir a materialização. Implementado em
    `revalidatePlanApproval` (`src/module-planning.ts`), que recalcula o
    SHA-256 canônico do conteúdo persistido (`context_payload`) excluindo a
    própria chave `context_hash` e o compara com o `context_hash` registrado,
    detectando qualquer alteração conjunta de payload+hash. Verificado por 3
    testes unitários em `src/module-planning.test.ts` (válido passa; adulteração
    conjunta de conteúdo+hash recomputado lança `CONTEXT_HASH_MISMATCH`;
    adulteração apenas do `context_hash` aninhado também lança). Suíte unitária
    19/19 passando.

16. **[DONE] Persistir revisão de origem na operação e job de retry.**
    `RETRY_MODULE_PLAN` deve gravar o `revision_id` da operação falha tanto na
    nova operação quanto no novo job. A revisão de origem não pode ficar
    apenas no evento ou em dados auxiliares; a linhagem deve ser consultável
    diretamente nos registros operacionais. Implementado com a migration
    `migrations/038_phase_5_module_plan_retry_lineage.sql`, que adiciona
    `module_revision_id uuid REFERENCES module_revisions(id)` em operations e
    jobs (com índices de linhagem). `enqueuePlan` agora preenche
    `module_revision_id` na operação de retry e no job de retry com o
    `module_revision_id` do snapshot falho, tornando a linhagem diretamente
    consultável nos registros operacionais (não só em eventos/snapshot);
    `revision_id` (FK de intake) permanece NULL. `MODULE_PLAN_RETRY_REQUESTED`
    passou a incluir `module_revision_id` no payload. Verificado por asserts de
    E2E (teste da pendência 11 + novo teste de linhagem direta da pendência
    16). Suíte E2E 11/11 passando.

17. **[DONE] Evidência completa para falha de agente.** Para timeout,
    indisponibilidade e demais falhas do agente que ocorram fora de
    `persistPlan`, persistir o mesmo relatório durável JSON/Markdown
    sanitizado usado nas falhas de contrato/validação, incluindo hash,
    `validator_version`, erros por regra quando aplicáveis, referência ao job
    e ação `RETRY_MODULE_PLAN`. Implementado em `failJob` (`src/worker.ts`,
    branch `PLAN_MODULE_WORK_ITEMS`), que agora persiste o par completo de
    evidência JSON + Markdown sanitizado
    (`module-plan-rejection-report` + `module-plan-rejection-report-markdown`)
    no mesmo formato de `persistPlanFailureEvidence`:
    `schema_version`, `validator_version` (`MODULE_PLAN_VALIDATOR_VERSION`),
    `sanitizer_version`, `job_id`, `operation_id`, `module_id`, `project_id`,
    `code`, `errors[]` por regra, `next_action` `'RETRY_MODULE_PLAN'` e
    `report_hash`; emite `MODULE_PLAN_FAILED` com `module_id`, `errors`,
    `evidence_hash` e `next_action`. Verificado por novo teste E2E que dispara
    falha real de agente fora de `persistPlan` (workdir/comando CODEX inválido)
    e asserta ambos os artefatos e o formato completo do relatório. Suíte E2E
    11/11 passando.

## Bug identificado no teste de ciclo de vida

| Bug | Status |
| --- | --- |
| 18. A tela de planejamento mantém a mensagem genérica de espera quando o worker falha, sem expor a causa nem a ação de retry auditável. | DONE |

18. **[DONE] Exibir falha e retry do planejamento autônomo na interface.**
    Quando a projeção retornar `PLANNING_FAILED`, a interface substitui a
    mensagem genérica de espera por uma explicação da interrupção, apresenta o
    `failure_code` sanitizado da operação e oferece “Tentar gerar proposta
    novamente”. A ação chama `POST .../retry-plan` com o
    `failed_operation_id` projetado, portanto preserva o retry idempotente e
    auditável já definido para F5-23; não existe preenchimento manual de work
    items nesta etapa. Coberto pelo teste de interface
    `src/module-planning-failure-ui.test.ts`; suíte `npm test` aprovada.

## Itens concluídos: observabilidade e recuperação do agente

| Item concluído | Status |
| --- | --- |
| 19. Capturar o stream JSONL do Codex durante o planejamento, sem persistir conteúdo sensível ou raciocínio bruto. | DONE |
| 20. Persistir sinais de atividade e saúde do planejamento como evidência e eventos auditáveis. | DONE |
| 21. Projetar o progresso operacional do agente na tela de planejamento. | DONE |
| 22. Tornar o timeout longo condicionado a telemetria de vida e degradação visível. | DONE |
| 23. Permitir recuperação segura após falha de uma tentativa de retry. | DONE |

19. **[DONE] Capturar eventos reais do Codex.** Executar o planejamento com
    `codex exec --json`, processar JSONL incrementalmente e aceitar somente um
    contrato fechado de eventos operacionais. Nunca persistir ou projetar
    prompt, cadeia de raciocínio, argumentos de ferramentas, conteúdo de
    arquivos, segredos ou saída bruta; eventos desconhecidos devem ser
    descartados de forma fail-closed.

20. **[DONE] Evidência durável de atividade e saúde.** Para cada job de
    `PLAN_MODULE_WORK_ITEMS`, registrar início, último evento operacional,
    heartbeat periódico, duração acumulada, término e causa de interrupção.
    Os registros devem ser sanitizados, associados a job/operação e emitidos
    como eventos de linha do tempo, sem transformar um heartbeat em alegação
    de progresso funcional.

21. **[DONE] Projeção e interface de acompanhamento.** Expor no
    `phase3Detail` o status do executor, a etapa permitida, o horário do último
    sinal, duração e condição de saúde; a tela deve atualizar por SSE e exibir
    claramente “na fila”, “em execução”, “ativo sem evento novo” ou
    “degradado”, sem formulário manual de work items.

22. **[DONE] Timeout observável e política de degradação.** Elevar o timeout
    de planejamento somente após a telemetria estar disponível, com valor
    configurável e auditado (por exemplo, 10–15 minutos), heartbeat a cada
    minuto e alerta de ausência de sinal em limiar menor (por exemplo, 2
    minutos). O timeout final deve preservar a última evidência disponível e
    informar na UI se o processo estava ativo ou silencioso antes da terminação.

23. **[DONE] Retry encadeado com linhagem correta.** Corrigir a seleção e a
    validação da operação de origem para que uma falha em `RETRY_MODULE_PLAN`
    possa gerar uma nova tentativa idempotente, reutilizando o mesmo snapshot,
    revisão e baseline da primeira operação de planejamento. A projeção deve
    apontar sempre para uma origem elegível e testes E2E devem cobrir duas
    falhas consecutivas seguidas de uma recuperação bem-sucedida.

## Dependência bloqueante de F5-23: runtime de desenvolvimento autônomo

| Bug | Status |
| --- | --- |
| 24. A autorização materializa delivery/worktree e marca `DEVELOPMENT_IN_PROGRESS`, mas `DEVELOP_WORK_ITEM` encerra após o preparo sem despachar agente de implementação. | DONE |
| 25. Escopo de projeção fiel e detecção de regressão do runtime de desenvolvimento. | TRANSFERRED TO F5-25 |

24. **[DONE][BLOQUEANTE][TASK PRÓPRIA] Runtime de execução autônoma de work
items.** Esta é uma descoberta legítima de F5-23, mas altera substancialmente
o ciclo de entrega da Fase 3. Deve permanecer como dependência bloqueante de
F5-23 e ser implementada em task própria de runtime de desenvolvimento, com
atualização explícita do Compass e do catálogo de workflow se algum estado
canônico precisar mudar.

   **Causa e evidência histórica.** Antes da correção parcial,
   `src/worker.ts` chamava somente `prepareDevelopmentJob()` e em seguida
   concluía `DEVELOP_WORK_ITEM`. Isso deixava delivery/worktree `ACTIVE`, job
   `COMPLETED`, nenhum processo Codex ativo, nenhum diff/commit e WI em
   `DEVELOPMENT_IN_PROGRESS`.

   **Checklist de implementação e auditoria.** O bug foi concluído; todos os
   itens abaixo estão `DONE`.

   - [DONE] O worker prepara o worktree e despacha `executeDevelopmentAgent()`
     com `cwd` no worktree reservado.
   - [DONE] O adaptador `controlled` produz alteração permitida e commit
     auditável determinístico; ele não conclui mais como no-op.
   - [DONE] Toda execução, inclusive a controlada, passa por validação de SHA,
     diff, paths alterados e commits auditáveis antes de ser aceita.
   - [DONE] Uma execução aceita registra evidência durável e transiciona a
     delivery para `EVIDENCE_REVIEW`, com WI em `QA_IN_PROGRESS` e próxima ação
     `SUBMIT_QA`; `DEVELOPMENT_IN_PROGRESS` não permanece após o job concluído.
   - [DONE] A migration `041_phase_5_development_runtime.sql` substitui o lock
     de worktree por projeto por exclusividade de delivery/worktree por WI.
   - [DONE] A falha de `DEVELOP_WORK_ITEM` não promove falha global de projeto
     ou módulo; a tentativa retorna para reserva ou `REWORK_ELIGIBLE`.
   - [DONE] O advisory lock global do worker foi removido, permitindo que jobs
     de WIs independentes sejam leased/executados em paralelo.
   - [DONE] Impor tecnicamente a allowlist/denylist durante a execução. O
     `workspace-write` do Codex ainda dá acesso a todo o worktree; prompt e
     validação posterior não constituem isolamento suficiente. **Rumo
     aprovado:** criar workspace de execução no worktree contendo somente os
     caminhos permitidos graváveis; paths fora da allowlist devem estar ausentes
     ou somente leitura. Executar o agente nesse workspace e aplicar de volta
     exclusivamente diff validado, preservando a rejeição de symlinks, renames
     e alterações fora da política.
   - [DONE] Implementar telemetria própria de desenvolvimento: JSONL com
     contrato fechado, sinais operacionais progressivos, heartbeat, saúde,
     falha sanitizada, eventos e projeção SSE/polling. **Rumo aprovado:**
     extrair de `executeModulePlanAgent` um adaptador reutilizável que aceite
     somente `thread.started`, `turn.started` e `turn.completed`; descartar
     eventos desconhecidos. Persistir apenas metadados sanitizados, nunca
     prompt, raciocínio, conteúdo de arquivo ou argumentos de ferramentas.
   - [DONE] Definir comando/API de retry auditável com `Idempotency-Key`,
     origem elegível, limite de tentativas e reconciliação determinística do
     worktree. **Rumo aprovado:** implementar `RETRY_DEVELOP_WORK_ITEM` e,
     antes de reenfileirar, classificar o worktree: íntegro/sem diff →
     reutilizar; diff permitido com commit auditável → reconciliar para revisão
     de evidência; divergente, sujo fora da allowlist ou lease perdida →
     liberar/remover e criar nova tentativa/worktree. Persistir a decisão,
     causa e hashes antes do reenfileiramento.
   - [DONE] Persistir para falhas de desenvolvimento relatório JSON/Markdown
     sanitizado com causa específica e ação de recuperação. **Rumo aprovado:**
     incluir job, delivery, operação, código, último sinal, estado do worktree,
     SHA base/head, número da tentativa e próxima ação. O evento deve apontar
     ao hash da evidência e nunca carregar saída bruta do agente.
   - [DONE] Cobrir automaticamente concorrência com chaves distintas,
     escrita controlada, timeout/retry, telemetria e a regressão “worktree
     preparado sem agente despachado”. **Rumo aprovado:** testes unitários para
     classificação de worktree, política de paths, JSONL e transições; testes
     de integração para WIs distintos em paralelo e duas chaves no mesmo WI;
     testes de worker para timeout/falha/retry; e E2E autorizar → agente
     controlado → commit/evidência → `SUBMIT_QA`, incluindo a regressão.

   **Ciclo de vida e semântica canônica.** A correção deve obedecer ao
   [`LIFECYCLE_COMPASS.md`](../../../LIFECYCLE_COMPASS.md), sobretudo o caminho
   `RECEIVED → VALIDATING → DISPATCHED → EVIDENCE_REVIEW → WAITING_FOR_GATE →
   COMPLETED` e seus ramos `FAILED`, `REWORK_REQUIRED`, `PAUSED` e `CANCELLED`.
   “Na fila”, “em execução”, “sem sinal novo” e “degradado” são campos de
   telemetria/projeção derivados — não novos estados de workflow. Se a task
   precisar introduzir estado canônico adicional, deve primeiro versionar o
   Compass e o catálogo de workflow; não criar estado ad hoc ou transição
   paralela. `DEVELOPMENT_IN_PROGRESS` só pode existir enquanto houver tentativa
   `DISPATCHED/RUNNING` com lease válido. Ao concluir com diff/commits validados,
   seguir para a etapa canônica de evidência concluída aguardando `SUBMIT_QA`;
   QA não pode ser liberado antes disso.

   **Persistência e concorrência.** A migration anterior criava `deliveries` já em
   `DEVELOPMENT_IN_PROGRESS` no ato da reserva e o índice
   `one_active_worktree_per_project` permite apenas um worktree
   `RESERVED`/`ACTIVE` por projeto. Separar reserva, preparo, despacho, execução
   e pronto para QA. Alterar a proteção de worktree para granularidade de work
   item/delivery, permitindo execução paralela apenas entre WIs independentes.
   A autorização deve bloquear transacionalmente o WI e ter restrição de uma
   delivery/tentativa ativa por WI; `Idempotency-Key` isoladamente não protege
   duas requisições concorrentes com chaves diferentes.

   **Contrato do executor.** Definir executor de desenvolvimento próprio. O
   adaptador atual trabalha em diretório temporário com sandbox read-only e não
   pode implementar/commitar no worktree. O novo contrato deve fixar `cwd` no
   worktree reservado, permitir escrita apenas ali e limitar tecnicamente os
   paths à allowlist. O contexto fechado inclui objetivo, inputs, output
   verificável, critérios, allowlist, denylist, QA, branch, SHA base e baseline.
   Prompt não é controle de segurança: validar após a execução paths alterados,
   diff, commits auditáveis e SHA antes de aceitar evidência.

   **Telemetria.** Reutilizar o padrão F5-23: executor, etapa permitida, último
   sinal, duração, saúde, eventos operacionais e falha sanitizada, atualizados
   por SSE/polling seguro. Heartbeat prova somente vida; evento operacional prova
   progresso. Capturar JSONL do Codex em contrato fechado, sem persistir prompt,
   raciocínio, argumentos de ferramentas, conteúdo bruto de arquivos ou
   segredos. A UI não pode apresentar executor concluído enquanto afirmar que
   existe agente ativo.

   **Falha, retry e recuperação.** Especificar comando/API de retry com
   `Idempotency-Key`, origem elegível, limite de tentativas e regra determinística
   de reutilizar, reconciliar ou descartar worktree. Timeout, falha do agente,
   perda de lease, política de paths, Git ou saída inválida devem produzir
   evidência JSON/Markdown sanitizada, causa específica e recuperação auditável.
   Falha de execução não pode promover falha global do projeto/módulo; deve
   seguir os ramos canônicos de execução do Compass.

   **Dependências.** Manter no backend: WI dependente só inicia após cada
   dependência `MERGED_TO_PHASE`; WIs independentes podem executar em paralelo;
   bloqueio externo requer resolução auditável. A UI apenas projeta essas regras.

   **Critérios de aceite.**

   - Autorizar WI elegível cria uma única tentativa ativa por WI e despacha um
     agente observável no worktree, não apenas o prepara.
   - Reserva/preparo/despacho/execução/evidência/QA são distinguíveis e coerentes
     com o Compass e catálogo versionado.
   - O agente produz alterações e commits auditáveis somente no worktree;
     clone principal e paths fora da política permanecem intactos.
   - Falha ou retry não deixam WI em desenvolvimento sem job/lease, não criam
     tentativas paralelas indevidas e não causam falha global do projeto.
   - Testes cobrem máquina de estados/projeção, concorrência com chaves distintas,
     executor com escrita controlada, heartbeat/falha/retry e E2E autorizar →
     agente → evidência validada → `SUBMIT_QA`, incluindo regressão “worktree
     preparado sem agente despachado”.

## Escopo transferido para F5-25

O escopo remanescente de projeção, diagnóstico, health/smoke e testes do runtime de desenvolvimento foi transferido integralmente para [F5-25 — Projeção fiel e diagnóstico do runtime de desenvolvimento](F5-25-development-runtime-projection.md). F5-23 permanece concluída com os itens de planejamento autônomo e observabilidade já entregues.
