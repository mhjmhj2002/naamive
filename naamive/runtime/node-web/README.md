# Runtime Node/Web — Fase 1

Pré-requisitos: consulte o [guia de pré-requisitos de ambiente](ENVIRONMENT_PREREQUISITES.md).
Todos os comandos abaixo devem ser executados no diretório
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

Se você estiver na raiz do repositório (`~/git/naamive`), prefixe os comandos
com o diretório do runtime em vez de executá-los diretamente:

```sh
npm --prefix naamive/runtime/node-web run worker
```

O mesmo formato funciona para `migrate`, `dev`, `reconcile`, `test` e `e2e`.

## Assurance (Fase 6)

A migration `044_phase_6_assurance.sql` é aditiva. O rollout é opt-in:
publique uma política em `POST /api/admin/assurance-policies`; somente novos
dispatches selecionados por `agentPolicyNames`, `taskTypes` e `classifications`
entram no micro-lifecycle de assurance. Desabilitar a política interrompe novas
seleções e não muda execuções ou aceites já existentes; não apague o histórico
para fazer rollback.

`/api/projects/:projectId/assurance` é uma projeção sanitizada, inclusive para
timeline por cursor. Nunca envie prompts, saída bruta, logs, segredos ou paths.
On-call pode cancelar; exceção de independência, escopo, arquitetura, política,
risco e fechamento escalado exigem gate humano de Tech Lead ou dono do
repositório.

Os comandos `start`, `dev`, `worker`, `migrate` e `reconcile` carregam
automaticamente o arquivo `.env` desse diretório quando ele existe.

## Depois de iniciar

Mantenha os dois terminais abertos:

| Terminal | Comando | Responsabilidade |
| --- | --- | --- |
| 1 | `npm run dev` | Executa a API e serve a interface web local. |
| 2 | `npm run worker` | Processa em segundo plano a validação do intake e abre o gate de registro. |

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000) no navegador. A interface
permite criar um rascunho, informar o caminho absoluto de um clone Git local,
submeter a necessidade e acompanhar os eventos. Quando o worker concluir a
validação, aprove ou rejeite o gate `REGISTER_PROJECT` na própria página.

O caminho do clone deve estar abaixo de `NAAMIVE_REPOSITORY_ROOTS` no `.env`,
ter Git, `origin`, branch-base e um commit inicial. Use um clone descartável ou
de teste para experimentar o fluxo.

Para encerrar, pressione `Ctrl+C` em cada terminal. O PostgreSQL permanece em
execução; para pará-lo também, execute `docker compose stop postgres` no
diretório `naamive/runtime/node-web`.

A API aceita somente loopback. `NAAMIVE_REPOSITORY_ROOTS`,
`NAAMIVE_ARTIFACT_STORE_URI` e `NAAMIVE_OPERATOR_ID` são obrigatórios; o worker
não inicia sem eles. O operador é injetado pelo servidor: a interface não pode
escolhê-lo.
Use `scripts/backup.sh backup.dump` e `scripts/restore.sh backup.dump` para os
procedimentos manuais de Fase 1. O destino de restore deve ser um PostgreSQL
efêmero durante o teste de aceite.
