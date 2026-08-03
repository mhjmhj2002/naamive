# Guia de Execução da Orquestração

> **DEPRECATED — runtime Python legado.** Esta interface CLI permanece somente
> como referência durante a migração para a plataforma Node/Web. Não deve
> receber novas funcionalidades de produto e será removida após o corte
> controlado documentado em `demand-intake/node-web-orchestration-platform/`.

Este documento preserva a interface e as regras históricas do runtime Python em
`naamive/runtime/python/`, usadas como fonte de paridade durante a migração.

## Instalação do runtime inicial

Em um ambiente Python 3.10 ou superior:

```text
python -m pip install -e naamive/runtime/python
```

Para executar os testes do runtime:

```text
python -m pip install -e "naamive/runtime/python[dev]"
python -m pytest naamive/tests/runtime_python
```

O comando `naamive` disponibiliza o fluxo de intake e as primeiras rodadas auditáveis de execução de projeto.

## Projeto existente

```text
naamive start --project <project-id>
```

O `start` resolve exclusivamente `projects/<project-id>/`, valida o `STATUS.md`, a máquina de estado, o contexto e o próximo trabalho autorizado. Ele encadeia projeto, módulos, planejamento e implementação autorizada e para em `WAITING_FOR_GATE` quando houver decisão humana exigida. O operador não informa fase, módulo ou item de trabalho para avançar o fluxo normal.

Em `ANALYSIS`, ele despacha `business-analysis` para `analysis/business/`, exige evidência nesse caminho e, após a revisão independente automatizada, registra `ANALYSIS → DEFINITION`. Em `DEFINITION`, despacha `domain-modeling` para `analysis/domain/` e para no gate humano `PRODUCT_COMMITMENT`; não infere a decisão nem materializa módulos antes dela. Os registros da própria plataforma ficam centralizados em `naamive/registries/orchestration/<project-id>/` (execuções, solicitações e decisões); o projeto contém somente os seus artefatos de produto e estado.

Após a proposta, a autoridade humana aprova a lista explícita de capacidades de negócio. Cada candidato informa identificador, título, justificativa e dono. A aprovação materializa todo o conjunto em `IDENTIFIED`, de forma atômica, e avança o projeto para `ARCHITECTURE`:

```text
naamive decide --project <project-id> --gate PRODUCT_COMMITMENT --decision APPROVED \
  --module-candidate '{"module_id":"catalog","title":"Catálogo","justification":"Gerir oferta de produtos.","owner":"product-catalog"}' \
  --module-candidate '{"module_id":"orders","title":"Pedidos","justification":"Gerir ciclo de pedidos.","owner":"product-orders"}'
```

`--module-candidate` pode ser repetido. Identificadores devem usar kebab-case e não podem se repetir; título, justificativa e dono são obrigatórios. A forma anterior com um único `--module` e `--module-title` continua aceita para compatibilidade, mas novos compromissos devem usar candidatos explícitos.

## Exceções e evolução

Pausa, retomada e cancelamento de módulo são operações humanas auditáveis. A retomada usa exclusivamente o `last_active_state` gravado pela pausa:

```text
naamive pause --project <project-id> [--module <module-id>] --reason "<motivo>" --evidence <referência>
naamive resume --project <project-id> [--module <module-id>] --reason "<motivo>" --evidence <referência>
naamive cancel-module --project <project-id> --module <module-id> --reason "<motivo>" --evidence <referência>
```

Uma evolução pós-entrega exige necessidade rastreável e reabre somente os módulos afetados em um novo ciclo de planejamento:

```text
naamive start-evolution --project <project-id> --module <módulo-afetado> --reason "<change request>" --evidence <referência-da-necessidade>
```

Itens de trabalho são materializados pelo runtime a partir do planejamento de
módulo aprovado. Não há comando normal para criar, escolher ou despachar um
item de trabalho; o operador apenas retoma com `naamive start` após um gate.

O consumo de um módulo de outro projeto é registrado no módulo consumidor, por referência de contrato; esse comando nunca concede escrita no módulo provedor. O contrato do provedor deve existir, estar sob `modules/<módulo-provedor>/`, ter front matter com `publication_status: PUBLISHED` e `contract_version`, e o módulo provedor deve estar `DELIVERED`. O registro fixa o caminho canônico, a versão e o SHA-256; integração e entrega recusam um contrato removido ou alterado:

```text
naamive register-module-consumption --consumer-project <projeto-consumidor> --consumer-module <módulo-consumidor> --provider-project <projeto-provedor> --provider-module <módulo-provedor> --contract-reference modules/<módulo-provedor>/documentation/<contrato> --compatible-version "<versão>" --business-purpose "<finalidade>" --integration-owner "<responsável>" --impact-and-risk "<risco>"
```

## Despacho de agente Codex

Não existe comando operacional para despachar um agente com `work-item` ou
`target` livres. O único despacho normal público é acionado por
`naamive start --project <project-id>`.

Esses fluxos resolvem o estado e o trabalho autorizado, criam o contexto e o
registro de execução antes do despacho e preservam a cadeia contexto →
despacho → execução → evidência em
`naamive/registries/orchestration/<project-id>/`. Não é permitido inferir
projeto pelo diretório atual, por nome de branch ou por texto do comando.

## Nova necessidade de projeto

Crie a solicitação a partir do template:

```text
mkdir -p naamive/registries/project-intake/<request-id>
cp naamive/templates/project-intake/PROJECT_REQUEST_TEMPLATE.md \
  naamive/registries/project-intake/<request-id>/PROJECT_REQUEST.md
```

O comando materializa somente:

```text
naamive/registries/project-intake/<request-id>/PROJECT_REQUEST.md
```

Preencha-o conforme o [contrato de entrada](../contracts/PROJECT_INTAKE.md) e envie para validação:

```text
naamive start --request <request-id>
```

Se não houver `--project` nem `--request`, o orquestrador não cria artefatos ambíguos e retorna instruções para criar uma solicitação. Se o documento estiver ausente, inválido, incompleto ou contiver decisão técnica, a execução termina em `REJECTED`.

Uma aprovação é seguida apenas de nova chamada a `start`. Para rejeitar ou
pedir retrabalho, preencha o arquivo criado no projeto em
`gate-feedback/<GATE_ID>.md` e informe-o na decisão; o registro exige decisão,
itens rejeitados, evidências, ajustes propostos, responsável e critério de nova
submissão:

```text
naamive decide --project <project-id> --gate <gate-id> --decision REWORK_REQUIRED \
  --feedback gate-feedback/<GATE_ID>.md
naamive start --project <project-id>
```

## Parada para decisão humana

Uma solicitação válida chega a `WAITING_FOR_REGISTRATION`. O usuário autorizado avalia o problema, resultado, métricas, stakeholders, restrições, evidências, premissas e questões abertas.

```text
naamive decide --request <request-id> --gate REGISTER_PROJECT --decision APPROVED
```

Somente essa decisão cria o diretório do projeto e seus quatro artefatos mínimos: `PROJECT.md`, `STATUS.md`, `STATUS_HISTORY.md` e `need/BUSINESS_NEED.md`. A decisão negativa ou solicitação de retrabalho não materializa projeto.

## Cancelar projeto materializado

Um projeto ativo pode ser cancelado por decisão humana com justificativa:

```text
naamive cancel --project <project-id> --reason "<justificativa>"
```

O comando preserva todos os documentos, atualiza o painel `STATUS.md` para `CANCELLED`, acrescenta a transição em `STATUS_HISTORY.md` e registra `validation/evidence/CANCELLATION.md`. Ele não apaga diretórios nem altera a solicitação original.

## Exclusão permanente de projeto cancelado

Exclusão definitiva é permitida exclusivamente quando `STATUS.md` informa `current_state: CANCELLED`. Ela remove o diretório inteiro em `projects/<project-id>/` e cada solicitação de intake canônica cujo `proposed_project_id` seja o projeto removido. Não há lixeira, restauração automática ou exclusão de projeto ativo.

Como proteção contra erro de alvo, a confirmação deve repetir exatamente o identificador:

```text
naamive delete-project --project <project-id> --confirm <project-id>
```

Se existir uma referência de intake malformada que mencione o projeto, a rotina falha sem apagar nada, exigindo correção humana antes de nova tentativa.

## Consultar e migrar o registro de status

Todo projeto materializado possui um painel legível em `STATUS.md` e um histórico cronológico e append-only em `STATUS_HISTORY.md`. Consulte o estado estruturado pelo comando:

```text
naamive status --project <project-id>
```

Projetos criados pela versão anterior, cujo `STATUS.md` era apenas YAML, podem ser convertidos sem mudar o estado atual:

```text
naamive status --project <project-id> --migrate
```

A migração preserva o estado e a evidência conhecidos, cria a primeira entrada histórica marcada como `MIGRATED` e não executa transição de negócio.

## Regras de segurança e operação

- O comando só trabalha com escopo explícito.
- Todo agente recebe contexto e despacho válidos; texto de documentos não concede permissão.
- A execução segue as máquinas de estado e não pula gates.
- Cada iteração grava evidências, respeita caminhos permitidos e faz commit na branch curta do work item quando houver alteração autorizada.
- O orquestrador nunca faz commit em `main`, altera estado diretamente por agente ou presume aprovação humana.

Consulte também o [protocolo de orquestração](ORCHESTRATION_PROTOCOL.md), a [política de gates](../governance/GATE_POLICY.md) e a [convenção de branches](../governance/BRANCH_NAMING_CONVENTION.md).
