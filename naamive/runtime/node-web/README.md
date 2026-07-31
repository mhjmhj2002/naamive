# Runtime Node/Web — Fase 1

Pré-requisitos: Node 24+, PostgreSQL 16+ e um diretório persistente para
artefatos. Todos os comandos abaixo devem ser executados no diretório
`naamive/runtime/node-web`. Nele, copie `.env.example` para `.env`, ajuste as
raízes permitidas e execute:

```sh
cd naamive/runtime/node-web
cp .env.example .env
# edite .env com os caminhos da sua máquina
npm install
docker compose up -d postgres
npm run migrate
npm run dev
# em outro terminal
npm run worker
```

Os comandos `start`, `dev`, `worker`, `migrate` e `reconcile` carregam
automaticamente o arquivo `.env` desse diretório quando ele existe.

A API aceita somente loopback. `NAAMIVE_REPOSITORY_ROOTS`,
`NAAMIVE_ARTIFACT_STORE_URI` e `NAAMIVE_OPERATOR_ID` são obrigatórios; o worker
não inicia sem eles. O operador é injetado pelo servidor: a interface não pode
escolhê-lo.
Use `scripts/backup.sh backup.dump` e `scripts/restore.sh backup.dump` para os
procedimentos manuais de Fase 1. O destino de restore deve ser um PostgreSQL
efêmero durante o teste de aceite.
