---
document_type: phase-4-readiness-package
status: APPROVED_FOR_IMPLEMENTATION
created_at: 2026-08-06
approved_at: 2026-08-06
approved_by: "@mhjmhj2002, repository owner"
applies_to: 12_ADR_PROVIDER_NEUTRAL_AGENT_EXECUTION_RUNTIME.md, 13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md
---

# Pacote de prontidão e aprovação da Fase 4

Este é o registro verificável e aprovado para P0-13 a P0-19. A aprovação deste
pacote, ADR e plano autoriza a implementação dentro dos limites abaixo.

## P0-13 — Governança

| Decisão | Responsável por preparar | Aprovador | Alçada | SLA | Registro obrigatório |
| --- | --- | --- | --- | --- | --- |
| ADR, plano, política e override | `@mhjmhj2002` (Tech Lead) | `@mhjmhj2002` (dono do repositório) | aprova/rejeita publicação e override extraordinário | 2 dias úteis | decisão, motivo, ator, política/versão |
| classificação e egress DeepSeek | `@mhjmhj2002` (Security Owner) | `@mhjmhj2002` (dono do repositório) | permite somente classificação/host/modelo explicitamente listados | 2 dias úteis | avaliação de dados, host, modelo e expiração |
| orçamento, custo e recarga | `@mhjmhj2002` (FinOps Owner) | `@mhjmhj2002` (dono do repositório) | define teto mensal e aprova aumento/recarga | 1 dia útil para quota bloqueante | teto, consumo, decisão e próximo responsável |
| intervenção operacional | `@mhjmhj2002` (On-call Owner) | `@mhjmhj2002` (Tech Lead) | pode pausar, cancelar e reconciliar; não pode ampliar egress | 30 min para execução bloqueada | operação, execução/tentativa, motivo e resultado |

Os quatro papéis ficam atribuídos temporariamente a `@mhjmhj2002`; futura
delegação exige decisão auditada. A aprovação cobre ADR, plano e este pacote na
versão de 2026-08-06. Todo override continua exigindo registro de motivo, ator,
política/versão e validade.

## P0-14 — Contratos e ciclo de vida

Os schemas Draft 2020-12 canônicos estão em `phase-4-contracts/`:
`common.schema.json`, `agent-execution-request.schema.json` e
`agent-execution-attempt-result.schema.json`. A validação carrega os três `$id`
`naamive://agent-runtime/v1/...`, rejeita propriedades extras e ocorre antes de
persistir ou despachar. O request agora contém `classification`, `policyName` e
`policyVersion`; portanto não há mais divergência entre texto e contrato.

`AgentExecutionService` é o proprietário da idempotência:
`UNIQUE (job_id, idempotency_key)`. O worker só entrega o job leased ao serviço;
ele não chama adapter/launcher e não interpreta falha de provider. Estados e
transições permitidas são:

```text
execution: PENDING -> SELECTED -> RUNNING -> SUCCEEDED|FAILED|BLOCKED_NO_EXECUTOR_AVAILABLE|CANCELLED|RECONCILIATION_REQUIRED
attempt:   PLANNED -> DISPATCHED -> SUCCEEDED|FAILED|TIMED_OUT|RATE_LIMITED|QUOTA_EXHAUSTED|AUTHENTICATION_FAILED|INVALID_OUTPUT|POLICY_BLOCKED|CANCELLED|RECONCILIATION_REQUIRED
```

Não há transição terminal de volta a estado ativo. Uma tentativa `DISPATCHED`
exige reconciliação antes de retry/fallback, e uma execução aceita no máximo uma
tentativa `DISPATCHED`. O banco, logs, SSE e ArtifactStore aceitam somente
referências, hash, estado, códigos e erro sanitizado: prompt, resposta, payload,
stdout/stderr e segredo são recusados.

## P0-15 e P0-16 — Retry, fallback e reconciliação

| Mecanismo | Proprietário | Persistência | Limite | Regra |
| --- | --- | --- | --- | --- |
| lease/infraestrutura | `jobs`/worker | `jobs.attempts`, lease e `available_at` | configuração atual do job | somente antes de criar/selecionar execução; nunca redespacha `RECONCILIATION_REQUIRED` |
| provider retry | `AgentExecutionService` | tentativa com `attempt_kind=RETRY`, `retry_not_before` | 2 no primário | mesmo runtime/configuração, backoff `retry-after` ou 5s/15s |
| fallback | `AgentExecutionService` | tentativa com `attempt_kind=FALLBACK` | 1 total | outro runtime apenas após retries elegíveis e filtros de política |
| reconciliação | reconciliador dedicado | tentativa/execution e evidência | até resultado terminal | consulta efeito/artefato; sem novo dispatch enquanto incerto |

A seleção é determinística: (1) job/execução ainda não cancelado, (2) runtime
habilitado e configuração congelável, (3) classificação e egress, (4) paths,
(5) criticidade/escopo e restrição `CODEX`-only, (6) primário da política, e
(7) disponibilidade conhecida daquela execução. Segurança, classificação e
criticidade vencem preferência e custo. A decisão persiste `selection_reason`
estruturado; rejeição usa `POLICY_BLOCKED`; ambos indisponíveis usam
`BLOCKED_NO_EXECUTOR_AVAILABLE`; não há ping-pong.

Após timeout, cancelamento em voo ou resposta perdida, a transação altera a
tentativa para `RECONCILIATION_REQUIRED`, mantém a lease encerrada e agenda job
de reconciliação com a mesma chave. O reconciliador procura efeito idempotente
por `execution_id` no adapter e por hash no ArtifactStore. Sucesso encontrado é
persistido uma vez; ausência confirmada permite a próxima ação da tabela; resposta
ambígua bloqueia e pede intervenção operacional.

## P0-17 — Contrato físico e restart

A migration `025_phase_4_agent_runtime.sql`, a ser criada somente depois do gate,
deve executar este contrato PostgreSQL (todos os identificadores e constraints
são parte da definição de pronto):

```sql
CREATE TABLE ai_runtime (
  id uuid PRIMARY KEY, name text NOT NULL, environment text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  current_configuration_version integer NOT NULL CHECK (current_configuration_version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (environment, name)
);
CREATE TABLE ai_runtime_configuration (
  runtime_id uuid NOT NULL REFERENCES ai_runtime(id), version integer NOT NULL CHECK (version > 0),
  adapter_type text NOT NULL CHECK (adapter_type IN ('CODEX_CLI','OPENAI_COMPATIBLE_HTTP')),
  endpoint text, model text NOT NULL,
  quality_tier text NOT NULL CHECK (quality_tier IN ('LOW','MEDIUM','HIGH')),
  timeout_seconds integer NOT NULL CHECK (timeout_seconds BETWEEN 1 AND 3600),
  auth_type text NOT NULL CHECK (auth_type IN ('API_KEY','BEARER_TOKEN','CLI_SESSION','NONE')),
  secret_reference text, configuration jsonb NOT NULL, created_by text NOT NULL, change_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY (runtime_id, version)
);
ALTER TABLE ai_runtime ADD CONSTRAINT ai_runtime_current_configuration_fk
  FOREIGN KEY (id, current_configuration_version)
  REFERENCES ai_runtime_configuration(runtime_id, version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE ai_runtime_validation (
  id uuid PRIMARY KEY, runtime_id uuid NOT NULL, configuration_version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('READY','DISABLED','MISCONFIGURED','AUTHENTICATION_REQUIRED','UNAVAILABLE','QUOTA_EXHAUSTED','UNKNOWN')),
  sanitized_result jsonb NOT NULL,
  source text NOT NULL, valid_until timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (runtime_id, configuration_version) REFERENCES ai_runtime_configuration(runtime_id, version),
  UNIQUE (runtime_id, configuration_version, source)
);
CREATE TABLE agent_execution_policy (
  id uuid NOT NULL, name text NOT NULL, version integer NOT NULL CHECK (version > 0),
  selectors jsonb NOT NULL, primary_runtime_id uuid NOT NULL REFERENCES ai_runtime(id),
  fallback_runtime_id uuid REFERENCES ai_runtime(id), fallback_allowed boolean NOT NULL DEFAULT false,
  provider_retry_limit integer NOT NULL DEFAULT 2 CHECK (provider_retry_limit BETWEEN 0 AND 2),
  published_at timestamptz NOT NULL, published_by text NOT NULL, PRIMARY KEY (id, version), UNIQUE (name, version),
  CHECK (NOT fallback_allowed OR fallback_runtime_id IS NOT NULL),
  CHECK (fallback_runtime_id IS NULL OR fallback_runtime_id <> primary_runtime_id)
);
CREATE TABLE agent_execution (
  id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES jobs(id), operation_id uuid NOT NULL REFERENCES operations(id),
  project_id uuid NOT NULL REFERENCES projects(id), idempotency_key text NOT NULL, agent_id text NOT NULL,
  agent_version text NOT NULL, task_type text NOT NULL, classification text NOT NULL CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  policy_id uuid NOT NULL, policy_version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('PENDING','SELECTED','RUNNING','SUCCEEDED','FAILED','BLOCKED_NO_EXECUTOR_AVAILABLE','CANCELLED','RECONCILIATION_REQUIRED')),
  selected_runtime_id uuid, selected_configuration_version integer,
  selection_reason jsonb NOT NULL, next_action text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
  FOREIGN KEY (policy_id, policy_version) REFERENCES agent_execution_policy(id, version),
  FOREIGN KEY (selected_runtime_id, selected_configuration_version) REFERENCES ai_runtime_configuration(runtime_id, version),
  CHECK ((selected_runtime_id IS NULL) = (selected_configuration_version IS NULL)),
  UNIQUE (job_id, idempotency_key)
);
CREATE TABLE agent_execution_attempt (
  id uuid PRIMARY KEY, execution_id uuid NOT NULL REFERENCES agent_execution(id),
  sequence integer NOT NULL CHECK (sequence > 0), runtime_id uuid NOT NULL,
  configuration_version integer NOT NULL, adapter_type text NOT NULL, attempt_kind text NOT NULL CHECK (attempt_kind IN ('PRIMARY','RETRY','FALLBACK')),
  state text NOT NULL CHECK (state IN ('PLANNED','DISPATCHED','SUCCEEDED','FAILED','TIMED_OUT','RATE_LIMITED','QUOTA_EXHAUSTED','AUTHENTICATION_FAILED','INVALID_OUTPUT','POLICY_BLOCKED','CANCELLED','RECONCILIATION_REQUIRED')),
  failure_class text, retry_not_before timestamptz, dispatched_at timestamptz,
  completed_at timestamptz, sanitized_error jsonb, evidence_reference jsonb, usage jsonb,
  FOREIGN KEY (runtime_id, configuration_version) REFERENCES ai_runtime_configuration(runtime_id, version),
  UNIQUE (execution_id, sequence)
);
CREATE UNIQUE INDEX agent_execution_one_dispatched ON agent_execution_attempt (execution_id) WHERE state = 'DISPATCHED';
```

Triggers reject updates to published policies, `(runtime_id, configuration_version)`
used by an attempt, and terminal attempts; only the explicit transition procedure
may update state. The migration also adds retention metadata (365 days minimum)
and audit rows with actor/reason/before/after sanitized values. Restart scans
expired `DISPATCHED` attempts, atomically changes them to
`RECONCILIATION_REQUIRED`, and enqueues exactly one reconciliation job keyed by
`reconcile:<attempt-id>`; it never returns them to the worker retry queue.

`ai_runtime` é a identidade executável e `ai_runtime_configuration` é seu
snapshot versionado; a política associa cada agente/tarefa ao runtime primário e
ao contingente. Portanto, o cadastro abaixo é representado sem JSON livre:
`adapter_type=CODEX_CLI` (IA: Codex), `model=GPT-5.6 Terra` e
`quality_tier=LOW` (Qualidade: Low). A combinação é validada contra as
capacidades oficiais do adapter/modelo antes de habilitar o runtime; a versão
congelada na tentativa preserva também modelo e nível.

## P0-18 — DeepSeek, secrets e egress

O Security Owner e dono do repositório aprovaram a seguinte configuração inicial
do DeepSeek:

| Campo | Valor aprovado |
| --- | --- |
| adapter/modelo | `OPENAI_COMPATIBLE_HTTP` / `deepseek-v4-flash`; fonte: documentação oficial DeepSeek, 2026-08-06 |
| endpoint | `https://api.deepseek.com`, HTTPS, sem redirect, certificado validado e host allowlisted |
| credencial | `env:NAAMIVE_SECRET_DEEPSEEK_API_KEY` em desenvolvimento e `naamive/<environment>/deepseek/api-key` em produção; rotação pelo Security Owner |
| classificação | `PUBLIC` habilitado; `INTERNAL` após aceite de redaction; `CONFIDENTIAL` e `RESTRICTED` negados |
| quota/rate limit | normalizar somente sinal estruturado oficial; HTTP `429` com `retry-after` é `RATE_LIMITED`; saldo/crédito insuficiente oficial é `QUOTA_EXHAUSTED` |
| custo | US$ 1,00 por execução e US$ 10,00 por mês-calendário; FinOps Owner aprova aumento/recarga |

### Limite inicial de custo DeepSeek

O teto mensal do runtime DeepSeek é **US$ 10,00 por mês-calendário (USD)**,
incluindo consumo gratuito eventualmente elegível e consumo pay-as-you-go. O
serviço soma somente uso/custo estruturado e sanitizado atribuído ao runtime;
ao alcançar US$ 10,00, não inicia nova tentativa DeepSeek e registra
`BLOCKED_NO_EXECUTOR_AVAILABLE` ou usa Codex somente se a política de fallback
já autorizar. Não há recarga ou aumento automático: qualquer alteração exige a
decisão auditada do FinOps Owner. O teto aprovado por execução é **US$ 1,00**;
o serviço não despacha DeepSeek quando a estimativa/remanescente conhecido
ultrapassa esse limite.

`env:NAAMIVE_SECRET_DEEPSEEK_API_KEY` é permitido apenas para desenvolvimento
local atestado. Produção requer `naamive/<environment>/deepseek/api-key` via
resolver aprovado. A redaction deve rejeitar valores do resolver, headers
`Authorization`, `api_key`, `token`, `secret`, URLs assinadas e conteúdo de
prompt/resposta antes de persistência ou log; o teste usa sentinelas para provar
ausência nos quatro destinos.

## P0-19 — Corte, flags e aceite

| Consumidor atual | Equivalência Codex-only | Corte | Reversão |
| --- | --- | --- | --- |
| `src/worker.ts` | mesmo input, output validado, transição, artefato e erro sanitizado | trocar chamada direta por `AgentExecutionService` com política Codex-only | flag `agentExecutionServiceEnabled=false`; manter adapter Codex |
| `src/agent.ts` | mesmo workdir, ambiente mínimo, timeout e sessão CLI | mover launcher para `CodexCliAdapter` sem mudar comportamento | reativar launcher encapsulado, sem schema/migration reversa |
| jobs/operations/events | mesmas chaves, lease e sem duplicação | habilitar serviço somente após paridade | desabilitar flag para novos jobs; reconciliar os já despachados |
| web/SSE | eventos existentes continuam e novos são aditivos | publicar projeção por feature flag | ocultar campos novos, sem apagar evidência |

Flags são desligadas por padrão e habilitadas nesta ordem: serviço Codex-only,
persistência de tentativas, projeção web/SSE, DeepSeek para `PUBLIC` e DeepSeek
para `INTERNAL` após aceite de redaction. Cada avanço requer aceite e uma janela
de observação; a reversão não apaga execução/tentativa e não reenvia dispatch
incerto.

Os cenários obrigatórios são: sucesso Codex-only com paridade; cancelamento antes,
durante e depois do dispatch; restart antes/depois de persistir dispatch; timeout;
lease perdida; resposta perdida pós-dispatch; retry com `retry-after`; fallback
único; ambos sem quota; saída inválida; bloqueio de egress; e reinício durante
fallback. Cada cenário deve provar estado final, uma única tentativa em voo,
artefato/ausência de artefato correta, evento SSE, próximo passo e ausência de
segredo/conteúdo bruto.

## Fechamento

O dono do repositório aprovou explicitamente as versões de 2026-08-06 da ADR,
do plano e deste arquivo. O roadmap marca P0-13 a P0-19 como `RESOLVED` e o
gate como `GO`; a implementação deve manter os limites aqui aprovados.
