---
task: F5-24
status: DONE
depends_on: [F5-22, F5-23]
---

# F5-24 — Revisão visual e auditável do plano de módulo

## Instruções de execução para o agente

Cada item entregável desta task pode ter um dos status `TO-DO`, `DOING` ou
`DONE`. Antes de iniciar, marque o item correspondente como `DOING`; atualize
seu status conforme a implementação avançar e só o marque como `DONE` depois de
verificar o respectivo resultado. Mantenha estas marcações no próprio arquivo,
para que o progresso seja auditável.

Quando todos os itens entregáveis estiverem `DONE`, atualize o status desta task
para `DONE`. Ao finalizar a task, faça commit das alterações na branch atual e
envie o commit para a branch remota correspondente (`git push`).

## Itens entregáveis

1. `DONE` — Implementar a projeção HTTP fechada `module_plan_review/v1`,
   incluindo sanitização, limites de histórico, ordenação e exclusão dos campos
   proibidos definidos nesta task.
2. `DONE` — Implementar o controller e a UI de revisão do plano: resumo,
   tabela comparativa, detalhe de WI, histórico somente leitura e seleção
   persistente por `logical_id`.
3. `DONE` — Implementar os fluxos de solicitar ajustes e aprovar plano,
   incluindo validações, confirmação, preservação de estado e tratamento de
   respostas/erros HTTP.
4. `DONE` — Implementar a integração SSE com uma única inscrição por projeto,
   coalescimento de refresh e descarte de respostas obsoletas.
5. `DONE` — Criar e executar os testes unitários, HTTP, UI/E2E e SSE previstos
   nos critérios de aceite; corrigir as falhas encontradas.
6. `DONE` — Revisar a implementação, atualizar todos os status dos itens e da
   task, fazer o commit final e enviar a branch atual para a remota.

## Objetivo

Permitir que o operador compare e decida a revisão atual de um plano de módulo
sem inspecionar JSON bruto. A tela torna explícitos cobertura, riscos,
dependências, QA, escopo permitido e a consequência da aprovação.

## Limites de escopo

Esta task cobre somente o read model e a UI de planejamento de módulo. A
projeção, correlação, diagnóstico, healthcheck e smoke do runtime de
desenvolvimento pertencem à [F5-25](F5-25-development-runtime-projection.md).
F5-24 consome apenas os estados de work item já publicados; não infere nem
altera estados de delivery, job ou worktree.

## Contrato de projeção

`GET /api/projects/:projectId?phase3=true` deve acrescentar o objeto fechado
`module_plan_review/v1`, uma entrada por módulo. Campos não previstos são
proibidos e todo texto é sanitizado pelos mesmos limites de F5-23.

```json
{
  "schema_version": "module-plan-review/v1",
  "module": {"id":"uuid","key":"string","objective":"string","state":"string"},
  "current_revision": {
    "id":"uuid","number":2,"status":"PLAN_PROPOSED",
    "supersedes_revision_id":"uuid|null","created_at":"RFC3339",
    "author":{"id":"string","label":"string"},
    "baseline":{"revision_id":"uuid","label":"string|null"},
    "evidence":{"json_hash":"sha256","markdown_hash":"sha256"}
  },
  "current_gate":{"id":"uuid","version":1,"status":"OPEN"},
  "summary":{"work_item_count":3,"eligible_count":1,"blocked_count":1,
    "criterion_count":4,"covered_criterion_count":4},
  "work_items":[],"criterion_coverage":[],"business_dependencies":[],
  "revision_history":[],"alerts":[]
}
```

Cada `work_items[]` contém somente `logical_id`, `title`, `objective`,
`inputs`, `output`, `acceptance_criteria`, `criterion_ids`, `allowlist`,
`denylist`, `depends_on_ids`, `qa_matrix`, `risks`, `capabilities`, `status`,
`eligible`, `blocked_reason` e hashes de evidência. Cada item de histórico
contém revisão, status, autor sanitizado, datas, feedback sanitizado,
`supersedes_revision_id` e hashes; o endpoint limita o histórico às 20 revisões
mais recentes e declara `history_truncated`. IDs, timestamps e hashes podem ser
expostos; prompts, conteúdo de artefatos, paths absolutos, segredos, payloads
de jobs e chaves de idempotência não podem ser expostos.

`alerts[]` tem `code`, `severity` (`INFO` ou `WARNING`), `revision_id`,
`work_item_id|null` e mensagem sanitizada. Na revisão atual, os invariantes
semânticos de F5-23 (cobertura ausente, allowlist ampla e QA obrigatório
ausente) não são avisos: invalidam a proposta e impedem o gate. Alertas desses
tipos só podem ser exibidos para revisão histórica/legada somente leitura.

## UI e interações

1. Exibir resumo com módulo, objetivo, revisão, gate, baseline, hashes,
   quantidade materializável, elegível e bloqueada, e cobertura de critérios.
2. Exibir uma tabela comparativa com `WI`, `Entrega`, `Dependências`,
   `Cobertura de critérios`, `QA`, `Risco` e `Situação`. Uma revisão com um WI
   deve revelar capacidades e justificativa de coesão, não ocultar sua amplitude.
3. Selecionar um WI abre detalhe lateral ou expansível no mesmo painel, com os
   campos contratuais completos e evidências por hash. A seleção é identificada
   por `logical_id` e sobrevive a refresh da mesma revisão.
4. Exibir histórico ordenado por revisão decrescente. Revisões/gates não atuais
   são somente leitura e jamais oferecem ações ativas.
5. **Solicitar ajustes** requer feedback não vazio e oferece sugestões rápidas.
   O texto não enviado é preservado durante refresh da mesma revisão; só é
   descartado após resposta aceita ou mudança de revisão, com aviso explícito.
6. **Aprovar plano** abre confirmação antes do POST, com `work_item_count`,
   `eligible_count`, `blocked_count`, bloqueios e a explicação de que todos os
   WIs serão materializados atomicamente e os elegíveis serão agendados conforme
   dependências e limite operacional de worktrees. Após `202`, mostrar
   `operation_id` e atualizar por projeção; erro HTTP preserva seleção, feedback
   e controles reabilitados.

## Renderização e SSE

Há um único controller dono do estado e do DOM do painel. Ele mantém
`project_id`, `plan_revision_id`, `selected_logical_id`, `feedback_draft`,
`refresh_in_flight` e `refresh_requested`. SSE apenas marca refresh pendente;
não faz `fetch`, não substitui DOM e não chama handlers de mutação. Enquanto há
fetch, eventos adicionais são coalescidos em no máximo uma atualização seguinte.
Respostas de projeto/revisão já trocados são descartadas. Há uma única inscrição
SSE por projeto, removida ao trocar/fechar o projeto.

## Critérios de aceite e testes

- teste unitário cobre mapeamento de cobertura, elegibilidade, bloqueios,
  alertas de revisão legada e preservação de estado do controller;
- teste HTTP valida `module-plan-review/v1`, schema fechado, sanitização,
  ordenação/limite de histórico e ausência de campos proibidos;
- UI/E2E cobre tabela de múltiplos WIs, WI amplo, detalhe sem JSON, duas
  revisões com supersessão, gates obsoletos sem ação, confirmação de aprovação
  e preservação de feedback em falha;
- E2E emite uma sequência de eventos SSE durante renderização e comprova uma
  inscrição, refresh coalescido e ausência de loop/requisições repetidas.
