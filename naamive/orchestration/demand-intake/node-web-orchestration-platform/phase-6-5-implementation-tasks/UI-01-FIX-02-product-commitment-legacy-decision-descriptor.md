---
task: UI-01-FIX-02
status: TO_DO
title: Corrigir descriptor legado de PRODUCT_COMMITMENT e tornar a decisão humana executável
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-03
depends_on: [UI-01, UI-02, UI-01-FIX-01, GAT-03, GAT-03-FIX-01, GAT-03-FIX-02, TST-02]
context: NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
---

# UI-01-FIX-02 — Corrigir descriptor legado de PRODUCT_COMMITMENT e tornar a decisão humana executável

## Problema

Durante o manual E2E pós-F6.5, o projeto real:

```text
financas-familiares-lab-1
```

percorreu com sucesso:

```text
CREATE
→ SUBMIT_INTAKE
→ VALIDATE_INTAKE
→ REGISTER_PROJECT
→ START_PRODUCT_DISCOVERY
→ ANALYZE_PRODUCT_NEED
→ DEFINE_PRODUCT_REQUIREMENTS
→ REVIEW_PRODUCT_COMMITMENT
```

e chegou corretamente a:

```text
workflow_code    = PROJECT_DISCOVERY
workflow_version = 3
state            = WAITING_FOR_PRODUCT_COMMITMENT

PRODUCT_COMMITMENT · OPEN
```

A projeção publicou a capability:

```text
PRODUCT_COMMITMENT_DECISION
```

porém a ação não é executável pela UI.

Sintomas observados:

1. o campo/select cujo label é `Published decision for the gate.` é renderizado vazio, sem `APPROVED` nem `REJECTED`;
2. o descriptor publicado não envia `gate_id`;
3. o descriptor publica `reason`, enquanto o endpoint legado `/api/projects/:projectId/decision` espera `feedback` para decisões não aprovadas;
4. o descriptor publica um campo humano `evidence`, embora o endpoint legado registre a evidência já persistida no próprio gate;
5. o resumo superior mostra `Nenhuma ação humana prioritária.` mesmo existindo um `PRODUCT_COMMITMENT` aberto e uma capability humana publicada.

O projeto permanece corretamente parado no gate e não deve ser recriado para corrigir este finding.

## Classificação

**P1 — o lifecycle chega a um gate humano obrigatório, mas a capability publicada pela projeção não pode ser executada corretamente pela UI.**

O fluxo canônico alcança `PROJECT_DISCOVERY v3 / WAITING_FOR_PRODUCT_COMMITMENT`, mas não consegue atravessar a decisão humana ordinária pelo contrato:

```text
persisted facts
→ projection
→ action descriptor
→ UI-02 renderer
→ descriptor.command
→ official endpoint
```

## Evidência técnica já identificada

### 1. O adapter legado publica corretamente a capability

`PROJECT_DISCOVERY:3` declara:

```text
WAITING_FOR_PRODUCT_COMMITMENT
→ PRODUCT_COMMITMENT_DECISION
```

Portanto não criar botão hardcoded nem inferir ação pelo nome do estado.

### 2. O leitor de gates legados perde as decisões permitidas

`readLegacyGateFacts(...)` adapta a tabela histórica `gates` e atualmente produz:

```ts
allowed_decisions: []
decision_effects: {}
```

O schema genérico de decisão constrói:

```ts
decision: {
  type: 'string',
  enum: gate.allowed_decisions
}
```

Consequência: `enum = []` e a UI renderiza um `<select>` sem opções.

### 3. O descriptor de PRODUCT_COMMITMENT usa contrato incompatível

A implementação atual de `PRODUCT_COMMITMENT_DECISION` usa conceitualmente:

```text
gateDecisionSchema(openGate)

bindings:
- version
- decision
- reason
- evidence
```

Mas o endpoint legado oficial:

```text
POST /api/projects/:projectId/decision
```

revalida:

```text
body.gate_id
body.version
body.decision
body.feedback
```

e rejeita `gate_id` ausente/diferente com conflito de gate. Para decisão não aprovada, exige `feedback`.

### 4. O REGISTER_PROJECT já demonstra o padrão compatível

O gate legado `REGISTER_PROJECT` possui adaptação explícita com:

```text
gate_id      SERVER_BOUND
version      SERVER_BOUND
decision     HUMAN_INPUT
feedback     HUMAN_INPUT
```

e decisões explícitas:

```text
APPROVED
REJECTED
```

A correção de `PRODUCT_COMMITMENT` deve seguir o mesmo princípio de compatibilidade explícita, sem generalizar sem evidência.

# Objetivo

Tornar `PRODUCT_COMMITMENT_DECISION` de `PROJECT_DISCOVERY` legado realmente executável pelo renderer canônico UI-02 e pelo endpoint oficial existente.

Após a correção, em:

```text
PROJECT_DISCOVERY v3
WAITING_FOR_PRODUCT_COMMITMENT
PRODUCT_COMMITMENT · OPEN
```

a projeção deve publicar uma decisão humana coerente com o contrato real do endpoint, permitindo no mínimo:

```text
APPROVED
REJECTED
```

sem montagem manual de payload no frontend.

# Requisitos funcionais

## 1. Descriptor compatível com o endpoint legado

Para um gate legado aberto `PRODUCT_COMMITMENT / OPEN`, o descriptor deve publicar conceitualmente:

```text
gate_id
  source   = SERVER_BOUND
  value    = id exato do gate aberto
  editable = false
  send     = true

version
  source   = SERVER_BOUND
  value    = versão exata do gate
  editable = false
  send     = true

decision
  source   = HUMAN_INPUT
  editable = true
  send     = true
  enum     = [APPROVED, REJECTED]

feedback
  source   = HUMAN_INPUT
  editable = true
  send     = true
```

`feedback` pode permanecer opcional no schema da UI para `APPROVED`, porque o endpoint é a autoridade final e exige feedback quando a decisão não é aprovação.

Não publicar `reason` para esse endpoint legado.

Não publicar `evidence` como entrada humana se o endpoint não a aceita como parte desta decisão. Preservar a evidência já persistida no gate e registrada server-side.

## 2. Decisões explícitas para PRODUCT_COMMITMENT legado

Não depender de `readLegacyGateFacts(...).allowed_decisions` enquanto esse adapter histórico não possuir essa informação persistida.

A capability específica deve declarar apenas as decisões realmente suportadas pelo endpoint legado:

```text
APPROVED
REJECTED
```

com labels adequados, por exemplo:

```text
APPROVED → Aprovar
REJECTED → Solicitar ajustes
```

Não adicionar `REWORK_REQUIRED`, `BLOCK` ou outras decisões sem evidência no contrato legado.

## 3. Gate exato e versão exata

O descriptor deve ficar ligado ao gate aberto exato do mesmo snapshot.

Não pode:

- escolher gate por estado genérico;
- usar gate fechado;
- usar outro `PRODUCT_COMMITMENT`;
- omitir `gate_id`;
- permitir edição manual de `gate_id`;
- permitir edição manual de `version`.

O servidor continua responsável pela revalidação final.

## 4. Preservar fail-closed

A correção vale somente para adapters/workflows legados explicitamente declarados que realmente suportam esta capability.

Não transformar workflows legados desconhecidos em acionáveis.

Não inferir capabilities por nomes iguais de estado.

Não promover `PROJECT_DISCOVERY v3` para workflow current.

## 5. Corrigir o resumo `next_action`

Quando existir um gate legado aberto `PRODUCT_COMMITMENT` e a projeção possuir o descriptor autorizado correspondente, `next_action` não deve retornar `null`.

O resumo deve comunicar a parada real, por exemplo:

```text
Decisão pendente no gate PRODUCT_COMMITMENT.
```

E, quando autorizado:

```text
descriptor_code = PRODUCT_COMMITMENT_DECISION
```

A derivação deve usar fatos persistidos do gate + descriptor publicado no mesmo snapshot. Não inferir apenas de `project.state`.

## 6. UI-02 continua genérica

A UI não deve ganhar:

- opção `APPROVED` hardcoded para PRODUCT_COMMITMENT;
- endpoint hardcoded;
- payload especial montado por `if (descriptor.code === ...)`;
- leitura de schema antigo paralela a `input_binding.fields`.

O renderer deve continuar obedecendo:

```text
projection.allowed_actions
→ descriptor.input_binding.fields
→ buildActionPayload(...)
→ descriptor.command.href
```

Se o descriptor estiver correto, a UI deve renderizar a combo corretamente sem conhecimento especial desse gate.

# Comportamento esperado

## Aprovação

Dado:

```text
PROJECT_DISCOVERY v3
WAITING_FOR_PRODUCT_COMMITMENT
PRODUCT_COMMITMENT OPEN vN
```

quando o principal autorizado selecionar `APPROVED` e executar `PRODUCT_COMMITMENT_DECISION`, o request deve conter o gate e versão exatos e ser aceito pelo endpoint oficial.

A transição seguinte deve continuar sendo determinada pelo workflow persistido. Para v3, não inventar destino na projeção; deixar `transitionTarget(...)` e o workflow oficial determinarem o estado seguinte.

## Rejeição / solicitação de ajustes

Quando selecionar `REJECTED`, o payload deve usar `feedback` e o endpoint deve manter sua validação existente de feedback obrigatório para não aprovação.

O fluxo de retorno/rework existente deve permanecer inalterado.

# Escopo provável de código

Inspecionar antes de modificar:

```text
naamive/runtime/node-web/src/state-action-projection.ts
naamive/runtime/node-web/web/index.html
naamive/runtime/node-web/web/action-payload.js
naamive/runtime/node-web/src/server.ts
naamive/runtime/node-web/src/workflow.ts
naamive/runtime/node-web/migrations/
naamive/runtime/node-web/src/*ui*.test.ts
naamive/runtime/node-web/src/*.e2e.test.ts
```

A correção provavelmente deve ficar concentrada em:

```text
state-action-projection.ts
testes focados
```

Modificar frontend ou endpoint somente se a inspeção provar necessidade.

Não criar endpoint paralelo.

Não alterar semanticamente migration já publicada.

# Estratégia sugerida

Criar uma adaptação explícita equivalente conceitualmente a:

```text
legacyProductCommitmentDecisionSchema(gateId)
```

contendo:

```text
gate_id
version
decision [APPROVED, REJECTED]
feedback
```

e usar bindings server-bound/human-input compatíveis com `/decision`.

Também publicar `decision_options` coerentes para apresentação/explicabilidade.

Evitar reutilizar `gateDecisionSchema(...)` para gates legados quando ele depende de `allowed_decisions` provenientes de `gate_records`.

A implementação final pode escolher outra estrutura se preservar exatamente os invariantes acima.

# Testes obrigatórios

## A. Projeção de PRODUCT_COMMITMENT v3

Preparar em banco descartável um projeto realista em:

```text
PROJECT_DISCOVERY v3
WAITING_FOR_PRODUCT_COMMITMENT
```

com gate legado:

```text
PRODUCT_COMMITMENT
OPEN
version = N
```

e principal HUMAN autorizado.

Validar que `allowed_actions` contém exatamente um descriptor aplicável com:

```text
code = PRODUCT_COMMITMENT_DECISION
target.resource_kind = GATE
target.resource_id = gate.id
command.href = /api/projects/:projectId/decision
command.method = POST
```

## B. Opções de decisão

Validar que o campo `decision` contém:

```text
APPROVED
REJECTED
```

e não está vazio.

## C. Binding do payload

Validar:

```text
gate_id  = SERVER_BOUND / send=true / editable=false / valor exato
version  = SERVER_BOUND / send=true / editable=false / valor exato
decision = HUMAN_INPUT / send=true / editable=true
feedback = HUMAN_INPUT / send=true / editable=true
```

Validar ausência de binding incorreto `reason` e ausência de `evidence` humano para este comando, salvo evidência arquitetural explícita que demonstre necessidade.

## D. Execução real do descriptor

Usar o mesmo `buildActionPayload(...)` consumido pela UI ou um E2E equivalente.

Executar `APPROVED` pelo `descriptor.command.href`.

Validar:

- request aceito;
- gate deixa `OPEN`;
- gate fica `APPROVED`;
- evento correspondente é persistido;
- projeto avança conforme workflow;
- nenhuma montagem manual de endpoint/payload no teste.

## E. Rejeição

Executar cenário separado com `REJECTED` e `feedback` válido.

Validar:

- endpoint aceita;
- gate fica `REJECTED`;
- retorno de lifecycle é o existente;
- feedback é persistido/registrado conforme contrato atual.

Também validar que `REJECTED` sem feedback continua sendo rejeitado pelo servidor.

## F. Snapshot stale / segurança

Cobrir ao menos:

- `gate_id` incorreto;
- `version` stale;
- gate já fechado;
- principal sem `OPERATE_PROJECT`;
- workflow legado desconhecido;
- estado onde adapter não declara `PRODUCT_COMMITMENT_DECISION`.

Todos devem permanecer fail-closed.

## G. `next_action`

No snapshot com gate `PRODUCT_COMMITMENT` aberto, `next_action.text` deve indicar decisão pendente.

Quando o principal tiver autoridade:

```text
next_action.descriptor_code = PRODUCT_COMMITMENT_DECISION
```

Sem autoridade, pode existir explicação da espera, mas não capability executável.

## H. Renderer UI-02

Cobrir que o renderer genérico recebe o descriptor corrigido e produz select com as opções publicadas.

Não adicionar special case de `PRODUCT_COMMITMENT_DECISION` no frontend.

# Validação ampla

Depois dos testes focados:

```bash
npm run build
npm test
npm run e2e
```

e demais verificações relevantes do runtime.

Cumprir TST-02:

```text
NENHUM teste PostgreSQL pode usar o banco runtime/manual `naamive`.
```

Todos os testes PostgreSQL devem usar bancos descartáveis `naamive_test_*` / `naamive_e2e_*`, com cleanup inclusive em falha.

Não usar o Codex real nos testes automatizados.

Não deixar worker real consumir fixtures automatizadas.

Comparar qualquer falha agregada apenas contra baselines históricas já autorizadas; não promover falha nova a baseline.

# Preservação do manual E2E atual

O projeto manual existente é evidência do finding e deve ser preservado:

```text
project_id = financas-familiares-lab-1
workflow   = PROJECT_DISCOVERY v3
state      = WAITING_FOR_PRODUCT_COMMITMENT
gate       = PRODUCT_COMMITMENT OPEN
```

Não limpar, recriar ou modificar esse projeto por scripts de teste.

Após a correção, o objetivo é retomar o smoke no MESMO gate aberto.

Com o servidor atualizado, a UI deve voltar a projetar a mesma parada com:

```text
PRODUCT_COMMITMENT_DECISION
decision:
  - APPROVED
  - REJECTED
```

e payload executável.

O worker pode permanecer independente dessa decisão humana; não criar automação que atravesse o gate sem ação humana.

# Critérios de aceite

A task só está concluída quando todos forem verdadeiros:

- [ ] `PRODUCT_COMMITMENT_DECISION` continua vindo do adapter legado explícito.
- [ ] O select de decisão não fica vazio.
- [ ] `APPROVED` é publicado.
- [ ] `REJECTED` é publicado.
- [ ] `gate_id` correto é enviado server-bound.
- [ ] `version` correta é enviada server-bound.
- [ ] O payload usa `feedback`, não `reason`.
- [ ] Não há `evidence` humano incompatível com o endpoint legado.
- [ ] A aprovação funciona via descriptor + renderer genérico.
- [ ] A rejeição com feedback funciona.
- [ ] Rejeição sem feedback continua falhando corretamente.
- [ ] Gate stale/fechado continua protegido.
- [ ] Autorização continua project-scoped.
- [ ] Unknown legacy continua read-only fail-closed.
- [ ] `next_action` deixa de indicar ausência de ação quando o gate está esperando decisão.
- [ ] Não há botão/opção/endpoint hardcoded no frontend.
- [ ] Testes PostgreSQL usam banco descartável.
- [ ] Aggregate não introduz regressão nova.
- [ ] O banco runtime/manual `naamive` não é usado nem limpo por testes.

# Não fazer

Não:

- editar migrations publicadas para mascarar o problema;
- preencher `allowed_decisions` genericamente para todo gate legado sem provar contrato;
- transformar todos os gates legados em gates GAT-01;
- criar endpoint paralelo;
- hardcodar `APPROVED` / `REJECTED` no frontend;
- montar `gate_id` no navegador por conhecimento externo ao descriptor;
- enfraquecer validação de `gate_id` ou `version` no servidor;
- remover exigência de feedback para não aprovação;
- promover `PROJECT_DISCOVERY v3` para workflow current;
- alterar sem necessidade o fluxo v4;
- executar testes PostgreSQL contra `naamive`;
- apagar o projeto manual atual;
- rodar `git reset`, `git clean`, `rebase`, `merge`;
- fazer commit ou push automaticamente.

# Evidência esperada no retorno do agente

Ao concluir, informar:

1. causa raiz confirmada;
2. arquivos modificados;
3. contrato final do descriptor `PRODUCT_COMMITMENT_DECISION`;
4. como `gate_id`, `version`, `decision` e `feedback` são bindados;
5. teste de `APPROVED`;
6. teste de `REJECTED`;
7. teste de rejeição sem feedback;
8. teste de gate stale/fechado;
9. teste de autorização/fail-closed;
10. teste de `next_action`;
11. resultado de build;
12. resultado dos testes focados;
13. resultado do aggregate E2E com contagens exatas;
14. nomes dos bancos descartáveis criados/removidos, se disponíveis;
15. confirmação explícita de que o banco runtime `naamive` não foi usado por testes;
16. confirmação explícita de que o projeto manual `financas-familiares-lab-1` não foi alterado pelos testes;
17. `git diff --check`;
18. `git status --short`;
19. confirmação de que não houve commit/push/reset/clean/rebase/merge.

Não declarar PASS se houver regressão nova.
