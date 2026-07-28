---
document_type: orchestration-end-to-end-backlog
status: IN_PROGRESS
last_updated_at: 2026-07-28
completed_phases: [1, 2, 3, 4]
current_phase: 5
next_action: Orquestrar arquitetura, planejamento e implementação somente para work items autorizados de módulos planejados.
---

# Backlog de Orquestração Ponta a Ponta

Este documento acompanha o que falta para o runtime global do NAAMIVE conduzir uma necessidade aprovada até uma entrega aceita. Ele pertence à plataforma, em `naamive/`, e não a qualquer projeto em `projects/`.

## Como atualizar

- Ao iniciar uma fase, alterar seu estado para `IN_PROGRESS` e atualizar `current_phase`, `next_action` e `last_updated_at` no front matter.
- Ao concluir uma fase, marcar `DONE`, registrar a evidência verificável e incluir seu número em `completed_phases`.
- Uma fase só é `DONE` quando seus critérios de aceite passam em testes automatizados; implementação parcial permanece `IN_PROGRESS`.
- Não usar este arquivo para registrar estado ou decisões de um projeto de produto.

## Estado consolidado

| Fase | Estado | Resultado esperado |
| --- | --- | --- |
| 0. Intake, registro, cancelamento e exclusão | `DONE` | Necessidade validada pode originar projeto; cancelamento e exclusão seguem controles. |
| 1. Motor de estados e auditoria | `DONE` | Transições válidas de projeto e módulo são aplicadas por um único motor auditável. |
| 2. Execução de análise e definição | `DONE` | Agentes geram evidência verificável para análise, domínio e requisitos. |
| 3. Gates e decisões humanas | `DONE` | Gates persistem decisões, retomam/rejeitam/retrabalham sem inferência. |
| 4. Módulos e work items | `DONE` | Capacidades aprovadas e seus work items obedecem à propriedade estrutural. |
| 5. Arquitetura, planejamento e implementação | `IN_PROGRESS` | O fluxo avança somente com planos, riscos e itens autorizados. |
| 6. Integração, validação e entrega | `NOT_STARTED` | Evidências integradas culminam em aceite humano de entrega. |
| 7. Robustez e prova ponta a ponta | `NOT_STARTED` | Testes cobrem sucesso, falha, rework, pausa, cancelamento e exclusão. |

## Fase 1 — Motor de estados e auditoria

**Estado:** `DONE`

### Progresso registrado

- Grafo declarativo de transições de projeto e módulo implementado no runtime.
- Motor único passou a validar origem, destino, tipo de controle, pausa/retomada e compatibilidade entre o estado do módulo e do projeto.
- Solicitações de transição e decisões aprovadas são registradas centralmente; eventos de execução não sobrescrevem fatos anteriores.
- O ciclo `RECEIVED → … → terminal` agora é validado como stream de eventos; execuções interrompidas em despacho ou revisão podem ser encerradas em `REWORK_REQUIRED` pelo comando `recover-execution`.
- Locks por projeto/módulo protegem a aplicação de uma transição contra atualizações concorrentes; `expected_state` e `idempotency_key` permitem detectar estado obsoleto e repetir uma solicitação sem duplicá-la.
- Testes de transição inválida, pausa/retomada, limite projeto–módulo e recuperação de execução foram adicionados.
- `cancel` foi integrado ao motor único: preserva `CANCELLATION.md` no projeto e gera solicitação de transição e decisão humana nos registros centrais.
- Smoke test isolado do motor passou em 28 de julho de 2026.
- Ambiente virtual local `.venv` preparado com o runtime e dependências de desenvolvimento; a suíte `python -m pytest naamive/tests/runtime_python -q` passou com **11 testes** em 0,53 s em 28 de julho de 2026.
- Schemas versionados de registros de auditoria foram definidos em `naamive/schemas/orchestration/` e validados pelo runtime antes de persistência.
- Cobertura de idempotência, estado divergente, concorrência por lock, recuperação de execução, cancelamento e exclusão coordenada foi adicionada.
- A suíte `python -m pytest naamive/tests/runtime_python -q` passou com **14 testes** em 0,86 s em 28 de julho de 2026.

### Capacidades concluídas

- Grafo integral das máquinas de estado de projeto e módulo, incluindo pausa, retomada, cancelamento, retrabalho, entrega e evolução.
- API única para validar, registrar e aplicar transições de projeto e módulo; o cancelamento também a utiliza.
- Stream append-only de execução com todos os estados previstos, recuperação explícita para `REWORK_REQUIRED` e comando `recover-execution`.
- Schemas de auditoria v1 em `naamive/schemas/orchestration/` e validador de runtime para eventos, solicitações, decisões e índices de idempotência.
- Registros centralizados em `naamive/registries/orchestration/<project-id>/`, com eventos, solicitações, decisões, índices e locks por escopo.
- Proteções contra duplicação por chave de idempotência, atualização obsoleta por `expected_state` e transições simultâneas por lock de escopo.
- Exclusão definitiva coordenada do projeto, intake e registros centrais, após validação contra links simbólicos.

### Critérios de aceite

- Testes rejeitam toda transição fora da máquina aplicável.
- Testes confirmam que um módulo não ultrapassa o estado permitido pelo projeto.
- Toda alteração de `STATUS.md` possui solicitação, decisão e entrada no histórico rastreáveis.
- Falha, evidência ausente ou estado divergente não altera o estado de projeto ou módulo.
- O mesmo pedido repetido é idempotente e não duplica estado nem histórico.
- Uma execução interrompida possui resolução determinística e auditável.
- Cancelamento, pausa e retomada usam as mesmas validações de transição que o fluxo normal.

## Fase 2 — Execução de análise e definição

**Estado:** `DONE`

### Progresso registrado

- O runtime despacha `business-analysis` em `ANALYSIS` e exige `analysis/business/BUSINESS_ANALYSIS.md` com seções de negócio e metadados de rastreabilidade.
- `governance-assurance` revisa a análise em execução separada; somente uma revisão com critérios declarados e resultado `APPROVED` permite `ANALYSIS → DEFINITION`.
- Em `DEFINITION`, o runtime despacha separadamente `domain-modeling`, `requirements-engineering` e a revisão independente de definição.
- A proposta de módulo rejeita candidatos técnicos conhecidos; requisitos, proposta e revisões devem conter `execution_id`, escopo, fonte, responsável, data, premissas e lacunas.
- Teste determinístico cobre `ANALYSIS → DEFINITION` e a parada em `PRODUCT_COMMITMENT`.
- Evidência ausente, incompleta, não vinculada à execução ou reprovada por revisão resulta em `REWORK_REQUIRED` sem transição de projeto.
- Teste cobre rejeição de candidato técnico de módulo e a suíte possui **17 testes verdes** em 1,12 s em 28 de julho de 2026.

### Falta implementar

- Despachar `business-analysis`, `domain-modeling` e `requirements-engineering` com contexto e despacho completos.
- Validar conteúdo e vínculo das evidências aos critérios da transição; presença de arquivo não é evidência suficiente.
- Exigir revisão independente por papel distinto antes de `ANALYSIS → DEFINITION`.
- Produzir proposta rastreável de módulos candidatos, sem materializar módulos nem decidir escopo automaticamente.

### Sequência operacional esperada

1. Criar contexto de análise com a necessidade aprovada, fontes permitidas, objetivo, limites e saída esperada.
2. Despachar `business-analysis` para produzir entendimento de problema, valor, stakeholders, fluxos, regras iniciais, restrições, incertezas e métricas.
3. Despachar revisão independente (`governance-assurance` ou papel definido) para verificar a evidência contra critérios declarados, sem reescrever a análise.
4. Aplicar `ANALYSIS → DEFINITION` somente após decisão independente favorável.
5. Em `DEFINITION`, despachar `domain-modeling` e `requirements-engineering` em execuções separadas, com entradas e saídas explícitas.
6. Consolidar uma proposta de capacidade e módulos candidatos, com justificativa de fronteira de negócio, dependências, riscos, alternativas e questões abertas.
7. Criar solicitação para o gate de compromisso de produto; a proposta não pode criar diretórios de módulo.

### Regras de evidência

- Cada evidência deve declarar origem, autor/responsável, data, `execution_id`, escopo, pressupostos, lacunas e referência à necessidade aprovada.
- O runtime deve validar arquivos obrigatórios e seções mínimas por atividade; documentos vazios, de outro escopo ou sem rastreabilidade não satisfazem um gate.
- A análise não pode introduzir uma decisão de tecnologia como requisito de negócio; conflitos devem ser registrados como questão aberta ou risco.
- Uma revisão independente deve ser feita por papel diferente do produtor da evidência e registrar os critérios verificados.

### Critérios de aceite

- O resultado de cada agente é associado a `execution_id`, `dispatch_id`, item autorizado e artefatos produzidos.
- Evidência incompleta ou fora do alvo resulta em `REWORK_REQUIRED` sem transição.
- A transição para `DEFINITION` é possível somente após revisão independente aprovada.
- Uma proposta de módulo identifica capacidades de negócio, e testes rejeitam candidatos técnicos como `backend`, `database` ou `frontend`.
- Uma análise reprovada pode retornar a `REWORK_REQUIRED` sem apagar evidências anteriores.

## Fase 3 — Gates e decisões humanas

**Estado:** `DONE`

### Progresso registrado

- `PRODUCT_COMMITMENT` agora abre uma solicitação de transição pendente, mantém sua referência no status e exige decisão humana vinculada à solicitação.
- `APPROVED` registra decisão contratual, materializa o módulo explicitamente selecionado e aplica `DEFINITION → ARCHITECTURE`; `REJECTED` e `REWORK_REQUIRED` registram decisão sem alterar o estado do projeto.
- Decisões obsoletas ou sem solicitação pendente válida são rejeitadas pelo runtime.
- Teste determinístico cobre o compromisso aprovado e a vinculação entre gate, solicitação e decisão; a suíte possui **18 testes verdes** em 1,33 s em 28 de julho de 2026.
- Gates condicionais `MATERIAL_ARCHITECTURE_DECISION`, `RESIDUAL_RISK_ACCEPTANCE`, `DELIVERY_ACCEPTANCE` e `PAUSE` podem ser abertos por `request-gate` e resolvidos por `decide` com o mesmo registro auditável.
- Uma decisão aprovada aplica apenas a transição pendente correspondente; teste cobre o gate arquitetural aprovado e a suíte possui **19 testes verdes** em 1,42 s em 28 de julho de 2026.
- Restam testes explícitos para `REJECTED`, `REWORK_REQUIRED` e solicitação obsoleta em todos os gates condicionais.
- Decisões `REJECTED` e `REWORK_REQUIRED` de todos os gates condicionais preservam o estado, registram a decisão contratual e deixam uma próxima ação explícita no status.
- Gates condicionais são aceitos apenas na transição declarada; transições diretas ficam bloqueadas enquanto um gate estiver pendente, e solicitações obsoletas não geram decisão nem alteram estado.
- A suíte `./.venv/bin/python -m pytest naamive/tests/runtime_python -q` passou com **25 testes** em 28 de julho de 2026.

### Falta implementar

- Implementar decisões `APPROVED`, `REJECTED` e `REWORK_REQUIRED` para todos os gates humanos previstos.
- Registrar decisões em formato contratual conforme `GATE_DECISION.md`, com autoridade, justificativa, evidências e data.
- Implementar compromisso de produto, decisão arquitetural material, risco residual, pausa, cancelamento e aceite de entrega quando aplicáveis.
- Impedir retomada ou nova execução enquanto houver gate pendente incompatível.

### Catálogo mínimo de gates

| Gate | Momento | Decisor | Efeito aprovado |
| --- | --- | --- | --- |
| `REGISTER_PROJECT` | Pré-projeto | Autoridade humana | Materializa projeto em `ANALYSIS`. |
| `PRODUCT_COMMITMENT` | `DEFINITION → ARCHITECTURE` | Autoridade humana | Autoriza escopo, investimento e materialização dos módulos selecionados. |
| `MATERIAL_ARCHITECTURE_DECISION` | Quando houver decisão material | Autoridade humana | Autoriza exceção ou escolha arquitetural relevante. |
| `RESIDUAL_RISK_ACCEPTANCE` | Validação/entrega com risco relevante | Autoridade humana | Aceita risco residual explicitamente descrito. |
| `DELIVERY_ACCEPTANCE` | `DELIVERY → DELIVERED` | Autoridade humana | Aceita resultado, operação e handover. |

### Comportamento por decisão

- `APPROVED`: gera decisão assinada/identificada, aplica somente a transição solicitada e encerra a execução.
- `REWORK_REQUIRED`: preserva o estado do escopo, registra motivos e critérios faltantes, e cria uma próxima execução elegível.
- `REJECTED`: preserva estado e evidências, fecha a solicitação e exige uma nova proposta para novo avanço.
- `PAUSED` e `CANCELLED`: exigem motivo humano, evidência e estado anterior para possível retomada quando aplicável.
- Uma decisão deve verificar que a solicitação ainda aponta para o estado atual; decisão sobre transição obsoleta é rejeitada.

### Critérios de aceite

- Cada decisão humana é auditável e vinculada a uma solicitação de transição.
- Rejeição e retrabalho preservam estado e deixam uma próxima ação explícita.
- Nenhuma aprovação humana é inferida pelo runtime ou agente.
- Gates pendentes impedem nova transição incompatível e sobrevivem a reinício do processo.
- Decisão enviada para solicitação obsoleta não altera estado nem materializa artefatos.

## Fase 4 — Módulos e work items

**Estado:** `DONE`

### Falta implementar

- Materializar módulo aprovado com a árvore canônica mínima de módulo e status completo.
- Criar work items somente no planejamento do módulo, com objetivo, limites, prioridade, critérios de pronto e rastreabilidade à necessidade.
- Implementar execução e transições de módulo de `IDENTIFIED` até `DELIVERED`.
- Aplicar contratos de consumo de módulos reutilizáveis sem permitir escrita no módulo provedor por projeto consumidor.

### Progresso registrado

- Módulos materializados possuem árvore canônica, status versão 2 completo, histórico inicial e vínculo à decisão de compromisso de produto.
- Work items são criados exclusivamente em `planning/work-items/`, com objetivo, escopo de escrita, dependências, prioridade, critérios de pronto, evidências esperadas e autorização.
- Contextos de execução de módulo validam módulo, estado atual, compatibilidade com o projeto, alvo contido no módulo e work item autorizado antes de persistir o despacho.
- O registro de consumo é criado apenas no módulo consumidor e referencia o contrato do provedor sem conceder caminho de escrita no provedor.
- A suíte `./.venv/bin/python -m pytest naamive/tests/runtime_python -q` passou com **28 testes** em 28 de julho de 2026.

### Materialização canônica

- Criar apenas os diretórios necessários, mas usar os proprietários previstos no modelo: `need/`, `domain/`, `requirements/`, `planning/`, `architecture/`, `state-machine/`, `applications/`, `tests/`, `evidence/`, `documentation/` e `delivery/` quando autorizados.
- O status inicial do módulo deve conter todos os campos do contrato de status, histórico inicial e vínculo à decisão de compromisso de produto.
- Work items devem existir sob o planejamento do módulo — por exemplo, `planning/work-items/<work-item-id>.md` — e não em estrutura paralela no projeto.
- Cada work item deve possuir identificador estável, objetivo, escopo de escrita, dependências, prioridade proposta, critérios de pronto, evidências esperadas, estado e referência à necessidade/decisão que o autorizou.

### Regras de execução de módulo

- Um contexto de módulo deve sempre conter `module_id`, alvo sob o módulo e work item existente e autorizado.
- O runtime deve checar antes de cada execução se o módulo e projeto estão em estados compatíveis; a compatibilidade deve ser validada também no destino da transição.
- O módulo provedor publica somente contratos/versionamento no catálogo global; o projeto consumidor registra consumo, mas não recebe caminho de escrita no provedor.
- Cancelamento de módulo não cancela automaticamente o projeto; o impacto deve ser registrado e avaliado no escopo do projeto.

### Critérios de aceite

- Não é possível criar work item fora de módulo ou diretamente no projeto.
- Não é possível iniciar módulo em implementação antes de o projeto chegar a `IMPLEMENTATION`.
- Testes cobrem isolamento entre módulos e consumo por contrato.
- Testes confirmam que o caminho de um work item está sob `modules/<module-id>/planning/`.
- Um módulo materializado possui status e histórico válidos antes de aceitar qualquer despacho.

## Fase 5 — Arquitetura, planejamento e implementação

**Estado:** `IN_PROGRESS`

### Progresso registrado

- O executor agora possui uma iteração Git controlada para despachos de implementação: deriva a branch canônica do projeto/módulo e work item, exige base autorizada, recusa árvore de trabalho previamente alterada, troca ou cria somente a branch canônica e nunca trabalha em `main`.
- Ao concluir a execução, o runtime exige commit novo, diff inteiramente contido em `allowed_write_paths` e árvore sem alterações pendentes; branch e hash do commit retornam no resultado auditável.
- Testes isolados cobrem criação e reutilização de branch canônica, alteração prévia fora do escopo e commit com caminho não autorizado.
- Work items agora possuem ciclo de vida explícito (`AUTHORIZED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`) e dependências estáveis no formato `module-id/work-item-id`; o planejamento bloqueia o avanço enquanto qualquer predecessor não estiver `COMPLETED`.
- O despacho `implementation` de módulo valida estado do projeto e módulo, work item autorizado, predecessores completos, escopo de escrita e evidências esperadas; ele usa a iteração Git controlada e conclui o work item somente após a evidência exigida.

### Falta implementar

- Despachos de `solution-architecture`, `delivery-planning` e `implementation` para os estados e escopos corretos.
- Registro de decisões arquiteturais, integrações, riscos, dependências, plano de entrega e work items autorizados.
- Controles de `ARCHITECTURE → PLANNING`, `PLANNING → IMPLEMENTATION` e transições equivalentes de módulo.
- Aplicação das políticas de branch, autorização de escrita e evidência automatizada sem permitir commits pelo orquestrador em `main`.

### Fluxo por estado

- `ARCHITECTURE`: `solution-architecture` produz arquitetura de produto, decisões, integrações, impactos e decisões materiais pendentes.
- `PLANNING`: `delivery-planning` produz roadmap, releases, riscos, dependências, ordem de work items e critérios de pronto.
- `IMPLEMENTATION`: somente work items planejados podem despachar `implementation`; cada despacho deve apontar para um módulo e caminhos de aplicação explicitamente autorizados.
- O runtime deve separar artefatos transversais de projeto (integração, decisões de produto, riscos globais) de artefatos internos do módulo.

### Controles necessários

- Revisão independente de arquitetura e planejamento, com critérios explícitos para decisões materiais.
- Validação automatizada de que todo work item está aprovado, não bloqueado e compatível com o estado do módulo e projeto.
- Registro de dependências entre work items e bloqueio de itens cujo predecessor ainda não atingiu a condição necessária.
- Verificação de branch e mudanças no repositório antes de aceitar evidência de implementação; o agente não pode criar dependências, credenciais ou alterações fora do escopo autorizado sem nova decisão.

### Critérios de aceite

- Implementação só é despachada para work item de módulo aprovado e planejado.
- Plano incompleto, risco não tratado ou dependência não resolvida bloqueia avanço.
- Mudanças fora do caminho autorizado são rejeitadas e auditadas.
- Uma transição de planejamento para implementação falha se não houver work items autorizados, riscos tratados e revisão independente exigida.
- Um despacho de implementação sem módulo ou sem work item existente é rejeitado antes de executar o agente.

## Fase 6 — Integração, validação e entrega

**Estado:** `NOT_STARTED`

### Falta implementar

- Orquestrar `integration-engineering`, `quality-assurance`, `security-assurance` e `release-operations`.
- Validar contratos, fluxos, requisitos, qualidade, segurança, operação, handover e risco residual.
- Implementar retorno de `VALIDATION` para `IMPLEMENTATION` com achados rastreáveis.
- Implementar `DELIVERY → DELIVERED` somente após aceite humano e evidência de entrega.

### Sequência de encerramento

1. `integration-engineering` verifica contratos publicados, fluxos entre módulos e efeitos em sistemas externos autorizados.
2. `quality-assurance` verifica critérios de aceitação e qualidade; `security-assurance` verifica riscos, evidências e exceções aplicáveis.
3. Achados impeditivos criam ou reabrem work items e solicitam retorno rastreável para implementação; eles não são apagados por uma nova execução.
4. `release-operations` prepara release, implantação, operação, observabilidade e handover no escopo do projeto.
5. O runtime consolida evidências, riscos residuais e estado dos módulos elegíveis para a entrega.
6. A autoridade humana decide `DELIVERY_ACCEPTANCE`; somente aprovação move o projeto para `DELIVERED`.

### Controles de consistência

- O projeto não pode entrar em `DELIVERY` se módulos requeridos não tiverem evidência compatível para entrega ou se a integração estiver pendente.
- Um módulo não pode ser marcado `DELIVERED` fora do controle da entrega do projeto.
- Exceções de segurança, produção ou compliance exigem decisão humana específica e não podem ser mascaradas como aprovação automatizada.

### Critérios de aceite

- Um produto não alcança `DELIVERED` sem evidência de validação, entrega, operação e aceite humano.
- Achados de validação geram retrabalho rastreável sem apagar evidências anteriores.
- Estado de entrega de módulo permanece compatível com o estado de entrega do projeto.
- O pacote de entrega referencia evidências de aceite, qualidade, segurança, operação, handover e risco residual.
- Uma decisão de aceite rejeitada deixa o projeto em `DELIVERY` ou retorna a `VALIDATION`, conforme a decisão registrada.

## Fase 7 — Robustez e prova ponta a ponta

**Estado:** `NOT_STARTED`

### Falta implementar

- Criar suíte de testes de unidade, integração e CLI para cada fase e cada gate.
- Simular o adaptador Codex para testes determinísticos; manter um teste manual controlado para a integração real.
- Cobrir timeouts, falhas do agente, escrita fora do escopo, evidência inválida, execução interrompida, rework, pausa, cancelamento e exclusão.
- Executar um novo projeto de catálogo somente após todos os critérios anteriores passarem.

### Estratégia de teste

- Testes unitários para tabela de transições, validação de escopo, renderização de status, idempotência e regras de compatibilidade projeto–módulo.
- Testes de integração com filesystem temporário para todos os comandos CLI e registros centrais, sem depender de um projeto real do repositório.
- Dublês determinísticos para Codex CLI: sucesso com evidência válida, saída inválida, timeout, falha não zero e escrita fora do alvo.
- Teste de integração opcional do Codex real, isolado e explicitamente autorizado, que não seja pré-requisito para testes determinísticos.
- Matriz de falhas para cada gate: evidência ausente, decisão obsoleta, estado divergente, escopo inválido, módulo incompatível e interrupção entre registro e atualização de status.

### Roteiro do teste de catálogo futuro

1. Criar solicitação limpa de catálogo e obter `REGISTER_PROJECT`.
2. Executar análise, revisão independente, definição e compromisso de produto.
3. Materializar o módulo de catálogo aprovado e criar work items planejados.
4. Percorrer arquitetura, planejamento, implementação, integração, validação e entrega com evidências reais ou dublês controlados.
5. Verificar registros centrais, status/histórico do produto e limites de escrita após cada fase.
6. Cancelar e excluir o projeto de teste somente se ele for descartável e a política de retenção dos registros centrais tiver sido verificada.

### Critérios de aceite

- A suíte automatizada cobre o caminho feliz completo e os principais caminhos de falha.
- Um teste ponta a ponta controlado produz registros auditáveis, sem componentes de orquestração dentro do projeto criado.
- O resultado do teste pode ser cancelado e excluído conforme a política, sem corromper a plataforma.
- A execução do roteiro é reproduzível a partir de um repositório limpo e não requer editar arquivos da plataforma manualmente durante o fluxo.

## Fora de escopo desta implementação

- Alterar a visão do NAAMIVE ou permitir que tecnologia defina módulos.
- Criar componentes globais dentro de projetos de produto.
- Usar projetos piloto como parte estrutural da orquestração.
