# Stack e Arquitetura do NAAMIVE

## 1. Visão Geral

O **NAAMIVE** é uma plataforma concebida para conduzir necessidades de negócio até resultados de software verificáveis de ponta a ponta sem exigir coordenação manual contínua.

Sua arquitetura é fundamentada nos princípios de:
- **Domain-Driven Design (DDD) Puro:** A lógica de negócio, entidades de domínio, regras invariantes e transições de ciclo de vida são 100% isoladas de frameworks web, bancos de dados ou bibliotecas externas.
- **Portas e Adaptadores (Arquitetura Hexagonal):** A aplicação interage com o mundo externo através de contratos explícitos (portas), implementados por adaptadores intercambiáveis (HTTP, persistência PostgreSQL/em memória, autenticação do Owner e filas de tarefas).
- **Assincronismo e Desacoplamento:** O processamento demorado, eventos de integração entre módulos e reconciliação de estado rodam em um Worker desacoplado em segundo plano, mantendo as requisições HTTP rápidas e responsivas.

---

## 2. Componentes da Stack Tecnológica

| Componente | Tecnologia | Papel e Justificativa |
| :--- | :--- | :--- |
| **Runtime & Módulos** | Node.js (>= 24.0.0, ESM Nativo) | Suporte moderno a módulos ECMAScript nativos (`"type": "module"`), estabilidade de longo prazo e alta performance de I/O assíncrono. |
| **Linguagem & Tipagem** | TypeScript 5.8 | Tipagem estrita (`strict: true`), garantindo integridade de contratos, enums de status, ausência de efeitos colaterais e segurança em tempo de compilação. |
| **Banco de Dados Relacional** | PostgreSQL / `pg` | Persistência transacional com isolamento ACID, integridade referencial estrita, histórico imutável em JSONB e controle de concorrência. |
| **Emulador em Memória** | `pg-mem` | Permite testes unitários e de integração ultrarrápidos e operação autônoma sem requerer um container ou daemon externo ativo no ambiente local. |
| **Camada Web & HTTP** | Node.js `http` nativo | Servidor HTTP enxuto, sem acoplamento a frameworks pesados, com roteamento semântico, renderização de templates HTML com Bootstrap 5 e endpoints REST JSON. |
| **Design & UI Responsiva** | Bootstrap 5 + Vanilla CSS | Interface moderna com tema escuro (Dark Mode), paleta de cores balanceada, cartões informativos, badges de status, linha do tempo interativa e total responsividade para dispositivos móveis e desktops. |
| **Processamento Assíncrono** | `WorkerSegundoPlano` | Worker desacoplado com ciclo de polling não bloqueante, loop assíncrono, tratamento de falhas e re-tentativas idempotentes. |
| **Suíte de Testes** | Vitest 3.0 | Executor de testes rápido com suporte nativo a ESM e TypeScript, executando toda a suíte de testes de fundação, domínio, worker e web em poucos segundos. |

---

## 3. Topologia e Isolamento Arquitetural

A estrutura de código em `src/` obedece a um isolamento estrito de camadas:

```text
src/
├── domain/                  # Núcleo de Domínio Puro (sem dependências externas)
│   ├── tipos.ts             # Enums de Status, Tipos de Necessidade, Decisões e Atores
│   ├── erros.ts             # Erros de domínio (InvarianteViolada, TransicaoInvalida, etc.)
│   ├── valores.ts           # Objetos de Valor e registros de eventos imutáveis
│   ├── necessidade.ts       # Entidade raiz agregada com regras de transição e invariantes
│   ├── servico-compromisso.ts # Consolidação formal do Compromisso da Necessidade
│   └── repositorio-necessidade.ts # Contrato da Porta de Persistência do Domínio
│
├── infrastructure/          # Camada de Infraestrutura e Adaptadores
│   ├── database/            # Adaptadores de Banco de Dados
│   │   ├── conexao.ts       # Gerenciador de conexão com pool PostgreSQL
│   │   ├── migrador.ts      # Executor de migrações DDL versionadas com rastreabilidade
│   │   ├── repositorio-postgres.ts # Repositório da Necessidade em PostgreSQL
│   │   └── repositorio-memoria.ts  # Repositório da Necessidade em memória nativa
│   └── adapters/            # Portas e Adaptadores Hexagonais
│       ├── autenticacao-owner.ts   # Porta de autenticação e verificação do Owner
│       ├── integracao-modulos.ts   # Portas de integração com M-002 e M-004
│       └── fila-tarefas.ts         # Filas de tarefas (Postgres e Memória)
│
├── worker/                  # Camada de Processamento Assíncrono
│   └── worker-segundo-plano.ts # Loop de background desacoplado do ciclo HTTP
│
├── web/                     # Camada de Apresentação Web e API
│   ├── templates.ts         # Renderizador HTML responsivo com Bootstrap 5
│   └── servidor-web.ts      # Servidor HTTP nativo e roteador de rotas
│
├── config/                  # Configurações de Ambiente
│   └── ambiente.ts          # Carregamento seguro de variáveis e portas padrão
│
└── server.ts                # Bootstrap operacional executável do sistema
```

---

## 4. Fluxo de Vida e Integridade dos Dados

1. **Separação entre Estado Atual e Histórico:** O status do ciclo de vida (`EM_FORMACAO`, `EM_QUALIFICACAO`, `AGUARDANDO_DECISAO`, `EM_PROJETO`, `ATENDIDA`, `CANCELADA`) é estritamente separado do histórico de atividades, das recomendações de especialistas e das decisões do Owner.
2. **Autoridade Humana Preservada:** Transições críticas e decisões de compromisso exigem verificação estrita de identidade através do `AdaptadorAutenticacaoOwner`.
3. **Idempotência de Integrações:** A comunicação entre módulos (ex: bootstrap do Projeto M-002 a partir de N-001 aprovada) é determinística e idempotente, garantindo a regra 1:1 entre a Necessidade e o Projeto.
