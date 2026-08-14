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

A sequência aditiva `044_phase_6_assurance.sql`,
`045_phase_6_assurance_upgrade_compatibility.sql`,
`046_phase_6_contract_completeness.sql` e
`047_phase_6_rework_and_query_guards.sql` instala o modelo sem backfill do
legado. O rollout é opt-in:
publique uma política em `POST /api/admin/assurance-policies`; somente novos
dispatches selecionados por `agentPolicyNames`, `taskTypes` e `classifications`
entram no micro-lifecycle de assurance. Desabilitar a política interrompe novas
seleções e não muda execuções ou aceites já existentes; não apague o histórico
para fazer rollback.

Cada política deve declarar `reviewer_runtime_ids`. O servidor só seleciona
runtimes habilitados e atuais dessa lista, congela a identidade completa do
produtor e rejeita reviewer igual ao produtor. Ao concluir um dispatch F6, o
mesmo commit transacional cria `OUTPUT_SUBMITTED`, o `work_acceptance` e o job
`REVIEW`; se nenhum reviewer independente estiver elegível, o aceite permanece
em `WAITING_FOR_INDEPENDENT_REVIEWER` e nenhum efeito de negócio é promovido.
O output estruturado fica no ArtifactStore por referência e hash, nunca dentro
do payload público do aceite ou do pacote de review.

`/api/projects/:projectId/assurance` é uma projeção sanitizada, inclusive para
timeline por cursor. Nunca envie prompts, saída bruta, logs, segredos ou paths.
On-call pode cancelar; exceção de independência, escopo, arquitetura, política,
risco e fechamento escalado exigem gate humano de Tech Lead ou dono do
repositório.

O stream `GET /api/projects/:projectId/assurance/events` implementa
`assurance-sse/v1`. Ele aceita o cursor numérico ascendente em `cursor` ou
`Last-Event-ID`, reenvia somente eventos com id maior que o cursor e é
estritamente de leitura — reconectar não cria dispatch, decisão ou rework. Cada
evento `assurance` contém apenas o registro sanitizado da timeline; o cabeçalho
`X-Assurance-Stream-Version: 1` fixa o contrato. A projeção inclui as métricas
de tempo até review/aceite, rework, indisponibilidade de reviewer, bloqueios,
escalonamentos e falhas de handoff.

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
