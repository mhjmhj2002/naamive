---
document_type: phase-planning
status: IMPLEMENTATION_COMPLETE_VALIDATED
created_at: 2026-08-05
scope: planning and validated implementation record for the Phase 5 technology baseline
primary_roadmap: 01_DELIVERY_ROADMAP.md
---

# Planejamento da Fase 5 — Baseline Tecnológica antes dos Módulos

> **Nota de reorganização — 2026-08-06:** a baseline foi renumerada para Fase 5
> para liberar a Fase 4 ao runtime multi-provider. O escopo deste plano
> permaneceu inalterado; sua implementação foi concluída e validada.

## Objetivo

A Fase 5 institui a Technology Baseline como o contrato tecnológico imutável entre Produto e Engenharia. Depois de o produto assumir seu compromisso e antes de materializar o primeiro módulo, o projeto seleciona uma revisão publicada do Catálogo e declara quais decisões tecnológicas governadas aceita, exige, prefere, proíbe ou delega à arquitetura do módulo. Novas Baselines só podem referenciar itens ativos nesse snapshot publicado. Esse contrato torna explícitos os limites nos quais Engenharia pode projetar e executar, sem transformar a engine em conhecedora de tecnologias específicas.

## Demonstração

Em um novo projeto com compromisso de produto aprovado, o inventário seguro oferece evidências para o operador selecionar o Perfil Tecnológico ativo e suas referências publicadas do Catálogo Tecnológico. Na publicação inicial, o único perfil selecionável é `TYPESCRIPT_MODULAR_MONOLITH`, com `MODULAR_MONOLITH` disponível; `MICROSERVICES` é reconhecível como item inativo, mas não pode compor nova Baseline. A baseline expande essa composição em itens catalogados e explicita o que é obrigatório, permitido, preferido, proibido e o que permanece como decisão arquitetural do módulo; não é uma lista textual de tecnologias. No snapshot inicial, `POSTGRESQL` compõe o perfil como item `REQUIRED` da persistência; portanto, na demonstração de referência, o banco entra selecionado e obrigatório, e não como decisão aberta. Uma categoria pode ser deixada como decisão arquitetural do módulo somente quando ela for elegível a `DEFER_TO_MODULE_ARCHITECTURE` — o que não ocorre para o banco nesta publicação, dado o perfil ativo. Após sua aprovação, o primeiro módulo pode ser materializado e sua proposta, arquitetura, work item, matriz de QA e execução Dev referenciam a mesma revisão imutável. Uma mudança posterior no contrato cria uma nova revisão para uso futuro, sem alterar os registros já autorizados.

## Escopo e exclusões

Inclui F5-01 a F5-06: a governança versionada de Catálogo Tecnológico, Perfis Tecnológicos e compatibilidades; publicação transacional da primeira revisão por seeds; workflow e gate da baseline; inventário read-only como evidência; revisões e evidências imutáveis; experiência web; bloqueio da primeira materialização e propagação da revisão contratual aos objetos de entrega.

Não inclui decidir automaticamente a arquitetura de um módulo, executar instalação, migration, deploy ou comandos arbitrários no repositório; criar PR/release/aceite final, que pertencem à Fase 6; nem reescrever projetos ou módulos já materializados na Fase 3. Também não inclui tela ou endpoint administrativo para alterar o catálogo. A baseline não é um inventário nem uma especificação de implementação: ela é o contrato que delimita as decisões arquiteturais legítimas para o projeto.

### Separação de responsabilidades

| Limite | Responsabilidade |
| --- | --- |
| **Engine** | Executa workflow, gates, validações genéricas, persistência, auditoria e propagação de referências. Não identifica, interpreta nem especializa fluxos para tecnologias. |
| **Catálogo Tecnológico** | Publica as identidades, versões, status, perfis e relações de compatibilidade que podem ser usados na plataforma. É a única fonte de verdade tecnológica. |
| **Technology Baseline** | Formaliza o contrato entre Produto e Engenharia para um projeto, selecionando referências publicadas e classificando-as como requeridas, permitidas, preferidas, proibidas ou deferidas. |
| **Arquitetura do Módulo** | Toma as decisões concretas de implementação do módulo dentro da baseline vigente, resolve somente as decisões explicitamente deferidas e justifica desvios de preferências. Não altera o contrato do projeto. |

## Princípios arquiteturais normativos

Esta seção é a referência obrigatória para toda tarefa, contrato, migration, API, tela e evidência da Fase 5. Em caso de conflito, estes princípios prevalecem sobre exemplos, estruturas provisórias ou conveniências de implementação.

1. **A engine permanece genérica.** Workflow, gates, comandos, validação, persistência, API, SSE e evidências tratam referências e regras genéricas; não contêm condicionais, estados, schemas ou fluxos dedicados a uma tecnologia, fornecedor, linguagem, framework, banco ou versão.
2. **Tecnologias são governadas por dados.** Nome canônico, ecossistema, tipo, versões suportadas, metadados, status, restrições e políticas são registros versionados e auditáveis, não enumerações ou regras codificadas na engine.
3. **O Catálogo Tecnológico é a única fonte de verdade.** Somente entradas publicadas no catálogo definem quais tecnologias existem para a plataforma e como são identificadas. Inventário, baseline, arquitetura de módulo, QA, Dev e UI podem consultar ou referenciar o catálogo, mas não redefinem suas tecnologias.
4. **Baselines referenciam o catálogo, nunca texto livre.** Uma revisão de baseline armazena IDs imutáveis de itens e revisões do catálogo, junto de sua classificação e justificativa. Um Perfil Tecnológico pode ser registrado apenas como origem auditável dos itens expandidos. Campos livres só podem explicar a decisão ou registrar uma pergunta aberta; não podem identificar, criar, renomear ou versionar tecnologia.
5. **Perfis Tecnológicos representam combinações aprovadas.** Um perfil é uma composição versionada de referências do catálogo, com finalidade e regras próprias, aprovada antes de uso. A baseline começa por um perfil ativo, expande seus itens catalogados e só os complementa dentro das regras publicadas; ela não inventa combinações equivalentes em texto.
6. **Compatibilidades são governadas por dados.** Compatibilidade, incompatibilidade, pré-requisito, escopo e intervalo de versão são relações versionadas entre entradas do catálogo e/ou perfis. A engine delega a decisão a um avaliador genérico dessas relações e não codifica matrizes tecnológicas.
7. **Itens inativos preservam o histórico.** Inativar entrada, perfil ou relação impede novo uso, mas nunca invalida, reescreve ou deixa sem resolução uma baseline, módulo, work item, entrega, QA ou evidência histórica que já a referencie.
8. **O workflow desconhece tecnologias específicas.** Estados e transições sabem apenas se uma baseline válida, um perfil aprovado e as compatibilidades requeridas foram satisfeitos. A seleção e a interpretação de qualquer item pertencem exclusivamente aos dados governados.
9. **A plataforma evolui por ativação de catálogo e perfis.** Adicionar, corrigir, aprovar, inativar ou combinar tecnologias compatíveis ocorre por publicação versionada de entradas, relações e perfis, sem especializar ou redistribuir a engine. Um novo adaptador técnico só é justificável quando introduz uma capacidade de execução incompatível com os contratos genéricos, e não para reconhecer uma tecnologia.
10. **A Technology Baseline é a Constituição Tecnológica do Projeto.** A revisão aprovada é o contrato tecnológico imutável que delimita escolhas permitidas, exigidas, preferidas, proibidas e deferidas para aquele projeto. Todos os contratos posteriores a referenciam e a interpretam pelos dados publicados; nenhum deles pode contorná-la, substituí-la por texto livre ou alterá-la retroativamente.

## Pré-requisitos para iniciar implementação

| Item | Condição verificável de desbloqueio |
| --- | --- |
| Fase 3 | A materialização de módulo, suas revisões e o gate individual continuam preservados para projetos legados. |
| Workflow publicado | A nova versão do workflow de projeto pode ser publicada sem editar definições/transições já aplicadas, e a seleção de versão ocorre atomicamente ao iniciar a descoberta. |
| Vínculo Git | O repositório vinculado passa pela allowlist existente e tem SHA inicial persistido. |
| Artefatos | `ArtifactStore` suporta intenção, hash, reconciliação e referências para inventário e baseline. |
| Seeds do catálogo | Os seis arquivos versionados, seus schemas e o publicador transacional validam categorias, itens, perfis, cardinalidade, regras `ERROR` e hash antes de publicar a primeira revisão. |

Não há migração silenciosa de projeto já em `PRODUCT_COMMITMENT` ou com módulo criado. A política da baseline vale para projetos novos na versão nova do workflow; legado permanece consultável e explicitamente identificado como `BASELINE_NOT_REQUIRED_LEGACY`.

## Modelo de domínio proposto

```text
Technology Categories
        ↓
Technology Catalog
        ↓
Technology Profiles
        ↓
Compatibility Rules
        ↓
Technology Inventory
        ↓
Technology Baseline
        ↓
Technology Baseline Revision
```

### Technology Categories

`technology_categories` classifica o catálogo por responsabilidade tecnológica, como runtime, framework, persistência, mensageria, integração, infraestrutura ou observabilidade. Uma categoria possui muitos `technology_catalog_items`; cada item pertence a exatamente uma categoria. Além de organizar descoberta, a categoria define a cardinalidade genérica com que seus itens podem ser selecionados.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK. |
| `code` | `varchar` | `NOT NULL`, único, estável e imutável. |
| `name` | `varchar` | `NOT NULL`; rótulo de exibição. |
| `description` | `text` | Opcional. |
| `selection_mode` | `varchar` | `NOT NULL`; somente `SINGLE` ou `MULTIPLE`. |
| `min_selections` | `integer` | `NOT NULL`; maior ou igual a zero. |
| `max_selections` | `integer` | Opcional; quando informado, maior ou igual a `min_selections`. |
| `is_active` | `boolean` | `NOT NULL`; habilita a categoria para novas Baselines. |
| `display_order` | `integer` | `NOT NULL`; ordena a apresentação dirigida por dados. |
| `created_at` | `timestamptz` | `NOT NULL`. |
| `updated_at` | `timestamptz` | `NOT NULL`. |

As constraints do banco impõem `selection_mode IN ('SINGLE', 'MULTIPLE')`, `min_selections >= 0`, `max_selections IS NULL OR max_selections >= min_selections` e, para `SINGLE`, `max_selections = 1`. Uma categoria `MULTIPLE` pode ter `max_selections` nulo, significando quantidade ilimitada. `code` não pode ser atualizado após a criação; sua unicidade e imutabilidade são garantidas por índice e trigger/guard transacional.

Cardinalidade é propriedade exclusiva da categoria, nunca do perfil, do workflow, da API ou de código específico da aplicação. Ao criar, complementar ou submeter uma Baseline, a engine agrupa os itens selecionados por `category_id` e valida genericamente `min_selections`, `max_selections` e `selection_mode` contra os dados desta tabela. Perfis apenas referenciam itens catalogados e não podem sobrescrever essas regras.

Classificação e cardinalidade são regras ortogonais, ambas governadas por dados. A classificação `REQUIRED` de um item no perfil ou na baseline estabelece, para projetos que adotam aquele perfil, que a referência deve estar presente na arquitetura do módulo; a cardinalidade da categoria estabelece quantos itens daquela categoria podem compor a baseline. Restringir ou remover um item `REQUIRED` na baseline continua sujeito à cardinalidade da categoria: a baseline deve permanecer válida quanto a `min_selections`/`max_selections` e, se a remoção violar `min_selections`, deverá ser substituída por outro item ativo da mesma categoria ou por uma decisão explícita `DEFER_TO_MODULE_ARCHITECTURE` quando a política da categoria permitir. A classificação `REQUIRED` não autoriza exceder `max_selections` nem contornar `SINGLE`/`MULTIPLE`; estas continuam sendo regras exclusivas da categoria.

Uma decisão `DEFER_TO_MODULE_ARCHITECTURE` é escopada a uma categoria e pode resolver a obrigatoriedade de decisão de uma categoria cujo mínimo inicial seja `1`, desde que contenha pergunta e justificativa auditáveis. Na validação da Baseline, ela satisfaz essa decisão mínima sem contar como item selecionado nem consumir `max_selections`; não existe item tecnológico `NONE` ou `DEFER`. Perfil não satisfaz nem posterga cardinalidade: é apenas uma composição candidata. A categoria só é considerada atendida no momento da Baseline, por itens catalogados ou por uma decisão explícita de deferimento; a arquitetura do módulo deverá resolver o deferimento antes de aprovar sua própria decisão.

A resolução do deferimento é um contrato conceitual entre a baseline e a arquitetura do módulo, não uma regra de engine. Ao materializar um módulo sob uma baseline que contém uma decisão aberta para uma categoria, a arquitetura do módulo deve: (a) referenciar a decisão aberta por sua identificação na revisão da baseline; (b) declarar a escolha concreta feita para aquela categoria; e (c) registrar justificativa e eventuais desvios de preferências. A escolha declarada deve ser resolvida exclusivamente a partir de itens ativos do mesmo snapshot `PUBLISHED` da baseline, nunca por texto livre ou por um item inexistente no catálogo. O gate de aprovação da arquitetura do módulo exige que toda decisão aberta aplicável tenha sido resolvida dessa forma antes da aprovação.

Uma categoria com `is_active = false` não participa de novas Baselines nem de novos contextos de seleção; referências históricas permanecem resolúveis. Categoria já referenciada por item, perfil, contexto, Baseline ou evidência não pode ser apagada fisicamente; FKs `RESTRICT` e a política de inativação preservam o histórico.

#### Carga inicial de categorias

`technology-categories.json` publica inicialmente as categorias abaixo. Todas estão ativas; `NULL` em `max_selections` significa quantidade ilimitada.

| Código | Nome | `selection_mode` | `min_selections` | `max_selections` | `is_active` | `display_order` |
| --- | --- | --- | ---: | ---: | --- | ---: |
| `ARCHITECTURE_STYLE` | Estilo arquitetural | `SINGLE` | 1 | 1 | `true` | 10 |
| `APPLICATION_STRUCTURE` | Estrutura da aplicação | `SINGLE` | 1 | 1 | `true` | 20 |
| `LANGUAGE` | Linguagem | `SINGLE` | 1 | 1 | `true` | 30 |
| `RUNTIME` | Runtime | `SINGLE` | 1 | 1 | `true` | 40 |
| `APPLICATION_FRAMEWORK` | Framework de aplicação | `SINGLE` | 0 | 1 | `true` | 50 |
| `API_STYLE` | Estilo de API | `SINGLE` | 1 | 1 | `true` | 60 |
| `DATABASE` | Banco de dados | `SINGLE` | 0 | 1 | `true` | 70 |
| `DATA_ACCESS` | Acesso a dados | `SINGLE` | 0 | 1 | `true` | 80 |
| `MODULE_COMMUNICATION` | Comunicação entre módulos | `SINGLE` | 1 | 1 | `true` | 90 |
| `PACKAGE_MANAGER` | Gerenciador de pacotes | `SINGLE` | 1 | 1 | `true` | 100 |
| `BUILD_TOOL` | Ferramenta de build | `SINGLE` | 1 | 1 | `true` | 110 |
| `TEST_FRAMEWORK` | Framework de testes | `SINGLE` | 1 | 1 | `true` | 120 |
| `TEST_STRATEGY` | Estratégias de teste | `MULTIPLE` | 1 | `NULL` | `true` | 130 |
| `API_DOCUMENTATION` | Documentação de API | `SINGLE` | 0 | 1 | `true` | 140 |
| `PACKAGING` | Empacotamento | `MULTIPLE` | 0 | `NULL` | `true` | 150 |
| `CI_PLATFORM` | Integração contínua | `SINGLE` | 0 | 1 | `true` | 160 |
| `OBSERVABILITY` | Observabilidade | `MULTIPLE` | 1 | `NULL` | `true` | 170 |
| `SECURITY_REQUIREMENT` | Requisitos de segurança | `MULTIPLE` | 1 | `NULL` | `true` | 180 |
| `MESSAGING` | Mensageria | `MULTIPLE` | 0 | `NULL` | `true` | 190 |
| `ORCHESTRATION` | Orquestração | `SINGLE` | 0 | 1 | `true` | 200 |

### Technology Catalog

`technology_catalog_items` é a tabela central de identidades estáveis do Catálogo Tecnológico. Cada item pertence a uma única categoria e é a única forma de uma Baseline referenciar uma tecnologia; Baseline, perfil e arquitetura nunca recebem a tecnologia como texto livre.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK. |
| `category_id` | `uuid` | `NOT NULL`; FK para `technology_categories`. |
| `code` | `varchar` | `NOT NULL`; código canônico único dentro da categoria. |
| `name` | `varchar` | `NOT NULL`; nome de exibição. |
| `description` | `text` | Opcional. |
| `is_active` | `boolean` | `NOT NULL`; habilita o item para novas escolhas. |
| `display_order` | `integer` | `NOT NULL`; ordena a apresentação dirigida por dados. |
| `metadata` | `jsonb` | `NOT NULL DEFAULT '{}'`; propriedades declarativas específicas da categoria. |
| `created_at` | `timestamptz` | `NOT NULL`. |
| `updated_at` | `timestamptz` | `NOT NULL`. |

O banco impõe `UNIQUE(category_id, code)`. Após publicação, `code` e `category_id` são imutáveis; índice, FK e trigger/guard transacional rejeitam alteração. Item referenciado por perfil, contexto, Baseline, módulo ou evidência não pode ser apagado fisicamente; FKs `RESTRICT` e inativação preservam o histórico.

`is_active = false` significa somente que o item está indisponível para novas escolhas na próxima revisão publicada do Catálogo. Não significa exclusão, invalidade histórica, compromisso de implementação futura ou classificação de escopo de entrega. Baselines, módulos e evidências existentes continuam válidos e resolúveis por `catalog_item_id` e `technology_catalog_revision_id`.

`name` e `description` admitem somente correções editoriais que não alterem a semântica. Alteração semântica de capacidade, compatibilidade, versão, restrição ou significado exige nova revisão publicada em `technology_catalog_revisions` — ou novo item quando a identidade canônica deixar de ser a mesma. A classificação de uma alteração como editorial é validada e auditada no servidor, nunca inferida pelo cliente.

`metadata` pode guardar apenas propriedades declarativas previstas pelo schema da categoria, como atributos de apresentação, capacidade e política de governança de versão. A chave estruturada `version_governance` aceita somente `REQUIRED` ou `UNMANAGED`: a primeira torna `version_constraint` obrigatória para o item no snapshot; a segunda não a exige. Ela não admite expressão de versão e não substitui `category_id`, `code`, `name`, `is_active`, cardinalidade, classificação ou regras de compatibilidade. `metadata` também não pode conter scripts, expressões, URLs executáveis ou regras arbitrárias que mudem o comportamento da engine.

Semanticamente, `version_constraint` nula em um item com `version_governance = UNMANAGED` significa "qualquer versão aceita para a referência", ou seja, a baseline e a arquitetura do módulo podem utilizar a tecnologia em qualquer versão publicada, sem restrição imposta pelo catálogo. `version_constraint` nula em um item com `version_governance = REQUIRED` não é permitida: a restrição é obrigatória e deve ser expressa no perfil e na baseline. Essa interpretação é governada por dados e validada pelo avaliador genérico; nunca é inferida pelo navegador.

Artefatos podem repetir `code` e `name` como projeção legível, mas a fonte de verdade é sempre a referência persistida `catalog_item_id` — acompanhada de `technology_catalog_revision_id` quando a semântica precisa ser congelada.

#### Carga inicial de itens ativos

A verificação do repositório confirma TypeScript, Node.js, `node:http`, `pg`, npm, `tsc`, `node:test`, logs estruturados, validação de entrada, tratamento centralizado de erros e segredos por variáveis de ambiente. O manifesto não declara NestJS, Prisma, pnpm ou Vitest; por isso, esses itens não são ativados. Também não há suporte atual a OpenAPI, GitHub Actions, empacotamento da aplicação em Docker ou endpoint de saúde geral, logo as respectivas categorias opcionais começam sem itens.

`technology-catalog-items.json` publica os seguintes itens com `is_active = true`:

| Categoria | `code` | `name` |
| --- | --- | --- |
| `ARCHITECTURE_STYLE` | `MODULAR_MONOLITH` | Monólito modular |
| `APPLICATION_STRUCTURE` | `LAYERED_MODULES` | Módulos organizados em camadas |
| `LANGUAGE` | `TYPESCRIPT` | TypeScript |
| `RUNTIME` | `NODEJS_22` | Node.js 22 |
| `API_STYLE` | `REST_JSON` | REST com JSON |
| `DATABASE` | `POSTGRESQL` | PostgreSQL |
| `DATA_ACCESS` | `NODE_POSTGRES` | node-postgres (pg) |
| `MODULE_COMMUNICATION` | `IN_PROCESS_MODULE_CALL` | Comunicação interna em processo |
| `PACKAGE_MANAGER` | `NPM` | npm |
| `BUILD_TOOL` | `TYPESCRIPT_COMPILER` | TypeScript Compiler |
| `TEST_FRAMEWORK` | `NODE_TEST_RUNNER` | Node.js test runner |
| `TEST_STRATEGY` | `UNIT_TESTS` | Testes unitários |
| `TEST_STRATEGY` | `INTEGRATION_TESTS` | Testes de integração |
| `TEST_STRATEGY` | `API_E2E_TESTS` | Testes E2E de API |
| `OBSERVABILITY` | `STRUCTURED_LOGGING` | Logs estruturados |
| `SECURITY_REQUIREMENT` | `INPUT_VALIDATION` | Validação de entrada |
| `SECURITY_REQUIREMENT` | `CENTRALIZED_ERROR_HANDLING` | Tratamento centralizado de erros |
| `SECURITY_REQUIREMENT` | `ENVIRONMENT_SECRETS` | Segredos por variáveis de ambiente |

Cada item ativo deve ser reconhecível pelo inventário na extensão aplicável e referenciável por Baseline, arquitetura do módulo, planejamento, QA e execução Dev pelos seus IDs e revisões. O inventário pode registrar o uso de `node:http` como capacidade ou fato técnico sanitizado, mas ele não é framework, não recebe `catalog_item_id` nesta publicação e não satisfaz `APPLICATION_FRAMEWORK`. A ausência de item em `APPLICATION_FRAMEWORK`, `API_DOCUMENTATION`, `PACKAGING`, `CI_PLATFORM`, `MESSAGING` ou `ORCHESTRATION` não cria item fictício `NONE`; categorias opcionais simplesmente permanecem sem seleção até uma publicação governada adicionar um item suportado.

#### Itens conhecidos inicialmente inativos

Os itens abaixo são identidades conhecidas no catálogo, publicadas com `is_active = false`. Eles não aparecem como escolha normal de novas Baselines, mas podem ser reconhecidos pelo inventário quando houver detector. Sua presença não representa implementação futura confirmada, não contém data de ativação e não autoriza a plataforma a executá-los. Uma ativação futura exige nova revisão publicada do catálogo e validação prévia das capacidades de inventário, Baseline, arquitetura, planejamento, QA e execução Dev aplicáveis; alterar apenas `is_active` nunca torna uma tecnologia funcional.

| Categoria | `code` | `name` |
| --- | --- | --- |
| `ARCHITECTURE_STYLE` | `MICROSERVICES` | Microsserviços |
| `APPLICATION_STRUCTURE` | `HEXAGONAL_ARCHITECTURE` | Arquitetura hexagonal |
| `APPLICATION_STRUCTURE` | `CLEAN_ARCHITECTURE` | Clean Architecture |
| `LANGUAGE` | `JAVASCRIPT` | JavaScript |
| `LANGUAGE` | `JAVA` | Java |
| `LANGUAGE` | `PYTHON` | Python |
| `RUNTIME` | `NODEJS_24` | Node.js 24 |
| `RUNTIME` | `JVM_21` | JVM 21 |
| `RUNTIME` | `PYTHON_3_13` | Python 3.13 |
| `APPLICATION_FRAMEWORK` | `EXPRESS` | Express |
| `APPLICATION_FRAMEWORK` | `FASTIFY` | Fastify |
| `APPLICATION_FRAMEWORK` | `SPRING_BOOT` | Spring Boot |
| `API_STYLE` | `GRAPHQL` | GraphQL |
| `API_STYLE` | `GRPC` | gRPC |
| `DATABASE` | `MYSQL` | MySQL |
| `DATABASE` | `MONGODB` | MongoDB |
| `DATABASE` | `SQLITE` | SQLite |
| `DATA_ACCESS` | `TYPEORM` | TypeORM |
| `DATA_ACCESS` | `DRIZZLE` | Drizzle ORM |
| `DATA_ACCESS` | `RAW_SQL` | SQL direto |
| `MODULE_COMMUNICATION` | `INTERNAL_HTTP` | HTTP interno |
| `MODULE_COMMUNICATION` | `INTERNAL_EVENT_BUS` | Barramento interno de eventos |
| `PACKAGE_MANAGER` | `PNPM` | pnpm |
| `PACKAGE_MANAGER` | `YARN` | Yarn |
| `BUILD_TOOL` | `SWC` | SWC |
| `BUILD_TOOL` | `ESBUILD` | esbuild |
| `TEST_FRAMEWORK` | `VITEST` | Vitest |
| `TEST_FRAMEWORK` | `JEST` | Jest |
| `TEST_STRATEGY` | `CONTRACT_TESTS` | Testes de contrato |
| `TEST_STRATEGY` | `PERFORMANCE_TESTS` | Testes de desempenho |
| `API_DOCUMENTATION` | `ASYNCAPI` | AsyncAPI |
| `MESSAGING` | `KAFKA` | Apache Kafka |
| `MESSAGING` | `RABBITMQ` | RabbitMQ |
| `MESSAGING` | `AWS_SQS` | Amazon SQS |
| `ORCHESTRATION` | `KUBERNETES` | Kubernetes |
| `OBSERVABILITY` | `METRICS` | Métricas |
| `OBSERVABILITY` | `DISTRIBUTED_TRACING` | Rastreamento distribuído |
| `OBSERVABILITY` | `OPENTELEMETRY` | OpenTelemetry |

`PACKAGE_MANAGER/NPM` e `TEST_FRAMEWORK/NODE_TEST_RUNNER` não constam desta carga inativa: são os itens ativos da stack real do repositório e a constraint `UNIQUE(category_id, code)` veda qualquer duplicação. O seed inicial não cria regras `REQUIRES` para PNPM ou Vitest, nem cria regra de compatibilidade para apenas repetir a composição do perfil. Regras envolvendo NPM ou Node.js test runner só são publicadas quando uma dependência técnica real exigir validação.

#### Technology Catalog Revision

`technology_catalog_revisions` representa uma publicação global e imutável do Catálogo Tecnológico, não uma revisão isolada de item. O ciclo permitido é `DRAFT → PUBLISHED → SUPERSEDED`; a transição para `PUBLISHED` calcula e confere o `content_hash`, persiste todas as associações congeladas e substitui transacionalmente a revisão selecionável anterior. Nenhuma associação ou valor semântico de uma revisão `PUBLISHED` ou `SUPERSEDED` pode ser atualizado ou removido.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK. |
| `revision_number` | `bigint` | `NOT NULL UNIQUE`; monotônico. |
| `status` | `varchar` | `NOT NULL`; `DRAFT`, `PUBLISHED` ou `SUPERSEDED`. |
| `description` | `text` | Opcional; resume a publicação. |
| `content_hash` | `varchar` | `NOT NULL`; hash canônico do conteúdo congelado. |
| `published_at` | `timestamptz` | Nulo em `DRAFT`; obrigatório em `PUBLISHED` e `SUPERSEDED`. |
| `published_by` | `varchar` | Ator da publicação; obrigatório em `PUBLISHED` e `SUPERSEDED`. |
| `created_at` | `timestamptz` | `NOT NULL`. |

A abordagem adotada é **A: tabelas de associação versionadas por `revision_id`**. Na publicação, o servidor copia os valores semânticos e de seleção para `technology_catalog_revision_categories`, `technology_catalog_revision_items`, `technology_catalog_revision_profiles`, `technology_catalog_revision_profile_items` e `technology_catalog_revision_compatibility_rules`. Cada associação armazena `revision_id`, a FK para a identidade corrente e os campos necessários para reconstrução — incluindo categorias e cardinalidade, itens e `is_active`, perfis e `is_active`, composição/classificação dos perfis e regras/estado ativo. As FKs preservam a rastreabilidade da identidade; os valores copiados impedem que atualização posterior de uma tabela corrente reinterprete a revisão já publicada.

Somente uma revisão `PUBLISHED` pode originar uma nova Baseline. A revisão inicial contém integralmente as categorias, itens ativos e inativos, perfil, itens de perfil e regras definidos neste plano. A publicação valida todas as FKs, cardinalidades, perfis, regras e `content_hash` antes de uma única transação que grava todas as associações, muda o status para `PUBLISHED` e emite a evidência. Qualquer falha aborta a transação; não há publicação parcial.

Uma revisão `PUBLISHED` é append-only e imutável. Nova ativação, inativação ou alteração material de categoria, item, perfil, composição ou regra cria novo `DRAFT`, novas associações e novo hash; após publicação, a anterior pode ser `SUPERSEDED`, mas continua integralmente consultável. Comparações são feitas por `revision_id`, conteúdo normalizado das associações e `content_hash`. Alterar `is_active` na tabela corrente sem publicar nova revisão não altera as opções consumidas por projetos existentes nem por novas Baselines, que consultam exclusivamente o snapshot `PUBLISHED` selecionado.

### Technology Profiles

`technology_profiles` representa combinações aprovadas reutilizáveis, como uma plataforma de serviço ou um padrão de execução.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK. |
| `code` | `varchar` | `NOT NULL UNIQUE`; estável e sem classificação de escopo de entrega no nome. |
| `name` | `varchar` | `NOT NULL`. |
| `description` | `text` | Opcional. |
| `is_active` | `boolean` | `NOT NULL`; habilita o perfil para originar nova Baseline. |
| `created_at` | `timestamptz` | `NOT NULL`. |
| `updated_at` | `timestamptz` | `NOT NULL`. |

`technology_profile_items` materializa a composição do perfil:

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `profile_id` | `uuid` | `NOT NULL`; FK para `technology_profiles`. |
| `catalog_item_id` | `uuid` | `NOT NULL`; FK para `technology_catalog_items`. |
| `classification` | `varchar` | `NOT NULL`; somente `REQUIRED`, `PREFERRED`, `ALLOWED` ou `PROHIBITED`. |
| `version_constraint` | `varchar` | Obrigatória somente quando o `metadata.version_governance` do item no snapshot for `REQUIRED`; caso contrário é opcional e, na publicação inicial, permanece nula. Validada contra o snapshot publicado do Catálogo. |
| `justification` | `text` | Opcional; explica a escolha, sem identificar tecnologia em texto livre. |
| `display_order` | `integer` | `NOT NULL`; ordena a composição apresentada. |

`PRIMARY KEY(profile_id, catalog_item_id)` impede duplicidade. O perfil só pode referenciar item ativo no snapshot de catálogo em publicação; sua publicação valida cardinalidade de categorias e todas as regras de compatibilidade aplicáveis. `DEFER_TO_MODULE_ARCHITECTURE` não é item de perfil: permanece decisão explícita da Baseline, quando a categoria e a política permitirem.

Perfil inativo não pode originar nova Baseline, mas perfil já usado não pode ser apagado fisicamente. Ativação ou alteração material de composição exige nova publicação versionada do catálogo; ela preserva o perfil histórico e cria novo perfil com código próprio, em vez de alterar a composição já utilizada.

#### Perfis Tecnológicos como mecanismo oficial de seleção

Um Perfil Tecnológico é uma combinação aprovada e reutilizável de itens do Catálogo para uma abordagem de engenharia. Ele não é uma lista descritiva nem um atalho para texto livre: sua composição é a coleção de vínculos `technology_profile_items`, cada qual com item catalogado, classificação e restrição de versão.

A seleção de uma baseline nova começa obrigatoriamente por um Perfil Tecnológico `ACTIVE` em uma revisão global `PUBLISHED`. O servidor expande seus itens para `technology_baseline_revision_items`, fixa seus IDs e o `technology_catalog_revision_id` na revisão da Baseline e registra o perfil como origem auditável. A baseline pode adicionar ou restringir referências catalogadas somente quando compatíveis com o perfil e com as regras publicadas; não pode substituir a composição por nomes ou valores livres. A arquitetura do módulo recebe a baseline expandida, e não um perfil interpretado novamente.

Na publicação inicial, existe exatamente um Perfil Tecnológico selecionável:

| Campo | Valor |
| --- | --- |
| `code` | `TYPESCRIPT_MODULAR_MONOLITH` |
| `name` | TypeScript Modular Monolith |
| `description` | Perfil da stack efetiva do repositório Node.js/TypeScript. |
| `is_active` | `true` |

Todos os itens abaixo são `REQUIRED`. No snapshot inicial, `NODEJS_22` possui `metadata.version_governance = REQUIRED` e `version_constraint` `>=22 <23`; os demais itens possuem `version_governance = UNMANAGED` e a restrição permanece nula. Alterar essa política exige nova revisão publicada do catálogo.

| `catalog_item_id` resolvido por | `classification` | `version_constraint` | `display_order` |
| --- | --- | --- | ---: |
| `ARCHITECTURE_STYLE/MODULAR_MONOLITH` | `REQUIRED` | — | 10 |
| `APPLICATION_STRUCTURE/LAYERED_MODULES` | `REQUIRED` | — | 20 |
| `LANGUAGE/TYPESCRIPT` | `REQUIRED` | — | 30 |
| `RUNTIME/NODEJS_22` | `REQUIRED` | `>=22 <23` | 40 |
| `API_STYLE/REST_JSON` | `REQUIRED` | — | 50 |
| `DATABASE/POSTGRESQL` | `REQUIRED` | — | 60 |
| `DATA_ACCESS/NODE_POSTGRES` | `REQUIRED` | — | 70 |
| `MODULE_COMMUNICATION/IN_PROCESS_MODULE_CALL` | `REQUIRED` | — | 80 |
| `PACKAGE_MANAGER/NPM` | `REQUIRED` | — | 90 |
| `BUILD_TOOL/TYPESCRIPT_COMPILER` | `REQUIRED` | — | 100 |
| `TEST_FRAMEWORK/NODE_TEST_RUNNER` | `REQUIRED` | — | 110 |
| `TEST_STRATEGY/UNIT_TESTS` | `REQUIRED` | — | 120 |
| `TEST_STRATEGY/INTEGRATION_TESTS` | `REQUIRED` | — | 130 |
| `TEST_STRATEGY/API_E2E_TESTS` | `REQUIRED` | — | 140 |
| `OBSERVABILITY/STRUCTURED_LOGGING` | `REQUIRED` | — | 150 |
| `SECURITY_REQUIREMENT/INPUT_VALIDATION` | `REQUIRED` | — | 160 |
| `SECURITY_REQUIREMENT/CENTRALIZED_ERROR_HANDLING` | `REQUIRED` | — | 170 |
| `SECURITY_REQUIREMENT/ENVIRONMENT_SECRETS` | `REQUIRED` | — | 180 |

`NESTJS`, `PRISMA`, `PNPM`, `VITEST`, `OPENAPI`, `DOCKER`, `GITHUB_ACTIONS` e `HEALTH_ENDPOINT` não compõem este perfil porque não são itens ativos suportados pela stack atual. Todo outro perfil permanece `INACTIVE` até publicação governada. A inclusão, ativação ou alteração material de perfil é evolução de configuração auditada e não requer especialização da engine.

Quando houver exatamente um perfil ativo, a UI pode aplicá-lo automaticamente, mas deve apresentar ao operador todos os itens, classificações e restrições que serão usados. Workflow, API e UI decidem pela condição genérica de quantidade de perfis ativos; não possuem regra específica para `TYPESCRIPT_MODULAR_MONOLITH`.

### Compatibility Rules

`technology_compatibility_rules` é a fonte de todas as regras de combinação entre itens do Catálogo. A engine conhece somente operadores e severidades genéricos; não contém matriz, condicional ou conhecimento de tecnologias específicas.

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | `uuid` | PK. |
| `source_item_id` | `uuid` | `NOT NULL`; FK para `technology_catalog_items`. |
| `relationship_type` | `varchar` | `NOT NULL`; `REQUIRES`, `CONFLICTS_WITH` ou `RECOMMENDS`. |
| `target_item_id` | `uuid` | `NOT NULL`; FK para `technology_catalog_items`. |
| `constraint_expression` | `varchar` | Opcional; condição declarativa de versão ou capacidade. |
| `severity` | `varchar` | `NOT NULL`; `ERROR`, `WARNING` ou `INFO`. |
| `message` | `text` | `NOT NULL`; explicação exibível e auditável. |
| `is_active` | `boolean` | `NOT NULL`; habilita a regra para novas validações. |
| `created_at` | `timestamptz` | `NOT NULL`. |
| `updated_at` | `timestamptz` | `NOT NULL`. |

As constraints impõem `source_item_id <> target_item_id`, valores permitidos para `relationship_type` e `severity`, e unicidade por `(source_item_id, relationship_type, target_item_id, constraint_expression)`, tratando expressão nula como valor único para impedir duplicidade. Para `CONFLICTS_WITH`, a persistência usa uma ordenação canônica de origem/destino e a avaliação é simétrica.

`relationship_type` possui os efeitos genéricos abaixo:

| `relationship_type` | Efeito genérico |
| --- | --- |
| `REQUIRES` | Quando o sujeito é selecionado, o objeto também deve estar presente na baseline ou na arquitetura do módulo, atendendo a condição de versão e escopo da regra. |
| `CONFLICTS_WITH` | Sujeito e objeto não podem coexistir na mesma baseline ou arquitetura do módulo no escopo definido. |
| `RECOMMENDS` | Quando o sujeito é selecionado, o objeto é recomendado. Sua ausência não bloqueia a publicação para severidade `WARNING` ou `INFO`, mas pode exigir justificativa auditável. |

`REQUIRES` e `RECOMMENDS` são direcionais. Regras ativas participam de novas validações e regras inativas permanecem auditáveis, sem reavaliar Baselines históricas. Um perfil que contém conflito ativo de severidade `ERROR` não pode ser publicado; recomendações `WARNING` ou `INFO` não impedem publicação. Condições de versão e severidade são dados da regra; o avaliador genérico apenas aplica os operadores.

#### Conjunto inicial de regras

| Origem | `relationship_type` | Destino | `constraint_expression` | `severity` | `is_active` | `message` |
| --- | --- | --- | --- | --- | --- | --- |
| `MODULAR_MONOLITH` | `REQUIRES` | `IN_PROCESS_MODULE_CALL` | `NULL` | `ERROR` | `true` | Monólito modular requer comunicação interna em processo. |
| `MICROSERVICES` | `CONFLICTS_WITH` | `IN_PROCESS_MODULE_CALL` | `NULL` | `ERROR` | `false` | Microsserviços não são compatíveis com comunicação interna em processo. |

`MICROSERVICES` permanece inativo; por isso sua regra também começa inativa. As regras propostas para `NESTJS → TYPESCRIPT`, `NESTJS → NODEJS_22`, `PRISMA → POSTGRESQL` e `REST_JSON → OPENAPI` não são cadastradas nesta publicação, pois NestJS, Prisma e OpenAPI não existem como itens ativos suportados no catálogo atual. Nenhuma regra é criada para Kafka depender de `EVENT_DRIVEN`, pois esse item não existe no catálogo. Quando os itens e capacidades correspondentes forem publicados, regras poderão ser adicionadas por nova publicação governada.

### Technology Inventory

O inventário não “detecta tecnologias” como resultado final. Ele executa obrigatoriamente o fluxo abaixo e só então produz evidência:

```text
Detectar fato sanitizado no repositório
        ↓
Resolver contra o snapshot `PUBLISHED` de technology_catalog_revisions
        ↓
Gerar snapshot imutável da detecção e de sua resolução
```

`technology_inventory` é esse snapshot read-only, ligado ao projeto, ao SHA do repositório, à execução que o produziu e ao `technology_catalog_revision_id` `PUBLISHED` usado. Cada fato detectado contém `source_path`, `detector_code`, `confidence`, valor resumido, resultado da resolução e, quando resolvido, `catalog_item_id`; nunca inclui conteúdo integral de configuração, credencial, segredo, variável de ambiente ou log bruto.

A resolução consulta exclusivamente o Catálogo Tecnológico e registra um dos resultados sanitizados: `RESOLVED_ACTIVE` para uma revisão publicada e selecionável; `RESOLVED_INACTIVE` quando a identidade encontrada está inativa ou não selecionável; `UNKNOWN_CATALOG_ITEM` quando não existe correspondência publicada; ou `AMBIGUOUS_CATALOG_ITEM` quando há mais de uma correspondência possível. Um fato `RESOLVED_INACTIVE` permanece como evidência histórica, mas não pode ser escolhido para uma nova baseline. Fatos desconhecidos ou ambíguos não recebem ID inventado, não são tratados como tecnologia aprovada e exigem resolução por publicação governada no catálogo antes de poderem integrar uma baseline. A criação, ativação, inativação ou alteração de categorias, itens, revisões, perfis e regras é proibida ao inventário.

O inventário é evidência de apoio, não condição de elegibilidade. A baseline pode referenciar qualquer item ativo da revisão `PUBLISHED` selecionada, independentemente de o inventário ter ou não detectado a tecnologia correspondente no repositório do projeto. Um item ativo não detectado permanece elegível para seleção deliberada pelo operador dentro das regras do perfil e do catálogo; a presença ou ausência no inventário apenas informa a decisão e permanece auditada como evidência. Fato `UNKNOWN_CATALOG_ITEM` ou `AMBIGUOUS_CATALOG_ITEM` não pode integrar a baseline, pois não corresponde a um item catalogado. Essa regra reforça que a autoridade de seleção é o catálogo publicado, e o inventário nunca bloqueia nem adiciona tecnologias por si só.

A coleta usa uma lista fechada de caminhos e parsers locais (por exemplo `package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `pyproject.toml`, `Dockerfile`, manifests de infraestrutura e pipelines). O inventário inspeciona exclusivamente o repositório vinculado ao projeto, no SHA persistido (`repository_sha`); nunca inventaria o próprio repositório da plataforma NAAMIVE, salvo se ele for, ele próprio, o repositório alvo do projeto. O job lê exclusivamente uma worktree Git temporária e detached criada no `repository_sha` persistido na reserva do job; não lê a árvore de trabalho do operador nem `HEAD` atual. Antes e depois da leitura confirma que `rev-parse <sha>` resolve exatamente o SHA reservado, registra `requested_sha` e `read_sha`, e falha sem snapshot se divergirem. A criação/remoção da worktree é controlada pelo runtime, fora dos paths de desenvolvimento, e não executa scripts do projeto, hooks Git, gerenciador de pacotes ou comando indicado pelo repositório.

O caminhamento rejeita symlink, submódulo, path fora da allowlist, arquivo acima do limite versionado e manifesto malformado; registra somente o código sanitizado da rejeição, path permitido e detector. Parsers têm limite de bytes, profundidade e tamanho de campos; nunca serializam conteúdo, lockfiles integrais, variáveis, URLs com credenciais, stdout/stderr ou prompts. Ausência de evidência é “não detectado”, não prova de ausência.

### Technology Baseline

`technology_baselines` identifica o contrato tecnológico de um projeto. Ela é a raiz estável cujas revisões formalizam, com base no catálogo e na evidência disponível, os limites acordados entre Produto e Engenharia. A baseline não armazena identidades tecnológicas em texto livre.

### Technology Baseline Revision

`technology_baseline_revisions` possui cardinalidade muitas-para-uma com `technology_baselines`: uma baseline tem revisões numeradas monotonicamente, e uma revisão pertence a exatamente uma baseline. A revisão é imutável, possui estado, `inventory_id` usado, autor/ator servidor, correlação e artefato canônico. Seu payload contém itens de baseline baseados exclusivamente em referências imutáveis ao Catálogo Tecnológico. Um Perfil Tecnológico pode ser usado para propor uma combinação, mas seus itens são expandidos e persistidos individualmente na baseline; o perfil é somente a origem auditável, nunca substituto da referência catalogada.

| Área | Conteúdo |
| --- | --- |
| Stack existente | Itens catalogados confirmados e vínculo com o inventário. |
| Tecnologias permitidas/preferidas | Itens catalogados de linguagem/runtime, frameworks e bibliotecas/padrões relevantes. |
| Persistência e integração | Itens catalogados de banco, mensageria, APIs e contratos permitidos ou proibidos. |
| Infraestrutura | Itens catalogados de build, execução, deploy e ambientes, quando conhecidos. |
| Segurança e compatibilidade | Referências a regras de compatibilidade aplicáveis aos itens catalogados. |
| Decisões abertas | Registro explícito `DEFER_TO_MODULE_ARCHITECTURE`, escopado por `category_id`, com pergunta e justificativa. |

A revisão da baseline fixa obrigatoriamente `technology_catalog_revision_id`; cada item nela tem a seguinte estrutura:

| Campo | Regra |
| --- | --- |
| `catalog_item_id` | FK para `technology_catalog_items`; identifica a tecnologia de forma canônica. |
| `technology_catalog_revision_id` | FK obrigatório na revisão de Baseline para `technology_catalog_revisions`; congela o universo de categorias, itens, perfis e regras usado por todos os seus itens. Não é uma revisão independente por item. |
| `classification` | Um de `REQUIRED`, `ALLOWED`, `PREFERRED` ou `PROHIBITED`; determina a regra aplicável ao módulo. |
| `version_constraint` | Restrição SemVer ou versão exata, obrigatória somente quando `metadata.version_governance = REQUIRED` no snapshot catalogado; validada contra a revisão publicada. |
| `reason` | Justificativa auditável da decisão; pode explicar o contexto, mas não pode identificar, nomear, versionar ou criar uma tecnologia em texto livre. |

O payload obedece a um JSON Schema versionado (`technology-baseline/v1`). A revisão de Baseline exige `technology_catalog_revision_id` com status `PUBLISHED`; cada item exige `catalog_item_id`, `classification` e `reason`, e `version_constraint` é obrigatório somente quando o item estiver marcado no snapshot com `metadata.version_governance = REQUIRED`. Para uma nova Baseline, o item deve estar ativo no snapshot publicado; item inativo só permanece resolúvel em revisões históricas que já o referenciem. `technology_profile_id` e `technology_compatibility_rule_id` podem ser registrados apenas como origem e regra aplicada, respectivamente, sem substituir os campos obrigatórios do item. Para a mesma referência e escopo não pode haver mais de uma classificação nem restrições incompatíveis; `DEFER_TO_MODULE_ARCHITECTURE` é uma decisão aberta separada que contém `category_id`, pergunta e justificativa, é exclusiva daquela categoria e não pode coexistir com uma classificação tecnológica para a mesma decisão. A precedência de validação é `PROHIBITED` (nega) > `REQUIRED` (exige restrição compatível) > `PREFERRED` (orienta) > `ALLOWED` (permite). O servidor valida schema, FKs, presença do item e do perfil no snapshot, estado ativo congelado para nova seleção, política de versão, restrições e regras de compatibilidade da revisão publicada, e rejeita contradições antes de criar a revisão. A arquitetura do módulo declara somente as mesmas referências e só pode ser aprovada se satisfizer todos os `REQUIRED`, nenhum `PROHIBITED` e todas as compatibilidades aplicáveis; `PREFERRED` divergente exige justificativa auditada.

“Não definido” só é válido como decisão aberta explícita; não é string vazia. O gate aprova uma revisão, não uma inferência. Revisões `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` e `SUPERSEDED` não são sobrescritas.

Uma alteração material — tecnologia requerida/proibida, versão de runtime, banco, integração, segurança, infraestrutura ou decisão aberta que afete compatibilidade — cria revisão nova e gate. Texto explicativo e metadado sanitizado podem ter correção editorial sem alterar a revisão aprovada apenas se não mudarem a semântica; essa classificação deve ser auditada pelo servidor, nunca inferida pelo navegador.

### Referências aplicadas e integridade transacional

As migrations são exclusivamente aditivas e introduzem as tabelas abaixo:

| Grupo | Tabelas e relacionamentos |
| --- | --- |
| Categorias, itens e revisões | `technology_categories(id uuid PK, code varchar NOT NULL UNIQUE, name varchar NOT NULL, description text, selection_mode varchar NOT NULL, min_selections integer NOT NULL, max_selections integer NULL, is_active boolean NOT NULL, display_order integer NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)` → `technology_catalog_items(id uuid PK, category_id uuid NOT NULL FK, code varchar NOT NULL, name varchar NOT NULL, description text, is_active boolean NOT NULL, display_order integer NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, UNIQUE(category_id, code))`; `technology_catalog_revisions(id uuid PK, revision_number bigint NOT NULL UNIQUE, status varchar NOT NULL, description text, content_hash varchar NOT NULL, published_at timestamptz NULL, published_by varchar NULL, created_at timestamptz NOT NULL)`. |
| Perfis | `technology_profiles(id uuid PK, code varchar NOT NULL UNIQUE, name varchar NOT NULL, description text, is_active boolean NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)` → `technology_profile_items(profile_id uuid NOT NULL FK, catalog_item_id uuid NOT NULL FK, classification varchar NOT NULL, version_constraint varchar NULL, justification text, display_order integer NOT NULL, PRIMARY KEY(profile_id, catalog_item_id))`. O perfil compõe itens catalogados sem duplicidade. |
| Compatibilidades | `technology_compatibility_rules(id uuid PK, source_item_id uuid NOT NULL FK, relationship_type varchar NOT NULL, target_item_id uuid NOT NULL FK, constraint_expression varchar NULL, severity varchar NOT NULL, message text NOT NULL, is_active boolean NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, UNIQUE NULLS NOT DISTINCT(source_item_id, relationship_type, target_item_id, constraint_expression))`. Origem e destino apontam para itens do catálogo; a constraint impede auto-referência e a unicidade trata expressão nula como valor único. |
| Conteúdo congelado | `technology_catalog_revision_categories(revision_id FK, category_id FK, code, name, selection_mode, min_selections, max_selections, is_active, display_order, PRIMARY KEY(revision_id, category_id))`, `technology_catalog_revision_items(revision_id FK, catalog_item_id FK, category_id FK, code, name, description, is_active, display_order, metadata, PRIMARY KEY(revision_id, catalog_item_id))`, `technology_catalog_revision_profiles(revision_id FK, profile_id FK, code, name, description, is_active, PRIMARY KEY(revision_id, profile_id))`, `technology_catalog_revision_profile_items(revision_id FK, profile_id FK, catalog_item_id FK, classification, version_constraint, justification, display_order, PRIMARY KEY(revision_id, profile_id, catalog_item_id))` e `technology_catalog_revision_compatibility_rules(revision_id FK, compatibility_rule_id FK, source_item_id, relationship_type, target_item_id, constraint_expression, severity, message, is_active, PRIMARY KEY(revision_id, compatibility_rule_id))`. |
| Contexto de seleção | `technology_selection_contexts(id, project_id FK, technology_catalog_revision_id FK, technology_profile_id FK, hash, status, ...)`. O contexto referencia uma única revisão `PUBLISHED` e seu perfil ativo congelado. |
| Contrato do projeto | `technology_baselines(id, project_id, ...)` → `technology_baseline_revisions(id, baseline_id FK, project_id FK, technology_catalog_revision_id FK NOT NULL, selection_context_id FK, inventory_id FK, revision_number, payload, schema_version, status, ...)` → `technology_baseline_revision_items(id, baseline_revision_id FK, catalog_item_id FK, classification, version_constraint, reason, source_profile_id FK NULL, compatibility_rule_id FK NULL, ...)`; `technology_baseline_gates(id, project_id FK, baseline_revision_id FK, status, version, ...)` registra a decisão. |

Índices únicos preservam chave canônica por categoria, número global de revisão, vínculo de perfil por item, regra por origem/tipo/destino/expressão e cada referência dentro de um contexto. FKs compostas verificam que categoria, item, perfil e regra da Baseline pertencem ao `technology_catalog_revision_id` de seu contexto e que todas as entidades pertencem ao mesmo projeto. Não há `ON DELETE CASCADE` em dados publicados ou referenciados: exclusão física é vedada e a inativação somente bloqueia seleção futura.

O banco não contém enum, coluna, constraint ou tabela que represente uma tecnologia concreta. Tecnologias, fornecedores, linguagens, frameworks, bancos, versões e combinações são linhas versionadas do catálogo. Valores finitos genéricos de ciclo de vida, classificação e tipo de regra são permitidos porque descrevem o mecanismo, não uma tecnologia; adicionar uma tecnologia ou combinação aprovada é `INSERT`/publicação de dados, sem migration ou deploy da engine.

Toda alteração semântica cria uma nova revisão ou um novo contexto; linhas publicadas são append-only e mantêm ator, correlação, hash, vigência e referência à versão anterior quando aplicável. A tabela de itens da baseline veda colunas de nome, ecossistema ou versão tecnológica em texto livre; `reason` é a única justificativa textual e não é uma identidade tecnológica. Também adiciona `technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id)` a `modules`, `module_revisions`, `module_gates`, `work_items`, `deliveries` e `findings`; cria `qa_matrices(id, project_id FK, work_item_id FK, delivery_id FK, technology_baseline_revision_id FK NOT NULL, payload, hash, ...)`, substituindo a matriz congelada somente-em-payload. `jobs`/execuções Dev recebem a mesma coluna e `integration_candidates.manifest` inclui o ID por work item. Os artefatos `module-definition`, arquitetura, `module-plan`, `qa-report`, manifesto/validação de candidata e evidência Dev repetem o ID apenas como referência verificável, nunca como fonte de verdade.

Para um projeto v3, a materialização escolhe uma revisão aprovada e grava o mesmo ID em módulo, revisão e gate; toda escrita posterior o herda exclusivamente do pai persistido. A igualdade obrigatória é: `modules = module_revisions = module_gates`; `work_items = sua module_revision`; `deliveries = seu work_item`; `qa_matrices = sua delivery/work_item`; `findings = sua delivery` (ou, em candidata, o work item do manifesto); jobs/execuções e payloads de evidência repetem o ID da entidade de origem. Como regra arquitetural, todo contrato de implementação de um projeto v3 deve referenciar uma revisão de baseline `APPROVED` e nenhuma entidade pode ser criada ou atualizada sem essa referência, nem divergir da referência herdada do seu pai persistido; todas as entidades de um mesmo fluxo devem pertencer ao mesmo projeto. A única exceção é projeto com `workflow_code='PROJECT_DISCOVERY'` e `workflow_version <= 2`, marcado `BASELINE_NOT_REQUIRED_LEGACY`; rotas alternativas não podem escolher a exceção. Escrita direta, caminho alternativo e worker devem respeitar a mesma garantia, sem caminho de contorno.

Novo módulo pode usar a revisão recém-aprovada. Nesta terminologia, "revisão de baseline" refere-se exclusivamente ao contrato tecnológico da Fase 5 (uma revisão de `technology_baseline_revisions`); "revisão de módulo" refere-se ao ciclo de revisão de um módulo na definição F3 (`module_revisions`). Os dois ciclos são independentes: alterar a baseline no meio de um módulo ativo não muda o contrato do módulo — isso exigiria revisão de módulo e os gates correspondentes, ou decisão explícita de manter a baseline anterior. Registros legados podem ter a referência nula, acompanhada da marca de política legada; isso não é convertido retroativamente.

## Publicação inicial do Catálogo Tecnológico

Na Fase 5, o Catálogo Tecnológico é publicado exclusivamente por seeds versionadas no repositório. Não haverá tela administrativa, formulário de manutenção nem endpoint de escrita administrativa nesta fase. A API expõe somente leitura do catálogo para a jornada de projeto; qualquer criação, ativação, inativação ou revisão passa por alteração revisável dos seeds e por sua publicação governada.

O pacote inicial é composto pelos arquivos abaixo, validados por JSON Schema versionado antes de qualquer escrita. Todos usam o mesmo envelope: `schema_version` identifica a versão do contrato do arquivo, `catalog_revision` identifica o número da publicação global e `records` contém exclusivamente os registros daquele tipo. Os seis arquivos devem declarar o mesmo `schema_version` compatível e o mesmo `catalog_revision`; divergência entre envelopes falha antes de qualquer persistência. O `catalog_revision` declarado no envelope de cada seed é o mesmo valor persistido como `revision_number` na revisão publicada (`technology_catalog_revisions.revision_number`); não há numeração separada entre o contrato do pacote de seeds e a revisão global do catálogo. Publicações futuras incrementam ambos de forma monotônica e idêntica.

| Arquivo | Conteúdo publicado |
| --- | --- |
| `technology-categories.json` | Categorias, cardinalidade, estado e ordem de exibição. |
| `technology-catalog-items.json` | Itens canônicos, categoria de origem, estado, ordem e `metadata` declarativo. |
| `technology-profiles.json` | Identidade, status e metadados dos Perfis Tecnológicos. |
| `technology-profile-items.json` | Composição de cada perfil por IDs de itens do catálogo, classificação, restrição de versão, justificativa e ordem de exibição. |
| `technology-compatibility-rules.json` | Regras `REQUIRES`, `CONFLICTS_WITH` e `RECOMMENDS`, por referências de item, com condição, severidade e estado. |
| `technology-catalog-revision.json` | Metadados da publicação: descrição, número, hash esperado quando aplicável e intenção de publicar a revisão global. |

O publicador carrega os arquivos nesta ordem lógica: **1.** categorias; **2.** itens do catálogo; **3.** perfis; **4.** itens de perfil; **5.** regras de compatibilidade; **6.** publicação da revisão. A resolução por `code` estável é idempotente somente quando o registro existente é semanticamente igual ao seed; `code` duplicado no mesmo conjunto, referência inexistente ou alteração fora do fluxo de nova revisão falha explicitamente. Em especial, o publicador não reativa silenciosamente categoria, item, perfil ou regra que tenha sido alterado fora da seed.

Antes de persistir a publicação, o publicador valida o conjunto inteiro: referências de categoria, item e perfil; compatibilidade entre categoria e item; cardinalidade de cada perfil; regras ativas de severidade `ERROR`; e que todo item de perfil esteja ativo no snapshot que será publicado. Só então cria o `DRAFT` global, calcula o hash canônico do conteúdo normalizado e, em uma única transação quando tecnicamente possível, persiste identidades, associações versionadas, hash, evidência e a transição para `PUBLISHED`. Falha de validação, conflito de hash ou erro de persistência reverte a transação integralmente: não há revisão parcialmente carregada ou publicada. A publicação é idempotente por `revision_number` e hash do pacote; conflito com uma revisão já publicada falha explicitamente, sem sobrescrever histórico. Ao concluir, persiste ator, correlação, hash do pacote e evidência canônica no `ArtifactStore`.

O pacote inicial publica somente o perfil `TYPESCRIPT_MODULAR_MONOLITH` como `ACTIVE`. A ativação futura de categorias, itens, regras ou perfis ocorre somente por nova seed ou migration, com nova revisão publicada, preservando revisões existentes e sem exigir mudança na engine. Não há tela administrativa nesta fase. Uma experiência administrativa poderá ser planejada em fase posterior, desde que publique o mesmo contrato versionado e mantenha as mesmas garantias de validação, auditoria e imutabilidade.

## Workflow, seleção de versão, gates e comandos

Publicar `PROJECT_DISCOVERY` v3 completo, copiando todos os estados, transições, guards e políticas de arquivamento de v2 (inclusive `WAITING_FOR_REVIEW_ADJUSTMENT`, recuperação de falha e `ARCHIVE_PROJECT` → `PROJECT_ARCHIVING`), e acrescentando a baseline após o gate de produto. `startProductDiscovery` deixa de fixar `workflow_version=2`: para todo projeto criado após a publicação de v3, seleciona v3 na mesma transação que sai de `PROJECT_INTAKE/REGISTERED`; projetos que já iniciaram descoberta e todos os v2 continuam em sua versão. A seleção persiste no evento/operation e é imutável. Não há migração silenciosa de projetos em andamento.

Após a decisão `PRODUCT_COMMITMENT_APPROVED`, v3 primeiro prepara um contexto de seleção tecnológico e só então cria a baseline. A preparação seleciona e fixa, na mesma operação, uma `technology_catalog_revision` `PUBLISHED`, o Perfil Tecnológico `ACTIVE` dentro desse snapshot e as regras ativas aplicáveis. Em seguida, o inventário resolve seus fatos exclusivamente contra essa revisão e o servidor cria o `DRAFT` expandido da baseline. O workflow não conhece nem ramifica por itens, perfis ou regras específicos; apenas exige que o snapshot publicado seja válido e completo.

```text
PRODUCT_COMMITMENT
  → TECHNOLOGY_SELECTION_PREPARING
  → TECHNOLOGY_BASELINE_IN_REVIEW
  → WAITING_FOR_TECHNOLOGY_BASELINE
  ├─ APPROVE_TECHNOLOGY_BASELINE → READY_FOR_MODULE_MATERIALIZATION
  └─ REQUEST_BASELINE_ADJUSTMENTS → TECHNOLOGY_BASELINE_IN_REVIEW

READY_FOR_MODULE_MATERIALIZATION
  → MATERIALIZE_MODULE → módulo aguarda aprovação individual
  └─ START_TECHNOLOGY_BASELINE_REVISION
       → TECHNOLOGY_SELECTION_PREPARING
       → TECHNOLOGY_BASELINE_IN_REVIEW
```

O contexto de seleção registra `technology_catalog_revision_id`, perfil e regras presentes no snapshot, junto de hash, ator, correlação e evidência. A criação do `DRAFT` usa apenas esse snapshot; mudanças posteriores nas tabelas correntes não alteram uma revisão pendente ou aprovada. Uma nova revisão de baseline sempre reinicia a preparação e obtém o snapshot global `PUBLISHED` então selecionável, preservando o contexto anterior para histórico. Ausência de revisão publicada, perfil ativo no snapshot, item selecionável, regra consistente ou resolução válida impede criar o `DRAFT`, registra erro explicável e não produz baseline parcial.

`ARCHIVE_PROJECT` permanece disponível em cada estado ativo acima e segue integralmente a política global publicada: cancela/reconcilia job/gate de baseline, contexto de seleção e inventário, registra evidência e chega a `ARCHIVED`. `REQUEST_BASELINE_ADJUSTMENTS` fecha o gate daquela revisão como `REJECTED`; nunca retorna para editar o objeto rejeitado.

O nome exibido na timeline deve ser amigável: “Preparando orientações técnicas”, “Revisão técnica necessária” e “Orientações técnicas aprovadas”. Os estados/códigos internos só aparecem em evidência e suporte, não como chamada principal ao operador.

Comandos mínimos:

| Comando | Autoridade | Regra |
| --- | --- | --- |
| `PREPARE_TECHNOLOGY_SELECTION_CONTEXT` | worker | Só em `TECHNOLOGY_SELECTION_PREPARING`; fixa uma revisão global `PUBLISHED`, Perfil ativo e regras de compatibilidade aplicáveis em um contexto imutável. Não interpreta tecnologia específica. |
| `START_TECHNOLOGY_INVENTORY` | worker | Só após contexto de seleção válido e no SHA vinculado; resolve fatos contra o catálogo fixado, cria operação/job/evidência antes da leitura e nunca cria itens. |
| `CREATE_TECHNOLOGY_BASELINE_DRAFT` | servidor | Só após inventário resolvido e contexto válido; expande o Perfil ativo em itens de baseline e grava o `technology_catalog_revision_id` do contexto. Rejeita qualquer tecnologia em texto livre ou referência fora do snapshot. |
| `SUBMIT_TECHNOLOGY_BASELINE` | operador | Só para `DRAFT`; revalida perfil, catálogo e compatibilidades contra o contexto fixado, valida schema e cria um único gate novo `OPEN` vinculado àquela revisão, mudando-a para `PENDING_APPROVAL`. Nunca atualiza gate. |
| `DECIDE_TECHNOLOGY_BASELINE` | operador | Exige versão do gate aberto; aprova ou rejeita-o definitivamente. Rejeição exige feedback, preserva a revisão/gate e retorna a `TECHNOLOGY_BASELINE_IN_REVIEW`. |
| `START_TECHNOLOGY_BASELINE_REVISION` | operador | A partir de revisão `REJECTED` ou `APPROVED`, inicia nova preparação de contexto e, apenas depois dela, cria novo `DRAFT` monotônico que aponta `supersedes_revision_id`. Nenhum rascunho é editado: corrigir seu conteúdo o marca `SUPERSEDED`/abandonado e cria outro rascunho numerado. Submeter cria novo gate. |
| `MATERIALIZE_MODULE` | operador | Para v3, exige baseline aprovada: usa a última aprovada por padrão ou aceita `technology_baseline_revision_id` explicitamente selecionada dentre as aprovadas do projeto; fixa-a na proposta. Para v2 legado mantém a regra existente. |

Há no máximo um gate `OPEN` por revisão (índice parcial); uma revisão tem no máximo uma decisão. Há no máximo um `DRAFT` ativo por baseline, mas revisões aprovadas podem coexistir para preservar módulos existentes. Após aprovação, `READY_FOR_MODULE_MATERIALIZATION` permanece disponível: iniciar uma nova revisão não bloqueia módulos enquanto houver ao menos uma revisão aprovada, e novos módulos recebem por padrão a última aprovada, ou outra aprovada escolhida pelo operador. Todo comando aceita `idempotency-key`, retorna `ACCEPTED` com `operation_id` quando assíncrono e registra evento persistido. O ator é obtido de `NAAMIVE_OPERATOR_ID`. Conflito de versão, baseline ausente ou tentativa de materializar com revisão não aprovada retorna erro explicável sem efeito.

## Evidências e auditoria

| Etapa | Artefato canônico mínimo |
| --- | --- |
| Inventário | `technology-inventory`: SHA observado, contexto de seleção, detectores/versões, fatos sanitizados, resoluções de catálogo, limitações e hash. |
| Revisão | `technology-baseline`: `technology_catalog_revision_id`, payload completo por IDs de item, perfil de origem, regras aplicadas, inventário de origem, classificações e decisões abertas. |
| Gate | `technology-baseline-decision`: versão, decisão, feedback e hash da revisão aprovada/rejeitada. |
| Mudança material | `technology-baseline-revision`: revisão anterior, resumo de diferenças classificadas e decisão aplicável. |

O protocolo de intenção, escrita, hash, transação e reconciliação do `ArtifactStore` é obrigatório. Caminhos de configuração podem ser registrados somente quando pertencem à allowlist; conteúdo, tokens, URLs com credenciais, stdout/stderr e prompts completos são proibidos.

## API, web e SSE

O Catálogo Tecnológico é uma fonte global, governada e somente-leitura para a jornada de projeto; as operações da baseline permanecem aninhadas no projeto. Nenhum endpoint aceita fatos tecnológicos calculados pelo navegador, nomes, ecossistemas, versões ou combinações tecnológicas em texto livre.

```text
GET  /api/technology/categories
GET  /api/technology/catalog-items?category_id=:categoryId&status=ACTIVE
GET  /api/technology/catalog-revisions/:catalogRevisionId
GET  /api/technology/profiles?status=ACTIVE
GET  /api/technology/profiles/:profileId

GET  /api/projects/:projectId/technology-baseline
GET  /api/projects/:projectId/technology-baseline/selection-context
POST /api/projects/:projectId/technology-baseline/inventory
POST /api/projects/:projectId/technology-baseline/revisions
POST /api/projects/:projectId/technology-baseline/decision
POST /api/projects/:projectId/technology-baseline/revisions/:revisionId/start-revision
```

`GET /api/technology/categories` e `GET /api/technology/catalog-items` retornam dados da revisão global `PUBLISHED` selecionável; `GET /api/technology/catalog-revisions/:catalogRevisionId` permite consultar seu snapshot imutável; e os endpoints de perfil retornam a composição expandida em referências de catálogo, suas classificações e compatibilidades aplicáveis. Na Fase 5, publicação, ativação e inativação são feitas somente pelos seeds versionados; não há tela nem endpoint administrativo, e inventário ou baseline nunca podem acioná-las implicitamente.

Qualquer corpo aceito para criar, complementar ou submeter uma revisão de baseline usa exclusivamente o contrato estruturado abaixo. `technology_profile_id` e `technology_compatibility_rule_id` são opcionais como origem e regra aplicável, mas não substituem as referências obrigatórias:

```json
{
  "selection_context_id": "uuid",
  "technology_catalog_revision_id": "uuid",
  "items": [
    {
      "catalog_item_id": "uuid",
      "classification": "REQUIRED",
      "version_constraint": ">=22 <23",
      "reason": "Compatibilidade com a plataforma do projeto",
      "technology_profile_id": "uuid",
      "technology_compatibility_rule_id": "uuid"
    }
  ]
}
```

O servidor ignora ou rejeita campos como `technology_name`, `ecosystem`, `technology_version`, `framework` ou qualquer valor que tente identificar uma tecnologia fora de `catalog_item_id` e `technology_catalog_revision_id`. Ele valida que a revisão global é a mesma do `selection_context_id`, que cada item pertence ao snapshot `PUBLISHED`, que seu estado congelado permite a operação e que as regras de compatibilidade são satisfeitas. `reason` pode ser texto explicativo, mas não cria identidade tecnológica.

### Interface dirigida por dados

A interface monta a jornada sem conhecer tecnologias específicas. Ao abrir a baseline, ela consulta `GET /api/technology/categories`, consulta os itens `ACTIVE` de cada categoria aplicável, consulta o Perfil Tecnológico `ACTIVE` e sua composição expandida, e consulta o contexto de seleção e inventário do projeto. Rótulos, ícones, ordem, capacidades, restrições de versão, classificações e compatibilidades são renderizados a partir das respostas publicadas do Catálogo, nunca de condicionais do navegador para linguagens, frameworks, bancos ou fornecedores.

Com o perfil e o contexto carregados, a interface apresenta os itens catalogados que compõem a baseline, suas classificações, restrições de versão, origem e regras aplicáveis. Ela permite ao operador justificar, dentro das regras do perfil, referências adicionais ou mudanças de classificação por meio de IDs de item e da revisão global; a validação definitiva continua no servidor. A montagem envia somente `selection_context_id`, `technology_catalog_revision_id`, `catalog_item_id`, `classification`, `version_constraint`, `reason` e referências auditáveis opcionais de perfil/regra. Ela não cria catálogo, não deduz compatibilidade e não envia nomes de tecnologias.

A tela apresenta primeiro uma explicação simples: “Estas orientações serão usadas ao planejar e desenvolver os próximos módulos. Você pode deixar decisões específicas para a arquitetura de cada módulo.” Em seguida mostra o que foi detectado, o que o operador confirmou, restrições, preferências e decisões em aberto, cada uma com fonte e incerteza quando aplicável. Ela não chama a decisão de deploy, entrega ou aprovação de código.

Enquanto a baseline estiver pendente, a ação “Criar módulo” fica indisponível e explica: “Revise as orientações técnicas antes de criar o primeiro módulo.” Após aprovação, a linha do tempo mostra a aprovação e a tela passa a oferecer a criação do módulo. Projetos legados mostram aviso informativo, sem bloquear nem fingir que possuem baseline aplicada.

SSE publica `TECHNOLOGY_SELECTION_CONTEXT_READY`, `TECHNOLOGY_INVENTORY_STARTED`, `TECHNOLOGY_INVENTORY_READY`, `TECHNOLOGY_BASELINE_SUBMITTED`, `TECHNOLOGY_BASELINE_APPROVED`, `TECHNOLOGY_BASELINE_ADJUSTMENTS_REQUESTED` e `TECHNOLOGY_BASELINE_REVISION_STARTED`. A projeção usa replay por cursor e mostra resumo sanitizado, duração, próxima ação, `technology_catalog_revision_id` e referências de evidência; não projeta nomes tecnológicos como dado autoritativo.

## Testes e validação

1. **Unitários de catálogo e baseline:** schema/normalização, FKs lógicas de item/revisão, classificação, versões/ranges, decisão aberta explícita, expansão de perfil e rejeição de perfil inválido (sem itens, com item inativo, revisão não publicada, item duplicado ou regra incompatível). Cobrem também revisão de catálogo: uma nova revisão é selecionável para novo contexto, sem mudar a resolução de baseline antiga, enquanto apenas itens ativos no snapshot podem integrar nova Baseline.
2. **Unitários de compatibilidade:** avaliam `REQUIRES`, `CONFLICTS_WITH` e `RECOMMENDS`, direção, simetria canônica de conflito, escopo, restrição de versão, precedência, justificativa de recomendação não adotada e rejeição de combinações inválidas. Nenhum caso depende de condicional para tecnologia concreta.
3. **PostgreSQL, seeds e histórico:** provam atomicidade de contexto/revisão/gate/evento/operação e da publicação de seeds, índices de unicidade, FKs compostas, ausência de cascata destrutiva e rejeição de referência fora do contexto. Executam o pacote inicial duas vezes sem duplicar registros; falha de validação ou persistência não deixa revisão `PUBLISHED` incompleta; e conferem hash e conteúdo exato da revisão inicial, com somente `TYPESCRIPT_MODULAR_MONOLITH` ativo e `MICROSERVICES` inativo. Cobrem item inativo, múltiplas revisões de catálogo e perfil, baseline antiga e histórico: inativar ou revisar catálogo/perfil/regra impede novo uso, mas mantém legíveis e válidas as revisões, módulos e evidências anteriores.
4. **Integração de inventário:** cobre resolução ativa, item inativo, tecnologia desconhecida e correspondência ambígua, além de crash/retry após reserva e antes/depois da escrita, mudança de `HEAD` entre enfileiramento e leitura, worktree detached no SHA, symlink, submódulo, path fora da allowlist, arquivo excessivo, manifesto malformado, segredo e arquivo não suportado. Confirma ausência de execução, de exposição sensível e de criação ou alteração no Catálogo Tecnológico.
5. **Workflow e múltiplas revisões:** compromisso aprovado → preparação do contexto → inventário resolvido → `DRAFT` expandido → aprovação → módulo; uma revisão posterior reinicia o contexto, pode adotar nova revisão de catálogo ou perfil e abre novo gate, sem alterar baseline antiga nem módulo ativo. Valida bloqueio antes do gate e a herança da revisão ao módulo, work item, QA e Dev.
6. **E2E de API e web:** UI consulta categorias, itens ativos e perfil ativo do snapshot publicado; monta payload somente com IDs catalogados e rejeita texto tecnológico livre. Uma nova seed publicada pode disponibilizar item, regra e perfil para projeto novo sem alterar a engine, endpoints genéricos ou workflow, mas somente após a capacidade técnica aplicável existir e ser validada.
7. **Regressão Fase 3:** cenário de projeto legado continua a materializar e entregar módulo sem baseline retroativa; cenário v3 não pode iniciar Dev se alguma referência obrigatória de baseline estiver ausente.

## Sequência F5-01 a F5-06

| Ordem | Tarefa | Resultado verificável | Status |
| --- | --- | --- | --- |
| 1 | F5-01 | Seeds versionados publicam transacionalmente a revisão inicial do catálogo, categorias, itens, perfil, cardinalidade e regras; v2 permanece intacto. | `DONE` |
| 2 | F5-02 | Workflow v3 fixa uma revisão `PUBLISHED`; inventário seguro e read-only resolve fatos exclusivamente nesse snapshot e gera evidência sanitizada no SHA vinculado. | `DONE` |
| 3 | F5-03 | Baseline/revisões/evidências imutáveis persistem `technology_catalog_revision_id`, `catalog_item_id`, classificações, restrições e decisões abertas. | `DONE` |
| 4 | F5-04 | API, web e SSE consultam o snapshot publicado e permitem revisão humana dirigida por dados, payload sem tecnologia livre e gate versionado. | `DONE` |
| 5 | F5-05 | Novo projeto não materializa o primeiro módulo sem baseline aprovada composta somente por itens ativos da revisão publicada; legado não é bloqueado. | `DONE` |
| 6 | F5-06 | A revisão aplicada permanece referenciada por todos os contratos de implementação relevantes; evolução futura ocorre por capacidade implementada e nova revisão de catálogo. | `DONE` |

Esta sequência foi concluída e validada. O roadmap consolidado registra F5-01 a
F5-21 como `DONE`; a TD-F5-001 continua `OPEN` exclusivamente como melhoria
futura de cobertura automatizada, sem pendência funcional da Fase 5.

## Critério de aceite da Fase 5

O aceite demonstra a jornada completa, sempre por referências versionadas:

```text
Catálogo Tecnológico
        ↓
Perfil Tecnológico
        ↓
Projeto
        ↓
Technology Baseline
        ↓
Módulo
```

1. **Seeds, Catálogo e Perfil:** executar o mesmo pacote de seeds duas vezes não duplica registros nem associações. A publicação inicial contém exatamente as categorias, itens, perfil e regras definidos neste plano; somente `TYPESCRIPT_MODULAR_MONOLITH` está ativo como perfil e `MICROSERVICES` permanece cadastrado, porém indisponível para novas Baselines. A API retorna o snapshot publicado e suas opções selecionáveis; a engine não contém referência aos seus nomes.
2. **Atomicidade da publicação:** uma falha de schema, referência, cardinalidade, compatibilidade `ERROR`, estado ativo ou persistência não deixa revisão `PUBLISHED` incompleta. O hash canônico e todas as associações congeladas só existem para a revisão efetivamente publicada.
3. **Projeto e Baseline:** em um repositório descartável, um projeto alcança o compromisso de produto. O workflow fixa uma revisão global `PUBLISHED`, perfil ativo, catálogo e compatibilidades em um contexto imutável; o inventário sanitizado resolve os fatos nesse contexto. A UI monta o `DRAFT` com `technology_catalog_revision_id`, `catalog_item_id`, `classification`, `version_constraint` e `reason`. Fato desconhecido, ambíguo ou item inativo permanece visível como evidência, mas não integra a baseline nem cria item no catálogo.
4. **Módulo:** antes da aprovação, API e UI recusam a criação do primeiro módulo. Depois do gate, a proposta do módulo, sua arquitetura, work item, matriz de QA e execução Dev conservam a mesma revisão de baseline e as referências exatas do catálogo. Uma revisão posterior do contrato cria novo contexto e novo gate, sem modificar registros já autorizados.
5. **Evolução por configuração:** posteriormente, somente após a capacidade aplicável de inventário, baseline, arquitetura, planejamento, QA e execução Dev estar implementada e validada, uma nova versão dos seeds publica nova categoria ou item, regras de compatibilidade e Perfil Tecnológico que o inclua. Um novo projeto consulta a revisão publicada, fixa o novo contexto e cria sua baseline e módulo com as novas referências. Essa ativação não altera o contrato central da engine, workflow, endpoints genéricos, enums tecnológicos ou migrations; projetos e módulos anteriores continuam resolvendo suas revisões históricas.

Um projeto v2 já em `PRODUCT_COMMITMENT` continua consultável e executa a jornada legada sem inserção retroativa de evento ou baseline. Timeline, SSE e evidências permitem auditar todas as etapas sem revelar conteúdo sensível ou executar código do repositório.
