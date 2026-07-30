# Runtime Node/Web — Fase 1

Pré-requisitos: Node 24+, PostgreSQL 16+ e um diretório persistente para
artefatos. Copie `.env.example`, ajuste as raízes permitidas e execute:

```sh
npm install
docker compose up -d postgres
npm run migrate
npm run dev
# em outro terminal
npm run worker
```

A API aceita somente loopback. `NAAMIVE_REPOSITORY_ROOTS`,
`NAAMIVE_ARTIFACT_STORE_URI` e `NAAMIVE_OPERATOR_ID` são obrigatórios; o worker
não inicia sem eles. O operador é injetado pelo servidor: a interface não pode
escolhê-lo.
Use `scripts/backup.sh backup.dump` e `scripts/restore.sh backup.dump` para os
procedimentos manuais de Fase 1. O destino de restore deve ser um PostgreSQL
efêmero durante o teste de aceite.
