# Contrato de Consumo de Módulo Reutilizável

Um módulo reutilizável é uma capacidade de negócio com um único projeto proprietário e um ou mais projetos consumidores. Reutilização ocorre por contrato publicado; nunca por cópia do diretório, código ou estado do módulo.

## Invariantes

- Todo módulo pertence a exatamente um projeto provedor.
- Todo work item pertence a exatamente um módulo; portanto, pertence indiretamente a um único projeto provedor.
- Um projeto consumidor não pode criar work item, alterar artefato ou mudar o estado do módulo provedor.
- Mudança em um módulo reutilizável é solicitada e planejada como work item do próprio módulo provedor.
- Não existe diretório global `modules/` nem cópia de módulo em projeto consumidor.

## Registro mínimo de consumo

Cada dependência de consumo deve registrar:

| Campo | Regra |
| --- | --- |
| `consumer_project_id` | Projeto que consome a capacidade. |
| `consumer_module_id` | Módulo consumidor responsável pela integração. |
| `provider_project_id` | Projeto proprietário do módulo reutilizável. |
| `provider_module_id` | Módulo reutilizável consumido. |
| `contract_reference` | Contrato ou interface publicada pelo provedor. |
| `compatible_version` | Versão ou intervalo de compatibilidade aceito. |
| `business_purpose` | Finalidade de negócio do consumo. |
| `integration_owner` | Responsável pelo relacionamento de integração. |
| `impact_and_risk` | Impacto de indisponibilidade, mudança ou incompatibilidade. |

O registro pertence à arquitetura ou integração do projeto consumidor. O provedor publica seus contratos no próprio escopo. O catálogo global apenas aponta para módulos aprovados para consumo; ele não transfere propriedade.

## Exemplo conceitual

```text
projects/identity/modules/identity/          ← proprietário do módulo
projects/digital-ordering/modules/orders/    ← consumidor
    └── referencia contrato de identity
```

Uma mudança solicitada por `digital-ordering` em `identity` deve resultar em work item sob `projects/identity/modules/identity/`, depois de avaliação e priorização do projeto provedor.
