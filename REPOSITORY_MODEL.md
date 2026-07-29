# Modelo do Repositório NAAMIVE

## Relação canônica

```text
Plataforma
    ↓
Necessidade de negócio
    ↓
Projeto
    ↓
Módulos de negócio
    ↓
Aplicações e artefatos do módulo
    ↓
Integração
    ↓
Validação
    ↓
Entrega
```

Uma necessidade de negócio aprovada origina um projeto. Um projeto pode conter um ou mais módulos, e cada módulo materializa as aplicações e os artefatos necessários à sua capacidade. A entrega é o encerramento de um ciclo validado, não a mera produção de código.

## Propriedade estrutural

Todo artefato possui um proprietário estrutural identificável e pertence a exatamente um escopo:

- Plataforma NAAMIVE;
- projeto específico; ou
- módulo específico.

O caminho deve revelar esse proprietário. Portanto, não são permitidas estruturas globais ambíguas como `/docs/planning`, `/docs/architecture`, `/docs/modules`, `/planning`, `/architecture` ou `/applications`.

## Plataforma e produto

`naamive/` é a plataforma global única. Ela reúne as capacidades reutilizáveis que atendem todos os projetos: agentes, governança, runtime, orquestração, templates, schemas, contratos, registros, ferramentas, scripts e testes da plataforma.

`projects/` é o contêiner multiplicável de produtos. Cada necessidade aprovada é isolada em `projects/<project-id>/`; projetos não compartilham diretórios de propriedade. Planejamento, arquitetura, validação e entrega de produto pertencem ao respectivo projeto, não à plataforma. Um projeto pode consumir, por contrato, um módulo que pertence a outro projeto, sem copiar seu diretório ou assumir sua propriedade.

## Estruturas únicas da plataforma

Existem somente uma vez no repositório:

```text
naamive/
├── vision/
├── agents/
├── governance/
├── runtime/
├── orchestration/
├── templates/
├── schemas/
├── contracts/
├── registries/
├── tooling/
├── scripts/
└── tests/
```

`naamive/vision/` contém propósito e princípios estáveis. `naamive/agents/` contém exclusivamente os agentes oficiais da plataforma. `governance/`, `runtime/` e `orchestration/` são globais; não são copiados para projetos. Templates, schemas, contratos, registros, ferramentas, scripts e testes também permanecem globais conforme sua natureza.

## Modelo canônico de projeto

```text
projects/
└── <project-id>/
    ├── PROJECT.md
    ├── STATUS.md
    ├── need/
    │   ├── BUSINESS_NEED.md
    │   ├── stakeholders/
    │   └── evidence/
    ├── analysis/
    │   ├── business/
    │   ├── domain/
    │   ├── requirements/
    │   └── constraints/
    ├── planning/
    │   ├── roadmap/
    │   ├── backlog/
    │   ├── releases/
    │   └── risks/
    ├── architecture/
    │   ├── PROJECT_ARCHITECTURE.md
    │   ├── decisions/
    │   ├── integrations/
    │   └── deployment/
    ├── modules/
    │   └── <module-id>/
    ├── integration/
    │   ├── contracts/
    │   ├── workflows/
    │   └── tests/
    ├── validation/
    │   ├── acceptance/
    │   ├── quality/
    │   ├── security/
    │   └── evidence/
    └── delivery/
        ├── releases/
        ├── deployment/
        ├── operations/
        └── handover/
```

Um projeto representa a transformação de uma necessidade de negócio em solução entregue. Seu identificador é estável e representa o produto ou a necessidade atendida; não representa linguagem, framework, banco de dados, arquitetura técnica, sprint ou agente.

No nível do projeto ficam os assuntos que abrangem todo o produto ou mais de um módulo: necessidade original, visão, stakeholders, análise e requisitos globais, restrições, roadmap, backlog, riscos, arquitetura de produto, integração entre módulos, implantação, validação final, releases, operação e entrega.

## Modelo canônico de módulo

```text
projects/
└── <project-id>/
    └── modules/
        └── <module-id>/
            ├── MODULE.md
            ├── STATUS.md
            ├── need/
            ├── domain/
            ├── requirements/
            ├── planning/
            ├── architecture/
            ├── state-machine/
            ├── applications/
            │   ├── api/
            │   ├── web/
            │   ├── mobile/
            │   ├── workers/
            │   └── integrations/
            ├── tests/
            ├── evidence/
            ├── documentation/
            └── delivery/
```

Um módulo é uma capacidade de negócio independente e claramente delimitada, como `identity`, `catalog`, `orders`, `payments` ou `notifications`. Tecnologia não define módulos: `backend`, `frontend`, `database`, `common` e `utils` são elementos de implementação, não capacidades de negócio.

No módulo ficam sua necessidade específica, regras de domínio, requisitos, planejamento, arquitetura interna, máquina de estados, aplicações, integrações específicas, testes, evidências, documentação e entrega. As aplicações ficam, por padrão, em `applications/` do módulo que implementam. Os subdiretórios `api`, `web`, `mobile`, `workers` e `integrations` são criados somente quando necessários.

## Módulos reutilizáveis

Todo módulo tem exatamente um projeto proprietário e pode ter vários projetos consumidores. O módulo permanece no caminho canônico do projeto provedor; reuso ocorre por contrato, versão compatível e registro de dependência, nunca pela cópia de diretórios, código ou estado.

Por exemplo, `projects/identity/modules/identity/` pode publicar uma capacidade de identidade que `projects/digital-ordering/` consome. O projeto consumidor registra a dependência em sua arquitetura ou integração e mantém somente seus próprios módulos e work items. Qualquer mudança no módulo compartilhado deve ser priorizada e executada pelo projeto provedor.

Não existe um diretório global `modules/`. `naamive/registries/` pode manter um catálogo referencial de módulos aprovados para consumo, mas esse catálogo não é proprietário nem contém implementação.

Uma aplicação que abranja módulos deve ter localização decidida explicitamente pela arquitetura do projeto, identificando módulos envolvidos, preservando a propriedade das capacidades, evitando duplicação e registrando a justificativa. Ela não transforma aplicações em falsos módulos.

## Classificação: único e multiplicável

Estruturas únicas: `naamive/vision/`, `naamive/agents/`, `naamive/governance/`, `naamive/runtime/`, `naamive/orchestration/`, `naamive/templates/`, `naamive/schemas/`, `naamive/contracts/`, `naamive/registries/`, `naamive/tooling/`, `naamive/scripts/` e `naamive/tests/`.

Estruturas multiplicáveis por projeto: `need/`, `analysis/`, `planning/`, `architecture/`, `modules/`, `integration/`, `validation/` e `delivery/` sob `projects/<project-id>/`.

Estruturas multiplicáveis por módulo: `need/`, `domain/`, `requirements/`, `planning/`, `architecture/`, `state-machine/`, `applications/`, `tests/`, `evidence/`, `documentation/` e `delivery/` sob `projects/<project-id>/modules/<module-id>/`. Work items existem somente dentro do módulo, em seu planejamento, e nunca diretamente no projeto.

## Não duplicação e materialização sob demanda

Projetos consomem capacidades globais do NAAMIVE e não mantêm cópias de `agents/`, `runtime/`, `orchestration/`, `global-governance/` ou `templates/`. Exceções exigem decisão arquitetural explícita. Por padrão, agentes de engenharia e orquestração permanecem em `naamive/agents/`.

Os modelos deste documento não exigem a criação antecipada de suas árvores. Um diretório só é materializado quando tem proprietário definido, uso real, necessidade para um artefato autorizado e previsão no modelo canônico. Nesta etapa, somente a estrutura global inicial é materializada; nenhum projeto ou módulo é criado.
