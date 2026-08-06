---
document_type: phase-planning
status: APPROVED_FOR_IMPLEMENTATION
created_at: 2026-08-06
approved_at: 2026-08-06
approved_by: "@mhjmhj2002, repository owner"
supersedes: multi-provider runtime planning in this document
scope: planning only; implementation requires explicit governance approval
primary_roadmap: 01_DELIVERY_ROADMAP.md
related_adr: 12_ADR_PROVIDER_NEUTRAL_AGENT_EXECUTION_RUNTIME.md
---

# Planejamento da Fase 4 — Runtimes configuráveis Codex e DeepSeek

## Decisão e resultado demonstrável

A Fase 4 implementa somente dois tipos de adapter: `CODEX_CLI` e
`OPENAI_COMPATIBLE_HTTP`. Codex e DeepSeek são os únicos mecanismos integrados
nesta fase, mas não são instâncias únicas hardcoded: cada instância é um
**AI Runtime** persistido e governado por configuração. Não haverá OpenRouter,
catálogo/marketplace de modelos, router genérico, votação, execução paralela,
seleção por IA, nem suporte antecipado a outros fabricantes.

O domínio continua soberano: a máquina de estados autoriza trabalho, agentes,
gates, rework e transições. O runtime apenas executa o agente autorizado:

```text
Worker -> AgentExecutionService -> ExecutorConfigurationRepository
       -> ExecutionPolicy -> AI Runtime versionado -> SecretResolver
       -> CodexCliAdapter | OpenAiCompatibleHttpAdapter -> OutputValidator
       -> ArtifactStore -> pedido de transição
```

Uma demonstração controlada inicia um job elegível, registra a política e o
executor principal, simula `QUOTA_EXHAUSTED`, realiza fallback autorizado no
outro executor, valida a saída, persiste evidências e mostra a timeline por
web/SSE. Outra demonstração deixa os dois sem quota e bloqueia somente o
trabalho afetado, com causas individuais e próxima ação explícita.

## Análise da proposta substituída

| Preservar | Remover ou reduzir |
| --- | --- |
| Serviço único, contratos versionados, tentativas imutáveis, idempotência, worktree isolado, ArtifactStore, validação de saída, sanitização, classificação, auditoria, retries limitados, fallback governado, reconciliação e projeções web/SSE. | OpenRouter, `ai_model`, catálogo/capacidades de modelos, rotas genéricas, comparação de preço de mercado, diversidade de modelos para QA, overrides de rota, circuit breaker distribuído por provider/modelo, health marketplace, votação e paralelismo. |
| Codex por processo filho configurável, ambiente mínimo, arquivo de contexto, timeout, encerramento governado e descarte de stdout/stderr brutos. | Abstrações para Anthropic, Gemini, Qwen, Mistral, Ollama e qualquer provider não utilizado. |
| Políticas publicadas e versionadas, mas simples e determinísticas. | Desempate por custo, estimativa/tokenizer como pré-condição de rota e inteligência automática para escolher modelo. |

`13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md` é o único plano canônico
da Fase 4; a proposta anterior é superseded por esta revisão, na mesma data e
pela decisão de limitar o runtime aos dois executores realmente utilizados.

## Configuração dinâmica de AI Runtimes

O código conhece contratos, adapters, tipos de autenticação e protocolos
suportados; PostgreSQL define quais runtimes existem, se estão habilitados,
modelo, endpoint, timeout, prioridade, política e referência lógica de segredo;
o Secret Store guarda o valor da credencial. O domínio conhece
`SecretReference`, nunca uma API key, token, senha ou sessão.

```text
Código -> implementa adapters e protocolos
PostgreSQL -> registra AI Runtimes e políticas
SecretResolver -> resolve credencial fora do banco
Secret Store -> armazena o valor secreto
```

`Agent` é o papel funcional e seu contrato de saída; `AI Runtime` é uma
instância configurada que pode executar esse agente; `Adapter Type` é a
implementação técnica do código; `Execution Policy` associa agente/tarefa a
runtimes primário e contingência. Uma nova conta Codex/DeepSeek, modelo,
endpoint, ambiente, prioridade, timeout ou credencial é alteração administrativa
auditada, sem recompilar ou fazer deploy, desde que use adapter e autenticação
suportados. Novo protocolo, autenticação não suportada, CLI incompatível, formato
de tool calling distinto ou sandbox novo continua exigindo novo adapter.

Nesta fase os únicos valores implementados são:

```text
CODEX_CLI
OPENAI_COMPATIBLE_HTTP
```

Tipos futuros como `ANTHROPIC_HTTP`, `GEMINI_HTTP`, `LOCAL_PROCESS` e
`OLLAMA_HTTP` são apenas possibilidades documentadas, não implementação
antecipada.

## Responsabilidades dos executores

| Executor | Uso preferencial | Não é selecionado automaticamente para |
| --- | --- | --- |
| Codex | Arquitetura, contratos centrais, máquina de estados, workflows, domínio, persistência crítica, migrations complexas, segurança, Git, integração, investigação difícil, mudanças amplas, revisão crítica e alto risco de regressão. | Ser substituído pelo DeepSeek em tarefa `CODEX`-only ou crítica sem fallback. |
| DeepSeek | Work items delimitados, CRUD, testes unitários, cobertura, documentação, fixtures, DTOs, mapeamentos, validações simples, refatoração localizada, correção de causa conhecida e análise/proposta inicial. | Mudança crítica apenas por custo menor, conteúdo não autorizado ou escopo que exija compreensão global. |

O custo é secundário a segurança, classificação, risco, escopo e capacidade
necessária. DeepSeek recebe somente contexto explicitamente autorizado; fallback
nunca amplia a classificação permitida.

## Contratos e invariantes

Os contratos JSON Schema Draft 2020-12 usam URIs imutáveis
`naamive://agent-runtime/v1/<nome>`. Os nomes TypeScript finais seguem o padrão
do projeto.

```ts
type AdapterType = "CODEX_CLI" | "OPENAI_COMPATIBLE_HTTP";
type AuthenticationType = "API_KEY" | "BEARER_TOKEN" | "CLI_SESSION" | "NONE";

interface AgentExecutor {
  execute(
    request: AgentExecutionRequest
  ): Promise<AgentExecutionAttemptResult>;
}

type AgentExecutionRequest = {
  executionId: string;
  operationId: string;
  jobId: string;
  projectId: string;
  phaseId?: string;
  moduleId?: string;
  workItemId?: string;
  agentId: string;
  agentVersion: string;
  taskType: string;
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  contextReference: ArtifactReference;
  outputSchemaReference: ArtifactReference;
  repositoryReference?: RepositoryReference;
  workingDirectory?: string;
  timeoutSeconds: number;
  idempotencyKey: string;
  policyName: string;
  policyVersion: number;
  fallbackAllowed: boolean;
};

type AgentExecutionAttemptResult = {
  attemptId: string;
  executionId: string;
  runtimeId: string;
  adapterType: AdapterType;
  status: "SUCCEEDED" | "FAILED" | "TIMED_OUT" | "RATE_LIMITED" |
    "QUOTA_EXHAUSTED" | "AUTHENTICATION_FAILED" | "INVALID_OUTPUT" |
    "POLICY_BLOCKED" | "CANCELLED" | "RECONCILIATION_REQUIRED";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  structuredOutputReference?: ArtifactReference;
  sanitizedError?: SanitizedExecutionError;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    estimatedCost?: number;
    currency?: string;
  };
  retryable: boolean;
  fallbackEligible: boolean;
};
```

O pedido exige IDs de correlação, agente/versão, tarefa, referências de contexto
e schema, classificação, política/versão, timeout e idempotência. Referências
contêm apenas identificador, hash e versão, nunca conteúdo. `AgentExecutionService`
é a única porta de entrada e impõe unicidade `(job_id, idempotency_key)`.
Os contratos executáveis Draft 2020-12 estão em `phase-4-contracts/`; o pacote
de prontidão `14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md` fixa validação,
transições, DDL, reconciliação, segurança e aceite verificáveis.

O executor não cria job, não altera estado canônico e não aplica transição.
Resultado somente produz pedido de transição depois de validação, persistência de
artefatos e reconciliação de efeitos. PostgreSQL, logs, SSE e evidências jamais
guardam prompt, resposta, payload HTTP, stdout/stderr bruto ou segredo.

## Política de seleção

`ExecutionPolicy` é determinística e publicada imutavelmente com `name`,
`version`, seletor de agente/tarefa/criticidade, runtime primário, runtime de
fallback, limites de retry e regras de classificação/egresso. A associação
agente/runtime fica no banco; não consulta IA, mercado ou preço dinâmico.

| Perfil | Primário | Fallback | Permitido |
| --- | --- | --- | --- |
| `architecture`, `critical-review` | Codex | nenhum | não |
| `critical-implementation`, segurança, máquina de estados, migration destrutiva, release/Git | Codex | DeepSeek | não |
| `standard-implementation`, testes e documentação | DeepSeek | Codex | sim |
| tarefa `CODEX`-only ou executor exigido | Codex | nenhum | não |

A resolução avalia, nesta ordem: executor habilitado; classificação e
autorização de egress; allowlist/denylist de paths; risco/criticidade; escopo e
necessidade de escrita/compreensão global; restrição explícita de executor; e
disponibilidade já conhecida na execução. O `preferredExecutor` somente é aceito
se não contrariar esses controles. A decisão persiste política/versão, motivos,
executor primário, fallback elegível e regras efetivas.

## Retry, fallback e falhas

Retry repete o **mesmo executor**; fallback tenta o **outro executor**. São
contadores persistidos e independentes do retry de infraestrutura do job: o job
cuida de falha antes da execução/lease; o serviço cuida de tentativa, retry,
fallback e reconciliação após dispatch.

| Classe | Retry | Fallback | Próxima ação |
| --- | --- | --- | --- |
| `TRANSIENT_NETWORK_ERROR`, `EXECUTOR_UNAVAILABLE` | Sim, limitado | após limite, se permitido | aguardar backoff ou usar secundário |
| `TIMEOUT` | Sim, limitado | se permitido após limite | reconciliar efeito antes da nova tentativa |
| `RATE_LIMITED` | Sim, com `retry-after` | se persistir e permitido | aguardar ou usar secundário |
| `QUOTA_EXHAUSTED` | Não | se permitido | recarregar/renovar ou usar secundário |
| `AUTHENTICATION_FAILED`, `AUTHORIZATION_FAILED` | Não | somente se seguro e política permitir | corrigir credencial/autorização |
| `INVALID_CONFIGURATION`, `POLICY_BLOCKED`, `CANCELLED` | Não | Não | corrigir configuração, autorização ou cancelamento |
| `CONTEXT_LIMIT_EXCEEDED` | Não na mesma configuração | somente se a política autorizar o outro | reduzir contexto ou usar executor compatível |
| `OUTPUT_SCHEMA_INVALID`, `OUTPUT_INCOMPLETE` | uma vez | se permitido | corrigir saída/usar secundário |
| falha funcional do código | Não | Não | fluxo de QA, finding e rework |

A taxonomia inclui ainda `MODEL_UNAVAILABLE` (somente para a configuração
concreta do DeepSeek), `UNKNOWN_SANITIZED_ERROR` e os estados acima. A
classificação usa, nesta ordem, código estruturado/HTTP/API ou CLI, `retry-after`
e metadados documentados; texto sanitizado é o último recurso.

Padrão seguro: no máximo dois retries no executor primário, um fallback total e
nenhum retorno ao executor já abandonado:

```text
DeepSeek PRIMARY -> DeepSeek RETRY -> Codex FALLBACK -> encerrar
```

Timeout, cancelamento ou perda de resposta pós-dispatch ficam em
`RECONCILIATION_REQUIRED`; não se assume falha nem se cria tentativa concorrente.
Há no máximo uma tentativa `DISPATCHED` por execução.
O retry do job trata somente lease/falha anterior à seleção; retry de provider,
fallback e reconciliação passam a ser propriedade persistida de
`AgentExecutionService`, como definido no pacote de prontidão.

### Quota, créditos e indisponibilidade total

`quota exceeded`, `credits exhausted`, `usage/billing limit reached`,
`insufficient balance`, `premium requests exhausted` e equivalente oficial são
normalizados para `QUOTA_EXHAUSTED`; rate limit temporário permanece
`RATE_LIMITED`. Ao receber quota, registra-se a tentativa e a indisponibilidade
para aquela execução. Se o fallback for autorizado, inicia-se uma única tentativa
no outro executor; caso contrário, a execução é bloqueada e o operador é
notificado.

Se ambos falharem por quota, indisponibilidade ou limite, o estado é
`BLOCKED_NO_EXECUTOR_AVAILABLE`: preserva job, refs, worktree, tentativas e
evidências; não cria saída vazia, não finge sucesso e não alterna executores.
A projeção lista causa por executor e próxima ação, por exemplo: renovar
créditos/saldo, aguardar franquia ou corrigir disponibilidade. Só o trabalho
afetado para.

Para DeepSeek, o teto inicial é US$ 10,00 por mês-calendário, definido no pacote
de prontidão. Atingir o teto bloqueia novas tentativas DeepSeek; não recarrega,
não aumenta orçamento automaticamente e não ignora a política de fallback.

## Modelo de domínio e persistência

| Entidade | Campos essenciais |
| --- | --- |
| `ai_runtime` | `id`, `name`, `description`, `enabled`, `environment`, versão de configuração corrente e timestamps. `name` é único por ambiente. |
| `ai_runtime_configuration` | `runtime_id`, `version`, adapter, endpoint, modelo, `quality_tier`, timeout, autenticação, referência de segredo, capacidades, metadados sanitizados, ator/motivo e timestamp. É o snapshot imutável usado por execução/tentativa. |
| `ai_runtime_validation` | runtime/versão, estado (`READY`, `DISABLED`, `MISCONFIGURED`, `AUTHENTICATION_REQUIRED`, `UNAVAILABLE`, `QUOTA_EXHAUSTED` ou `UNKNOWN`), resultado sanitizado, próxima ação, origem, validade e timestamps. |
| `agent_execution_policy` | `id`, `name`, `version`, seletores, `primary_runtime_id`, `fallback_runtime_id`, `fallback_allowed`, limites, `published_at`. |
| `agent_execution` | correlação job/operação/agente/tarefa, política/versão, runtime e **versão de configuração congelada**, estado, tentativa selecionada, `next_action`, timestamps. |
| `agent_execution_attempt` | execução, sequência, runtime, adapter type, versão congelada, número, `PRIMARY`/`RETRY`/`FALLBACK`, estado, classificação, duração, uso/custo e referências de evidência. |

Política publicada, versão de runtime usada e tentativa terminal são imutáveis.
`name` é único por ambiente, mas vários runtimes podem usar o mesmo adapter.
Índices incluem política `(name, version)`, execução `(job_id, idempotency_key)`,
tentativa `(execution_id, sequence)` e índice parcial para `DISPATCHED`.
Alterações de runtime criam nova `configuration_version`, registram ator e
configuração anterior/posterior sanitizada e não afetam execução já iniciada.
Metadados retêm 365 dias; evidências obedecem ArtifactStore, nunca menos de 365
dias, com tombstone auditável na expiração.

`quality_tier` é uma intenção de execução, não uma alegação de qualidade do
resultado. O adapter a traduz para o parâmetro oficialmente suportado pelo
executor (por exemplo, esforço de raciocínio); se a combinação
adapter/modelo/nível não for oficialmente suportada, a validação do runtime a
recusa. Assim, um runtime pode ser cadastrado explicitamente como
`adapter_type=CODEX_CLI`, `model=GPT-5.6 Terra` e `quality_tier=LOW`, desde que a
compatibilidade seja aprovada e validada.

Estados de execução: `PENDING -> SELECTED -> RUNNING -> {SUCCEEDED, FAILED,
BLOCKED_NO_EXECUTOR_AVAILABLE, CANCELLED, RECONCILIATION_REQUIRED}`. Tentativa:
`PLANNED -> DISPATCHED -> terminal`. A primeira migration F4 cria somente as
cinco entidades de domínio acima e a tabela técnica de snapshots
`ai_runtime_configuration`; não cria catálogo genérico, modelos ou health/circuit
breaker distribuído.

### Operação administrativa governada

Operadores autorizados podem cadastrar, editar, habilitar, desabilitar, testar e
promover versão de runtime, trocar modelo, endpoint e `secret_reference`, e
definir primário/contingência na política. Cada mutação valida adapter,
autenticação, endpoint, timeout, namespace/ambiente da referência e produz
auditoria com ator, motivo, versão anterior/posterior sanitizada e resultado de
validação. Runtime só pode resolver segredo do próprio ambiente; a API nunca
revela valor de segredo ou conteúdo de sessão. O estado operacional projetado é
informativo e temporal: `READY`, `DISABLED`, `MISCONFIGURED`,
`AUTHENTICATION_REQUIRED`, `UNAVAILABLE`, `QUOTA_EXHAUSTED` ou `UNKNOWN`;
validação no despacho continua obrigatória.

## Segurança, autenticação e configuração

Aplicam-se ambiente mínimo, workdir temporário isolado, allowlist/denylist de
paths, contexto autorizado, timeout, cancelamento, segredo externo, sanitização,
validação, idempotência, reconciliação e ArtifactStore existentes.

| Classificação | Egress |
| --- | --- |
| `PUBLIC` | Codex ou DeepSeek, conforme política. |
| `INTERNAL` | Codex ou DeepSeek, quando explicitamente autorizado. |
| `CONFIDENTIAL` | somente executor expressamente autorizado pela política. |
| `RESTRICTED` | bloqueado, salvo ambiente específico futuro aprovado. |

Falha de redaction, egress ou classificação é `POLICY_BLOCKED` e não permite
fallback. `secret_reference` é validada, tem namespace e ambiente allowlisted e
nunca escolhe arbitrariamente uma variável, arquivo ou caminho. O resolver
autorizado recebe a referência, obtém o segredo e o entrega somente ao adapter;
nunca o persiste, devolve pela API ou registra em logs. Erros são sanitizados e
referências em memória são liberadas quando possível.

Para desenvolvimento local, `EnvironmentSecretResolver` aceita referências
explicitamente permitidas como `env:NAAMIVE_SECRET_DEEPSEEK_API_KEY`; `.env`
permanece ignorado, `.env.example` não contém valores e a documentação cobre
permissões e rotação. Produção pode trocar somente a implementação por
`VaultSecretResolver`, `AwsSecretsManagerResolver`, `AzureKeyVaultResolver`,
`GoogleSecretManagerResolver` ou `KubernetesSecretResolver`, sem alterar
domínio, máquina de estados, adapters, agentes ou políticas.

Um runtime de Codex usa `CODEX_CLI`/`CLI_SESSION`; um de DeepSeek usa
`OPENAI_COMPATIBLE_HTTP`/`BEARER_TOKEN` e referência como
`naamive/dev/deepseek/api-key` ou `env:NAAMIVE_SECRET_DEEPSEEK_API_KEY`.
Endpoints obedecem allowlist de esquema, host e porta, validação de certificado
e TLS obrigatório; nenhuma configuração desabilita TLS. Antes do despacho,
valida-se runtime habilitado, adapter, endpoint, modelo, timeout, autenticação e
referência; Codex valida comando/sessão, DeepSeek valida referência, endpoint e
modelo sem fazer chamada paga quando houver health check apropriado.

PostgreSQL, seus dumps, backups do ArtifactStore, payload HTTP completo, headers
de autorização, variáveis de ambiente e comandos/processos contendo segredo nunca
recebem credenciais. O adaptador só recebe segredo resolvido para sua chamada e
não pode ler referência não autorizada.

## Auditoria e observabilidade

Eventos de timeline: `EXECUTION_POLICY_RESOLVED`, `EXECUTOR_SELECTED`,
`EXECUTOR_ATTEMPT_STARTED`, `EXECUTOR_ATTEMPT_FAILED`,
`EXECUTOR_RETRY_SCHEDULED`, `EXECUTOR_QUOTA_EXHAUSTED`,
`EXECUTOR_FALLBACK_STARTED`, `EXECUTOR_ATTEMPT_SUCCEEDED`,
`EXECUTION_OUTPUT_VALIDATED`, `EXECUTION_COMPLETED` e
`EXECUTION_BLOCKED_NO_EXECUTOR_AVAILABLE`.

Logs e spans correlacionam `project_id`, fase, módulo, work item, operação, job,
execução, tentativa, runtime, adapter type, modelo, endpoint sanitizado,
auth type, versão de configuração e resultado da validação. Nunca usam conteúdo,
segredo, header de autorização, variáveis de ambiente, comando/processo com
segredo ou IDs únicos como labels.
Métricas mínimas: `agent_executions_total`, `agent_execution_attempts_total`,
`agent_execution_success_total`, `agent_execution_failure_total`,
`agent_execution_duration_seconds`, `agent_execution_retries_total`,
`agent_execution_fallbacks_total`, `executor_quota_exhausted_total`,
`executor_rate_limited_total`, `executor_timeouts_total`,
`executor_invalid_outputs_total`, `executor_availability`,
`agent_execution_tokens_total` e `agent_execution_estimated_cost_total`.

Web/SSE exibem agente, tarefa, criticidade, política/versão, executor principal
e efetivo, tentativas, retry, fallback, duração, uso/custo disponível, erro
sanitizado, evidências e próxima ação. As projeções vêm apenas de eventos e
persistência canônicos, sem inferência por timer.

## Testes e aceite

Unitários cobrem cadastro/edição/habilitação/desabilitação de runtime, troca de
modelo, endpoint autorizado e `secret_reference` sem código; adapter inexistente,
referência fora do namespace/ambiente, segredo ausente, autenticação inválida,
rotação com mesma referência, freeze de versão durante execução, API/log/backup
sem segredo, além de seleção, política, classificação, Codex/DeepSeek sem quota,
ambos indisponíveis, timeout, retry, limite/anti-ping-pong, saída inválida,
autenticação, bloqueio de política e próxima ação. Integração com executores fake
cobre os dois sucessos, cada executor indisponível seguido de sucesso do outro,
ambos indisponíveis, `retry-after`, restart durante fallback, cancelamento e
reconciliação.

O aceite E2E controlado prova: job elegível; política; quota no primário;
fallback autorizado; sucesso/validação no secundário; ArtifactStore; SSE;
timeline e auditoria. O segundo aceite prova Codex sem créditos e DeepSeek sem
saldo, bloqueio recuperável sem saída e mensagem clara de ação humana.

Smoke real, opcional e isolado, existe para cada executor: requer confirmação e
configuração, não altera projeto real, tem contexto descartável, teto de custo,
não persiste conteúdo sensível e não bloqueia a suíte determinística.

## Backlog

| ID | Entrega |
| --- | --- |
| F4-01 | Contrato comum versionado: solicitação, tentativa, resultado, erro, uso, evidência, `AI Runtime`, adapter type e `SecretResolver`. |
| F4-02 | `AgentExecutionService` como única entrada. |
| F4-03 | Adapter `CODEX_CLI` com paridade do launcher isolado e sessão CLI. |
| F4-04 | Adapter `OPENAI_COMPATIBLE_HTTP` para DeepSeek, após confirmar compatibilidade necessária. |
| F4-05 | Políticas determinísticas orientadas por dados entre agentes e AI Runtimes. |
| F4-06 | Retry limitado e fallback bidirecional governado. |
| F4-07 | Detecção e normalização de quota/créditos. |
| F4-08 | Persistência/versionamento de AI Runtimes, `EnvironmentSecretResolver`, segurança, classificação e allowlists. |
| F4-09 | Auditoria de configuração, evidências, uso, custo e observabilidade sem segredos. |
| F4-10 | Web e SSE para tentativas, fallback e bloqueios. |
| F4-11 | Testes, aceite e smoke opcional. |
| F4-12 | Migração de consumidores e corte de chamadas diretas ao launcher. |

## Critérios de aceite, riscos e pendências

Além dos critérios existentes, a fase só estará concluída quando runtimes forem
cadastrados e reconfigurados por persistência; Codex e DeepSeek não forem
instâncias únicas hardcoded; o código conhecer adapters, não contas; banco,
backups e ArtifactStore não contiverem valores secretos; `.env` local funcionar;
políticas agente/runtime forem orientadas por dados; cada execução congelar a
versão; alterações forem auditáveis; e novo protocolo continuar exigindo adapter.
Nenhuma abstração além da necessária aos dois adapters será implementada.

A fase só estará concluída quando os 12 itens estiverem implementados e
verificados; todos os fluxos usarem o serviço único; Codex e DeepSeek estiverem
encapsulados; políticas e tentativas forem auditáveis; retry/fallback forem
separados e limitados; quota for detectada; os dois cenários de fallback e de
indisponibilidade total forem demonstrados; UI/SSE mostrarem o fluxo real; e
segredos/conteúdo bruto não forem persistidos. O modo Codex-only atual deve
permanecer durante a migração. Este documento não marca implementação como feita.

As decisões de classificação/egress DeepSeek, credencial/conta/modelo suportado,
quota/rate limit, alçadas e operação foram aprovadas no pacote de prontidão.
Fallback pode aumentar custo e superfície de egress; é mitigado por política,
classificação e um único fallback. Resultado incerto após dispatch exige
reconciliação, não nova execução cega.

Arquivos afetados por este replanejamento: este plano, a ADR
`12_ADR_PROVIDER_NEUTRAL_AGENT_EXECUTION_RUNTIME.md`, o pacote de prontidão
`14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md`, os schemas
`phase-4-contracts/` e `01_DELIVERY_ROADMAP.md`. Fases 5 e 6 não mudam, exceto
continuarem a depender exclusivamente de `AgentExecutionService` e políticas
publicadas.
