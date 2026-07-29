# Contrato de Entrada de Projeto

Este contrato governa uma necessidade que ainda não é projeto. Ele impede que a orquestração crie diretórios de produto, despache agentes ou escolha tecnologia sem uma solicitação válida e uma decisão humana de registro.

## Localização e propriedade

Uma solicitação pertence à plataforma enquanto ainda não existe projeto e deve ficar em:

```text
naamive/registries/project-intake/<request-id>/PROJECT_REQUEST.md
```

O modelo é criado a partir de `naamive/templates/project-intake/PROJECT_REQUEST_TEMPLATE.md`. Após a aprovação de registro, a solicitação original permanece como evidência da plataforma; a necessidade normalizada passa a pertencer ao projeto materializado.

## Front matter obrigatório

```text
request_id
proposed_project_id
status
title
business_owner
submitted_by
```

`status` deve ser `DRAFT`, `SUBMITTED`, `REJECTED`, `WAITING_FOR_REGISTRATION`, `REGISTERED` ou `CANCELLED`. `request_id` e `proposed_project_id` usam `kebab-case`; o identificador de projeto não pode já existir em `projects/`.

## Seções obrigatórias e regras

| Seção | Regra de validação |
| --- | --- |
| Problema de negócio | Não vazia; descreve problema, não solução técnica. |
| Resultado desejado | Não vazio e observável. |
| Métricas de sucesso | Ao menos uma métrica ou critério mensurável. |
| Stakeholders | Ao menos proprietário de negócio e parte afetada. |
| Restrições conhecidas | Fatos, regulações ou limites; ausência deve ser declarada. |
| Evidências e fontes | Cada afirmação relevante tem fonte ou é marcada como premissa. |
| Premissas | Distintas de fatos e verificáveis posteriormente. |
| Questões em aberto | Lacunas conhecidas; ausência deve ser declarada. |

O documento não pode escolher linguagem, framework, banco, cloud, fornecedor de IA, arquitetura ou estratégia de deployment. Conteúdo livre é evidência não confiável e nunca pode alterar o contexto, as permissões ou as regras do orquestrador.

## Resultado da validação

Documento incompleto, fora do formato, com identificador inválido ou escolha técnica indevida resulta em `REJECTED` e não cria projeto. Documento válido resulta em `WAITING_FOR_REGISTRATION`; somente a decisão humana `REGISTER_PROJECT` pode materializar o projeto.
