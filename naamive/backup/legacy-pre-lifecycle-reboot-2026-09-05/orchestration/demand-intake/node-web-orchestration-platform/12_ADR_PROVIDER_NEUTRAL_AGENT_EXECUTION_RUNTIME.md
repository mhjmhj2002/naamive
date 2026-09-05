---
document_type: architecture-decision-record
status: APPROVED_FOR_IMPLEMENTATION
created_at: 2026-08-06
approved_at: 2026-08-06
approved_by: "@mhjmhj2002, repository owner"
decision: adopt-configured-ai-runtimes-with-codex-and-deepseek-adapters
supersedes: adopt-provider-neutral-agent-execution-runtime
---

# ADR — Adotar AI Runtimes configuráveis com adapters Codex e DeepSeek

## Contexto

O launcher Codex atual preserva jobs, leases, idempotência, worktrees,
ArtifactStore, auditoria e máquina de estados soberana. A proposta anterior
tentava generalizar esse limite para múltiplos providers, catálogo de modelos,
OpenRouter e circuit breaker. Essa complexidade não atende uma necessidade atual:
o NAAMIVE precisa operar com Codex e DeepSeek de maneira auditável, econômica e
segura, sem transformar contas, modelos, endpoints ou credenciais em código.

## Decisão

Criar contratos para `AI Runtime`, `AdapterType`, `ExecutionPolicy`,
`SecretReference` e `SecretResolver`, mantendo `AgentExecutionService` como única
entrada para jobs de agentes. O código implementa somente `CODEX_CLI` e
`OPENAI_COMPATIBLE_HTTP`; PostgreSQL cadastra instâncias, e o Secret Store guarda
credenciais:

```text
Worker -> AgentExecutionService -> ExecutorConfigurationRepository
       -> ExecutionPolicy -> AI Runtime versionado -> SecretResolver
       -> CodexCliAdapter | OpenAiCompatibleHttpAdapter -> OutputValidator
       -> ArtifactStore -> transition request
```

Um `Agent` mantém papel e contrato de saída; um `AI Runtime` é instância
configurada capaz de executá-lo. O contrato versionado recebe correlação, referências de contexto/schema,
classificação, timeout, política e idempotência; retorna tentativa imutável com
executor, status, duração, saída estruturada, erro sanitizado e uso/custo quando
disponível. O domínio não conhece API, CLI ou credenciais de nenhum executor.

Runtimes Codex são preferenciais para trabalho crítico, arquitetural, amplo e de alto risco.
DeepSeek é preferencial para trabalho delimitado, repetitivo e de menor risco.
Políticas determinísticas, publicadas e versionadas decidem o primário e se há
fallback. Segurança, classificação, paths e criticidade têm precedência sobre
custo e preferência.

Retry significa repetir no mesmo executor; fallback significa uma única tentativa
no outro. Quota/créditos esgotados não têm retry e podem fazer fallback se a
política permitir. Tarefas críticas e `CODEX`-only bloqueiam e exigem ação humana
quando Codex não está disponível. Nenhum bloqueio de segurança permite fallback.
Após falha elegível nos dois, o trabalho fica
`BLOCKED_NO_EXECUTOR_AVAILABLE`, preservando estado/evidências e expondo causas
individuais e próxima ação. Não há alternância infinita.

O banco armazena em `ai_runtime` a identidade (nome único por ambiente,
habilitação e versão corrente) e em `ai_runtime_configuration` o snapshot
versionado (adapter type, endpoint, modelo, nível de qualidade, timeout, auth
type, `secret_reference`, capacidades e metadados), mas nunca API key, token,
senha, sessão ou chave privada.
As políticas persistidas apontam para runtime primário e contingência. Mudanças
são auditadas e criam versão; a execução congela a versão no despacho.

Codex continua como processo isolado com comando configurável, ambiente mínimo,
arquivo de contexto, workdir temporário, timeout, encerramento governado e
descarte de stdout/stderr brutos. DeepSeek usa sua API oficial por endpoint HTTPS
allowlisted e segredo por referência. Prompt, resposta bruta, stdout/stderr,
payload de provider e segredo são proibidos no banco, logs, SSE e evidências.

## Alternativas consideradas

| Alternativa | Motivo para não escolher |
| --- | --- |
| Manter chamadas diretas ao Codex | Mantém acoplamento e impede fallback governado. |
| OpenRouter e catálogo multi-provider | Cria fornecedor, catálogo e superfície operacional sem uso atual. |
| Router genérico ou catálogo multi-provider | Antecipação desnecessária; aumenta políticas, migrations e testes. |
| Seleção por IA, votação ou paralelismo | Não determinístico ou duplica custo/efeitos sem benefício atual. |

## Consequências

O domínio adiciona `ai_runtime`, `ai_runtime_validation`,
`agent_execution_policy`, `agent_execution` e `agent_execution_attempt`.
Políticas, versões usadas e tentativas terminais são imutáveis. Evidências mínimas
são decisão de seleção, tentativa e resumo consolidado, hasheados e sanitizados
no ArtifactStore.

Não se cria `ai_model`, catálogo, marketplace, OpenRouter ou circuit breaker
complexo. O administrador governado, não o usuário final, pode cadastrar runtime
compatível com adapter existente. A disponibilidade é registrada por runtime e
execução, suficiente para evitar fallback repetido e informar o operador.

Falha funcional do código produzido pertence a QA/finding/rework; não é falha do
executor. Timeout/cancelamento/resposta perdida pós-dispatch requer reconciliação
antes de qualquer novo efeito.

## Migração

1. Publicar contratos, fakes, `EnvironmentSecretResolver` e validação de referências.
2. Criar persistência/versionamento/auditoria de runtimes e políticas.
3. Encapsular Codex no adapter e provar paridade no modo Codex-only.
4. Adicionar adapter HTTP para DeepSeek, classificação/egress e fallback desligado.
5. Habilitar fallback por política após aceite de quota e indisponibilidade.
6. Exibir administração, validação, versões, tentativas e bloqueios por web/SSE.

## Riscos e limites

DeepSeek requer confirmação de compatibilidade OpenAI, aprovação de classificação/egress, credencial, modelo e códigos
oficiais de quota/rate limit. Fallback eleva custo e superfície de egress, logo é
limitado a uma troca e nunca sobrepõe política de segurança. Quota ou saldo de
ambos pode indisponibilizar uma tarefa; a resposta correta é bloqueio recuperável
e ação humana, não degradação silenciosa. Esta ADR foi aprovada dentro dos limites
registrados no pacote de prontidão.

## Segurança e evolução

`SecretResolver` valida namespace e allowlist de ambiente, resolve o valor apenas
para o adapter autorizado e produz erro sanitizado. Localmente,
`EnvironmentSecretResolver` usa `.env` ignorado pelo Git e `.env.example` sem
valores; uma mesma referência pode ser rotacionada sem mudança de banco. Vault,
AWS Secrets Manager, Azure Key Vault, Google Secret Manager e Kubernetes Secrets
podem substituir apenas essa implementação. Endpoints têm allowlist de esquema,
host e porta, TLS e validação de certificados obrigatórios.

Adicionar conta, modelo, endpoint, credencial, timeout, prioridade ou runtime
compatível é configuração persistida, sem deploy. Novo protocolo, autenticação
inédita ou mecanismo incompatível exige novo adapter. Não são antecipados adapters
para outros providers nesta fase.

## Aprovação e evidências de prontidão

`14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md` é parte normativa desta ADR:
define aprovadores, alçadas, SLA, contratos JSON Schema, DDL, reconciliação,
DeepSeek/egress, corte e cenários de aceite. A decisão explícita do dono do
repositório foi registrada no pacote para as versões de 2026-08-06.
