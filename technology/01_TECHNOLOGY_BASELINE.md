# NAAMIVE — Technology Baseline

**Status:** BRAINSTORM  
**Versão:** 0.6  
**Natureza:** desenho técnico derivado; ainda não aprovado para implementação  
**Deriva de:** `NB-0001`  
**Fase:** SECOND DOCUMENTATION ROUND — TECHNICAL IMPLEMENTATION DESIGN  
**Brainstorms consolidados:** 2.1 — Fundação Técnica e Shell da Aplicação; 2.2 — Core Technology Stack e Automated Regression; 2.3 — Web ↔ Worker Transport; 2.4 — Security Implementation; 2.5 — Observability Tooling; 2.6 — Deployment Model  
**Última atualização:** 2026-09-07

---

## 1. Propósito

Este documento define a fundação técnica proposta para implementar o NAAMIVE
sem alterar, enfraquecer ou reinterpretar as regras já ratificadas em
`NB-0001`.

A primeira rodada documental respondeu principalmente:

```text
O QUE o NAAMIVE é
QUAL problema resolve
QUAIS são os lifecycles
QUAIS são as regras
QUEM possui authority
QUANDO uma transição é válida
COMO falhas, recovery, audit e continuity devem se comportar
```

Esta segunda rodada responde:

```text
COMO implementar tecnicamente essa lei?
```

A Technology Baseline não substitui a Normative Baseline.

```text
NB-0001
  ↓
Technology Baseline
  ↓
Arquitetura concreta
  ↓
Implementação
```

Se uma decisão técnica exigir mudança na lei do sistema, a solução não deve ser
“adaptar silenciosamente” a implementação. O impacto deve ser tratado como
possível mudança normativa separada.

---

## 2. Princípio arquitetural central

O `web` será implementado como **monólito modular**.

A intenção é obter a simplicidade operacional de um monólito com fronteiras
internas comparáveis às de serviços independentes:

```text
um deploy
+
um processo principal
+
módulos de negócio fortemente delimitados
+
contratos explícitos
+
internals privados
+
dependências controladas
```

A arquitetura deve favorecer:

- compreensão local;
- baixo acoplamento;
- alta coesão;
- manutenção segura;
- criação simples de novos módulos;
- evolução sem efeito cascata desnecessário;
- fronteiras verificáveis automaticamente.

A robustez não deve vir de distribuir fisicamente o sistema cedo demais.

O objetivo é preservar fronteiras fortes **dentro do monólito**.

---

## 3. Decisões aprovadas no Brainstorm 2.1

### D2.1-01 — Runtime principal

```text
Node.js
```

Node.js permanece como runtime principal do novo NAAMIVE.

A versão exata ainda será definida.

---

### D2.1-02 — Linguagem principal

```text
TypeScript
```

TypeScript será a linguagem padrão de implementação.

JavaScript sem tipagem não deve ser usado como padrão para código de aplicação.

Motivações:

- contratos explícitos;
- maior segurança de refactor;
- melhor legibilidade;
- melhor suporte a boundaries;
- melhor capacidade de validação estática;
- menor risco de acoplamentos acidentais.

---

### D2.1-03 — Deployables iniciais

A solução terá inicialmente dois projetos executáveis:

```text
web
worker
```

Visão:

```text
                ┌────────────┐
                │ PostgreSQL │
                └──────┬─────┘
                       │
          ┌────────────┴────────────┐
          │                         │
        WEB                       WORKER
  modular monolith           execução assíncrona
```

Não criar inicialmente uma arquitetura distribuída com múltiplos microserviços.

---

### D2.1-04 — Aplicação `web`

`web` será um **monólito modular** contendo frontend e backend no mesmo
deployable, mantendo separação interna clara de responsabilidades.

Conceitualmente:

```text
web
├── backend
│   ├── modules
│   ├── application
│   ├── infrastructure
│   └── api
└── frontend
    ├── shell
    ├── modules
    └── shared-ui
```

A estrutura física exata ainda será definida.

O ponto aprovado é:

```text
frontend + backend
dentro do mesmo deployable web
sem misturar suas responsabilidades
```

---

### D2.1-05 — Aplicação `worker`

`worker` será responsável pelas capacidades assíncronas e operacionais que não
devem depender do ciclo HTTP da aplicação web.

Escopo conceitual esperado:

```text
Executions
Scheduling
Background work
Recovery
Reconciliation
Async handoffs
Operational continuity
```

A divisão exata entre responsabilidades do `web` e do `worker` será refinada em
documentação posterior.

---

### D2.1-06 — Banco de dados

```text
PostgreSQL
```

PostgreSQL permanece como banco principal.

Para o reboot será criada uma base nova.

Não reutilizar a base anterior como fundação da nova implementação.

O legado pode ensinar, mas não governa o novo desenho físico.

---

### D2.1-07 — Ambiente local

```text
Docker
```

PostgreSQL será executado localmente via Docker.

A composição completa de desenvolvimento ainda será definida.

---

## 4. Monólito modular

### 4.1 Módulos por capacidade de negócio

A organização principal deve seguir capacidades de negócio, e não camadas
técnicas globais.

Evitar arquitetura principal semelhante a:

```text
controllers/
services/
repositories/
models/
```

com entidades de todo o sistema misturadas.

Preferir:

```text
modules/
├── need/
├── project/
├── business-module/
├── work-item/
├── governance/
├── execution/
├── delivery/
└── ...
```

Cada módulo pode possuir internamente suas próprias camadas.

Exemplo conceitual:

```text
project/
├── api/
├── application/
├── domain/
├── persistence/
└── public-contract/
```

Os nomes finais ainda serão definidos.

---

### D2.1-08 — Módulos representam capacidades

Um módulo técnico deve corresponder a uma capacidade clara do domínio.

Não criar módulos apenas porque determinada tecnologia existe.

Exemplo:

```text
Project
Need
Execution
Governance
Delivery
```

são candidatos naturais a boundaries.

```text
Controllers
Services
Repositories
```

não são capacidades de negócio.

---

### D2.1-09 — Internals privados

O interior de um módulo é privado.

Outro módulo não deve importar diretamente:

```text
entities internas
repositories internos
services internos
mappers internos
controllers internos
persistência interna
```

Integração entre módulos deve ocorrer por superfície explícita e estável.

Conceito:

```text
Module A
   ↓
Public Contract
   ↓
Module B
```

e não:

```text
Module A
   ↓
Module B internals
```

---

### D2.1-10 — Public contracts explícitos

Cada módulo que precisar ser consumido por outros deve expor uma interface
pública deliberada.

Essa superfície deve deixar claro:

- o que pode ser chamado;
- quais dados podem entrar;
- quais dados podem sair;
- quais invariantes são preservadas;
- quais erros são possíveis;
- quais operações são síncronas ou assíncronas.

A existência de um arquivo interno não significa permissão de uso por outro
módulo.

---

### D2.1-11 — Ownership de dados

Cada módulo é responsável pelos seus próprios dados.

Mesmo compartilhando o mesmo PostgreSQL:

```text
Need owns Need data
Project owns Project data
Execution owns Execution data
Governance owns Governance data
```

Um módulo não deve atualizar diretamente a persistência privada de outro.

Evitar:

```text
ProjectService
  ↓
UPDATE execution_table
```

Preferir:

```text
Project
  ↓
Execution public contract
  ↓
Execution module
  ↓
Execution persistence
```

---

### D2.1-12 — Sem acesso cruzado direto ao banco

A existência de um único PostgreSQL não autoriza acesso irrestrito entre
módulos.

Como regra arquitetural:

```text
módulo A
não consulta/altera diretamente
tabelas privadas do módulo B
```

Casos legítimos de leitura agregada, reporting ou projections deverão ser
desenhados explicitamente.

---

### D2.1-13 — Shared mínimo

Diretórios como:

```text
shared/
common/
utils/
helpers/
```

devem ser tratados com cautela.

Regra:

```text
shared = exceção
```

Infraestrutura realmente transversal pode ser compartilhada, por exemplo:

```text
configuration
clock
ids
database primitives
transactions
logging
telemetry primitives
```

Regra de negócio pertencente a um módulo não deve migrar para `shared` apenas
porque outro módulo também precisa dela.

Duplicação pequena pode ser preferível a criar dependência arquitetural errada.

---

### D2.1-14 — Dependências direcionais

Dependências entre módulos devem ser explícitas e direcionais.

Evitar grafos do tipo:

```text
Need ↔ Project ↔ Execution ↔ Governance
 ↑                         ↓
 └─────────────────────────┘
```

A arquitetura deve permitir identificar:

```text
quem depende de quem?
por qual contrato?
por qual razão?
```

Dependência circular deve ser tratada como sinal arquitetural de problema.

---

### D2.1-15 — Boundaries verificáveis

As fronteiras entre módulos não devem existir apenas em documentação.

A implementação deverá possuir guardrails automatizados capazes de detectar
violações.

Exemplos de violações que devem ser detectáveis:

```text
import direto de internals de outro módulo
dependência circular proibida
acesso a persistence privada de outro módulo
uso de camada proibida
```

Esses checks devem fazer parte do build e/ou CI quando a estrutura concreta for
definida.

---

### D2.1-16 — Novo módulo deve ser barato

A arquitetura será considerada saudável quando um novo módulo puder ser criado
sem exigir conhecimento detalhado de todo o monólito.

Objetivo conceitual:

```text
criar módulo
  ↓
definir boundary
  ↓
expor contracts
  ↓
declarar dependências permitidas
  ↓
testar
```

Evitar arquiteturas em que adicionar uma capacidade exija editar diversos
arquivos centrais e conhecer internals de módulos não relacionados.

---

## 5. Relação entre `web` e `worker`

`web` e `worker` são dois deployables distintos, mas não devem se transformar em
duas interpretações diferentes da lei do sistema.

O desenho futuro deverá garantir que ambos compartilhem de forma segura:

- contratos;
- tipos fundamentais;
- identificadores;
- invariantes técnicas;
- conceitos derivados de `NB-0001`.

Sem:

- duplicar regra de negócio;
- copiar código de domínio;
- criar implementações divergentes;
- permitir que o worker contorne authority ou lifecycle.

A forma concreta dessa reutilização ainda está aberta.

---

## 6. Shell da aplicação web

A experiência autenticada terá uma estrutura fixa de aplicação.

### 6.1 Login separado

Antes da autenticação:

```text
┌──────────────────────────────────────────┐
│                                          │
│              TELA DE LOGIN               │
│                                          │
└──────────────────────────────────────────┘
```

Login é uma tela separada do shell principal.

Após autenticação válida:

```text
login
  ↓
autenticação
  ↓
redirect
  ↓
página principal
```

---

### D2.1-17 — Application Shell

Após login, a página principal terá:

```text
┌──────────────────────────────────────────────────────┐
│                  MENU HORIZONTAL                     │
├───────────────┬──────────────────────────────────────┤
│               │                                      │
│ MENU          │                                      │
│ VERTICAL      │          CONTENT AREA                │
│               │                                      │
│ Projetos      │        inicialmente vazia            │
│ do usuário    │                                      │
│               │                                      │
│               │                                      │
└───────────────┴──────────────────────────────────────┘
```

Estrutura:

```text
Application Shell
├── Horizontal Menu
├── Vertical Menu
└── Content Area
```

---

### D2.1-18 — Content Area inicialmente vazia

Após login, a área principal pode permanecer vazia até o usuário selecionar uma
ação ou projeto.

Não priorizar dashboard nesta etapa.

Possibilidade futura:

```text
content area inicial
  ↓
dashboard
```

Dashboard fica explicitamente postergado.

---

### D2.1-19 — Navegação por menu

Ao selecionar um item do menu:

```text
menu item
  ↓
content area
  ↓
tela correspondente
```

Cadastros e demais telas devem abrir dentro da área principal do shell.

Evitar substituir toda a estrutura da aplicação a cada navegação.

---

### D2.1-20 — Projetos no menu vertical

O menu vertical apresentará os projetos acessíveis ao usuário autenticado.

Conceito:

```text
authenticated principal
        ↓
backend authority / visibility
        ↓
authorized projects
        ↓
vertical menu
```

O frontend não é responsável por decidir segurança.

Regra:

```text
backend decide
frontend apresenta
```

Filtragem visual no frontend não substitui authorization no servidor.

---

## 7. Separação inicial entre menus

A hipótese atual é:

```text
MENU HORIZONTAL
→ contexto de plataforma

MENU VERTICAL
→ contexto de projetos
```

Exemplo conceitual, ainda não aprovado:

```text
Horizontal
├── cadastros
├── administração
├── configurações
└── usuário

Vertical
├── Projeto A
├── Projeto B
└── Projeto C
```

Essa divisão permanece em brainstorm até a definição dos módulos e da navegação
real da aplicação.

---

## 8. Princípios técnicos derivados da NB-0001

A implementação deverá preservar, no mínimo:

```text
one canonical truth
immutable history
projections are not truth
terminal means terminal
FAILED Execution is never resurrected
retry/recovery creates causal successor
authority must be provable
handoffs must be durable
fail-closed must remain actionable
unknown external effect requires reconciliation
baseline changes require impact coverage
human authority cannot be silently replaced by an agent
```

A arquitetura técnica existe para implementar essas propriedades, não para
redefini-las.

---

## 9. Regras de simplicidade

Robustez não significa complexidade gratuita.

Preferir:

```text
modular monolith
antes de microservices

explicit contracts
antes de acesso direto

single PostgreSQL
antes de bancos distribuídos sem necessidade

two deployables
antes de decomposição prematura

automated boundaries
antes de convenções informais
```

Distribuição física futura só deve ocorrer quando existir necessidade concreta.

---

## 10. Brainstorm 2.2 — Core Technology Stack

O Brainstorm 2.2 fecha a stack-base usada para implementar o desenho aprovado no
Brainstorm 2.1.

Princípio:

```text
framework é periferia

domain e application core
não dependem de Fastify, React ou Kysely
```

As ferramentas existem para implementar os boundaries do NAAMIVE.

Elas não definem a lei do domínio.

---

### D2.2-01 — Backend framework

```text
Fastify
```

Fastify será o framework HTTP do backend.

A escolha privilegia:

- baixo acoplamento ao framework;
- composição explícita;
- encapsulamento;
- plugins com escopo;
- boa integração com TypeScript;
- possibilidade de preservar o domínio independente da camada HTTP.

Regra:

```text
Fastify não entra no domínio.
```

Handlers HTTP devem adaptar requests para commands/queries da application layer.

---

### D2.2-02 — Frontend framework

```text
React
```

React será a base da interface web.

A aplicação é predominantemente autenticada e orientada a trabalho interno,
portanto não existe necessidade atual de adicionar um framework full-stack/SSR
como requisito estrutural.

---

### D2.2-03 — Frontend build tooling

```text
Vite
```

Vite será usado para desenvolvimento e build do frontend.

---

### D2.2-04 — Frontend routing

```text
React Router
```

React Router será responsável pela navegação do frontend dentro do shell da
aplicação.

A navegação deve preservar:

```text
horizontal menu
+
vertical project context
+
content area
```

---

### D2.2-05 — Persistence tooling

```text
Kysely
+
pg / node-postgres
+
PostgreSQL
```

Kysely será a camada tipada de construção e execução de SQL.

`pg` / `node-postgres` será o driver PostgreSQL.

A escolha busca manter a persistência próxima de SQL explícito, especialmente
para operações que dependam de:

```text
transactions
constraints
locking
fencing
idempotency
immutable history
projections
reconciliation
```

Kysely não deve transformar persistence models em domain models.

O domínio permanece independente da ferramenta de persistência.

---

### D2.2-06 — HTTP schema validation

```text
TypeBox
+
Fastify Type Provider
```

TypeBox será usado nos boundaries HTTP para definição e validação de contratos.

Princípio:

```text
TypeBox valida contrato de transporte.
Domain valida regra de domínio.
```

Schema HTTP não é fonte normativa de lifecycle ou business rule.

---

### D2.2-07 — Package manager

```text
pnpm
```

`pnpm` será o package manager do repositório.

---

### D2.2-08 — Workspace / monorepo tooling

```text
pnpm workspaces
```

O repositório usará workspaces nativos do pnpm.

Não adicionar inicialmente:

```text
Nx
Turborepo
```

A inclusão futura de tooling adicional exige necessidade concreta.

Packages internos podem ser usados para boundaries compiláveis, mas:

```text
package != microservice
package != deployable
```

Os deployables permanecem:

```text
web
worker
```

---

### D2.2-09 — Build backend e worker

```text
TypeScript
+
tsc
```

Backend e worker serão compilados com a toolchain TypeScript.

Ferramentas adicionais de bundling não fazem parte da baseline neste momento.

---

### D2.2-10 — Test runner

```text
Vitest
```

Vitest será o runner principal para testes automatizados da base TypeScript.

Ele poderá cobrir, conforme o tipo de teste:

```text
domain
application
architecture guardrails
integration
API
frontend
```

A classificação do teste deve permanecer explícita; usar o mesmo runner não
significa misturar responsabilidades entre suites.

---

### D2.2-11 — E2E desde a primeira vertical slice

```text
Playwright
```

Playwright fará parte da implementação desde a primeira vertical slice.

Não será tratado como melhoria futura.

O monorepo terá uma suite/projeto E2E próprio, separado dos deployables.

Estrutura conceitual:

```text
naamive/
├── apps/
│   ├── web/
│   └── worker/
├── tests/
│   └── e2e/
└── packages/
```

A estrutura física final pode ser refinada, preservando a separação.

---

### D2.2-12 — Automated Regression from Day One

Fluxos consolidados devem adquirir proteção automatizada contra regressão.

Princípio:

```text
funcionalidade consolidada
não depende de memória humana
para continuar funcionando
```

A partir da primeira vertical slice:

```text
implementação
   ↓
unit/domain tests
   ↓
integration/API tests aplicáveis
   ↓
E2E do comportamento crítico
   ↓
PASS
   ↓
funcionalidade consolidada
```

---

### D2.2-13 — Core Journeys Regression Suite

Será mantida uma suite E2E de jornadas centrais já consolidadas.

Ela cresce incrementalmente junto com o produto.

Exemplos conceituais futuros:

```text
login
application shell
Need lifecycle
Project lifecycle
human gate
Execution
recovery
Delivery
```

Somente fluxos implementados e consolidados entram na suite.

Não criar testes fictícios para funcionalidades ainda inexistentes.

---

### D2.2-14 — CI Regression Gate

Regressão automatizada será requisito de continuidade da implementação.

Pipeline conceitual:

```text
change
  ↓
architecture guardrails
  ↓
unit/domain
  ↓
integration/API
  ↓
E2E core journeys
  ↓
PASS
```

Uma task nova não é considerada saudável apenas porque sua nova funcionalidade
passa.

O comportamento consolidado anterior deve continuar passando.

---

### D2.2-15 — Architecture guardrails desde o início

Os testes/guardrails de arquitetura começam junto com a implementação.

Eles devem proteger, entre outros:

```text
module internals
dependency direction
forbidden cross-module imports
circular dependencies
persistence ownership
```

O mecanismo técnico exato para todas as verificações ainda pode ser refinado,
mas a existência do gate é obrigatória.

---

## 11. Brainstorm 2.3 — Web ↔ Worker Transport

O Brainstorm 2.3 define como os dois deployables iniciais trocam trabalho
assíncrono sem introduzir infraestrutura distribuída desnecessária.

A decisão preserva o mecanismo estrutural que funcionou no legado, mas corrige
a semântica de retry, recovery e autoridade para obedecer à `NB-0001`.

Princípio:

```text
transport durável
não é a mesma coisa que
Execution reutilizável
```

O PostgreSQL será o mecanismo durável de handoff entre `web` e `worker`.

---

### D2.3-01 — PostgreSQL-backed durable dispatch

O `web` não chama o `worker` diretamente por HTTP.

O `web` persiste a intenção/trabalho de forma durável no PostgreSQL.

O `worker` descobre trabalho elegível a partir dessa persistência.

Conceito:

```text
WEB
  ↓
durable intent / job / handoff
  ↓
PostgreSQL
  ↓
WORKER
```

O handoff deve permanecer recuperável após restart de qualquer processo.

---

### D2.3-02 — Sem broker externo inicialmente

Não adicionar inicialmente:

```text
Kafka
RabbitMQ
Redis queue
broker dedicado
```

Motivo:

- PostgreSQL já é dependência obrigatória;
- o volume e a topologia atuais não justificam um broker separado;
- um broker adicionaria novos failure modes;
- exigiria coordenação entre transação do banco e publicação externa;
- aumentaria deployment e observability sem resolver uma dor atual.

A introdução futura de broker exige necessidade concreta e nova decisão técnica.

---

### D2.3-03 — Worker polling

O `worker` buscará trabalho elegível no PostgreSQL.

A implementação deverá evitar polling frenético.

Cadência, backoff e wake-up strategy serão refinados posteriormente.

---

### D2.3-04 — Claim concorrente seguro

A aquisição de trabalho deverá usar mecanismo transacional equivalente a:

```text
SELECT ... FOR UPDATE SKIP LOCKED
```

ou mecanismo PostgreSQL de segurança equivalente.

Objetivo:

```text
vários workers podem competir
sem dois se tornarem autoritativos
para a mesma tentativa
```

O SQL físico final será definido no desenho de persistência.

---

### D2.3-05 — Lease

Uma Execution em execução assíncrona deverá possuir claim temporal.

A lease permite distinguir:

```text
executor ativo
vs
executor desaparecido
```

O tempo exato de lease permanece aberto.

---

### D2.3-06 — Heartbeat

Uma Execution `RUNNING` deverá renovar ou provar sua autoridade durante execução
quando o tipo de trabalho exigir duração suficiente para isso.

Heartbeat é mecanismo operacional.

Heartbeat:

```text
prova presença
```

Não significa:

```text
prova progresso funcional
```

Cadência será definida posteriormente.

---

### D2.3-07 — Fencing obrigatório

Lease sozinha não é suficiente.

Toda publicação autoritativa de resultado deverá provar que o executor ainda
possui a geração/token de autoridade corrente.

Conceito:

```text
Execution A
worker A
generation = 7

lease expira
        ↓
autoridade revogada
        ↓
nova Execution B
worker B
generation = 8

worker A reaparece
generation 7 != generation atual 8
        ↓
resultado rejeitado
```

Executor obsoleto não pode publicar resultado autoritativo.

---

### D2.3-08 — Expiração não ressuscita Execution

A semântica antiga de reaquisição do mesmo trabalho não deve ser aplicada como
ressurreição da mesma `Execution`.

Regra:

```text
lease expirada
→ autoridade perdida
→ Execution antiga não volta a RUNNING
```

Quando continuidade for permitida:

```text
Execution A
RUNNING
  ↓
EXPIRED / authority lost
  ↓
CANCELLED com causa preservada

nova tentativa governada
  ↓
Execution B
CREATED
  ↓
ELIGIBLE
  ↓
RUNNING
```

---

### D2.3-09 — Retry cria nova Execution causal

Retry técnico não reutiliza uma Execution terminal.

Regra:

```text
FAILED Execution
≠
Execution reativável
```

Retry:

```text
Execution A
FAILED
  ↓
policy + revalidation
  ↓
Execution B
CREATED
```

A nova Execution deve possuir vínculo causal com a anterior e com a mesma
intenção lógica quando aplicável.

---

### D2.3-10 — Recovery cria nova Execution causal

Recovery após falha terminal também cria nova Execution.

A nova tentativa deve registrar:

```text
cause
cause_ref
origin_execution_id
intent_id
normative_baseline_ref
governing baseline/version
```

conforme aplicável.

Recovery não apaga nem reescreve a tentativa anterior.

---

### D2.3-11 — Idempotência durável

A criação de trabalho e de tentativa deve ser idempotente em relação à intenção
lógica e à política de tentativa.

Duplo clique, request repetida, retry de transporte ou restart não devem
materializar múltiplas responsabilidades autoritativas equivalentes.

A implementação deverá usar chaves duráveis adequadas.

---

### D2.3-12 — Exactly-once lógico

Não exigir transporte físico exactly-once.

Exigir:

```text
um único resultado autoritativo
para a mesma intenção
```

Pode existir concorrência física ou redelivery, desde que fencing,
idempotência e autoridade impeçam dupla consolidação.

---

### D2.3-13 — Revalidation antes de RUNNING

Antes de uma Execution adquirir authority operacional para executar, revalidar,
conforme aplicável:

```text
Work Item
intention
dependencies
authority
cancellation
blockers
governing baseline/version
retry/recovery policy
absence of authoritative final result
```

Elegibility não deve ser presumida apenas porque existe um registro pendente no
banco.

---

### D2.3-14 — Revalidation antes de publicar resultado

Antes de consolidar sucesso ou efeito autoritativo, verificar novamente:

```text
claim current
fencing generation current
Execution authority current
Work Item version current
governing baseline compatible
intent still valid
no cancellation
no competing authoritative result
```

Processo físico vivo não implica authority válida.

---

### D2.3-15 — Reconciliation como safety net

O sistema deverá possuir reconciliation para reencontrar trabalho ou handoff que
ficou durável no PostgreSQL, mas cuja continuidade operacional foi interrompida.

Exemplos:

```text
web persiste e cai
worker cai após claim
worker perde conexão
processo reinicia
evento de wake-up é perdido
```

Reconciliation não deve criar nova responsabilidade cegamente.

Primeiro deve descobrir o estado durável existente.

---

### D2.3-16 — Efeito externo incerto

Quando a Execution produz efeito externo não transacional e o resultado se torna
incerto:

```text
não fazer retry cego
```

Primeiro:

```text
reconcile
```

quando duplicação puder ser prejudicial.

Idempotency key externa deve ser propagada quando suportada.

---

### D2.3-17 — Web e worker não compartilham autoridade implícita

O fato de ambos usarem o mesmo banco não permite ao `worker` contornar:

```text
lifecycle
authority
module contracts
ownership
baseline validation
```

O worker executa trabalho autorizado.

Ele não inventa autorização.

---

### D2.3-18 — Transporte é infraestrutura, handoff é domínio governado

A persistência técnica no PostgreSQL não substitui os requisitos de handoff.

Quando um handoff material existir, devem permanecer observáveis, conforme
aplicável:

```text
source
destination
responsibility
intent
baseline
normative baseline
authority context
causation
correlation
acceptance/status
```

---

## 12. Brainstorm 2.4 — Security Implementation

O Brainstorm 2.4 define a implementação-base de autenticação, autorização,
principals, secrets e security audit.

A decisão reaproveita os conceitos que funcionaram no legado, mas os alinha ao
modelo ratificado de identidade e authority da `NB-0001`.

Princípio:

```text
authenticated
!=
authorized
```

Identidade prova quem é.

Authority prova o que aquele principal pode fazer agora, sobre qual escopo e
sob qual contexto governante.

---

### D2.4-01 — Human authentication

Usuários humanos autenticam com:

```text
username
+
password
```

A aplicação não usará JWT no browser como mecanismo padrão.

---

### D2.4-02 — Password hashing

Passwords serão armazenadas somente como hash.

Algoritmo aprovado:

```text
Argon2id
```

Regras:

```text
plain password storage............. FORBIDDEN
reversible password encryption..... FORBIDDEN
password hash only................. REQUIRED
unique salt........................ REQUIRED
parameters configurable............ REQUIRED
```

Parâmetros concretos de memória/custo/paralelismo serão definidos na
implementação e poderão ser endurecidos no futuro.

---

### D2.4-03 — Server-side opaque session

Após autenticação humana válida:

```text
server
  ↓
creates opaque session
  ↓
stores only server-side session state/hash
  ↓
browser receives opaque session cookie
```

A sessão não carrega authority completa.

Regra:

```text
session identifies principal
authority is resolved separately
```

---

### D2.4-04 — HttpOnly cookie

Sessão humana será entregue por cookie:

```text
HttpOnly
SameSite
Secure in production
Path=/
```

A configuração concreta de duração e política de renovação será definida
posteriormente.

---

### D2.4-05 — No auth token in localStorage

É proibido usar como padrão:

```text
JWT in localStorage
session token in localStorage
long-lived auth credential in browser storage
```

O browser não deve possuir credencial reutilizável de longa duração fora do
cookie protegido.

---

### D2.4-06 — CSRF protection

Como autenticação humana usa cookie de sessão, mutações devem possuir proteção
CSRF.

Modelo aprovado:

```text
same-origin validation
+
CSRF token
```

Requests de leitura seguros podem ser tratados conforme método HTTP e policy.

---

### D2.4-07 — Authorization server-side only

Toda ação protegida é autorizada no servidor.

Regra:

```text
frontend may display capability
frontend never grants capability
```

Claims enviados pelo browser não são fonte de authority.

---

### D2.4-08 — Canonical Authority Service

A resolução de authority deve possuir mecanismo canônico centralizado.

Conceito:

```text
command
  ↓
AuthorityService.authorize(
  principal,
  action,
  scope,
  context
)
  ↓
ALLOW / DENY
```

Módulos não devem espalhar regras ad hoc como:

```text
if user.role === 'ADMIN'
```

A mesma regra canônica deve ser reutilizável por API, worker e demais
boundaries autorizados.

---

### D2.4-09 — Role is not authority by itself

Roles podem organizar capabilities, mas role isolada não concede ação.

Decisão de autorização considera, conforme aplicável:

```text
principal
+
action
+
scope
+
time
+
governing baseline/version
+
normative_baseline_ref
+
restrictions
+
authority source
```

Exemplo conceitual:

```text
TECH_LEAD
```

sozinho não é suficiente.

É necessário grant compatível com a ação e o escopo concretos.

---

### D2.4-10 — Scoped grants

Grants devem permitir escopo explícito.

Escopos podem incluir:

```text
system
Project
Module
Work Item
Delivery
action type
environment
time window
baseline
```

Authority fora do escopo é inválida.

---

### D2.4-11 — Expiration and revocation

Grants, sessions e credentials devem suportar:

```text
expiration
revocation
```

Revogação deve impedir uso futuro em tempo compatível com o risco.

Decisões históricas legítimas não são apagadas retroativamente.

---

### D2.4-12 — Baseline-aware authority

Authority material deve ser resolvida contra o contexto governante aplicável.

Mudança material pode exigir:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
```

Authority nunca deve migrar silenciosamente para baseline incompatível.

---

### D2.4-13 — Distinct principal classes

A nova implementação deverá representar separadamente:

```text
HUMAN
SERVICE
AGENT
EXECUTOR
```

Esses principals não são intercambiáveis.

Exemplo:

```text
HUMAN
manuel

SERVICE
naamive-worker

AGENT
architecture-reviewer-gpt

EXECUTOR
execution-8f382...
```

A modelagem física exata será definida posteriormente.

---

### D2.4-14 — Worker uses service principal

O worker autentica como `SERVICE`.

Regra:

```text
worker never reuses human credential
```

O worker recebe somente capabilities necessárias para sua responsabilidade
técnica.

---

### D2.4-15 — Agent uses agent identity

Agentes devem possuir identidade rastreável e distinta do worker e do humano.

A identidade do agent deve permitir reconstruir:

```text
which configured agent
which runtime/provider
which policy/context
which Execution
```

conforme aplicável.

---

### D2.4-16 — Executor identity

A execução concreta deve ser rastreável a identity/authority operacional própria.

Executor não herda human authority.

Executor também não deve ser confundido com o service principal que o
orquestrou.

---

### D2.4-17 — Human gates require HUMAN

Ação governada explicitamente humana exige principal `HUMAN`.

É proibido:

```text
SERVICE satisfies human gate
AGENT satisfies human gate
EXECUTOR satisfies human gate
```

Agente pode preparar recomendação.

A decisão humana permanece atribuída ao humano autorizado.

---

### D2.4-18 — Least privilege

Toda credencial e principal recebe apenas capabilities necessárias.

Evitar:

```text
admin credential reused everywhere
worker with business approval rights
agent with configuration admin rights
```

Capability técnica não implica authority de negócio.

---

### D2.4-19 — Login rate limiting

Login deverá possuir proteção contra tentativa em massa.

Obrigatório:

```text
rate limiting
backoff/delay policy
audit
generic client error
```

Valores concretos serão definidos na implementação.

---

### D2.4-20 — Generic authentication errors

O cliente não deve receber detalhes que facilitem enumeração de usuário.

Preferir:

```text
AUTH_LOGIN_INVALID
```

em vez de diferenciar publicamente:

```text
USER_NOT_FOUND
PASSWORD_WRONG
```

Detalhes necessários podem permanecer apenas em audit/telemetry protegidos.

---

### D2.4-21 — Security headers

O web deverá aplicar security headers apropriados ao deployment final.

O conjunto concreto será definido posteriormente, considerando no mínimo:

```text
content security policy
frame protection
content-type protection
referrer policy
transport security in production
```

A configuração deve ser compatível com o frontend real.

---

### D2.4-22 — Boundary validation

Todo input que cruza trust boundary é não confiável por padrão.

Boundaries relevantes incluem:

```text
browser → API
API → persistence
web → durable worker handoff
worker → agent provider
worker → external system
system → human
```

Validação de transporte não substitui regra de domínio.

---

### D2.4-23 — Local secrets

Em desenvolvimento local:

```text
.env
```

é permitido somente quando:

```text
not versioned
not committed
not logged
```

`.env.example` pode existir sem valores reais.

---

### D2.4-24 — Production secret store

Em produção, secrets devem usar secret store apropriado ao deployment.

O produto concreto será escolhido no Brainstorm de deployment.

Não fixar agora:

```text
Vault
AWS Secrets Manager
Docker Secrets
Kubernetes Secrets
etc.
```

A obrigação é:

```text
production secret store........ REQUIRED
```

---

### D2.4-25 — Secret rotation

Credentials materialmente sensíveis devem ser rotacionáveis.

Inclui, conforme aplicável:

```text
service credentials
agent provider credentials
database credentials
signing material
external API credentials
```

Rotação deve preservar auditabilidade.

---

### D2.4-26 — No secrets in repository

É proibido versionar secrets reais.

Inclui:

```text
passwords
API keys
service credentials
database secrets
signing keys
provider tokens
```

---

### D2.4-27 — No secrets in logs

Logs, audit trail, telemetry, prompts e error payloads não devem expor secret.

Redaction e minimização são obrigatórias onde houver risco de vazamento.

---

### D2.4-28 — Security audit

Eventos relevantes de segurança devem ser auditáveis.

No mínimo:

```text
login success/failure
logout
authorization allow/deny
grant creation
grant revocation
credential creation
credential rotation
credential revocation
principal revocation
sensitive governed decisions
break-glass use, if introduced
```

Audit deve permitir reconstruir principal, ação, scope, authority e resultado.

---

### D2.4-29 — UI capability projection

A UI pode receber projeção de ações disponíveis.

Mas:

```text
projection != authority source
```

Ao executar a ação, o servidor revalida authority.

Botão visível não é autorização.

---

### D2.4-30 — Security fail-closed

Se identidade, sessão, grant, scope, baseline ou authority não puderem ser
provados:

```text
DENY
```

A negação não deve produzir efeito autoritativo parcial.

Quando necessário, a condição deve permanecer observável e tratável.

---

## 13. Brainstorm 2.5 — Observability Tooling

O Brainstorm 2.5 define a stack-base e os princípios de observabilidade do
NAAMIVE.

A decisão preserva os pontos positivos do legado — especialmente logs
estruturados, telemetria sanitizada, separação entre heartbeat e progresso real
e evidência durável de falha — e adiciona métricas, tracing e uma plataforma
self-hosted de observabilidade.

A observabilidade operacional não substitui estado canônico, audit trail,
Inconsistency ou evidência governada.

Princípio:

```text
logs
metrics
traces
!=
canonical truth
```

A verdade governada continua em mecanismos duráveis definidos pelo NAAMIVE.

---

### D2.5-01 — Zero assinatura obrigatória

A stack de observabilidade deve ser utilizável sem assinatura paga obrigatória.

Regra:

```text
self-hosted OSS/FOSS................ REQUIRED
mandatory paid subscription......... FORBIDDEN
mandatory SaaS dependency............ FORBIDDEN
paid observability platform.......... NOT REQUIRED
vendor-neutral instrumentation....... REQUIRED
```

O NAAMIVE não deve depender tecnicamente de plano pago de observabilidade para
operar.

Custos da infraestrutura onde os componentes são executados não transformam a
ferramenta em dependência SaaS obrigatória.

Qualquer adoção futura de plataforma paga exige decisão técnica explícita e não
pode ser pressuposta pela baseline atual.

---

### D2.5-02 — Pino para application logging

Logger aprovado:

```text
Pino
```

Aplicação deve produzir logs estruturados em JSON.

Campos conceituais incluem, conforme aplicável:

```text
timestamp
level
service
component
event
correlation_id
causation_id
trace_id
span_id
project context
execution context
error classification
```

Os campos finais serão definidos por contrato técnico posterior.

---

### D2.5-03 — Structured JSON required

Logs operacionais devem ser machine-readable.

Evitar logs relevantes apenas em texto livre.

É permitido possuir mensagem humana complementar, desde que o evento e seus
campos estruturados continuem disponíveis.

---

### D2.5-04 — Automatic redaction

Logs devem possuir redaction para dados sensíveis.

É proibido expor por padrão:

```text
password
session token
service credential
API key
provider key
database secret
authorization credential
raw secret-bearing payload
```

Redaction não substitui evitar capturar o dado.

Primeira preferência:

```text
do not collect
```

Segunda proteção:

```text
redact
```

---

### D2.5-05 — Logs are not canonical events

Log operacional não é substituto de evento canônico.

Exemplo:

```text
Pino
worker_claim_success
```

pode diagnosticar uma operação.

Mas a mudança autoritativa da Execution deve continuar registrada pelo modelo
durável correspondente.

Perda do backend de logs não pode apagar a história governada do sistema.

---

### D2.5-06 — OpenTelemetry

Padrão aprovado para tracing:

```text
OpenTelemetry
```

A instrumentação deverá ser vendor-neutral.

Não espalhar no domínio código acoplado diretamente a um fornecedor de
observabilidade.

---

### D2.5-07 — OpenTelemetry Collector

Componente de coleta/exportação aprovado:

```text
OpenTelemetry Collector
```

Modelo:

```text
web ─────┐
         ├── OpenTelemetry → Collector → trace backend
worker ──┘
```

A aplicação conhece o padrão OpenTelemetry.

O Collector decide como exportar os sinais suportados.

---

### D2.5-08 — Tracing ponta a ponta

Tracing deverá permitir acompanhar uma operação através dos boundaries técnicos.

Exemplo conceitual:

```text
browser request
  ↓
web
  ↓
command
  ↓
database transaction
  ↓
durable handoff
  ↓
worker claim
  ↓
Execution
  ↓
agent/external provider
  ↓
result publication
```

Tracing deve ser utilizado para diagnóstico operacional.

---

### D2.5-09 — Correlation and causation remain durable

`trace_id` não substitui:

```text
correlation_id
causation_id
```

quando esses identificadores forem materialmente necessários ao domínio,
governança ou forensics.

Trace pode ser amostrado, expirar ou ser descartado.

Causalidade governada não pode depender da retenção do tracing.

---

### D2.5-10 — Prometheus metrics model

Modelo de métricas aprovado:

```text
Prometheus
```

A aplicação deve expor métricas em formato compatível com Prometheus.

---

### D2.5-11 — prom-client

Biblioteca Node aprovada para métricas:

```text
prom-client
```

Ela será usada para instrumentar `web` e `worker` conforme aplicável.

---

### D2.5-12 — Metrics endpoint

O `web` deve fornecer endpoint protegido/apropriadamente exposto para scraping
de métricas.

Conceito:

```text
/metrics
```

A forma de proteção e exposição externa será definida no deployment.

Worker deverá produzir métricas equivalentes por mecanismo compatível com seu
modelo de execução.

---

### D2.5-13 — Technical metrics

Métricas técnicas incluem, conforme aplicável:

```text
HTTP request rate
HTTP error rate
HTTP latency
database pool usage
database errors
worker activity
memory
process health
event loop health
external provider latency
```

Essas métricas não substituem métricas de lifecycle.

---

### D2.5-14 — Lifecycle and governance metrics

Observabilidade deve medir também saúde semântica do NAAMIVE.

Exemplos conceituais:

```text
resources by lifecycle state
blocked resources
paused resources
waiting resources
stale too long
pending human gates
old blockers
expiring authorities
expiring exceptions
critical risks
```

---

### D2.5-15 — Execution metrics

No mínimo, o desenho deve permitir medir:

```text
running age
failed count
retry count
recovery count
stale result attempts
claim/lease expiry
zombie/fencing rejection
execution duration
```

---

### D2.5-16 — Handoff and continuity metrics

Devem existir sinais para:

```text
pending handoff age
handoff acceptance latency
uncertain handoff
lost/recovered handoff
resource without actionable continuation
continuity inconsistency
```

---

### D2.5-17 — Projection metrics

Devem existir sinais para:

```text
projection lag
rebuild failure
stale watermark
semantic conformance failure
missing required action
missing blocker
missing wait condition
duplicate projection element
contradictory projection
unauthorized extra action
```

Projection atualizada temporalmente ainda pode estar semanticamente errada.

---

### D2.5-18 — Inconsistency and reconciliation metrics

Devem existir métricas para:

```text
open inconsistencies
inconsistency age
inconsistency by severity/type
reconciliation backlog
reconciliation age
recovery backlog
```

Métrica não substitui o registro canônico da Inconsistency.

---

### D2.5-19 — No high-cardinality IDs as metric labels

IDs de entidades não devem ser usados normalmente como labels Prometheus.

Proibido por padrão:

```text
project_id
work_item_id
execution_id
user_id
handoff_id
correlation_id
```

Esses identificadores pertencem a:

```text
logs
traces
canonical records
```

Métricas devem agregar.

---

### D2.5-20 — Grafana

Ferramenta de visualização aprovada:

```text
Grafana
```

Uso esperado:

```text
dashboards
metrics visualization
trace navigation
log navigation
alert visualization
```

A instalação padrão será self-hosted.

Grafana Cloud não é requisito.

---

### D2.5-21 — Prometheus server

Backend padrão para métricas:

```text
Prometheus
```

Será self-hosted na baseline inicial.

Retenção e sizing serão definidos conforme deployment.

---

### D2.5-22 — Loki as default log backend

Backend padrão aprovado para logs:

```text
Loki
```

Status:

```text
APPROVED AS DEFAULT
```

A aplicação não deve depender de APIs específicas do Loki.

Logs continuam sendo emitidos em contrato estruturado e coletáveis por
infraestrutura substituível.

---

### D2.5-23 — Tempo as default trace backend

Backend padrão aprovado para traces:

```text
Tempo
```

Status:

```text
APPROVED AS DEFAULT
```

A aplicação deve instrumentar OpenTelemetry, não Tempo diretamente.

---

### D2.5-24 — Observability stack

Stack padrão:

```text
APPLICATION
├── Pino
├── OpenTelemetry
└── prom-client

COLLECTION / STORAGE
├── OpenTelemetry Collector
├── Prometheus
├── Loki
└── Tempo

VISUALIZATION
└── Grafana
```

Todos os componentes devem poder ser executados de forma self-hosted sem
assinatura obrigatória.

---

### D2.5-25 — Liveness endpoint

O web deve possuir:

```text
/health/live
```

Objetivo:

```text
o processo está vivo?
```

Liveness não deve falhar apenas porque uma dependência externa está
temporariamente indisponível, quando o processo continua saudável.

---

### D2.5-26 — Readiness endpoint

O web deve possuir:

```text
/health/ready
```

Objetivo:

```text
o processo está apto a servir corretamente?
```

Exemplo:

```text
process alive
+
PostgreSQL unavailable
=
live  OK
ready FAIL
```

Dependências concretas de readiness serão definidas por componente.

---

### D2.5-27 — Worker health

Worker deve possuir mecanismo equivalente para revelar:

```text
alive
ready
active
degraded
draining
```

conforme aplicável ao modelo final de deployment.

Não assumir que processo existente significa worker funcional.

---

### D2.5-28 — ALIVE is not PROGRESS

Decisão herdada e preservada do legado:

```text
heartbeat
=
liveness evidence
```

Não significa:

```text
functional progress
```

É obrigatório distinguir:

```text
ALIVE
ALIVE_NO_PROGRESS
DEGRADED
```

quando a natureza da Execution permitir detectar essa diferença.

---

### D2.5-29 — Operational progress signal

Quando aplicável, progresso funcional deve ser derivado de evento operacional
válido ou mudança material observável.

Heartbeat não atualiza artificialmente o relógio de progresso funcional.

Isso permite detectar:

```text
executor vivo
+
nenhum avanço
```

sem classificar falsamente o processo como saudável.

---

### D2.5-30 — Agent telemetry closed contract

Telemetria de agentes deve usar contrato fechado e sanitizado.

Permitido, conforme aplicável:

```text
event type
timestamp
sequence
status
duration
usage counters
provider/runtime identity
Execution correlation
sanitized failure classification
```

---

### D2.5-31 — Raw agent payload forbidden by default

Não coletar por padrão em telemetry/logging:

```text
prompt
private reasoning
raw agent output
tool arguments
source file contents
secrets
raw stderr containing sensitive content
arbitrary provider payload
```

Se algum conteúdo material precisar ser preservado como evidence, isso deve
seguir contrato de evidence próprio, não ser jogado indiscriminadamente em
observability.

---

### D2.5-32 — Durable failure evidence

Falhas materiais devem possuir evidência durável suficiente para diagnóstico,
recovery e audit quando exigido.

Log de erro sozinho não é evidência suficiente para fato governado.

---

### D2.5-33 — Separate operational signals from audit

Quatro categorias devem permanecer semanticamente distintas:

```text
LOG
diagnóstico técnico

METRIC
medição agregada

TRACE
caminho operacional

AUDIT / CANONICAL RECORD
história governada e durável
```

Um mesmo acontecimento pode produzir sinais nas quatro categorias.

Isso não torna as categorias intercambiáveis.

---

### D2.5-34 — Actionable alerts

Alertas devem ser acionáveis.

Evitar alertar simplesmente porque um log possui level `error`.

Condições conceituais de alerta incluem:

```text
Execution running too long
repeated lease expiry
worker unavailable
ALIVE_NO_PROGRESS too long
pending handoff too old
projection lag
projection semantic mismatch
critical inconsistency
reconciliation stuck
human gate aging
authority near expiration
```

Thresholds concretos serão definidos na baseline operacional/deployment.

---

### D2.5-35 — Governed alert references canonical Inconsistency

Quando um alerta representa discrepancy governada:

```text
alert
  ↓
references canonical Inconsistency
```

O alerta não cria uma segunda fonte de verdade.

Exemplo:

```text
Grafana alert
  ↓
INCONSISTENCY-...
```

A Inconsistency continua responsável por lifecycle, ownership, tratamento e
closure da discrepância.

---

### D2.5-36 — Observability failure must not corrupt business state

Falha ao enviar log, trace ou métrica não deve normalmente quebrar transação de
negócio ou corromper estado canônico.

Exceção:

quando a própria lei exigir persistência durável de audit/evidence para permitir
a operação.

Nesse caso:

```text
audit/evidence required
!=
optional telemetry
```

---

### D2.5-37 — Observability module boundaries

Instrumentação deve respeitar arquitetura modular.

Módulos podem emitir eventos técnicos através de contracts/shared
infrastructure controlada.

Eles não devem ganhar dependência direta de:

```text
Grafana
Loki
Tempo
Prometheus server internals
```

Frameworks e backends de observabilidade permanecem periféricos.

---

## 14. Brainstorm 2.6 — Deployment Model

O Brainstorm 2.6 define como o NAAMIVE será executado e promovido entre
ambientes sem criar custo operacional prematuro.

A decisão preserva a simplicidade do legado para desenvolvimento local e cria
uma progressão explícita de ambientes:

```text
DEV
  ↓
PRE-HML
  ↓
HML
  ↓
PROD
```

Princípio central:

```text
desenvolver sem custo de infraestrutura
até o produto estar pronto para evoluir
```

A existência lógica de HML e PROD não obriga sua infraestrutura a existir desde
o início.

---

### D2.6-01 — Zero infraestrutura paga durante desenvolvimento

Enquanto o projeto ainda estiver em construção, o objetivo é executar localmente
sem assinatura ou infraestrutura paga obrigatória.

Regra:

```text
paid hosting before readiness........ NOT REQUIRED
mandatory cloud subscription......... FORBIDDEN
mandatory paid deployment platform... FORBIDDEN
local-first development.............. REQUIRED
```

HML e PROD podem permanecer apenas como perfis definidos até existir necessidade
real de provisioná-los.

---

### D2.6-02 — Quatro environment profiles

Perfis aprovados:

```text
DEV
PRE-HML
HML
PROD
```

Cada perfil representa objetivo operacional diferente.

Ambiente é configuração e boundary operacional.

Não é uma versão diferente do produto.

---

### D2.6-03 — DEV

Objetivo:

```text
máxima produtividade de desenvolvimento
```

Modelo aprovado:

```text
web...................... host
worker................... host
PostgreSQL............... Docker
infra auxiliar........... Docker quando necessária
observability............ Docker opcional
hot reload............... YES
debug local.............. YES
```

`web` e `worker` não precisam rodar em container durante o ciclo diário de
desenvolvimento.

Isso evita custo de rebuild/restart desnecessário e preserva debugging simples.

---

### D2.6-04 — PRE-HML

Objetivo:

```text
provar o pacote real antes da homologação
```

PRE-HML executa o sistema como release containerizada.

Modelo:

```text
web...................... Docker
worker................... Docker
PostgreSQL............... Docker
migrations............... reais
health checks............ reais
observability............ real quando necessária à validação
E2E...................... completo
```

PRE-HML deve ser preferencialmente:

```text
local
ou
CI
```

e pode ser descartável.

Não exige servidor permanente.

---

### D2.6-05 — PRE-HML local-first

Antes de pagar qualquer infraestrutura externa, PRE-HML deve poder ser executado
na própria máquina de desenvolvimento ou em runner disponível sem assinatura
obrigatória.

Conceito:

```text
DEV
→ execução rápida no host

PRE-HML
→ stack Docker completa local
```

Essa etapa existe para detectar:

```text
funciona no DEV
mas quebra quando empacotado
```

antes de HML.

---

### D2.6-06 — HML

Objetivo:

```text
homologar release candidata
```

HML será ambiente containerizado e persistente quando for provisionado.

Características:

```text
Docker
config própria
database própria
secrets próprios
HTTPS
observability
dados de homologação
```

HML não precisa existir fisicamente enquanto o projeto ainda estiver em
desenvolvimento local.

---

### D2.6-07 — PROD

Objetivo:

```text
operação real
```

PROD será containerizado e utilizará a mesma release já validada em PRE-HML e
HML.

Características:

```text
Docker
HTTPS/TLS
production secrets
persistent state
backup
observability
hardening
```

---

### D2.6-08 — Build once, promote

Regra central de release:

```text
BUILD ONCE
  ↓
PRE-HML
  ↓
HML
  ↓
PROD
```

Não recompilar aplicação entre esses ambientes.

---

### D2.6-09 — Same artifact across PRE-HML, HML and PROD

PRE-HML, HML e PROD devem executar os mesmos artefatos imutáveis da release.

Exemplo:

```text
naamive-web:R27
digest sha256:ABC

PRE-HML → sha256:ABC
HML     → sha256:ABC
PROD    → sha256:ABC
```

O mesmo princípio vale para `worker`.

---

### D2.6-10 — Environment differences are configuration

Entre PRE-HML, HML e PROD podem mudar:

```text
database
secrets
URLs
capacity
retention
backup policy
observability retention
external provider configuration
```

Não devem mudar silenciosamente:

```text
source code
Dockerfile
application binary
release image
domain behavior
```

---

### D2.6-11 — Docker Engine

Runtime de container aprovado:

```text
Docker Engine
```

---

### D2.6-12 — Docker Compose v2

Orquestração inicial aprovada:

```text
Docker Compose v2
```

Kubernetes, Docker Swarm e Nomad não são necessários na baseline inicial.

---

### D2.6-13 — No Kubernetes initially

Regra:

```text
Kubernetes............... NOT REQUIRED
Docker Swarm............. NOT REQUIRED
Nomad.................... NOT REQUIRED
```

Infraestrutura distribuída futura exige necessidade concreta e nova decisão
tecnológica.

---

### D2.6-14 — Production topology starts single-host

Quando PROD for provisionado, a topologia inicial pode ser:

```text
single Linux host
+
Docker Compose
```

Isso é suficiente para a escala inicial prevista.

A arquitetura deve continuar permitindo evolução posterior.

---

### D2.6-15 — Web and worker separate containers

Em ambientes containerizados:

```text
web
worker
```

serão containers distintos.

Isso preserva responsabilidades e permite scaling independente.

---

### D2.6-16 — Horizontal worker scaling supported

Inicialmente:

```text
web....... 1 instance
worker.... 1 instance
```

A arquitetura deve permitir múltiplos workers posteriormente.

A segurança contra dupla authority depende do modelo aprovado em 2.3:

```text
transactional claim
lease
fencing
idempotency
```

---

### D2.6-17 — Reverse proxy

Reverse proxy padrão aprovado:

```text
Caddy
```

Objetivos:

```text
HTTPS
TLS certificate management
HTTP → HTTPS redirect
reverse proxy
external network boundary
```

Caddy deverá ser self-hosted, sem assinatura obrigatória.

---

### D2.6-18 — TLS

HML e PROD, quando remotamente acessíveis, exigem:

```text
HTTPS/TLS
```

Credenciais de sessão marcadas como `Secure` nesses ambientes.

---

### D2.6-19 — Network exposure

Por padrão, apenas o reverse proxy pode ser exposto externamente.

Conceito:

```text
80  → redirect
443 → HTTPS
```

É proibida exposição pública direta, por padrão, de:

```text
PostgreSQL
worker
OpenTelemetry Collector
Prometheus
Loki
Tempo
```

Grafana também não deve ser público por padrão.

---

### D2.6-20 — Persistent state outside ephemeral container filesystem

Container pode ser descartado.

Estado material não.

Devem possuir persistência adequada:

```text
PostgreSQL data
artifacts/evidence
worker workspaces quando necessários
observability persistence conforme retenção
backups
```

Nenhum estado canônico pode existir apenas no filesystem efêmero do container.

---

### D2.6-21 — Repository/source is not runtime state

O código-fonte do NAAMIVE não é local de persistência operacional.

É proibido usar o repositório como destino de:

```text
database data
logs
runtime state
secrets
evidence
backups
temporary operational files
```

quando esses dados possuírem destino operacional próprio.

---

### D2.6-22 — Worker filesystem access is narrower than web

Acesso a repositories/workspaces deve ser concedido apenas ao componente que
precisa.

Preferência:

```text
worker
→ repository/workspace access

web
→ no broad repository filesystem access
```

O desenho físico definitivo será validado quando os adapters Git/agent forem
implementados.

---

### D2.6-23 — Immutable release identification

Cada release deve possuir identificadores suficientes para forensics.

No mínimo:

```text
release_id
git_commit
build_timestamp
technology_baseline_ref
image_digest
```

conforme aplicável.

---

### D2.6-24 — Same release ID for web and worker

`web` e `worker` pertencentes à mesma promoção devem carregar a mesma identidade
de release.

Isso não impede imagens distintas.

Exemplo:

```text
release R27

web image....... digest A
worker image.... digest B
```

Ambas pertencem a:

```text
release_id = R27
```

---

### D2.6-25 — No latest tag in authoritative deployment

É proibido depender de:

```text
:latest
```

como identidade de release em HML/PROD.

Deploy deve referenciar tag/digest imutável ou equivalentemente verificável.

---

### D2.6-26 — Controlled migration step

Migration de banco será etapa controlada da promoção.

Não permitir que toda instância de `web` ou `worker` execute migrations
automaticamente ao iniciar.

Conceito:

```text
release
  ↓
controlled migration step
  ↓
runtime promotion
```

A ferramenta e estratégia exatas de migration permanecem para o Brainstorm 2.8.

---

### D2.6-27 — Release flow

Fluxo conceitual:

```text
code
  ↓
unit / integration / architecture tests
  ↓
DEV
  ↓
build immutable images
  ↓
PRE-HML
  ↓
migrations + health + E2E
  ↓
release candidate
  ↓
HML
  ↓
homologation
  ↓
explicit approval
  ↓
PROD
  ↓
production smoke + observability
```

Enquanto HML/PROD não forem provisionados, o fluxo pode parar em PRE-HML.

---

### D2.6-28 — Health validation

Promotion não considera container saudável apenas porque o processo existe.

Usar:

```text
/health/live
/health/ready
```

e health equivalente do worker.

---

### D2.6-29 — Post-deploy smoke

Após promoção de release deve existir smoke test técnico mínimo.

Em PRE-HML isso é obrigatório desde o início.

Em HML/PROD será obrigatório quando esses ambientes forem provisionados.

---

### D2.6-30 — Graceful worker shutdown

Worker deve responder a shutdown controlado.

Conceito:

```text
SIGTERM
  ↓
stop claiming new work
  ↓
drain current activity safely
  ↓
terminate
```

Se authority expirar durante interrupção, o lifecycle aprovado de Execution
governa a continuidade.

---

### D2.6-31 — Restart policy

Serviços containerizados devem possuir restart policy apropriada.

Restart automático não pode esconder crash loop.

Observability deve revelar indisponibilidade e repetição de restart.

---

### D2.6-32 — PostgreSQL backup

Quando HML/PROD persistentes forem provisionados, backup do PostgreSQL será
obrigatório conforme criticidade do ambiente.

Para PROD:

```text
automated backup........ REQUIRED
integrity validation.... REQUIRED
restore test............ REQUIRED
separate backup storage. REQUIRED
```

---

### D2.6-33 — Backup integrity

Preservar o princípio positivo do legado:

```text
pg_dump
+
validation
+
SHA-256 or equivalent integrity proof
+
metadata
```

A ferramenta final poderá evoluir, mas integridade verificável permanece
obrigatória.

---

### D2.6-34 — Restore is explicitly destructive

Restore destrutivo deve exigir confirmação explícita e operação controlada.

Nunca executar restore por automatismo ambíguo.

---

### D2.6-35 — Restore testing

Backup não é considerado confiável apenas porque foi criado.

Deve existir validação periódica por restore em ambiente descartável ou
equivalente.

---

### D2.6-36 — Backup separate from primary DB storage

Backup de PROD não deve existir somente no mesmo filesystem/volume físico do
banco primário.

A mídia concreta pode evoluir:

```text
separate disk
NAS
another host
object storage
```

Não é exigido serviço pago.

---

### D2.6-37 — Production secret delivery

Modelo inicial aprovado:

```text
protected host secret files
+
Docker Compose secrets
```

Segredos reais ficam fora do Git e com permissões restritas.

`.env` de produção deve preferencialmente conter apenas configuração não
sensível.

---

### D2.6-38 — No Vault requirement initially

Não exigir inicialmente:

```text
Vault
cloud secret manager
enterprise secret platform
```

Esses componentes só entram mediante necessidade concreta.

---

### D2.6-39 — Container hardening

Em HML/PROD:

```text
non-root containers.............. REQUIRED
minimal image.................... REQUIRED
drop unnecessary capabilities... REQUIRED WHEN POSSIBLE
read-only filesystem............. REQUIRED WHEN POSSIBLE
only necessary mounts............ REQUIRED
only necessary networks.......... REQUIRED
```

---

### D2.6-40 — Docker socket forbidden

É proibido montar:

```text
/var/run/docker.sock
```

em `web` ou `worker`.

Controle do Docker daemon não deve ser capability implícita da aplicação.

---

### D2.6-41 — CI/CD default

Plataforma default:

```text
GitHub Actions
```

para build/test/release automation.

Assinatura paga não é requisito.

Se necessário, runner self-hosted pode ser adotado.

---

### D2.6-42 — No mandatory paid CI

Regra:

```text
mandatory paid CI subscription....... FORBIDDEN
```

A pipeline deve ser executável usando recursos gratuitos/self-hosted
compatíveis com o estágio do projeto.

---

### D2.6-43 — Explicit production promotion initially

Inicialmente:

```text
merge
  ↓
automated build/test
  ↓
release candidate
  ↓
explicit production promotion
```

Não promover automaticamente para PROD apenas por merge.

Essa regra pode ser reavaliada quando maturidade operacional justificar.

---

### D2.6-44 — HML and PROD can be deferred

Enquanto o projeto não estiver pronto:

```text
HML infrastructure........ OPTIONAL / NOT PROVISIONED
PROD infrastructure....... OPTIONAL / NOT PROVISIONED
```

O importante é que os perfis e contratos já estejam definidos.

O desenvolvimento pode permanecer:

```text
DEV
+
PRE-HML local
```

sem custo de hosting.

---

### D2.6-45 — Environment parity rule

Quanto mais próximo de PROD, menor deve ser a divergência operacional.

Regra:

```text
DEV
optimized for development

PRE-HML
production-like packaging

HML
production-like runtime

PROD
production runtime
```

PRE-HML existe justamente para antecipar diferenças de empacotamento antes de
HML.

---

## 15. Decisões ainda abertas

Os seguintes pontos **não estão aprovados** e não devem ser preenchidos por
suposição.

### Versões e compatibilidade

```text
versão exata do Node.js
versão exata do TypeScript
versões exatas de Fastify / React / Vite / React Router
versão exata do Kysely / pg / TypeBox
versão exata do pnpm
versões exatas de Vitest / Playwright
versão exata da lib Argon2
versão exata de Pino
versões exatas de OpenTelemetry
versão exata de prom-client
versões exatas de Prometheus / Grafana / Loki / Tempo
versão exata de Docker Engine
versão exata de Docker Compose
versão exata de Caddy
policy de atualização de dependências
```

### Persistência e modelo físico

```text
migration strategy/tooling detalhado
schema strategy
transaction abstraction
connection management
naming conventions
physical ownership
projection storage strategy
job/handoff table design
auth table design final
audit storage schema final
claim token representation
fencing generation representation
lease duration
heartbeat cadence
polling cadence
artifact storage implementation final
workspace storage implementation final
```

### Deployment — fechado no nível arquitetural

```text
DEV profile.......................... APPROVED
PRE-HML profile...................... APPROVED
HML profile.......................... APPROVED
PROD profile......................... APPROVED

local-first development.............. REQUIRED
paid hosting before readiness........ NOT REQUIRED
mandatory cloud subscription......... FORBIDDEN
mandatory paid deployment platform... FORBIDDEN

DEV web/worker on host................ APPROVED
DEV infrastructure via Compose........ APPROVED

PRE-HML full Docker stack............. APPROVED
PRE-HML local/CI...................... APPROVED
PRE-HML disposable.................... PREFERRED

HML containerized..................... APPROVED
PROD containerized.................... APPROVED

build once / promote.................. REQUIRED
same immutable artifact............... REQUIRED
environment differences = config...... REQUIRED

Docker Engine......................... APPROVED
Docker Compose v2..................... APPROVED
Kubernetes............................ NOT REQUIRED
single-host initial production........ APPROVED

web container......................... REQUIRED OUTSIDE DEV
worker container...................... REQUIRED OUTSIDE DEV
Caddy................................. APPROVED
HTTPS/TLS............................. REQUIRED REMOTELY

PostgreSQL public exposure............ FORBIDDEN
worker public exposure................ FORBIDDEN
observability public by default....... FORBIDDEN

persistent PostgreSQL................. REQUIRED
persistent artifacts/evidence......... REQUIRED
ephemeral container canonical state... FORBIDDEN

immutable release identity............ REQUIRED
:latest authoritative deploy.......... FORBIDDEN
same release ID web/worker............. REQUIRED
controlled migration step............. REQUIRED
health validation..................... REQUIRED
post-deploy smoke..................... REQUIRED

graceful worker shutdown.............. REQUIRED
restart policy........................ REQUIRED
horizontal worker scale............... SUPPORTED

production DB backup.................. REQUIRED WHEN PROD EXISTS
backup integrity...................... REQUIRED
restore test.......................... REQUIRED
backup separate from primary storage.. REQUIRED

Compose secrets....................... APPROVED INITIAL
non-root containers................... REQUIRED
Docker socket mount................... FORBIDDEN

GitHub Actions........................ DEFAULT
mandatory paid CI..................... FORBIDDEN
explicit production promotion......... INITIAL DEFAULT
```

### Runtime ainda a detalhar

```text
concrete locking strategy
concrete fencing token format
idempotency key format
concurrency limits
retry limits/backoff
reconciliation cadence
worker shutdown grace period
session lifetime
session renewal policy
credential lifetime
login rate-limit thresholds
health thresholds
ALIVE_NO_PROGRESS thresholds
alert thresholds
```

### Observability operations ainda a detalhar

```text
scrape interval
metrics retention
logs retention
traces retention
trace sampling policy
Collector pipeline configuration
dashboard set
alert routing
production storage sizing
backup requirements for observability data
```

### Environment/deployment details ainda a detalhar

```text
Compose file layout
environment configuration layout
PRE-HML orchestration command
HML host/provider
PROD host/provider
domain/DNS
certificate policy details
exact secret file layout
backup schedule
backup retention
restore cadence
persistent volume layout
production sizing
release naming convention
image registry
```

### Testing ainda a detalhar

```text
database test strategy
integration environment strategy
fixtures/factories
test data isolation
architecture-rule enforcement mechanism
E2E environment orchestration
worker restart/recovery scenarios
fencing/zombie-executor tests
authentication E2E
authorization scope tests
revocation tests
CSRF tests
security regression tests
observability instrumentation tests
health endpoint tests
ALIVE_NO_PROGRESS tests
metric cardinality checks
redaction tests
PRE-HML full-stack tests
migration promotion tests
release identity tests
```

---

## 16. Próximos brainstorms

Fila aprovada após o Brainstorm 2.6:

```text
2.7 — Application Shell / UI
2.8 — PostgreSQL / persistence / migrations / transaction details
2.9 — Technology Baseline consolidation
2.10 — Technical audit
2.11 — Approval / freeze
```

`2.7 — Application Shell / UI` permanece explicitamente reservado e passa a ser
o próximo bloco.

---

## 17. Critério para sair de BRAINSTORM

Este documento não deve ser promovido para candidato enquanto existirem decisões
estruturais críticas abertas.

Promoção esperada:

```text
BRAINSTORM
  ↓
CANDIDATE FOR APPROVAL
  ↓
TECHNICAL AUDIT
  ↓
APPROVED
  ↓
TECHNOLOGY BASELINE IN FORCE
```

A nomenclatura final de estados será confirmada antes da ratificação técnica.

---

## 18. Estado atual após Brainstorm 2.6

```text
Node.js........................ APPROVED
TypeScript..................... APPROVED
web + worker................... APPROVED
PostgreSQL..................... APPROVED
novo banco..................... APPROVED
Docker local................... APPROVED
web modular monolith........... APPROVED
frontend + backend no web...... APPROVED
business-capability modules.... APPROVED
module internals private....... APPROVED
public contracts............... APPROVED
data ownership................. APPROVED
no cross-module DB access...... APPROVED
shared minimal................. APPROVED
directional dependencies....... APPROVED
automated boundaries........... APPROVED
login separado................. APPROVED
application shell.............. APPROVED
horizontal + vertical menu..... APPROVED
project menu by authorization.. APPROVED
content area initially blank... APPROVED
dashboard...................... DEFERRED

Fastify........................ APPROVED
React.......................... APPROVED
Vite........................... APPROVED
React Router................... APPROVED
Kysely......................... APPROVED
pg / node-postgres............. APPROVED
TypeBox........................ APPROVED
Fastify Type Provider.......... APPROVED
pnpm........................... APPROVED
pnpm workspaces................ APPROVED
Nx / Turborepo................. NOT REQUIRED NOW
tsc backend/worker............. APPROVED
Vitest......................... APPROVED
Playwright..................... APPROVED
E2E from first vertical slice.. APPROVED
core regression suite.......... REQUIRED
CI regression gate............. REQUIRED
architecture guardrails........ REQUIRED FROM START

PostgreSQL durable dispatch..... APPROVED
external broker................. NOT REQUIRED NOW
worker DB polling............... APPROVED
transactional claim............. APPROVED
lease........................... APPROVED
heartbeat....................... APPROVED
fencing......................... REQUIRED
idempotency..................... REQUIRED
reconciliation.................. REQUIRED
retry = new Execution........... REQUIRED
recovery = new Execution........ REQUIRED
expired authority resurrects?... NO

human username/password......... APPROVED
Argon2id........................ APPROVED
opaque server session........... APPROVED
HttpOnly cookie................. APPROVED
browser JWT..................... NO
localStorage auth token......... NO
CSRF............................ REQUIRED
server-side authorization....... REQUIRED
canonical AuthorityService...... REQUIRED
scoped grants................... APPROVED
expiration...................... REQUIRED
revocation...................... REQUIRED
baseline-aware authority........ REQUIRED
HUMAN/SERVICE/AGENT/EXECUTOR.... REQUIRED
least privilege................. REQUIRED
login rate limiting............. REQUIRED
generic login errors............ REQUIRED
security headers................ REQUIRED
production secret store......... REQUIRED
security audit.................. REQUIRED

Pino............................ APPROVED
OpenTelemetry................... APPROVED
OTel Collector.................. APPROVED
Prometheus...................... APPROVED
prom-client..................... APPROVED
Grafana......................... APPROVED
Loki............................ APPROVED AS DEFAULT
Tempo........................... APPROVED AS DEFAULT
self-hosted OSS/FOSS............ REQUIRED
paid subscription dependency.... FORBIDDEN
mandatory SaaS.................. FORBIDDEN
structured JSON logs............ REQUIRED
automatic redaction............. REQUIRED
health/live..................... REQUIRED
health/ready.................... REQUIRED
ALIVE != PROGRESS............... REQUIRED
canonical audit durable......... REQUIRED
actionable alerts............... REQUIRED
alert → Inconsistency........... REQUIRED WHEN GOVERNED

DEV............................. APPROVED
PRE-HML......................... APPROVED
HML............................. APPROVED
PROD............................ APPROVED
local-first / zero hosting cost. REQUIRED BEFORE READINESS
PRE-HML full Docker local........ APPROVED
build once / promote............ REQUIRED
same immutable release artifact. REQUIRED
Docker Engine................... APPROVED
Docker Compose v2............... APPROVED
Kubernetes...................... NOT REQUIRED
Caddy........................... APPROVED
HTTPS/TLS remote................ REQUIRED
immutable image identity........ REQUIRED
:latest authoritative deploy.... FORBIDDEN
controlled migration............ REQUIRED
health validation............... REQUIRED
production backup............... REQUIRED WHEN PROD EXISTS
GitHub Actions.................. DEFAULT
mandatory paid CI............... FORBIDDEN

exact versions.................. OPEN
migration details............... OPEN
Shell/UI detailed design........ NEXT — 2.7
```

---

## 19. Resultado consolidado dos Brainstorms 2.1–2.6

A fundação técnica atual é:

```text
DEVELOPMENT / PROMOTION

DEV
├── web on host
├── worker on host
└── infrastructure via Docker
     ↓
PRE-HML
├── full Docker stack
├── local or CI
├── disposable preferred
├── migrations
├── health
└── complete E2E
     ↓
HML
├── containerized
├── persistent when provisioned
└── same immutable release
     ↓
PROD
├── containerized
├── hardened
├── persistent
├── backup
└── same immutable release

BUILD ONCE
PRE-HML → HML → PROD
```

Aplicação:

```text
Node.js + TypeScript
        +
PostgreSQL novo
        +
pnpm workspaces
        +
2 deployables
├── web
│   ├── backend
│   │   ├── Fastify
│   │   ├── TypeBox
│   │   ├── Kysely + pg
│   │   └── canonical AuthorityService
│   ├── frontend
│   │   ├── React
│   │   ├── Vite
│   │   └── React Router
│   └── modular monolith
│
└── worker
    ├── Node.js + TypeScript
    ├── SERVICE principal
    ├── PostgreSQL durable dispatch
    ├── transactional claim
    ├── lease + heartbeat
    ├── fencing
    ├── idempotency
    └── reconciliation
```

Infraestrutura containerizada:

```text
Caddy
web
worker
PostgreSQL
OpenTelemetry Collector
Prometheus
Loki
Tempo
Grafana
```

Princípios consolidados:

```text
local first
no paid infrastructure before product readiness

DEV optimizes developer productivity
PRE-HML proves production-like packaging
HML validates the release
PROD promotes the same artifact

build once
promote immutable artifact

containers are disposable
canonical state is not

simple operations first
no Kubernetes by default

frameworks stay peripheral
domain stays central

observability reveals
but does not replace canonical truth

regression protection begins
with the first vertical slice
```

O próximo bloco é o **Brainstorm 2.7 — Application Shell / UI**.
