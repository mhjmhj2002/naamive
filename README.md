# NAAMIVE

O NAAMIVE organiza a condução de necessidades de negócio até resultados de software verificáveis.

## Comece aqui

1. [Regras para agentes](AGENTS.md)
2. [Continuidade atual](CONTINUIDADE_ATUAL.md)
3. [Documentação Técnica e Operacional do Sistema](#sistema-naamive)
4. [Documentação das Verticais](#documentação)
5. [Dados operacionais](#dados-operacionais)

## Execução Rápida do Sistema

Comando único para compilar e iniciar a aplicação web e o worker com suporte a portas livres (padrão `3001`):

```bash
npm run build && npm start
```

Acesse no navegador:
```text
http://localhost:3001/
```
*(Caso a porta 3001 esteja ocupada, o bootstrap aloca automaticamente a próxima porta livre sem falhar).*

## Regras para agentes

[AGENTS.md](AGENTS.md)

## Onde estamos agora

[CONTINUIDADE_ATUAL.md](CONTINUIDADE_ATUAL.md)

## Skills agênticas

As Skills são manuais operacionais dos Atores agênticos; a documentação das verticais permanece a fonte normativa do domínio e do processo.

### Necessidade

* [Formação da Necessidade](.agents/skills/necessidade/formacao-da-necessidade/SKILL.md)
* [Auditoria da Necessidade](.agents/skills/necessidade/auditoria-da-necessidade/SKILL.md)
* [Qualificação da Necessidade](.agents/skills/necessidade/qualificacao-da-necessidade/SKILL.md)

### Projeto

* [Formação do Projeto](.agents/skills/projeto/formacao-do-projeto/SKILL.md)
* [Auditoria do Projeto](.agents/skills/projeto/auditoria-do-projeto/SKILL.md)
* [Verificação Agregada do Projeto](.agents/skills/projeto/verificacao-agregada-do-projeto/SKILL.md)

### Módulo

* [Delimitação de Módulos](.agents/skills/modulo/delimitacao-de-modulos/SKILL.md)
* [Formação do Módulo](.agents/skills/modulo/formacao-do-modulo/SKILL.md)
* [Auditoria do Módulo](.agents/skills/modulo/auditoria-do-modulo/SKILL.md)

### Entrega de Valor

* [Delimitação de Entregas de Valor](.agents/skills/entrega-de-valor/delimitacao-de-entregas-de-valor/SKILL.md)
* [Formação da Entrega de Valor](.agents/skills/entrega-de-valor/formacao-da-entrega-de-valor/SKILL.md)
* [Auditoria da Entrega de Valor](.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md)
* [Verificação da Entrega de Valor](.agents/skills/entrega-de-valor/verificacao-da-entrega-de-valor/SKILL.md)

### Item de Trabalho (Realização)

* [Planejamento da Realização](.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md)
* [Execução do Item de Trabalho](.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md)
* [Integração da Realização](.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md)

## Documentação

### Sistema NAAMIVE (Operação e Arquitetura)

Manuais operacionais vivos do sistema executável e de sua infraestrutura:

* [01 — Stack e Arquitetura do Sistema](documentacao/naamive/01_STACK_E_ARQUITETURA.md): detalhamento da stack (Node.js ESM, TypeScript, PostgreSQL / pg-mem, Bootstrap 5, Worker assíncrono) e isolamento DDD hexagonal.
* [02 — Configuração e Ambiente](documentacao/naamive/02_CONFIGURACAO_E_AMBIENTE.md): pré-requisitos, variáveis de ambiente, portas suportadas (padrão 3001) e isolamento de conflitos locais.
* [03 — Como Executar e Testar](documentacao/naamive/03_COMO_EXECUTAR_E_TESTAR.md): guia prático de compilação (`npm run build`), suíte de testes (`npm test`, `npm run typecheck`), inicialização (`npm start`) e acesso web (`http://localhost:3001`).
* [04 — Fluxo Operacional da EV-001](documentacao/naamive/04_FLUXO_OPERACIONAL_EV001.md): roteiro passo a passo para o Owner inspecionar e operar o ciclo de vida da EV-001 (cadastro, pareceres, decisão do Owner `mhj` e visualização do Compromisso).

### Governança

* [Débitos e Continuidade Progressiva](documentacao/governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md)
* [Débitos de Governança](documentacao/governanca/debitos/DEB-GOV-001.md)
  * [DEB-GOV-001 — Ausência de Homologação do Owner na Entrega de Valor](documentacao/governanca/debitos/DEB-GOV-001.md)
* [Débitos Técnicos](documentacao/governanca/debitos/DEB-TEC-001.md)
  * [DEB-TEC-001 — Ausência de Motor de Orquestração Autônoma de Agentes e Handoffs no Worker/Backend](documentacao/governanca/debitos/DEB-TEC-001.md)

### Atores

* [Conceito de Ator](documentacao/atores/01_CONCEITO_DE_ATOR.md)

### Necessidade

* [Definição da Necessidade](documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md)
* [Modelo de Necessidade](documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md)
* [Atores da Necessidade](documentacao/necessidade/03_ATORES_DA_NECESSIDADE.md)
* [Formação e qualificação da Necessidade](documentacao/necessidade/04_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md)
* [Ciclo de Vida da Necessidade](documentacao/necessidade/05_CICLO_DE_VIDA_DA_NECESSIDADE.md)
* [Status da Necessidade](documentacao/necessidade/06_STATUS_DA_NECESSIDADE.md)
* [Resultados do Processo da Necessidade](documentacao/necessidade/07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md)

### Projeto

* [Definição do Projeto](documentacao/projeto/01_DEFINICAO_DO_PROJETO.md)
* [Modelo de Projeto](documentacao/projeto/02_MODELO_DE_PROJETO.md)
* [Atores do Projeto](documentacao/projeto/03_ATORES_DO_PROJETO.md)
* [Formação do Projeto](documentacao/projeto/04_FORMACAO_DO_PROJETO.md)
* [Ciclo de Vida do Projeto](documentacao/projeto/05_CICLO_DE_VIDA_DO_PROJETO.md)
* [Status do Projeto](documentacao/projeto/06_STATUS_DO_PROJETO.md)
* [Resultados do Processo do Projeto](documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md)

### Módulo

* [Definição do Módulo](documentacao/modulo/01_DEFINICAO_DO_MODULO.md)
* [Modelo de Módulo](documentacao/modulo/02_MODELO_DE_MODULO.md)
* [Atores do Módulo](documentacao/modulo/03_ATORES_DO_MODULO.md)
* [Formação do Módulo](documentacao/modulo/04_FORMACAO_DO_MODULO.md)
* [Ciclo de Vida do Módulo](documentacao/modulo/05_CICLO_DE_VIDA_DO_MODULO.md)
* [Status do Módulo](documentacao/modulo/06_STATUS_DO_MODULO.md)
* [Resultados do Processo do Módulo](documentacao/modulo/07_RESULTADOS_DO_PROCESSO_DO_MODULO.md)

### Entrega de Valor

* [Definição da Entrega de Valor](documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md)
* [Modelo de Entrega de Valor](documentacao/entrega-de-valor/02_MODELO_DE_ENTREGA_DE_VALOR.md)
* [Atores da Entrega de Valor](documentacao/entrega-de-valor/03_ATORES_DA_ENTREGA_DE_VALOR.md)
* [Formação da Entrega de Valor](documentacao/entrega-de-valor/04_FORMACAO_DA_ENTREGA_DE_VALOR.md)
* [Ciclo de Vida da Entrega de Valor](documentacao/entrega-de-valor/05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md)
* [Status da Entrega de Valor](documentacao/entrega-de-valor/06_STATUS_DA_ENTREGA_DE_VALOR.md)
* [Resultados do Processo da Entrega de Valor](documentacao/entrega-de-valor/07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md)

#### Referências

* [Catálogo de Baselines Técnicas](documentacao/entrega-de-valor/referencias/CATALOGO_DE_BASELINES_TECNICAS.md)

### Item de Trabalho (Realização)

* [Definição do Item de Trabalho](documentacao/item-de-trabalho/01_DEFINICAO_DO_ITEM_DE_TRABALHO.md)
* [Modelo de Item de Trabalho](documentacao/item-de-trabalho/02_MODELO_DE_ITEM_DE_TRABALHO.md)
* [Atores do Item de Trabalho](documentacao/item-de-trabalho/03_ATORES_DO_ITEM_DE_TRABALHO.md)
* [Planejamento e Decomposição](documentacao/item-de-trabalho/04_PLANEJAMENTO_E_DECOMPOSICAO.md)
* [Ciclo de Vida do Item de Trabalho](documentacao/item-de-trabalho/05_CICLO_DE_VIDA_DO_ITEM_DE_TRABALHO.md)
* [Status do Item de Trabalho](documentacao/item-de-trabalho/06_STATUS_DO_ITEM_DE_TRABALHO.md)
* [Resultados do Processo do Item de Trabalho](documentacao/item-de-trabalho/07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md)

## Dados operacionais

### Necessidades

* [N-001 — NAAMIVE](dados/necessidades/N-001/necessidade.md)

### Projetos

* [P-001 — Jornada Autônoma do NAAMIVE](dados/projetos/P-001/projeto.md)
  * [Mapa de Módulos do P-001](dados/projetos/P-001/mapa-de-modulos.md)

### Módulos

* [M-001 — Condução da Necessidade](dados/modulos/M-001/modulo.md)
  * [Mapa de Entregas de Valor de M-001](dados/modulos/M-001/mapa-de-entregas-de-valor.md)
* [M-002 — Formação do Projeto](dados/modulos/M-002/modulo.md)
  * [Mapa de Entregas de Valor de M-002](dados/modulos/M-002/mapa-de-entregas-de-valor.md)
* [M-003 — Coordenação do Trabalho](dados/modulos/M-003/modulo.md)
  * [Mapa de Entregas de Valor de M-003](dados/modulos/M-003/mapa-de-entregas-de-valor.md)
* [M-004 — Contexto e Rastreabilidade](dados/modulos/M-004/modulo.md)
  * [Mapa de Entregas de Valor de M-004](dados/modulos/M-004/mapa-de-entregas-de-valor.md)
* [M-005 — Verificação do Resultado de Software](dados/modulos/M-005/modulo.md)
  * [Mapa de Entregas de Valor de M-005](dados/modulos/M-005/mapa-de-entregas-de-valor.md)

### Entregas de Valor

* [EV-001 — Compromisso da Necessidade](dados/entregas-de-valor/EV-001/entrega-de-valor.md)
  * [Plano de Realização da EV-001](dados/entregas-de-valor/EV-001/plano-de-realizacao.md)
* [EV-002 — Direção do Projeto](dados/entregas-de-valor/EV-002/entrega-de-valor.md)
  * [Plano de Realização da EV-002](dados/entregas-de-valor/EV-002/plano-de-realizacao.md)
* [EV-003 — Coordenação do Trabalho Preparado](dados/entregas-de-valor/EV-003/entrega-de-valor.md)
  * [Plano de Realização da EV-003](dados/entregas-de-valor/EV-003/plano-de-realizacao.md)
* [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](dados/entregas-de-valor/EV-004/entrega-de-valor.md)
  * [Plano de Realização da EV-004](dados/entregas-de-valor/EV-004/plano-de-realizacao.md)
* [EV-005 — Avaliação e Verificação da Entrega de Valor](dados/entregas-de-valor/EV-005/entrega-de-valor.md)
  * [Plano de Realização da EV-005](dados/entregas-de-valor/EV-005/plano-de-realizacao.md)

### Itens de Trabalho

* [IT-001 — Estrutura Base Node.js/TypeScript, Configuração e Esquema PostgreSQL](dados/itens-de-trabalho/IT-001/item-de-trabalho.md)
* [IT-002 — Núcleo de Domínio da Necessidade, Regras de Transição e Compromisso](dados/itens-de-trabalho/IT-002/item-de-trabalho.md)
* [IT-003 — Worker em Background Desacoplado, Autenticação e Portas de Integração](dados/itens-de-trabalho/IT-003/item-de-trabalho.md)
* [IT-004 — Camada Web Responsiva, Adaptadores HTTP e Suíte de Testes Locais](dados/itens-de-trabalho/IT-004/item-de-trabalho.md)
* [IT-005 — Esquema Relacional PostgreSQL do Projeto, Migrações e Integridade 1:1](dados/itens-de-trabalho/IT-005/item-de-trabalho.md)
* [IT-006 — Núcleo de Domínio de Projeto, Transições de Status e Etapas de Formação](dados/itens-de-trabalho/IT-006/item-de-trabalho.md)
* [IT-007 — Repositório PostgreSQL, Serviço de Aplicação de Projeto e Handoff M-001/M-002](dados/itens-de-trabalho/IT-007/item-de-trabalho.md)
* [IT-008 — Camada Web Responsiva de Projetos, Visualização da Direção e Suíte Integrada](dados/itens-de-trabalho/IT-008/item-de-trabalho.md)
* [IT-009 — Esquema Relacional PostgreSQL de Coordenação do Trabalho e Migrações](dados/itens-de-trabalho/IT-009/item-de-trabalho.md)
* [IT-010 — Núcleo de Domínio de Coordenação, Motor de Elegibilidade e Invariante de Especialização](dados/itens-de-trabalho/IT-010/item-de-trabalho.md)
* [IT-011 — Repositório PostgreSQL, Serviço de Aplicação de Coordenação e Worker em Background](dados/itens-de-trabalho/IT-011/item-de-trabalho.md)
* [IT-012 — Camada Web Responsiva de Coordenação, Despacho de Handoffs e Suíte Integrada](dados/itens-de-trabalho/IT-012/item-de-trabalho.md)
* [IT-013 — Esquema Relacional PostgreSQL de Contexto e Rastreabilidade e Migrações](dados/itens-de-trabalho/IT-013/item-de-trabalho.md)
* [IT-014 — Núcleo de Domínio de Contexto, Rastreabilidade e Motor de Recuperação Proporcional](dados/itens-de-trabalho/IT-014/item-de-trabalho.md)
* [IT-015 — Repositório PostgreSQL, Serviço de Aplicação de Contexto e Auditoria em Background](dados/itens-de-trabalho/IT-015/item-de-trabalho.md)
* [IT-016 — Camada Web Responsiva de Rastreabilidade, Inspeção Causal e Suíte Integrada](dados/itens-de-trabalho/IT-016/item-de-trabalho.md)
* [IT-017 — Esquema Relacional PostgreSQL de Verificação de Software e Migrações](dados/itens-de-trabalho/IT-017/item-de-trabalho.md)
* [IT-018 — Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade](dados/itens-de-trabalho/IT-018/item-de-trabalho.md)
* [IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background](dados/itens-de-trabalho/IT-019/item-de-trabalho.md)
* [IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada](dados/itens-de-trabalho/IT-020/item-de-trabalho.md)

## Estrutura atual

```text
AGENTS.md
README.md
CONTINUIDADE_ATUAL.md

.agents/
└── skills/
    ├── necessidade/
    │   ├── formacao-da-necessidade/
    │   │   └── SKILL.md
    │   ├── auditoria-da-necessidade/
    │   │   └── SKILL.md
    │   └── qualificacao-da-necessidade/
    │       └── SKILL.md
    ├── projeto/
        ├── formacao-do-projeto/
        │   └── SKILL.md
        ├── auditoria-do-projeto/
        │   └── SKILL.md
        └── verificacao-agregada-do-projeto/
            └── SKILL.md
    ├── modulo/
        ├── delimitacao-de-modulos/
        │   └── SKILL.md
        ├── formacao-do-modulo/
        │   └── SKILL.md
        └── auditoria-do-modulo/
            └── SKILL.md
    ├── entrega-de-valor/
    │   ├── delimitacao-de-entregas-de-valor/
    │   │   └── SKILL.md
    │   ├── formacao-da-entrega-de-valor/
    │   │   └── SKILL.md
    │   ├── auditoria-da-entrega-de-valor/
    │   │   └── SKILL.md
    │   └── verificacao-da-entrega-de-valor/
    │       └── SKILL.md
    └── item-de-trabalho/
        ├── planejamento-da-realizacao/
        │   └── SKILL.md
        ├── execucao-do-item-de-trabalho/
        │   └── SKILL.md
        └── integracao-da-realizacao/
            └── SKILL.md

documentacao/
├── naamive/
│   ├── 01_STACK_E_ARQUITETURA.md
│   ├── 02_CONFIGURACAO_E_AMBIENTE.md
│   ├── 03_COMO_EXECUTAR_E_TESTAR.md
│   └── 04_FLUXO_OPERACIONAL_EV001.md
├── governanca/
│   ├── 01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md
│   └── debitos/
│       ├── DEB-GOV-001.md
│       └── DEB-TEC-001.md
├── atores/
│   └── 01_CONCEITO_DE_ATOR.md
├── necessidade/
│   ├── 01_DEFINICAO_DA_NECESSIDADE.md
│   ├── 02_MODELO_DE_NECESSIDADE.md
│   ├── 03_ATORES_DA_NECESSIDADE.md
│   ├── 04_FORMACAO_E_QUALIFICACAO_DA_NECESSIDADE.md
│   ├── 05_CICLO_DE_VIDA_DA_NECESSIDADE.md
│   ├── 06_STATUS_DA_NECESSIDADE.md
│   └── 07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md
├── projeto/
    ├── 01_DEFINICAO_DO_PROJETO.md
    ├── 02_MODELO_DE_PROJETO.md
    ├── 03_ATORES_DO_PROJETO.md
    ├── 04_FORMACAO_DO_PROJETO.md
    ├── 05_CICLO_DE_VIDA_DO_PROJETO.md
    ├── 06_STATUS_DO_PROJETO.md
    └── 07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md
├── modulo/
    ├── 01_DEFINICAO_DO_MODULO.md
    ├── 02_MODELO_DE_MODULO.md
    ├── 03_ATORES_DO_MODULO.md
    ├── 04_FORMACAO_DO_MODULO.md
    ├── 05_CICLO_DE_VIDA_DO_MODULO.md
    ├── 06_STATUS_DO_MODULO.md
    └── 07_RESULTADOS_DO_PROCESSO_DO_MODULO.md
├── entrega-de-valor/
│   ├── 01_DEFINICAO_DA_ENTREGA_DE_VALOR.md
│   ├── 02_MODELO_DE_ENTREGA_DE_VALOR.md
│   ├── 03_ATORES_DA_ENTREGA_DE_VALOR.md
│   ├── 04_FORMACAO_DA_ENTREGA_DE_VALOR.md
│   ├── 05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md
│   ├── 06_STATUS_DA_ENTREGA_DE_VALOR.md
│   ├── 07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md
│   └── referencias/
│       └── CATALOGO_DE_BASELINES_TECNICAS.md
└── item-de-trabalho/
    ├── 01_DEFINICAO_DO_ITEM_DE_TRABALHO.md
    ├── 02_MODELO_DE_ITEM_DE_TRABALHO.md
    ├── 03_ATORES_DO_ITEM_DE_TRABALHO.md
    ├── 04_PLANEJAMENTO_E_DECOMPOSICAO.md
    ├── 05_CICLO_DE_VIDA_DO_ITEM_DE_TRABALHO.md
    ├── 06_STATUS_DO_ITEM_DE_TRABALHO.md
    └── 07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md

dados/
├── necessidades/
│   └── N-001/
│       └── necessidade.md
├── projetos/
    └── P-001/
        ├── mapa-de-modulos.md
        └── projeto.md
├── modulos/
    ├── M-001/
    │   ├── modulo.md
    │   └── mapa-de-entregas-de-valor.md
    ├── M-002/
    │   ├── modulo.md
    │   └── mapa-de-entregas-de-valor.md
    ├── M-003/
    │   ├── modulo.md
    │   └── mapa-de-entregas-de-valor.md
    ├── M-004/
    │   ├── modulo.md
    │   └── mapa-de-entregas-de-valor.md
    └── M-005/
        ├── modulo.md
        └── mapa-de-entregas-de-valor.md
└── entregas-de-valor/
    ├── EV-001/
    │   ├── entrega-de-valor.md
    │   └── plano-de-realizacao.md
    ├── EV-002/
    │   ├── entrega-de-valor.md
    │   └── plano-de-realizacao.md
    ├── EV-003/
    │   ├── entrega-de-valor.md
    │   └── plano-de-realizacao.md
    ├── EV-004/
    │   ├── entrega-de-valor.md
    │   └── plano-de-realizacao.md
    └── EV-005/
        ├── entrega-de-valor.md
        └── plano-de-realizacao.md
dados/itens-de-trabalho/
├── IT-001/
│   └── item-de-trabalho.md
├── IT-002/
│   └── item-de-trabalho.md
├── IT-003/
│   └── item-de-trabalho.md
├── IT-004/
│   └── item-de-trabalho.md
├── IT-005/
│   └── item-de-trabalho.md
├── IT-006/
│   └── item-de-trabalho.md
├── IT-007/
│   └── item-de-trabalho.md
├── IT-008/
│   └── item-de-trabalho.md
├── IT-009/
│   └── item-de-trabalho.md
├── IT-010/
│   └── item-de-trabalho.md
├── IT-011/
│   └── item-de-trabalho.md
├── IT-012/
│   └── item-de-trabalho.md
├── IT-013/
│   └── item-de-trabalho.md
├── IT-014/
│   └── item-de-trabalho.md
├── IT-015/
│   └── item-de-trabalho.md
├── IT-016/
│   └── item-de-trabalho.md
├── IT-017/
│   └── item-de-trabalho.md
├── IT-018/
│   └── item-de-trabalho.md
├── IT-019/
│   └── item-de-trabalho.md
└── IT-020/
    └── item-de-trabalho.md
```

O `README.md` responde onde está cada coisa. O `CONTINUIDADE_ATUAL.md` responde onde o trabalho está agora.
