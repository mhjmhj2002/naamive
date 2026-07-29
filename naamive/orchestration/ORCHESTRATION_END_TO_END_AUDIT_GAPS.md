---
document_type: orchestration-end-to-end-audit-gaps
status: CLOSED
audited_at: 2026-07-29
source_backlog: ORCHESTRATION_END_TO_END_BACKLOG.md
---

# Gaps da Auditoria Ponta a Ponta da Orquestração

## Resultado da auditoria

A suíte determinística passou com `53` testes em 11,44 s em baseline limpo
temporário usando:

```text
naamive/scripts/run-clean-runtime-baseline.sh --run --allow-dirty-snapshot
```

Ela cobre o caminho de CLI de intake a `DELIVERED` com um dublê determinístico do agente. O relatório `baseline-reports/runtime-baseline-20260729151508.md` registra o commit-base e o snapshot limpo testado. A prova controlada com o adaptador Codex real também foi concluída em projeto descartável e registrada em `smoke-reports/codex-smoke-20260729142039.md`.

As correções técnicas, a prova real e a evidência de baseline limpo estão registradas abaixo; todos os gaps desta auditoria foram fechados.

## Gaps bloqueadores

### GAP-001 — Aceite de entrega pode deixar projeto e módulos inconsistentes

**Severidade:** bloqueador

**Estado:** `RESOLVED`

**Evidência de resolução:**
`naamive_runtime.orchestration._resolve_delivery_acceptance` registra uma
operação imutável, pré-valida todos os módulos sob lock e só promove o projeto
depois dos módulos. As regressões
`test_delivery_acceptance_rejects_incompatible_module_without_side_effects` e
`test_delivery_acceptance_recovers_partial_module_failure_and_is_idempotent`
passaram na suíte de 51 testes de 2026-07-28.

Ao aprovar `DELIVERY_ACCEPTANCE`, o runtime promove o projeto para `DELIVERED` antes de verificar se todos os módulos estão em `READY_FOR_DELIVERY`. Se a validação de qualquer módulo falhar, a execução lança erro depois de a transição do projeto já ter sido persistida.

**Risco:** projeto em `DELIVERED` com um ou mais módulos não entregues, violando a compatibilidade projeto–módulo e o critério de aceite da Fase 6.

**Localização:** `naamive/runtime/python/src/naamive_runtime/orchestration.py`, função `resolve_human_gate`.

**Correção necessária:** validar previamente todos os módulos e só então aplicar as transições; idealmente tratar a promoção coordenada como uma operação recuperável, com pré-validação integral e compensação explícita caso uma persistência falhe.

**Teste necessário:** abrir um `DELIVERY_ACCEPTANCE` com ao menos um módulo fora de `READY_FOR_DELIVERY` e comprovar que projeto e módulos permanecem inalterados.

### GAP-002 — Aprovação de release dispara nova preparação de entrega

**Severidade:** bloqueador

**Estado:** `RESOLVED`

**Evidência de resolução:** o registro imutável `release_package` vincula
execução, caminho, hash e evidências à autorização e ao aceite. As regressões
`test_release_authorization_binds_delivery_acceptance_to_one_immutable_package`
e `test_changed_authorized_package_blocks_delivery_acceptance_and_requires_rework`
passaram na suíte de 53 testes de 2026-07-28.

Quando `RELEASE_AUTHORIZATION` é aprovada, o estado continua em `DELIVERY` e o campo `release_authorized` é gravado. A chamada seguinte a `orchestrate --project` executa novamente `release-operations`, gerando um novo despacho e podendo recriar o mesmo `DELIVERY_PACKAGE.md` antes de abrir `DELIVERY_ACCEPTANCE`.

**Risco:** a autoridade operacional aprova um pacote e a autoridade de negócio pode receber outro pacote/evidência para aceite; há duplicidade de execução e perda de rastreabilidade do artefato aprovado.

**Localização:** `naamive/runtime/python/src/naamive_runtime/orchestration.py`, rodada `DELIVERY` de `_orchestrate_phase6`.

**Correção necessária:** após `RELEASE_AUTHORIZATION`, reutilizar o pacote e a execução que originaram o gate e abrir diretamente `DELIVERY_ACCEPTANCE`, sem novo despacho do agente.

**Teste necessário:** criar pacote com `release_authorization_required: true`, aprovar o gate e comprovar que a próxima orquestração não cria nova execução de `release-operations` nem modifica o pacote aprovado.

### GAP-003 — Não há prova integrada controlada com Codex real

**Severidade:** bloqueador de certificação

**Estado:** `RESOLVED`

**Evidência de resolução:** o smoke opt-in executou intake, registro, análise
e revisão independente usando `resolve_agent_runner` de produção; o projeto
`codex-smoke-20260729142039` alcançou `DEFINITION`. O relatório
`smoke-reports/codex-smoke-20260729142039.md` preserva comandos, versão do
Codex, IDs de despacho e execução, hashes e registros auditáveis.

O teste E2E de CLI troca `resolve_agent_runner` por um dublê. Ele não valida disponibilidade do Codex CLI, autenticação, compatibilidade do comando `codex exec`, execução com sandbox nem o comportamento real do agente na produção das evidências.

**Risco:** a suíte verde pode divergir do primeiro projeto novo executado com o adaptador real.

**Evidência:** `naamive/tests/runtime_python/test_intake_cli.py`, teste `test_cli_deterministic_end_to_end_happy_path`; o backlog também prevê uma prova opcional isolada com Codex real.

**Correção necessária:** disponibilizar um smoke test manual/controlado, explicitamente opt-in, que crie um projeto descartável, percorra ao menos intake, registro, análise e validação de evidência usando o adaptador real, e gere registros auditáveis. Ele não deve rodar na suíte determinística padrão.

## Gaps de governança e rastreabilidade

### GAP-004 — Backlog marcado como concluído mantém trabalho pendente

**Severidade:** média

**Estado:** `RESOLVED`

**Evidência de resolução:** a Fase 7 foi reaberta durante a reconciliação,
sua seção contraditória foi reclassificada e o baseline limpo foi executado
com `53 passed in 11.44s`. O relatório
`baseline-reports/runtime-baseline-20260729151508.md` e os estados finais dos
três documentos comprovam a sincronização.

`ORCHESTRATION_END_TO_END_BACKLOG.md` marca a Fase 7 e o documento como `DONE`, mas a própria seção “Falta implementar” ainda lista a matriz completa de testes, o teste com Codex real e a execução de um novo projeto de catálogo.

**Risco:** o estado consolidado comunica certificação antes de todos os critérios documentados estarem demonstrados.

**Correção necessária:** alinhar o front matter e o estado da Fase 7 à evidência disponível. Manter `IN_PROGRESS` até os gaps bloqueadores serem corrigidos e a prova controlada ser executada, ou mover explicitamente os itens restantes para um backlog posterior que não faça parte do critério de conclusão.

### GAP-005 — Falta teste de regressão para atomicidade do aceite coordenado

**Severidade:** média

**Estado:** `RESOLVED`

**Evidência de resolução:** as regressões de aceite coordenado da Fase 1
cobrem módulo incompatível, falha parcial recuperável e repetição idempotente,
protegendo o cenário que este GAP exigia.

A suíte E2E exercita apenas o caminho feliz, em que todos os módulos já estão prontos para entrega. Não há cenário que force falha durante a promoção coordenada de projeto e módulos.

**Risco:** regressões como a do GAP-001 não são detectadas automaticamente.

**Correção necessária:** adicionar testes unitários e de CLI para módulo incompatível, erro na transição de módulo e repetição idempotente do aceite de entrega.

## Condição de encerramento

Este documento pode ser marcado como `CLOSED` quando:

1. a suíte determinística foi executada e registrada em baseline limpo;
2. GAP-004 foi fechado com os estados documentais sincronizados;
3. os três documentos estão coerentes com as evidências de conclusão.
