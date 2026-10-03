# Status do Item de Trabalho

## Finalidade

Este é o catálogo oficial e a única fonte normativa dos Status da entidade **Item de Trabalho**.

Status responde à pergunta:
> Onde o Item de Trabalho está no seu ciclo de vida técnico?

Ele não se confunde com Resultado do Processo, atividade momentânea, fila de mensagens ou decisão humana isolada.

## Catálogo Oficial de Status

| Status | Definição |
| --- | --- |
| `CRIADO` | O Item de Trabalho foi materializado no repositório pelo Especialista em Planejamento da Realização com escopo e critérios técnicos definidos, mas ainda possui dependências técnicas não satisfeitas ou aguarda início do fluxo. |
| `PRONTO_PARA_EXECUCAO` | As dependências prévias foram satisfeitas e o Item de Trabalho está imediatamente apto a ser assumido por um Engenheiro de Software. |
| `EM_EXECUCAO` | Um Engenheiro de Software assumiu o item e está ativamente implementando código, configurações ou testes automatizados locais. |
| `BLOQUEADO` | A execução do item foi interrompida devido a impedimento técnico, ambiguidade de contrato ou dependência não resolvida, aguardando resolução causal. |
| `CONCLUIDO` | A execução técnica foi concluída com sucesso, com todos os critérios técnicos de aceitação comprovados por testes automatizados locais satisfatórios e evidências registradas. |
| `CANCELADO` | Status terminal excepcional decorrente do cancelamento da Entrega de Valor proprietária ou de replanejamento técnico justificado. |

## Fluxo Normativo de Transição

```text
CRIADO
  ↓ (dependências satisfeitas)
PRONTO_PARA_EXECUCAO
  ↓ (início da implementação pelo Engenheiro de Software)
EM_EXECUCAO
  ↓ (sucesso nos testes e critérios técnicos)
CONCLUIDO
```

### Transições de Exceção

```text
EM_EXECUCAO → BLOQUEADO (ao registrar EXECUCAO_IMPEDIDA)
BLOQUEADO → PRONTO_PARA_EXECUCAO (após resolução do impedimento pelo Planejamento ou Formação)
CRIADO / PRONTO_PARA_EXECUCAO / EM_EXECUCAO / BLOQUEADO → CANCELADO (por cancelamento da EV ou replanejamento)
```

## O que NÃO é Status do Item de Trabalho

Não são Status do Item de Trabalho:
* `EXECUCAO_CONCLUIDA`, `EXECUCAO_IMPEDIDA` (são Resultados do Processo);
* `REALIZACAO_INTEGRADA`, `REALIZACAO_INSUFICIENTE` (são Resultados do Processo da etapa de integração);
* `FORMADA`, `EM_REALIZACAO`, `CONCLUIDA` (são Status da Entrega de Valor);
* `EM_TESTE`, `EM_REVISAO`, `EM_CODE_REVIEW`, `EM_DEPLOY` (etapas ou atividades procedimentais internas de implementação);
* Decisão humana, Débito de Governança ou evidência isolada.
