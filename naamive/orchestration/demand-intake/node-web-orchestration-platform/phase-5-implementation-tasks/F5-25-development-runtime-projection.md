---
task: F5-25
status: TODO
depends_on: [F5-23]
---

# F5-25 — Projeção fiel e diagnóstico do runtime de desenvolvimento

## Objetivo

Substituir a interpretação client-side de `jobs.status` por uma projeção
canônica, sanitizada e read-only da tentativa de desenvolvimento. Um job
`COMPLETED` só é “pronto para QA” quando correlacionado com delivery
`EVIDENCE_REVIEW`, worktree `ACTIVE` e WI `QA_IN_PROGRESS`; combinado com WI
`DEVELOPMENT_IN_PROGRESS` é inconsistência degradada, nunca “preparo concluído”.

## Implementar

1. Aplicar a migration 042 antes da nova migration 043. A 043 adiciona as
   constraints graduais para `jobs.delivery_id` e `deliveries.worktree_id`,
   `artifacts.metadata`, deduplicação de diagnóstico e `runtime_processes`.
   Ela deve emitir relatório de legados; linhas nulas não são inferidas.
2. Criar um projetor backend que seleciona tentativa por `delivery.id`: duas ou
   mais deliveries com job leased são inconsistência; caso contrário seleciona
   a delivery não terminal mais recente e, por fim, a mais recente. Jobs são
   ordenados por `available_at DESC, id DESC`; histórico retém no máximo três
   tentativas anteriores.
3. Publicar exclusivamente `development-runtime/v1`: IDs, estados
   correlacionados, tentativa, timestamps, stage, health, próxima ação, erro
   sanitizado, build IDs e `diagnostic_id`. Remover `development_job`. Proibir
   paths, JSONL, prompts, argumentos de ferramenta, conteúdo e segredos.
4. Implementar uma matriz de projeção versionada e fechada. Ela inclui
   `QUEUED`, `PREPARING_WORKTREE`, `DISPATCHING_AGENT`, `EXECUTING_AGENT`,
   `VALIDATING_EVIDENCE`, `READY_FOR_QA`, `RETRY_SCHEDULED`, `FAILED`,
   `QA_COMPLETED` e `INCONSISTENT_TERMINAL_STATE`; toda combinação não listada,
   FK ausente ou `COMPLETED`/`DEVELOPMENT_IN_PROGRESS` é inconsistente,
   `DEGRADED` e `DIAGNOSE_RUNTIME_AND_RECONCILE`. `NO_RECENT_SIGNAL` aplica-se
   apenas a leased com `last_signal_at` existente e expirado; sinal ausente é
   degradado e deve ter regra explícita.
5. O detector executa fora de requisições GET e, em transação de inserção pura,
   persiste uma vez por fingerprint o evento e artefatos de inconsistência.
   Não atualiza jobs, deliveries, worktrees, WIs, operações ou leases.
6. Exigir `NAAMIVE_BUILD_ID` no server/worker, registrar heartbeats em
   `runtime_processes`, expor `GET /health/runtime` como `runtime-health/v1`
   (503 quando não saudável) e criar smoke que inicia ambos com a mesma build.
7. A UI apenas apresenta stage/health/next action derivados; recuperação e retry
   continuam exclusivamente nos comandos governados.

## Testes de aceite

- tabela de casos cobre todas as linhas da matriz, `VALIDATING_EVIDENCE`, sinal
  ausente e uma combinação não listada;
- contrato valida schema fechado, seleção da tentativa, histórico limitado e
  sanitização;
- E2E controlled cobre execução até evidence review/QA e o par inconsistente;
- worker cobre falhas antes/depois de despacho, timeout e retry sem terminal
  impossível;
- smoke falha para processo ausente, role/schema divergente ou build distinta.
