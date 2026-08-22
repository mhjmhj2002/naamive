---
task: LR-01
status: TO DO
title: Publicar workflows aderentes v2
depends_on: []
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# LR-01 — Publicar workflows aderentes v2

## Objetivo

Publicar novas versões imutáveis e aderentes dos workflows de projeto, módulo,
work item e execução que estabeleçam a base contratual da Fase 6.5. Remover do
fluxo novo a autorização humana individual de WI, representar espera técnica,
elegibilidade, produção, review, integração, validação, entrega, pausa e
cancelamento sem reinterpretar versões históricas.

## Problema corrigido e referência

A auditoria `orchestration/audits/2026-08-22-lifecycle-conformance-audit.md`
identifica `WAITING_FOR_WORK_ITEM_AUTHORIZATION`, macro-estados incompletos,
gates duplicados e ausência de trilhos normativos como causas fundacionais das
demais divergências. Enquanto estados e transições publicados continuarem
ambíguos, scheduler, recovery, gates, UI e testes não terão contrato estável.

## Contexto e comportamento atual

- `MODULE_PLAN_APPROVAL` materializa WIs pelo default legado
  `WAITING_FOR_WORK_ITEM_AUTHORIZATION`.
- `AUTHORIZE_WORK_ITEM` exige autoridade `OPERATOR`, apesar de o conjunto já ter
  sido aprovado.
- WIs aprovados mas dependentes, bloqueados externamente e elegíveis compartilham
  semântica insuficiente.
- Projeto e módulo não publicam todas as etapas normativas até entrega.
- `MODULE_APPROVAL` e `ARCHITECTURE_DECISION` são universais, embora o lifecycle
  permita humano apenas quando material.
- `PAUSED`, `CANCELLED`, `DELIVERY` e `DELIVERED` não formam um contrato web
  completo; `ARCHIVED` tem outra semântica.

## Comportamento esperado

- aprovação do plano autoriza todos os WIs daquela revisão, sem gate por item;
- WI inelegível espera dependência ou blocker explícito; WI elegível entra em
  fila/dispatch automático sem ação humana;
- estados distinguem produção, output, QA, review, aceite, merge e integração;
- projeto e módulo possuem transições coerentes de implementação a entrega;
- gate ordinário ou condicional aparece apenas onde autorizado;
- pausa, retomada, cancelamento, rework e falha possuem transições formais;
- apenas `ACCEPT` pode representar trabalho aceito no caminho supervisionado.

Dependências técnicas permanecem parte do contrato de elegibilidade: são
referências explícitas a predecessores e só ficam satisfeitas pelo marco de
aceite/integração definido para a versão. Elas não são gates nem justificam
autorização manual. Bloqueios externos são uma coleção independente e
auditável de decisões/informações pendentes; múltiplos bloqueios podem coexistir,
cada resolução preserva histórico, e o WI só se torna elegível quando todos os
bloqueios ativos e dependências aplicáveis estiverem resolvidos.

## Invariantes envolvidos

- Definição publicada nunca é editada; a nova semântica usa nova versão.
- `EXECUTION_SUCCEEDED != WORK_ACCEPTED`.
- `MODULE_PLAN_APPROVAL` aprova o conjunto e não autoriza WIs individualmente.
- Estados de espera técnica não exigem autoridade humana.
- Módulo não ultrapassa projeto; projeto não avança sem evidência agregada.
- Transição inválida ou evidência insuficiente não muda estado.
- Histórico, eventos, gates e evidências permanecem resolvíveis pela versão usada.

## Modelo de estados a fechar antes da migration

O desenho final pode adaptar códigos à convenção real, mas deve distinguir
semanticamente:

| Situação | Semântica obrigatória |
| --- | --- |
| Plano aprovado e dependência pendente | espera técnica por dependência, sem ação humana |
| Plano aprovado e blocker externo ativo | parada pela decisão externa identificada |
| Plano aprovado e elegível | fila/dispatch automático |
| Produção ativa | tentativa leased/running correlacionada |
| Output produzido | evidência pronta, ainda não aceita |
| QA/review | controle automático ou espera legítima por reviewer |
| `ACCEPT` | aceite técnico que habilita integração/reavaliação |
| `REWORK` | retorno corretivo com finding/contexto |
| `BLOCK` | assistência/routing antes de escalada |
| Falha recuperável | causa e próxima ação operacional explícitas |
| Entrega | espera pelo aceite humano final |
| Pausa/cancelamento | trilhos normativos distintos de archive/delete |

## Arquivos e componentes prováveis

- `runtime/node-web/migrations/` e publicador de workflow;
- tabelas `workflow_definitions`, `workflow_states`, `workflow_transitions`,
  políticas/guards e vínculos de instância;
- `src/workflow.ts`, `src/phase3.ts`, `src/assurance.ts`, `src/projection.ts`;
- contratos HTTP/SSE e schemas de estado/ação;
- testes de migration, workflow, Phase 3, Phase 5 e Phase 6.

Os caminhos devem ser confirmados por inventário de consumidores antes da edição.

## Dependências

Nenhuma task da Fase 6.5. Depende dos contratos normativos atuais, das migrations
publicadas até F6 e da baseline F5 aplicada aos projetos v3.

## Restrições

- Não editar migrations ou definições já aplicadas.
- Não migrar silenciosamente instâncias em curso.
- Não apagar `WAITING_FOR_WORK_ITEM_AUTHORIZATION` do histórico.
- Não iniciar scheduler, pipeline ou UI desta fase nesta task além do mínimo
  necessário para publicar/selecionar o contrato novo.
- `LR-01` define o contrato de workflow, estados, transições, guards,
  versionamento e compatibilidade. `AUT-01` implementa scheduler, elegibilidade
  automática e auto-dispatch; portanto, LR-01 não pode antecipar scheduler,
  polling, auto-dispatch, reação automática a dependência satisfeita, criação
  automática de jobs ou cascata automática de execução.
- Se um ajuste mínimo tiver efeito automático inevitável apenas para garantir a
  consistência do contrato novo, documentar por que ele não constitui
  implementação antecipada da `AUT-01`.
- Não transformar estado técnico em gate humano.
- Preservar workflows legados e o projeto real auditado.

## Estratégia de implementação

1. Inventariar definições, versões, estados, transições, guards e consumidores.
2. Produzir tabela normativa de mapeamento projeto/módulo/WI/execução, incluindo
   origem, evento, controle, destino, side effects autorizados e recuperação.
3. Validar o desenho contra Compass, lifecycles, protocolo e gate policy.
4. Antes de qualquer alteração funcional, migration ou publicação de workflow,
   fechar a matriz normativa de estados/transições de projeto, módulo, WI e
   execução; confirmar que cada estado possui semântica única; validá-la contra
   `LIFECYCLE_COMPASS.md`, `PROJECT_LIFECYCLE.md`, `MODULE_LIFECYCLE.md`,
   `ORCHESTRATION_PROTOCOL.md`, `STATE_MACHINE_MODEL.md` e `GATE_POLICY.md`;
   confirmar que espera técnica, blocker, gate, elegibilidade, produção, review,
   `ACCEPT`, `REWORK` e falha recuperável possuem semânticas distintas; e
   confirmar que nenhuma autorização humana implícita está sendo criada. Se
   houver conflito normativo relevante, parar antes da implementação funcional
   correspondente, registrar documentos em conflito, regra/estado/transição
   afetada, alternativas, impacto e recomendação, e solicitar decisão humana
   antes de continuar. Se for necessário inventar estado, gate ou transição não
   derivável dos documentos normativos ou do planejamento aprovado da Fase 6.5,
   tratar como `DECISÃO ARQUITETURAL NECESSÁRIA` e parar antes de implementá-lo.
5. Publicar versões novas em migration aditiva e repetível, com hashes/estado de
   publicação imutáveis.
6. Selecionar a versão nova apenas para instâncias novas ou migrações explícitas.
7. Adicionar projeção de compatibilidade que identifique versão e semântica sem
   expor ação inválida.
8. Validar cada consumidor e ajustar apenas os contratos indispensáveis ao novo
   workflow; automações funcionais ficam nas tasks dependentes.

## Compatibilidade e comportamento de linhas persistidas

Classificar, no mínimo:

- WIs históricos concluídos/integrados: permanecem na versão e estado originais.
- WIs em `WAITING_FOR_WORK_ITEM_AUTHORIZATION`: não podem ser promovidos em massa;
  uma migração explícita deve recalcular dependências, blockers, delivery ativa e
  aceites antes de selecionar espera técnica ou elegibilidade.
- WIs em `QA_IN_PROGRESS`/`EVIDENCE_REVIEW`: preservar delivery, SHAs, findings e
  evidência; a futura `AUT-02` fará o handoff, sem fingir aceite.
- WIs em `REWORK_ELIGIBLE`/`WAITING_FOR_ESCALATION`: preservar causa, rodada,
  finding e gate; `REC-01` definirá a ação operacional.
- Módulos/projetos com macro-estado atrasado: não atualizar por contagem simples;
  `LR-02` agregará evidências sob o contrato novo.
- Instâncias F6 opt-in: preservar acceptance/review/block e sua política original.

Para cada classe, gerar relatório de dry-run, quantidade, decisão e motivo.
Linha ambígua permanece legada e é sinalizada; não há inferência destrutiva.

## Idempotência, roll-forward e rollback

- A migration deve poder ser executada novamente sem duplicar definição, estado,
  transição, policy ou vínculo.
- Conteúdo publicado usa chave/version/hash determinísticos.
- Seleção/migração de instância usa chave idempotente e evento correlacionado.
- Roll-forward corrige publicação incompleta com nova migration; nunca altera a
  migration aplicada.
- Rollback operacional desabilita seleção da versão nova apenas para instâncias
  ainda não iniciadas. Instâncias já vinculadas continuam recuperáveis nessa
  versão; não são resetadas para workflow antigo.
- Rollback físico só é admitido se aditivo, sem linhas dependentes e provado por
  teste; caso contrário, manter schema e desativar seleção.

## Impacto em APIs e projeções

- toda resposta deve informar workflow/version e estado canônico/projetado;
- remover `AUTHORIZE_WORK_ITEM` de `allowed_actions` no fluxo novo;
- distinguir espera por dependência, blocker, fila, produção, review e gate;
- preservar leitura de estados legados com mensagem de compatibilidade;
- comandos obsoletos no workflow novo retornam conflito explicável, sem efeito;
- SSE publica transição uma vez e permite replay por cursor.

## Impacto em testes legados

- Testes que exigem `WAITING_FOR_WORK_ITEM_AUTHORIZATION` permanecem apenas como
  certificação de workflow legado; não são copiados para o fluxo novo.
- Regressões F3/F4/F5/F6 devem provar coexistência, baseline, Git, findings,
  acceptance e blocks.
- Fixtures precisam declarar workflow/version explicitamente para não obter
  comportamento novo por acidente.

## Compatibilidade com o projeto real da auditoria

Criar fixture/snapshot isolado das classes de estado do projeto real. O projeto
original não deve ser alterado por teste. A validação desta task prova que cada
linha pode ser classificada sem perda; o avanço automático será provado em
`AUT-01`, `AUT-02`, `AUT-03` e `TST-01`.

## Critérios de aceite

1. Novas definições são publicadas sem editar versões anteriores.
2. Novos planos não materializam WIs em autorização humana individual.
3. Espera técnica, blocker externo e elegibilidade possuem semântica distinta.
4. Estados/transições cobrem macro-lifecycle, micro-lifecycle e trilhos laterais.
5. `MODULE_PLAN_APPROVAL` permanece único; gates duplicados/universais não são
   válidos no fluxo ordinário novo.
6. Apenas `ACCEPT` habilita aceite/promoção no caminho supervisionado.
7. Linhas legadas são classificadas e preservadas; nenhuma migração ambígua ocorre.
8. APIs/projeções identificam versão e não oferecem comando incompatível.
9. Publicação, seleção e migração explícita são idempotentes.
10. Projeto real é representável como fixture de regressão sem mutação.
11. A matriz normativa de estados/transições foi fechada e validada contra os
    documentos normativos antes de qualquer alteração funcional.
12. Nenhum scheduler, auto-dispatch ou comportamento pertencente à `AUT-01` foi
    implementado antecipadamente.

## Testes obrigatórios

- unitários da tabela de transições, guards e mapeamentos;
- migration PostgreSQL em base vazia, reaplicação e base com dados F3–F6;
- transições válidas e inválidas de projeto, módulo, WI e execução;
- seleção concorrente/idempotente de workflow;
- classificação de todas as classes legadas listadas;
- regressão de workflows anteriores e comandos obsoletos;
- API/SSE de versão, estado e ausência de autorização individual;
- `git diff --check`, build e suites afetadas.

## Riscos

- Estado novo duplicar semântica existente; mitigar com inventário/mapeamento.
- Migração promover linha sem evidência; mitigar com fail-closed e dry-run.
- Consumidor assumir enum legado; mitigar com busca completa e testes por versão.
- Rollback deixar instância sem executor; mitigar mantendo suporte à versão nova.
- Agent criar estado, gate ou transição por conveniência de implementação;
  mitigar com pré-validação normativa obrigatória e parada diante de decisão
  arquitetural não coberta.
- LR-01 absorver responsabilidades de AUT-01; mitigar com fronteira explícita
  entre LR-01 e AUT-01.

## Evidências esperadas

- matriz final de workflows/transições/controles;
- migrations e hashes de publicação;
- relatório de compatibilidade/dry-run e contagens por classe;
- resultados PostgreSQL, unitários, integração e regressão;
- amostra de API/SSE sem `AUTHORIZE_WORK_ITEM` no fluxo novo;
- `git diff` demonstrando que definições históricas não foram alteradas.
