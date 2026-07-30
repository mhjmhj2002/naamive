---
document_type: agent-execution-guide
status: APPROVED_FOR_PHASE_1
created_at: 2026-07-30
scope: execution of Phase 1 tasks F1-01 through F1-14
primary_roadmap: 01_DELIVERY_ROADMAP.md
---

# Guia de Execução do Agente — Fase 1

## Contexto do workspace

| Item | Localização |
| --- | --- |
| Raiz do projeto | `/home/mhj/git/naamive` |
| Documentação da migração Node/Web | `/home/mhj/git/naamive/naamive/orchestration/demand-intake/node-web-orchestration-platform` |
| Runtime alvo da Fase 1 | `/home/mhj/git/naamive/naamive/runtime/node-web` |
| Runtime Python legado (somente referência) | `/home/mhj/git/naamive/naamive/runtime/python` |

Trabalhe a partir da raiz do projeto. A documentação da migração é a fonte de
verdade de produto e contratos; o runtime Python está deprecated e serve apenas
para inventário/paridade, nunca para novas funcionalidades.

## Índice de documentos da migração

| Arquivo | O que define | Quando utilizar |
| --- | --- | --- |
| `00_PRODUCT_NORTH_STAR.md` | Visão de produto, limites do MVP e princípios soberanos. | Antes de qualquer decisão que altere escopo, segurança, auditoria ou arquitetura. |
| `01_DELIVERY_ROADMAP.md` | Fases, tarefas, definição de pronto, pendências, status e issues. | No início, antes/depois de cada tarefa e ao registrar pendência ou issue. |
| `02_PHASE_1_STATE_MACHINE_CONTRACT.md` | Estados, transições, guards, efeitos, idempotência e recuperação de `PROJECT_INTAKE`. | Ao implementar F1-01, F1-05, F1-09, F1-11 ou comportamento de workflow. |
| `03_ARTIFACT_STORAGE_AND_AUDIT_CONTRACT.md` | Fonte canônica, campos e imutabilidade de artefatos/auditoria. | Ao implementar F1-06, jobs, eventos, gates ou reconciliação. |
| `04_PHASE_1_INTAKE_AND_VALIDATION_CONTRACT.md` | Schema de intake, revisão, vínculo Git e `VALIDATE_INTAKE`. | Ao implementar F1-01, F1-04, F1-07, F1-09 ou F1-11. |
| `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` | Segurança local, exclusividade, status, backup e operação. | Ao implementar F1-03, F1-08, F1-10, F1-12 ou configuração local. |
| `06_PHASE_1_AGENT_EXECUTION_GUIDE.md` | Processo de execução do agente, atualizações e validações. | Durante toda a Fase 1; siga este arquivo como instrução operacional. |

## Instrução de execução

Execute a Fase 1 do roadmap NAAMIVE de forma incremental e até o fim.

Raiz do projeto: /home/mhj/git/naamive.
Documentação da migração: /home/mhj/git/naamive/naamive/orchestration/demand-intake/node-web-orchestration-platform.
Você recebeu este arquivo como instrução operacional. Leia-o inteiro antes de
agir e siga seu índice de documentos. O roadmap principal é
`01_DELIVERY_ROADMAP.md`.

Escopo: executar somente F1-01 a F1-14. Não iniciar tarefas das Fases 2–5.
Comece pela tabela "Status das tarefas das fases" no roadmap e trabalhe apenas nas tarefas F1 marcadas TO DO ou DOING, respeitando dependências.

Para cada tarefa:
1. Leia sua definição de pronto e impedimento/tratamento no roadmap.
2. Implemente a menor fatia vertical que avance a tarefa sem quebrar contratos publicados.
3. Execute validações proporcionais (build, migration, testes unitários, integração e/ou E2E).
4. Atualize a observação e o status da tarefa no roadmap: TO DO → DOING → DONE. Use DONE apenas quando a definição de pronto estiver implementada e verificada.
5. Não altere uma definição de workflow publicada; crie nova versão/migration quando necessário.

Issues: ao encontrar um problema real durante a implementação, registre-o imediatamente na tabela "Issues encontradas durante a implementação" ao fim do roadmap. Preencha ID sequencial I-XXX, fase/tarefa, impacto (BLOCKING ou NON_BLOCKING), status OPEN, descrição, proposta de solução e aprovação PENDING. Continue tarefas independentes. Uma issue BLOCKING bloqueia somente a tarefa/fase afetada. Após aprovada, implemente a solução, valide e marque RESOLVED; atualize Aprovada para YES. Não transforme uma issue em pendência de prontidão sem necessidade.

Pendências: respeite as pendências do roadmap. Se uma decisão aprovada ainda não estiver implementada, mantenha-a OPEN. Só use RESOLVED para implementação verificada e mantenha resumo e registro detalhado consistentes.

Regras obrigatórias da Fase 1:
- Node.js + TypeScript; PostgreSQL é o banco normal de desenvolvimento e teste de integração/E2E.
- API localhost-only, CORS local restrito, ArtifactStore externo persistente e raízes Git allowlisted.
- O repositório NAAMIVE é somente leitura em runtime; não grave logs, estado ou evidências nele.
- A máquina de estados é soberana e baseada em workflow versionado/publicado; agentes não alteram estado canônico diretamente.
- Todo comando operacional é idempotente ou retorna conflito explicável; SUBMIT_INTAKE retorna ACCEPTED rapidamente com operation_id.
- Estado, evento, operação e job são atômicos quando aplicável; jobs usam outbox PostgreSQL, lease, idempotência, recuperação e somente um worker executando por vez.
- Eventos persistidos são a fonte da timeline e SSE; nunca simule progresso em memória.
- A identidade vem de NAAMIVE_OPERATOR_ID no servidor, nunca do payload web.
- ArtifactStore usa intenção persistida, chave/hash imutáveis e reconciliação; falha não pode avançar o workflow com auditoria parcial.

Critério de término: F1-01 a F1-14 estão DONE, não existe issue OPEN/BLOCKING da Fase 1, as pendências aplicáveis estão RESOLVED e o aceite web reproduz o fluxo criar/vincular → editar → submeter → worker → SSE → REGISTER_PROJECT → REGISTERED, incluindo ArtifactStore e recuperação após restart. Ao terminar, reporte arquivos alterados, comandos de validação e evidências; não inicie a Fase 2.

## Ordem recomendada

1. F1-01 a F1-05: consolidar modelo, inventário do legado, catálogo, validação
   Git e workflow publicado.
2. F1-06 a F1-10: ArtifactStore, API, PostgreSQL operacional, submissão e
   outbox.
3. F1-11 e F1-12: worker recuperável, eventos e SSE.
4. F1-13: interface web completa sobre as APIs e projeções reais.
5. F1-14: teste de aceite, reinício de worker e demonstração reproduzível.

## Rotina de atualização do roadmap

Após cada incremento verificável, atualize a linha correspondente na tabela de
status e registre uma observação curta, factual e verificável. Ao descobrir uma
issue, registre-a antes de iniciar a correção. Ao concluir F1-14, revise o
resumo de pendências, a tabela de status das tarefas e a tabela de issues para
eliminar divergências.

## Comandos de validação esperados

No diretório `naamive/runtime/node-web`:

```sh
npm run build
docker compose up -d postgres
npm run migrate
npm run reconcile
npm run test
npm run e2e
```

Se Docker ou outro recurso externo falhar por limitação do ambiente, crie uma
issue `NON_BLOCKING` ou `BLOCKING` conforme o impacto, inclua evidência segura
e continue tudo que puder ser validado localmente.
