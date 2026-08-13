---
task: F5-22
status: TODO
---

# F5-22 — Planejamento autônomo de módulos com revisão única

## Contexto

Após a arquitetura do módulo ser aprovada, o operador não deve decompor o
módulo manualmente em work items nem autorizá-los um a um. O agente de
planejamento deve produzir uma proposta auditável; a pessoa revisa, ajusta ou
aprova o conjunto uma única vez.

## Motivo e estado a recuperar

O runtime atual faz `DECIDE_ARCHITECTURE` aprovado transicionar o módulo para
`PLANNING_IN_PROGRESS`, mas não cria operação nem job. Por isso módulos já
aprovados ficam parados nesse estado; a tela não deve pedir a criação manual
de work items como compensação.

O job que executar esta task deve recuperar também qualquer módulo legado em
`PLANNING_IN_PROGRESS` sem uma proposta de plano aberta, incluindo o módulo
`registro-de-solicitacoes` do projeto de atendimento em uso no teste manual.
Essa recuperação deve ser idempotente e não pode recriar propostas, gates ou
jobs para módulos que já estejam sendo planejados.

## Implementar

1. Criar o job idempotente `PLAN_MODULE_WORK_ITEMS` após
   `DECIDE_ARCHITECTURE` aprovado, com lease, retry, heartbeat, contexto
   sanitizado e evidência JSON/Markdown versionada.
2. Definir e validar o contrato da proposta: work items, dependências,
   entradas, allowlist, denylist, saída, critérios de aceite e matriz de QA.
3. Persistir revisões imutáveis da proposta, com hashes, referências à
   definição, arquitetura e baseline tecnológica; ajustes humanos criam nova
   revisão e novo job, sem sobrescrever a anterior.
4. Incluir um único gate humano `MODULE_PLAN_APPROVAL`, com aprovação e
   feedback obrigatório para ajustes. A aprovação materializa o conjunto de
   work items atomicamente.
5. Substituir a criação manual de work item na web por tela de proposta:
   resumo, itens, dependências, critérios, edição controlada e ações
   **Aprovar plano** / **Solicitar ajustes**. O painel terá um único dono
   explícito da renderização; observers podem solicitar atualização, mas nunca
   executar `fetch` e `replaceChildren()` em reação à própria mutação.
6. Após a aprovação, agendar automaticamente itens elegíveis, respeitando
   dependências e o limite operacional de worktrees; não exigir autorização
   humana repetida por item.
7. Publicar eventos/SSE e projeções para proposta gerada, ajuste solicitado,
   plano aprovado, item agendado e bloqueio por dependência.
8. Atualizar a Bússola do ciclo de vida, a tabela de status e os testes
   unitários, integração, HTTP e E2E para o novo gate e os caminhos de ajuste,
   retry, falha e recuperação.

## Plano de implementação para o próximo job

1. **Persistência e migração**
   - Criar estruturas versionadas para a proposta de plano e suas revisões
     imutáveis (revisão, `supersedes_revision_id`, hash/evidência, feedback,
     autor e datas); não reutilizar `module_revisions` para misturar proposta
     de módulo com proposta de execução.
   - Adicionar o gate `MODULE_PLAN_APPROVAL` e garantir, por banco, no máximo
     uma proposta/gate aberto por módulo.
   - Criar uma migração de recuperação que localize módulos
     `PLANNING_IN_PROGRESS` sem proposta aberta e crie exatamente uma operação
     e job `PLAN_MODULE_WORK_ITEMS`, com chave de idempotência determinística.
   - Registrar no job a revisão do módulo e da Technology Baseline para que a
     proposta seja rastreável e não use contexto obsoleto.

2. **Comando e worker**
   - Em `decideArchitecture`, no caminho aprovado, criar transacionalmente a
     operação `PLAN_MODULE_WORK_ITEMS` e o job pendente; evento de auditoria
     deve apontar para ambos.
   - Estender o contrato do agente para retornar apenas uma proposta validável
     de work items: título, entradas, allowlist, denylist, saída, critérios,
     dependências e matriz de QA.
   - No worker, validar integralmente o contrato antes de qualquer persistência;
     salvar evidências JSON/Markdown, criar a revisão de proposta e abrir o
     gate humano. Falha/retry preserva a última revisão válida e nunca abre
     work items parcialmente.
   - Configurar falha, lease, heartbeat, retry e eventos específicos sem levar
     o projeto agregado a um estado falso de conclusão.

3. **Loop de ajustes**
   - Criar o comando HTTP versionado `REQUEST_PLAN_ADJUSTMENT`; exigir
     `project_id`, `module_id`, `plan_revision_id`, versão do gate,
     `idempotency_key` e feedback não vazio.
   - Fechar somente o gate da revisão atual como `REWORK_REQUIRED`, preservar
     evidência/feedback e enfileirar uma nova rodada do job com a proposta
     anterior como contexto.
   - Rejeitar revisão/gate obsoletos, plano aprovado e feedback vazio sem
     alterar dados. Não impor limite de rodadas.

4. **Aprovação e execução**
   - A aprovação do gate atual materializa atomicamente **todos** os work
     items daquela revisão; remover a criação e autorização manual por item.
   - Agendar automaticamente somente itens cujas dependências estejam
     satisfeitas, respeitando o limite operacional de worktrees. Itens
     dependentes devem aparecer como bloqueados, nunca como esquecidos.

5. **Projeção web**
   - Substituir os scripts/observers concorrentes de `web/index.html` por um
     único renderizador explícito do painel de módulo. Atualizações SSE podem
     solicitar refresh, mas não podem executar `fetch` + `replaceChildren()`
     em reação à própria mutação.
   - Exibir: planejamento em andamento; proposta completa; itens e
     dependências; feedback da rodada; ações **Aprovar plano** e **Solicitar
     ajustes**. Não exibir formulário de work item, autorização individual ou
     o título “Revisão do módulo” fora do gate de proposta de módulo.
   - O resumo do projeto deve priorizar o estado do módulo quando existir e
     distinguir “job em execução”, “proposta aguardando decisão”, “rework” e
     “bloqueado/falhou”.

6. **Testes e aceite**
   - Testar enfileiramento idempotente após arquitetura aprovada e a migração
     de recuperação de módulo já parado.
   - Testar proposta válida, contrato inválido, timeout, retry, lease vencido
     e preservação da última proposta.
   - Testar duas rodadas de ajuste, repetição idempotente e rejeição de gate
     ou revisão obsoletos.
   - Testar aprovação atômica, dependências, agendamento automático e ausência
     de work items parciais.
   - Testar a tela com SSE/mutações para provar que não há ciclo de renderização
     nem requisições repetidas. Rodar testes com banco isolado; a suíte não
     pode criar projetos na base usada pelo operador.

## Loop de proposta até aprovação final

O planejamento é um ciclo de revisão **sem limite fixo de rodadas**. A proposta
não é uma única tentativa descartável: cada rodada é auditável e a aprovação
final sempre aponta para uma revisão específica.

```text
Arquitetura aprovada
        ↓
Job PLAN_MODULE_WORK_ITEMS
        ↓
Proposta de plano revisão 1 → aguardando decisão humana
        ↓                         ↘ aprovar
comando de ajuste do usuário       materializar todos os work items
        ↓                          agendar conforme dependências
Nova revisão + novo job
        ↓
Proposta revisão N → aguardando decisão humana
        └───────────────────────────────↺
```

1. O agente produz uma revisão inicial `PLAN_PROPOSED` e abre o gate
   `MODULE_PLAN_APPROVAL` para aquela revisão.
2. O usuário pode aprovar a revisão atual, encerrando o loop. A aprovação é
   versionada e só é aceita se o gate e a revisão ainda forem os atuais.
3. Para ajustar, o usuário envia um comando explícito à proposta — por
   exemplo, `REQUEST_PLAN_ADJUSTMENT` — com feedback obrigatório, conciso e
   auditável. O comando não edita nem apaga a revisão atual.
4. O comando fecha o gate atual como `REWORK_REQUIRED`, preserva feedback,
   autor, data, referências de evidência e número da rodada; em seguida cria
   `PLAN_MODULE_WORK_ITEMS` para a próxima revisão.
5. O agente recebe a proposta anterior, o feedback humano e as evidências do
   módulo como contexto. Ele produz a revisão `N + 1`, com relação explícita
   `supersedes_revision_id` e novo hash de evidência; só então abre um novo
   `MODULE_PLAN_APPROVAL`.
6. O ciclo pode repetir `N` vezes. Não há autoaprovação, limite artificial de
   ajustes nem materialização parcial enquanto a decisão final for pendente.
   Falha, timeout ou retry do agente mantém a última proposta legível e não
   fecha nem substitui o gate humano sem decisão registrada.
7. A aprovação final materializa **exatamente** os work items da revisão
   aprovada, de forma atômica. Revisões anteriores permanecem imutáveis e
   consultáveis; nenhum comando posterior pode alterar os itens já
   materializados sem abrir novo ciclo de planejamento.

## Contrato mínimo do comando de ajuste

`REQUEST_PLAN_ADJUSTMENT` deve exigir `project_id`, `module_id`,
`plan_revision_id`, versão do gate, `feedback` não vazio e `idempotency_key`.
O retorno informa a operação e a revisão de origem; repetição com a mesma chave
é segura e não cria rodadas ou jobs duplicados. Feedback vazio, revisão/gate
obsoleto, proposta já aprovada ou módulo fora do estado de planejamento devem
falhar sem mudar estado.

## Aceite

Um módulo com arquitetura aprovada gera uma proposta automática. O operador
consegue pedir ajuste e receber nova revisão, ou aprovar uma única proposta; a
aprovação materializa o plano e inicia somente os itens sem dependências
pendentes. Nenhum formulário exige a criação manual de cada work item.

O aceite também deve provar ao menos duas rodadas de ajuste: revisão 1,
`REQUEST_PLAN_ADJUSTMENT`, revisão 2 e aprovação da revisão 2. Deve provar que
uma repetição idempotente do comando não cria nova revisão e que uma aprovação
ou ajuste sobre revisão/gate antigo é recusada.
