---
document_type: artifact-storage-and-audit-contract
status: APPROVED_FOR_MVP
created_at: 2026-07-30
---

# Contrato de Artefatos e Auditoria do MVP

## Separação de responsabilidades

| Local | Conteúdo permitido |
| --- | --- |
| Repositório NAAMIVE | Código da plataforma, migrations, contratos e documentação; somente leitura em runtime. |
| PostgreSQL | Estado, eventos, jobs, gates, findings, decisões e metadados/referências de artefato. |
| Repositório externo do produto | Código, testes, documentação do produto, branches, commits e PRs. |
| `ArtifactStore` externo | Evidências, relatórios, logs sanitizados, snapshots de gate e anexos de execução. |

Nenhum projeto, log, evidência ou estado de execução é criado ou alterado dentro
do repositório NAAMIVE. Nenhuma pasta técnica da NAAMIVE é criada no repositório
do produto.

## Configuração e layout

`NAAMIVE_ARTIFACT_STORE_URI` é obrigatório. No MVP o adaptador `file://` usa
volume persistente ou diretório de rede montado; o contrato permite adaptador de
object storage futuro sem alterar domínio ou referências.

```text
<artifact-store>/
  projects/<project-id>/
    executions/<execution-id>/evidence/
    executions/<execution-id>/reports/
    executions/<execution-id>/sanitized-logs/
    gates/<gate-id>/
    deliveries/
```

Objetos são gravados de forma imutável sob chave que inclui hash de conteúdo.
Arquivos temporários ou filesystem interno de container não são armazenamento
durável de artefatos.

Para a Fase 1 são obrigatórios os snapshots estruturado e Markdown/YAML da
revisão submetida, o relatório de validação, o snapshot de abertura do gate e o
registro de sua decisão. O protocolo de pré-gravação e recuperação está em
`05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md`.

## Referência de artefato

Cada artefato possui no PostgreSQL:

```text
artifact_id, project_id, execution_id, artifact_type,
storage_uri, storage_key, sha256, schema_version,
created_at, retention_policy,
repository_remote, branch, commit_sha, relative_path
```

Campos Git são obrigatórios quando o artefato comprova código ou documentação
versionada do produto. A máquina usa commit SHA e hash; nunca uma leitura solta
da branch atual como evidência de transição.

## Consistência e recuperação

1. Agente altera apenas worktree isolado do repositório do produto.
2. Plataforma valida escopo e cria commit com correlação de execução.
3. Push da branch confirma o commit remoto.
4. Evidências e relatórios sanitizados são gravados no `ArtifactStore`.
5. PostgreSQL registra referências/hashes e aceita a transição de negócio.

Falha antes do passo 5 não aceita a transição. Commit ou objeto órfão contém
`execution_id` e pode ser reconciliado de forma idempotente; a reconciliação não
presume sucesso nem despacha próximo trabalho sem registro completo.

Prompt completo, stdout/stderr bruto, raciocínio do agente, segredos e dados de
ambiente não são armazenados no `ArtifactStore`.
