---
document_type: platform-operations-contract
status: APPROVED_FOR_PHASE_1
created_at: 2026-07-30
scope: ArtifactStore, local API boundary, worker exclusivity, status and backup
---

# Contrato Operacional da Plataforma — Fase 1

## Artefatos obrigatórios e consistência

Antes de aceitar a transição correspondente, a plataforma grava no
`ArtifactStore` e referencia no PostgreSQL: (1) snapshot estruturado e
Markdown/YAML da revisão submetida; (2) relatório de validação; (3) snapshot de
abertura do gate; e (4) registro da decisão do gate. As chaves imutáveis usam
`projects/<project_id>/executions/<execution_id>/.../<sha256>` ou
`projects/<project_id>/gates/<gate_id>/.../<sha256>` e incluem versão de schema.

Uma indisponibilidade de escrita nunca aceita auditoria parcial. Na submissão a
falha retorna erro antes da transação de negócio; no worker ela é transitória e
mantém o job recuperável. O objeto é escrito de forma idempotente por
`execution_id`/hash; um reconciliador pode registrar objetos órfãos, mas não
avança workflow sem referência persistida e conjunto completo de artefatos.

## Exposição local segura

A Fase 1 é `localhost-only` por padrão: API e web vinculam explicitamente a
`127.0.0.1` e `::1`, nunca a `0.0.0.0`/interfaces de rede. CORS aceita somente
a origem configurada da web local, sem curingas e sem credenciais implícitas.
`NAAMIVE_REPOSITORY_ROOTS` e a raiz `file://` do ArtifactStore são allowlists;
todo caminho passa por resolução de symlink e verificação de contenção antes de
Git ou I/O. Testes cobrem rejeição fora da allowlist e configuração sem bind
externo. HML depende de pendência posterior: autenticação, TLS/reverse proxy e
decisão explícita de rede.

## Exclusividade e conflitos

O lock global serializa apenas a execução do worker/agente. Leituras, SSE e
`SAVE_INTAKE` de rascunhos permanecem disponíveis. `VALIDATE_INTAKE` ocupa o
único slot, mas submissão de outro projeto é aceita e enfileirada; submissão do
mesmo projeto com operação/gate aberto retorna `409 PROJECT_OPERATION_ACTIVE`.
Decisão de gate não ocupa o slot, mas exige `gate_id` e versão atual.

## Catálogo de status

`status_types`, `status_definitions` e `status_audiences` são catálogo de
apresentação reutilizável. Existe somente `state_status_mappings` — não existe
`workflow_status_mappings` — com chave
`(workflow_definition_id, workflow_version, state_code, event_code nullable,
status_type_code, audience_code)`. Cada mapa referencia um status do catálogo;
o mapa com evento tem precedência sobre o mapa apenas de estado. A projeção de
cada evento persiste `status_code`, `status_definition_version`, marco e próxima
ação aplicados, e a UI apenas os exibe.

## Backup e restore da Fase 1

A Fase 1 fornece comandos manuais documentados para `backup`, `restore` e dump
automático antes de migration destrutiva. Backup é aceito somente após validar
dump concluído, checksum e metadados de versão; restore exige destino PostgreSQL
explícito e confirmação para destino não efêmero. O teste de aceite restaura em
PostgreSQL efêmero e comprova projetos, estados, eventos e referências de
artefatos. Agendamento, retenção, rollback automatizado, alertas e runbooks de
produção pertencem exclusivamente à Fase 5.
