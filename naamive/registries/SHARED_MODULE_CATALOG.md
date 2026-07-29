# Catálogo de Módulos Reutilizáveis

Este catálogo é uma referência global administrada pela plataforma. Ele não contém módulos, código, work items ou estados de módulo; apenas indexa módulos que seus proprietários aprovaram para consumo por outros projetos.

## Critérios para catalogação

Um módulo só pode ser catalogado quando possuir proprietário identificável, contrato publicado, versão ou compatibilidade declarada, responsável de integração e decisão registrada de que pode ser consumido externamente.

## Entrada de catálogo

Uma entrada futura deve conter, no mínimo:

```text
provider_project_id
provider_module_id
canonical_path
business_capability
contract_reference
compatible_version
integration_owner
publication_decision
status
```

O caminho canônico de uma entrada sempre permanece sob `projects/<provider-project-id>/modules/<provider-module-id>/`. A catalogação não autoriza consumidores a modificar o módulo.
