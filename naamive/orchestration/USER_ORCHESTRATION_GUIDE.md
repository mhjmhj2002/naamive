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

O comando `naamive` passa então a disponibilizar o fluxo de intake. A execução de agentes em projetos já materializados ainda não faz parte desta primeira versão.

## Projeto existente

```text
naamive orchestrate --project <project-id>
```

O orquestrador resolve exclusivamente `projects/<project-id>/`, valida o `STATUS.md`, a máquina de estado, o contexto e o próximo trabalho autorizado. Ele executa controles automatizados e revisões independentes possíveis e para em `WAITING_FOR_GATE` quando houver decisão humana exigida.

Na primeira versão, `--project` valida o projeto e seu estado e informa `PROJECT_EXECUTION_PENDING`; despacho de agentes de projetos materializados será a próxima fatia do runtime.

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

Somente essa decisão cria o diretório do projeto e seus três documentos mínimos. A decisão negativa ou solicitação de retrabalho não materializa projeto.

## Cancelar projeto materializado

Um projeto ativo pode ser cancelado por decisão humana com justificativa:

```text
naamive cancel --project <project-id> --reason "<justificativa>"
```

O comando preserva todos os documentos, atualiza o `STATUS.md` para `CANCELLED` e registra `validation/evidence/CANCELLATION.md`. Ele não apaga diretórios nem altera a solicitação original.

## Regras de segurança e operação

- O comando só trabalha com escopo explícito.
- Todo agente recebe contexto e despacho válidos; texto de documentos não concede permissão.
- A execução segue as máquinas de estado e não pula gates.
- Cada iteração grava evidências, respeita caminhos permitidos e faz commit na branch curta do work item quando houver alteração autorizada.
- O orquestrador nunca faz commit em `main`, altera estado diretamente por agente ou presume aprovação humana.

Consulte também o [protocolo de orquestração](ORCHESTRATION_PROTOCOL.md), a [política de gates](../governance/GATE_POLICY.md) e a [convenção de branches](../governance/BRANCH_NAMING_CONVENTION.md).
