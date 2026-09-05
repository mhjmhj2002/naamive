# Pré-requisitos de ambiente

Este guia descreve o que deve estar disponível antes de iniciar o runtime
Node/Web da Fase 1.

| Requisito | Obrigatório | Como validar |
| --- | --- | --- |
| [Node.js 24+](NODE_SETUP.md) e npm | Sim | `node --version` e `npm --version` |
| Docker Engine e Docker Compose v2 | Sim, para PostgreSQL local | `docker --version` e `docker compose version` |
| Git | Sim | `git --version` |
| Clone Git local do projeto a conduzir | Sim para criar um projeto | `git -C /caminho/do/clone remote get-url origin` |
| Diretório persistente para ArtifactStore | Sim | `mkdir -p /caminho/artefatos && test -w /caminho/artefatos` |
| Portas locais 3000 e 5432 livres | Recomendado | `ss -ltn '( sport = :3000 or sport = :5432 )'` |

## Docker e PostgreSQL

O PostgreSQL de desenvolvimento é iniciado pelo Compose deste diretório:

```sh
cd naamive/runtime/node-web
docker compose up -d postgres
docker compose ps
```

Não é necessário instalar PostgreSQL no sistema para o fluxo normal. O Compose
expõe o banco somente em `127.0.0.1:5432` e mantém os dados em volume Docker.

## Git e clone do projeto

Ao criar um projeto pela web, informe o caminho absoluto de um clone Git local
existente. Esse clone precisa ter `origin`, branch-base e um commit inicial.
Ele deve ficar abaixo de uma raiz listada em `NAAMIVE_REPOSITORY_ROOTS` no
arquivo `.env`.

Exemplo de configuração local:

```dotenv
NAAMIVE_REPOSITORY_ROOTS=/home/seu-usuario/git
```

Se a árvore Git tiver alterações, a API exige confirmação explícita e uma razão
durante a criação/vinculação.

## ArtifactStore

Crie fora do repositório NAAMIVE um diretório persistente para evidências:

```sh
mkdir -p /home/seu-usuario/naamive-artifacts
```

Configure-o no `.env` com URI `file://`:

```dotenv
NAAMIVE_ARTIFACT_STORE_URI=file:///home/seu-usuario/naamive-artifacts
```

Não use uma pasta dentro deste repositório: o runtime trata a NAAMIVE como
somente leitura e não grava logs, estado ou evidências nela.

## Ferramentas opcionais

`pg_dump`, `pg_restore` e `sha256sum` são necessários apenas para executar os
scripts manuais de backup e restore. Se você usa somente o PostgreSQL via
Docker, pode chamar essas ferramentas dentro do container ou instalá-las pelo
gerenciador de pacotes da sua distribuição.
