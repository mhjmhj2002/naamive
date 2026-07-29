---
document_type: orchestration-end-to-end-audit-gap-status
status: ACTIVE
source_backlog: ORCHESTRATION_END_TO_END_AUDIT_GAPS_BACKLOG.md
last_updated_at: 2026-07-29
---

# Status dos Gaps da Auditoria Ponta a Ponta

Este arquivo acompanha o estado de tratamento dos gaps descritos em
`ORCHESTRATION_END_TO_END_AUDIT_GAPS_BACKLOG.md`. Ele segue o mesmo modelo de
registro dos documentos históricos de auditoria: cada gap conserva sua
descrição e seus critérios no backlog, enquanto este arquivo registra somente
o estado consolidado e a evidência já obtida.

Ele não é um workflow adicional para agentes, não cria fases de revisão e não
impõe aprovação, bloqueio ou despacho além do fluxo normal já aplicável ao
trabalho solicitado.

## Estados de acompanhamento

| Estado | Significado |
| --- | --- |
| `OPEN` | Gap identificado, ainda sem correção registrada. |
| `IN_PROGRESS` | Correção em andamento. |
| `RESOLVED` | Correção e evidência de aceite registradas. |

O estado é descritivo. O agente pode executar o trabalho que lhe for solicitado
normalmente; a atualização deste registro não é pré-requisito, gate ou motivo
para interromper a execução.

## Estado consolidado

| Gap | Prioridade | Estado | Evidência / próxima ação |
| --- | --- | --- | --- |
| `GAP-001` | Bloqueador | `RESOLVED` | `run-agent` foi removido da interface operacional; 54 testes de runtime passaram e a regressão confirma a rejeição sem criar diretório. |
| `GAP-002` | Alta | `RESOLVED` | `PRODUCT_COMMITMENT` aprova candidatos explícitos e publica o conjunto completo de módulos atomicamente. |
| `GAP-003` | Alta | `RESOLVED` | Operações públicas auditáveis cobrem retrabalho integrado, pausa, retomada, cancelamento de módulo e evolução. |
| `GAP-004` | Média | `RESOLVED` | O consumo resolve o contrato publicado no projeto provedor e fixa caminho canônico, versão e SHA-256; integração e entrega revalidam essa identidade. |

## Evidência registrada

### GAP-001 — `run-agent` contorna contexto, despacho, estado e auditoria

**Estado:** `RESOLVED`

**Correção registrada:** a interface operacional `run-agent` foi removida. Os
despachos de agentes permanecem nos fluxos canônicos, que criam contexto e
registros de execução antes de chamar o agente.

**Evidência:**

- `.venv/bin/pytest -q naamive/tests/runtime_python`: `54 passed in 10.74s`;
- `test_run_agent_is_not_an_operational_command` confirma que o comando
  removido é rejeitado sem criar o diretório-alvo.

### GAP-002 — Compromisso de produto materializa somente um módulo

**Estado:** `RESOLVED`

**Correção registrada:** `PRODUCT_COMMITMENT` agora recebe uma lista repetível
de candidatos JSON contendo `module_id`, `title`, `justification` e `owner`.
Os candidatos são validados antes da decisão, materializados em área temporária
e publicados juntos, preservando `IDENTIFIED`, status e a referência da decisão
para todos os módulos.

**Evidência:** `test_product_commitment_decision_is_linked_to_pending_request`
aprova `catalog` e `orders`, confirma ambos os módulos materializados e verifica
a lista imutável `approved_modules` no registro da decisão.

### GAP-003 — Estados de exceção e evolução não têm caminho operacional completo

**Estado:** `RESOLVED`

**Correção registrada:** os comandos `pause`, `resume` e `cancel-module`
aplicam decisões humanas auditáveis aos escopos de projeto ou módulo. Um finding
crítico de validação reconcilia todos os módulos participantes em
`IMPLEMENTING`. `start-evolution` exige módulos afetados, justificativa e
evidência, cria um `change_request` imutável e inicia novo planejamento apenas
para esses módulos.

**Evidência:** as regressões de runtime cobrem pausa/retomada/cancelamento de
módulo, evolução com change request e retorno integrado de finding crítico.

### GAP-004 — Registro de consumo não comprova contrato do provedor

**Estado:** `RESOLVED`

**Correção registrada:** `register-module-consumption` agora resolve a
referência exclusivamente no projeto e módulo provedor, exige contrato existente
com `publication_status: PUBLISHED`, `contract_version` e módulo provedor
`DELIVERED`. O registro do consumidor conserva o caminho canônico do provedor,
a versão publicada e o SHA-256 do conteúdo. Antes dos rounds de integração e
entrega, o runtime revalida cada consumo e bloqueia contrato removido, não
publicado ou divergente.

**Evidência:** `test_module_consumption_rejects_missing_unpublished_or_drifted_provider_contract`
cobre rejeição de caminho inexistente, contrato não publicado e alteração após
o registro; `test_module_consumption_is_owned_by_consumer_and_cannot_authorize_provider_write`
verifica a identidade imutável registrada e o isolamento do provedor.

## Histórico de atualização

| Quando | Gap | Estado | Registro |
| --- | --- | --- | --- |
| 2026-07-29 | `GAP-001` | `RESOLVED` | Remoção de `run-agent` e regressão de rejeição registradas. |
| 2026-07-29 | `GAP-002` | `RESOLVED` | Aprovação de lista explícita e publicação atômica do conjunto de módulos. |
| 2026-07-29 | `GAP-003` | `RESOLVED` | Operações auditáveis de exceção, reconciliação integrada e evolução. |
| 2026-07-29 | `GAP-004` | `RESOLVED` | Contrato publicado verificado, identidade imutável registrada e revalidação antes de integração/entrega. |
| 2026-07-29 | `GAP-002` | `OPEN` | Gap de materialização multi-módulo identificado na auditoria. |
| 2026-07-29 | `GAP-003` | `OPEN` | Gap de operações de exceção e evolução identificado na auditoria. |
| 2026-07-29 | `GAP-004` | `OPEN` | Gap de integridade de contrato de consumo identificado na auditoria. |
