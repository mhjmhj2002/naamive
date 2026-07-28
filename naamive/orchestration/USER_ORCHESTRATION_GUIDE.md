# Guia de Execução da Orquestração

Este documento define a interface de linha de comando canônica e as regras de uso. A implementação inicial está em Python, em `naamive/runtime/python/`, e preserva este contrato.

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
naamive orchestrate --project <project-id>
```

O orquestrador resolve exclusivamente `projects/<project-id>/`, valida o `STATUS.md`, a máquina de estado, o contexto e o próximo trabalho autorizado. Ele executa controles automatizados e revisões independentes possíveis e para em `WAITING_FOR_GATE` quando houver decisão humana exigida.

Em `ANALYSIS`, ele despacha `business-analysis` para `analysis/business/`, exige evidência nesse caminho e, após a revisão independente automatizada, registra `ANALYSIS → DEFINITION`. Em `DEFINITION`, despacha `domain-modeling` para `analysis/domain/` e para no gate humano `PRODUCT_COMMITMENT`; não infere a decisão nem materializa módulos antes dela. Os registros da própria plataforma ficam centralizados em `naamive/registries/orchestration/<project-id>/` (execuções, solicitações e decisões); o projeto contém somente os seus artefatos de produto e estado.

Após a proposta, a autoridade humana seleciona explicitamente o módulo de capacidade e registra o compromisso. A aprovação materializa o módulo em `IDENTIFIED` e avança o projeto para `ARCHITECTURE`:

```text
naamive decide --project <project-id> --gate PRODUCT_COMMITMENT --decision APPROVED --module <module-id> --module-title "<capacidade de negócio>"
```

Itens de trabalho só podem ser criados durante o planejamento de um módulo, em `planning/work-items/`, com escopo, critérios e autorização explícitos:

```text
naamive create-work-item --project <project-id> --module <module-id> --work-item <work-item-id> --title "<trabalho autorizado>" --objective "<objetivo>" --write-scope modules/<module-id>/applications/<alvo> --priority HIGH --ready-criterion "<critério>" --expected-evidence modules/<module-id>/tests/<evidência> --authorization <decisão-ou-plano>
```

O consumo de um módulo de outro projeto é registrado no módulo consumidor, por referência de contrato; esse comando nunca concede escrita no módulo provedor:

```text
naamive register-module-consumption --consumer-project <projeto-consumidor> --consumer-module <módulo-consumidor> --provider-project <projeto-provedor> --provider-module <módulo-provedor> --contract-reference modules/<módulo-provedor>/documentation/<contrato> --compatible-version "<versão>" --business-purpose "<finalidade>" --integration-owner "<responsável>" --impact-and-risk "<risco>"
```

## Despacho explícito de agente Codex

O runtime usa o modelo padrão suportado pela conta autenticada no Codex CLI, com raciocínio `low`. Isso evita fixar um identificador de modelo indisponível para a forma de autenticação atual. Cada execução deve indicar projeto, agente oficial, work item e caminho relativo autorizado:

```text
naamive run-agent --project <project-id> --agent business-analysis --work-item <work-item-id> --target analysis/business
```

O adaptador entrega apenas a necessidade aprovada, instrui o agente a respeitar seus contratos e rejeita alterações novas fora de `target`. Ele não muda estado, cria módulo, aprova gate ou faz commit: essas ações continuam sendo responsabilidade da orquestração e da autoridade humana.

Para uma conta com acesso a um modelo específico no Codex CLI, a substituição é explícita e não fica gravada no repositório:

```text
NAAMIVE_CODEX_MODEL=<modelo-compativel> naamive run-agent ...
```

Não é permitido inferir projeto pelo diretório atual, por nome de branch ou por texto do comando.

## Nova necessidade de projeto

Crie a solicitação a partir do template:

```text
naamive init-project-request --request-id <request-id>
```

O comando materializa somente:

```text
naamive/registries/project-intake/<request-id>/PROJECT_REQUEST.md
```

Preencha-o conforme o [contrato de entrada](../contracts/PROJECT_INTAKE.md) e envie para validação:

```text
naamive orchestrate --request <request-id>
```

Se não houver `--project` nem `--request`, o orquestrador não cria artefatos ambíguos e retorna instruções para criar uma solicitação. Se o documento estiver ausente, inválido, incompleto ou contiver decisão técnica, a execução termina em `REJECTED`.

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
