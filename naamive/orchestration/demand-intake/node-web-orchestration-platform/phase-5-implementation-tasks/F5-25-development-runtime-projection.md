---
task: F5-25
status: DONE
depends_on: [F5-23]
---

# F5-25 — Projeção fiel e diagnóstico do runtime de desenvolvimento

## Instruções de execução para o agente

Cada item entregável desta task pode ter um dos status `TO-DO`, `DOING` ou
`DONE`. Antes de iniciar, marque o item correspondente como `DOING`; atualize
seu status conforme a implementação avançar e só o marque como `DONE` depois de
verificar o respectivo resultado. Mantenha estas marcações no próprio arquivo,
para que o progresso seja auditável.

Quando todos os itens entregáveis estiverem `DONE`, atualize o status desta task
para `DONE`. Ao finalizar a task, faça commit das alterações na branch atual e
envie o commit para a branch remota correspondente (`git push`).

## Objetivo

Substituir a interpretação client-side de `jobs.status` por uma projeção
canônica, sanitizada e read-only da tentativa de desenvolvimento. Um job
`COMPLETED` só é “pronto para QA” quando correlacionado com delivery
`EVIDENCE_REVIEW`, worktree `ACTIVE` e WI `QA_IN_PROGRESS`; combinado com WI
`DEVELOPMENT_IN_PROGRESS` é inconsistência degradada, nunca “preparo concluído”.

## Implementar

1. [x] **DONE:** Aplicar a migration 042 antes da nova migration 043. A 043 adiciona as
   constraints graduais para `jobs.delivery_id` e `deliveries.worktree_id`,
   `artifacts.metadata`, deduplicação de diagnóstico e `runtime_processes`.
   Ela deve emitir relatório de legados; linhas nulas não são inferidas.
2. [x] **DONE:** Criar um projetor backend que seleciona tentativa por `delivery.id`: duas ou
   mais deliveries com job leased são inconsistência; caso contrário seleciona
   a delivery não terminal mais recente e, por fim, a mais recente. Jobs são
   ordenados por `available_at DESC, id DESC`; histórico retém no máximo três
   tentativas anteriores.
3. [x] **DONE:** Publicar exclusivamente `development-runtime/v1`: IDs, estados
   correlacionados, tentativa, timestamps, stage, health, próxima ação, erro
   sanitizado, build IDs e `diagnostic_id`. Remover `development_job`. Proibir
   paths, JSONL, prompts, argumentos de ferramenta, conteúdo e segredos.
4. [x] **DONE:** Implementar uma matriz de projeção versionada e fechada. Ela inclui
   `QUEUED`, `PREPARING_WORKTREE`, `DISPATCHING_AGENT`, `EXECUTING_AGENT`,
   `VALIDATING_EVIDENCE`, `READY_FOR_QA`, `RETRY_SCHEDULED`, `FAILED`,
   `QA_COMPLETED` e `INCONSISTENT_TERMINAL_STATE`; toda combinação não listada,
   FK ausente ou `COMPLETED`/`DEVELOPMENT_IN_PROGRESS` é inconsistente,
   `DEGRADED` e `DIAGNOSE_RUNTIME_AND_RECONCILE`. `NO_RECENT_SIGNAL` aplica-se
   apenas a leased com `last_signal_at` existente e expirado; sinal ausente é
   degradado e deve ter regra explícita.
5. [x] **DONE:** Executar o detector fora de requisições GET e, em transação de inserção pura,
   persiste uma vez por fingerprint o evento e artefatos de inconsistência.
   Não atualiza jobs, deliveries, worktrees, WIs, operações ou leases.
6. [x] **DONE:** Exigir `NAAMIVE_BUILD_ID` no server/worker, registrar heartbeats em
   `runtime_processes`, expor `GET /health/runtime` como `runtime-health/v1`
   (503 quando não saudável) e criar smoke que inicia ambos com a mesma build.
7. [x] **DONE:** Fazer a UI apresentar apenas stage/health/next action derivados; recuperação e retry
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

## Adendo normativo de prontidão

O contrato detalhado, matriz fechada, DDL 043, política de legado, diagnóstico,
health e casos enumerados estão em [F5-25-development-runtime-projection-addendum.md](F5-25-development-runtime-projection-addendum.md). Este adendo prevalece sobre qualquer redação ambígua desta task.
