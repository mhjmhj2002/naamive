# Máquina de Estados Pré-Projeto

Esta máquina existe antes de `projects/<project-id>/`. Ela administra a solicitação pertencente à plataforma e encerra-se quando um projeto é registrado ou a solicitação é cancelada.

| Estado | Significado | Próximos estados permitidos |
| --- | --- | --- |
| `DRAFT` | Template criado, ainda em preenchimento. | `SUBMITTED`, `CANCELLED` |
| `SUBMITTED` | Solicitação apresentada para validação. | `VALIDATING`, `CANCELLED` |
| `VALIDATING` | Formato, campos, fontes e identificadores estão sendo verificados. | `REJECTED`, `WAITING_FOR_REGISTRATION`, `CANCELLED` |
| `REJECTED` | Solicitação inválida; nenhum projeto foi criado. | `DRAFT`, `CANCELLED` |
| `WAITING_FOR_REGISTRATION` | Solicitação válida, aguardando decisão humana. | `REGISTERED`, `REJECTED`, `CANCELLED` |
| `REGISTERED` | Projeto foi materializado e a solicitação foi vinculada a ele. | nenhum |
| `CANCELLED` | Solicitação encerrada sem criação de projeto. | nenhum |

## Gate de registro

`WAITING_FOR_REGISTRATION → REGISTERED` exige `HUMAN_DECISION` com `gate_id: REGISTER_PROJECT`. A decisão confirma que a necessidade deve se tornar um produto e autoriza criar exclusivamente:

```text
projects/<project-id>/PROJECT.md
projects/<project-id>/STATUS.md
projects/<project-id>/need/BUSINESS_NEED.md
```

Esses arquivos são materializados pelos templates globais. O `STATUS.md` inicia em `ANALYSIS`; a máquina de ciclo de vida de projeto passa a governar o trabalho posterior. A aprovação não escolhe tecnologia nem cria módulos, aplicações ou work items.
