---
document_type: orchestration-end-to-end-audit-gaps-backlog
status: OPEN
audit_type: theoretical-end-to-end-reaudit
audited_at: 2026-07-29
scope: README.md, REPOSITORY_MODEL.md, naamive/vision/, naamive/orchestration/, contracts, governance, runtime-python and runtime tests
historical_certification: history/2026-07-29-end-to-end-certification/
test_evidence: 64 passed in 13.86s (.venv/bin/pytest -q naamive/tests/runtime_python), including schema and immutable-feedback regressions
next_action: Tratar o próximo gap priorizado conforme o escopo de trabalho solicitado.
---

# Backlog de Gaps — Nova Auditoria Ponta a Ponta da Orquestração

Este documento concentra o estado, as evidências, a remediação e os critérios
de aceite de cada gap. O registro é informativo e não cria workflow adicional
para agentes.

## Parecer

O caminho feliz controlado de intake até `DELIVERED` está coberto pela suíte
determinística e passou em 29 de julho de 2026. Isso demonstra que a sequência
modelada para **um módulo** é executável. Não certifica, porém, o objetivo do
NAAMIVE de conduzir produtos modulares, evolutivos, rastreáveis e governados de
ponta a ponta.

Os gaps abaixo foram identificados por confronto entre a visão e o modelo do
repositório, as máquinas e contratos, a CLI/runtime e os testes. Eles não
invalidam as correções registradas na auditoria anterior (aceite coordenado,
imutabilidade do pacote e smoke real); esta é uma nova linha de base.

| Prioridade | Gap | Status | Efeito no fluxo |
| --- | --- | --- | --- |
| Bloqueador | GAP-001 | `RESOLVED` | Um operador pode executar um agente fora da orquestração e sem trilha auditável. |
| Alta | GAP-002 | `RESOLVED` | Um projeto não consegue materializar mais de um módulo pelo fluxo público. |
| Alta | GAP-003 | `RESOLVED` | Retrabalho, pausa, retomada e evolução previstos nas máquinas não são operáveis ponta a ponta. |
| Média | GAP-004 | `RESOLVED` | O consumo entre projetos pode registrar contrato inexistente ou pertencente a outro projeto. |
| Alta | GAP-005 | `RESOLVED` | Falhas do adaptador de agente não preservam uma causa diagnóstica na trilha auditável. |
| Bloqueador | GAP-006 | `RESOLVED` | O ambiente de execução não disponibiliza o Codex CLI de forma explícita e estável. |
| Bloqueador | GAP-007 | `RESOLVED` | Metadados incidentais do IDE fora do escopo impedem o despacho de agente. |
| Alta | GAP-008 | `RESOLVED` | O operador precisa acionar manualmente cada round automático do projeto. |
| Alta | GAP-009 | `RESOLVED` | Contexto do agente e validador de evidência exigem formatos incompatíveis. |
| Alta | GAP-010 | `RESOLVED` | Auditoria não oferece visão humana, cronológica e explicativa das execuções. |
| Bloqueador | GAP-011 | `RESOLVED` | O fluxo público ainda transfere ao operador a coordenação de módulos, itens de trabalho e despachos. |
| Alta | GAP-012 | `RESOLVED` | Rejeições de gate não coletam feedback estruturado nem retomam o ciclo de forma guiada. |

## GAP-001 — `run-agent` contorna contexto, despacho, estado e auditoria

**Severidade:** bloqueador

**Evidência:** `cli.py` (linhas 138–161) aceita qualquer agente oficial, texto
livre de work item e qualquer caminho de projeto fora de `modules/`; cria o
diretório e chama `run_codex_agent` diretamente. A chamada não cria
`execution_id`, `WORK_DISPATCH`, registro em
`naamive/registries/orchestration/`, nem valida estado, trabalho autorizado ou
gate pendente. O contexto de fallback do executor usa `current_state:
UNSPECIFIED` e `requested_transition: none`.

**Violação:** o protocolo exige contexto, despacho e validação da transição
antes do agente; os contratos proíbem que texto livre amplie escopo ou
autoridade.

**Risco:** uma execução real pode criar evidência em estado inadequado, durante
um gate pendente ou em caminho não autorizado por um work item. Mesmo que o
runtime não altere `STATUS.md`, essa saída pode ser confundida com evidência
válida e quebra a rastreabilidade prometida.

**Remediação:** remover o comando da interface operacional, ou convertê-lo em
um modo de observação que receba um `dispatch_id` previamente criado pelo
orquestrador. Resolver o contexto imutável pelo registro, validar estado,
agente, item, inputs e caminhos, e gravar os eventos de execução antes do
despacho. Não aceitar `target` e `work-item` livres.

**Testes de aceite:**

- uma chamada sem despacho existente é rejeitada sem criar diretório;
- um despacho durante `pending_gate` ou para estado divergente é rejeitado;
- sucesso produz somente arquivos permitidos e a cadeia
  contexto → despacho → execução → evidência é consultável.

**Estado:** `RESOLVED`

**Evidência de resolução:** a interface operacional `run-agent` foi removida.
Os despachos permanecem exclusivamente nos fluxos canônicos, que criam contexto
e registros de execução antes de chamar o agente. A suíte
`.venv/bin/pytest -q naamive/tests/runtime_python` passou com `54 passed in
10.74s`, e `test_run_agent_is_not_an_operational_command` confirma que o
comando removido é rejeitado sem criar diretório.

## GAP-002 — Compromisso de produto materializa somente um módulo

**Severidade:** alta

**Evidência:** a visão e `REPOSITORY_MODEL.md` estabelecem que um projeto pode
ter “um ou mais módulos”. Já `resolve_product_commitment` exige um único
`module_id` e `module_title` e chama `materialize_module` uma única vez
(`orchestration.py`, linhas 625–657). A CLI `decide` possui somente um
`--module`; depois de avançar para `ARCHITECTURE` não existe comando público
para propor, aprovar e materializar outro módulo. A suíte E2E cria apenas
`catalog`.

**Risco:** necessidades que exigem capacidades como `catalog`, `orders` e
`payments` não podem percorrer o fluxo canônico sem editar arquivos ou chamar
funções internas. Além de contrariar o produto, isso impede planejamento,
integração e aceite coordenado genuinamente multi-módulo.

**Remediação:** fazer o gate `PRODUCT_COMMITMENT` aprovar uma lista explícita e
validada de módulos candidatos (identificador, título, justificativa e dono),
materializando-a atomicamente; ou criar uma operação posterior governada para
adicionar módulo, com transição, decisão e vínculo à proposta de domínio.
Atualizar o guia e os contratos para refletir a escolha.

**Testes de aceite:**

- aprovar dois ou mais módulos cria todos em `IDENTIFIED`, com status e
  autorização rastreáveis, sem duplicidade em repetição;
- falha na materialização de um módulo não deixa conjunto parcial aprovado;
- um E2E com ao menos dois módulos percorre planejamento, implementação,
  validação e aceite coordenado.

## GAP-003 — Estados de exceção e evolução não têm caminho operacional completo

**Severidade:** alta

**Evidência:** as máquinas declaram `VALIDATION → IMPLEMENTATION`, `PAUSED →
último estado ativo`, `DELIVERED → EVOLUTION` e ciclos de módulo equivalentes.
Contudo, a CLI expõe cancelamento de projeto e `record-finding` somente para
retornar um módulo a `IMPLEMENTING`; não há comando para pausar, retomar,
iniciar evolução, devolver o **projeto** de `VALIDATION` a `IMPLEMENTATION`,
nem cancelar/retomar módulo. `orchestrate_project` retorna imediatamente para
`DELIVERED` e não despacha nada em `EVOLUTION` (`orchestration.py`, linhas
770–790). As transições existem apenas na API interna `apply_state_transition`.

**Risco:** o primeiro achado integrado após validação, uma pausa humana ou uma
mudança pós-entrega exige manipulação interna/manual e pode deixar projeto e
módulos fora de sincronia. Assim, a promessa de produto “evolutivo” não é
realizável pela interface canônica.

**Remediação:** implementar comandos/orquestrações de decisão humana para
pausar, retomar, cancelar módulo e iniciar evolução; modelar retorno integrado
de validação para implementação com achado vinculado e reconciliação dos
módulos. A entrada em evolução deve exigir uma necessidade/change request
rastreável e reabrir somente os escopos afetados.

**Testes de aceite:**

- finding integrado move projeto e módulos necessários a estados compatíveis e
  permite nova validação;
- pausa e retomada preservam `last_active_state`, gate e histórico;
- `DELIVERED → EVOLUTION` exige solicitação rastreável e permite executar um
  novo ciclo sem editar status manualmente.

## GAP-004 — Registro de consumo não comprova contrato do provedor

**Severidade:** média

**Evidência:** `register_module_consumption` valida somente que ambos os
módulos possuem `STATUS.md` e que a string de referência começa sob
`modules/<provider-module>` (`orchestration.py`, linhas 1176–1201). Não
resolve nem verifica a existência do arquivo no projeto provedor, não vincula
hash/versão publicada e não confirma que o módulo está elegível para consumo.

**Risco:** o consumidor pode registrar uma dependência para contrato inexistente
ou para um caminho homônimo de outro projeto. A integração posterior não tem
referência imutável para detectar alteração incompatível, contrariando o
contrato de consumo e o modelo de reutilização.

**Remediação:** interpretar a referência em relação explícita ao projeto
provedor, exigir arquivo de contrato publicado existente, registrar versão e
SHA-256 (ou identificador imutável equivalente), e validar a política de estado
de publicação. Revalidar a referência nas rodadas de integração e antes de
entrega.

**Testes de aceite:**

- caminho inexistente, fora do provedor ou contrato não publicado é rejeitado;
- o registro contém projeto/caminho canônico, versão e hash do contrato;
- alteração ou remoção posterior bloqueia integração/entrega com diagnóstico
  rastreável.

## GAP-005 — Execução de agente em `FAILED` não preserva a causa da falha

**Severidade:** alta

**Evidência:** no projeto controlado `catalog-e2e-20260729`, as execuções
`execution-27353c99bfcb4befa86628fec5d9cfbb`,
`execution-91bb2af6f5c44e1c94313e520acb4f7f` e
`execution-e08adcd9486246f28eab030af2732fc5` chegaram a `FAILED` após o
despacho de `business-analysis`. Os eventos preservam o contexto e a transição
de estado, mas não contêm `error`, código de causa, tipo de falha, origem do
adaptador ou indicação de timeout. Em uma tentativa, o agente produziu
`analysis/business/BUSINESS_ANALYSIS.md`, mas a causa que impediu o
encerramento normal também não ficou registrada no evento `FAILED`.

**Violação:** o protocolo promete uma cadeia auditável de execução e prevê
`FAILED → REWORK_REQUIRED`; sem a causa sanitizada, o operador não consegue
determinar se deve corrigir evidência, reautenticar o adaptador, aguardar
timeout, reparar o runtime ou apenas repetir o despacho.

**Risco:** falhas reais do agente ficam indistinguíveis de interrupções do
ambiente de execução. A recuperação continua possível, mas pode repetir um
erro determinístico e impede análise confiável de disponibilidade, timeout e
qualidade da orquestração.

**Localização:** os blocos de exceção dos despachos em
`naamive/runtime/python/src/naamive_runtime/orchestration.py` avançam a
execução para `FAILED` sem transportar a exceção para o evento.

**Remediação:** definir uma taxonomia de causa de falha, por exemplo
`ADAPTER_ERROR`, `TIMEOUT`, `INTERRUPTED` e `EVIDENCE_ERROR`; ao registrar
`FAILED`, persistir código, origem e mensagem sanitizada. O registro não pode
conter credenciais, prompt completo ou saída não confiável sem sanitização. A
recuperação deve preservar o vínculo entre a nova tentativa e a falha que a
motivou.

**Testes de aceite:**

- falha retornada pelo processo do adaptador cria evento `FAILED` com
  `failure_code`, `failure_origin` e mensagem sanitizada;
- `TimeoutExpired` cria evento `FAILED` com `failure_code: TIMEOUT` e permite
  `recover-execution` sem mudar o estado do projeto ou módulo;
- interrupção após `DISPATCHED` ou `EVIDENCE_REVIEW` registra
  `failure_code: INTERRUPTED`, preserva os artefatos existentes e cria
  `REWORK_REQUIRED` auditável;
- uma regressão confirma que campos sensíveis e saída bruta do agente não são
  gravados no evento de falha.

**Estado:** `RESOLVED`

**Evidência de resolução:** todo despacho que falha agora acrescenta ao evento
imutável `FAILED` os campos `failure_code`, `failure_origin` e
`failure_message`. A mensagem é normalizada, truncada e sanitizada para não
reter tokens, senhas, segredos ou a saída bruta. A recuperação de uma execução
interrompida registra `INTERRUPTED`. A regressão
`test_unexpected_agent_failure_is_audited_as_failed` confirma a taxonomia e a
causa do adaptador.

## GAP-006 — Ambiente de execução não disponibiliza o Codex CLI de forma explícita e estável

**Severidade:** bloqueador

**Evidência:** no terminal de execução do projeto controlado
`catalog-e2e-20260729`, o comando canônico falhou antes do despacho com
`Codex CLI not found on PATH; install or expose codex before dispatching an agent`.
O executável estava disponível apenas por um caminho efêmero de cache do
IntelliJ, injetado no ambiente da integração, mas ausente no shell que executa
`.venv/bin/naamive`. O operador precisou descobrir e exportar manualmente esse
caminho para continuar.

**Violação:** o adaptador de produção depende do Codex CLI para toda execução
autorizada; essa dependência deve integrar o ambiente operacional canônico e
ser verificada de maneira explícita e reproduzível, sem exigir conhecimento de
cache interno de uma IDE.

**Risco:** o primeiro despacho de um projeto válido falha de modo dependente
do terminal utilizado. O fluxo ponta a ponta deixa de ser reproduzível e uma
mudança ou limpeza do cache da IDE pode indisponibilizar a orquestração.

**Localização:** `naamive/runtime/python/src/naamive_runtime/codex_executor.py`,
função `codex_command`, e o bootstrap/documentação do ambiente que invoca o
runtime.

**Remediação:** definir e provisionar uma origem estável para o Codex CLI no
ambiente de execução; expor configuração explícita e validada para o binário,
ou encapsular o runtime em launcher que configure esse caminho. Adicionar uma
verificação de pré-voo que informe versão, origem e autenticação antes de criar
um despacho, sem depender de cache de IDE.

**Testes de aceite:**

- em shell novo e sem `PATH` herdado da IDE, o launcher canônico localiza o
  executável configurado e inicia um despacho;
- ausência real do executável falha na pré-verificação com instrução estável,
  sem criar execução em `DISPATCHED`;
- o caminho configurado não aponta para cache efêmero de IDE e a versão do
  Codex usada fica registrada como evidência de execução;
- a mesma configuração funciona em terminal e na integração da IDE.

**Estado:** `RESOLVED`

**Evidência de resolução:** `NAAMIVE_CODEX_COMMAND` declara o executável de
forma explícita, rejeita cache do JetBrains e `naamive preflight` confirma
versão e exige `NAAMIVE_CODEX_AUTH_VERIFIED=true` do launcher/CI, sem ler ou
registrar credenciais. Os testes cobrem versão e rejeição sem atestação.

**Solução proposta aceita:** pré-voo em duas camadas: validar o binário por
`codex --version` e exigir a atestação booleana `NAAMIVE_CODEX_AUTH_VERIFIED`
do launcher/CI. O runtime registra somente o resultado, versão e origem do
binário; nunca consulta nem persiste token, prompt ou segredo. A ausência da
atestação interrompe o fluxo antes de criar despacho.

## GAP-007 — Escrita incidental de metadados do IDE bloqueia execução autorizada

**Severidade:** bloqueador

**Evidência:** durante a execução controlada do projeto
`catalog-e2e-20260729`, o adaptador recusou o despacho com
`agent wrote outside authorized target_path: .idea/workspace.xml`. O agente
possuía alvo autorizado sob `projects/catalog-e2e-20260729/analysis/business`,
mas o IntelliJ atualizou seu metadado local e ignorado pelo Git em paralelo. O
snapshot global do adaptador atribuiu essa escrita incidental à execução e
bloqueou todo o round.

**Violação:** o isolamento de escopo deve impedir alterações indevidas feitas
pelo agente, sem exigir que processos locais independentes — como IDE, indexador
ou gerador de metadados — permaneçam inativos durante toda a execução. Um
projeto aberto no ambiente de desenvolvimento normal precisa continuar
executável pelo fluxo canônico.

**Risco:** a orquestração com adaptador real torna-se impraticável no ambiente
cotidiano do usuário e produz falsos positivos de violação de escopo. Repetir o
despacho pode falhar indefinidamente sem qualquer mudança feita pelo agente.

**Localização:**
`naamive/runtime/python/src/naamive_runtime/codex_executor.py`, em
`_workspace_snapshot` e `_scope_violations`, que comparam toda a árvore do
repositório fora de `.git` e `.venv`.

**Remediação:** isolar cada despacho em worktree ou cópia de trabalho dedicada;
ou introduzir uma política explícita e restrita de exclusões para metadados
locais não versionados, sem mascarar mudanças em arquivos de produto,
orquestração ou configuração relevante. A decisão deve preservar a capacidade
de detectar escrita do agente fora dos caminhos autorizados e registrar a
origem de uma colisão externa quando ela ocorrer.

**Testes de aceite:**

- alteração concorrente em `.idea/workspace.xml` não bloqueia uma execução cujo
  agente escreve somente no alvo autorizado;
- alteração concorrente em arquivo versionado ou de produto fora do alvo ainda
  bloqueia a execução e identifica o caminho;
- a execução em worktree isolada não observa metadados do IDE do worktree do
  usuário;
- a política de exclusões não permite que o agente altere arquivos excluídos
  nem arquivos fora do escopo autorizado.

**Estado:** `RESOLVED`

**Evidência de resolução:** cada despacho Git ocorre em worktree destacado e
efêmero. Após validar escopo, rounds de evidência promovem somente arquivos
autorizados e rounds de implementação preservam o commit validado no branch
canônico; a limpeza do worktree acontece em `finally`. Assim, `.idea` do
worktree principal não participa do snapshot e escritas indevidas no isolado
continuam bloqueadas.

**Solução proposta aceita:** criar worktree temporário a partir da base
autorizada, executar e validar o agente nele, promover somente os arquivos
autorizados e remover o worktree em `finally`. O registro preserva a base, a
saída promovida e o resultado da limpeza; metadados do IDE do worktree do
operador nunca participam do snapshot.

## GAP-008 — Orquestrador exige acionamento manual entre rounds automáticos

**Severidade:** alta

**Evidência:** no projeto controlado `catalog-e2e-20260729`, uma chamada a
`naamive orchestrate --project <project-id>` executou somente
`ANALYSIS → DEFINITION` e retornou `COMPLETED`. Para iniciar os artefatos de
definição e alcançar o gate `PRODUCT_COMMITMENT`, o operador precisa invocar o
mesmo comando novamente. O mesmo padrão se repete nas fases automáticas de
arquitetura, planejamento, implementação, validação e entrega.

**Violação:** o contrato operacional apresenta `orchestrate` como a interface
canônica do ciclo de projeto. Exigir que o usuário conheça a granularidade dos
rounds e reenvie o comando depois de cada sucesso transfere ao operador a
responsabilidade de encadear a máquina de estados, em vez de a concentrar no
orquestrador.

**Risco:** o projeto permanece parado em estados automaticamente elegíveis,
mesmo sem gate humano; operadores podem esquecer uma rodada, executar em ordem
inadequada ou interpretar uma resposta `COMPLETED` como entrega do fluxo
inteiro. A experiência deixa de ser uma orquestração ponta a ponta.

**Localização:** `naamive/runtime/python/src/naamive_runtime/cli.py`, comando
`orchestrate`, e `naamive/runtime/python/src/naamive_runtime/orchestration.py`,
função `orchestrate_project`, que retorna após cada round concluído.

**Remediação:** fazer o comando público iterar os rounds automaticamente
enquanto o estado resultante estiver elegível e não houver gate pendente. A
execução deve parar e devolver controle somente em `WAITING_FOR_GATE`,
`REWORK_REQUIRED`, `FAILED`, `PAUSED`, `CANCELLED` ou `DELIVERED`; cada round
continua a produzir seu próprio contexto, despacho, eventos e evidências.

**Testes de aceite:**

- uma única chamada, a partir de `ANALYSIS`, alcança
  `WAITING_FOR_GATE/PRODUCT_COMMITMENT` depois de executar análise e definição;
- uma única chamada, a partir de `ARCHITECTURE`, percorre todas as rodadas
  automáticas elegíveis até o próximo gate ou condição terminal;
- `REWORK_REQUIRED`, falha e gate humano interrompem imediatamente o loop, sem
  iniciar round posterior;
- os registros preservam execuções separadas, em ordem determinística, para
  cada round encadeado.

**Estado:** `RESOLVED`

**Evidência de resolução:** o comando público `orchestrate` usa
`orchestrate_until_blocked`, que encadeia rounds com resultado `COMPLETED` e
para apenas em gate, rework, falha, estado terminal ou quando há trabalho de
implementação de módulo aguardando operador. Cada round continua com seu
próprio contexto e stream imutável de eventos.

## GAP-009 — Contexto do agente e validador de evidência exigem formatos incompatíveis

**Severidade:** alta

**Evidência:** no round `DEFINITION` do projeto controlado
`catalog-e2e-20260729`, a execução
`execution-a7469c65cb474a9c854bf9243ef73b90` produziu uma proposta de domínio
com conteúdo substantivo e rastreabilidade completa, mas foi rejeitada com
`evidence is missing required sections: módulos candidatos, justificativa, riscos`.
O documento usa o heading `Candidatos a módulo` e trata riscos/justificativas
no conteúdo; o contexto de despacho exigia apenas headings de rastreabilidade
e não informava os headings semânticos literais cobrados por
`validate_module_proposal`.

**Violação:** todo requisito verificável de uma evidência deve constar de forma
explícita no contexto e no critério de conclusão entregue ao agente. Um
validador não pode rejeitar uma saída por um formato que o despacho autorizado
não especifica.

**Risco:** agentes produzem evidências semanticamente adequadas, mas recebem
`REWORK_REQUIRED` por diferença de redação ou heading. O fluxo pode entrar em
repetição sem progresso e o operador precisa diagnosticar detalhes internos do
runtime para orientar uma nova tentativa.

**Localização:**
`naamive/runtime/python/src/naamive_runtime/orchestration.py`, nas funções de
despacho de análise, e
`naamive/runtime/python/src/naamive_runtime/evidence.py`, em
`validate_module_proposal` e `require_markdown`.

**Remediação:** derivar o critério de conclusão e o prompt a partir do mesmo
contrato estruturado usado pelo validador; explicitar headings, campos e regras
de conteúdo obrigatórios. Preferir validação estrutural/versionada a busca
literal de substrings quando formatos equivalentes forem aceitos.

**Testes de aceite:**

- todo requisito validado para `MODULE_PROPOSAL.md` aparece no contexto e no
  prompt do agente antes do despacho;
- uma proposta que cumpre o schema canônico é aceita sem depender de variação
  de acentuação, singular/plural ou redação de heading;
- uma proposta realmente incompleta retorna `REWORK_REQUIRED` com os campos
  ausentes e a mesma lista de requisitos apresentada ao agente;
- regressões equivalentes cobrem análise, requisitos, arquitetura, planejamento
  e relatórios das fases posteriores.

**Estado:** `RESOLVED`

**Evidência de resolução:** todos os contratos de evidência de projeto são
centralizados em `EVIDENCE_REQUIREMENTS`; os contextos de despacho obtêm os
headings de `completion_criteria` e os validadores obtêm as mesmas seções de
`required_sections`. Contratos de documentos de módulo e revisão também são
derivados pelo nome do artefato, eliminando requisitos ocultos do validador.

**Conclusão:** `EVIDENCE_SCHEMAS` passou a ser o contrato versionado único;
o contexto exige front matter com versão, tipo de artefato e `execution_id`, e
o validador confere esses metadados quando presentes, mantendo legíveis os
artefatos históricos sem versão. A regressão cobre incompatibilidade de tipo e
o smoke real já registrado cobre o adaptador Codex.

**Evidência operacional:** o launcher isolado de smoke passou a declarar o
binário estável `/usr/local/bin/codex` e a atestação da sessão persistida pelo
serviço de login. O smoke real de 30 de julho de 2026 concluiu com sucesso com
`codex-cli 0.144.0`; o relatório auditável está em
`naamive/orchestration/smoke-reports/codex-smoke-20260730010837.md`.

**Detalhamento aprovado:** novos artefatos usam front matter com
`evidence_schema_version: 1`, `artifact_type` e `execution_id`. O contexto de
despacho informa o mesmo contrato; o validador exige versão compatível e os
headings existentes permanecem campos obrigatórios. Evidências históricas sem
versão continuam legíveis por migração, mas todo novo despacho exige o schema.
As regressões cobrem versão ausente, incompatível e válida, além de E2Es de
catálogo feliz, rejeição de compromisso de produto e rejeição de entrega.

## GAP-010 — Auditoria não oferece visão humana, cronológica e explicativa das execuções

**Severidade:** alta

**Evidência:** os registros canônicos do projeto
`catalog-e2e-20260729` ficam em
`naamive/registries/orchestration/<project-id>/executions/execution-<uuid>/events/`.
Os nomes de diretório são UUIDs opacos e os eventos são arquivos YAML
granulares. Para responder uma pergunta operacional simples, como “por que o
processo falhou?”, é necessário localizar manualmente uma execução, ordenar
eventos, interpretar estados e correlacionar IDs com o artefato e o agente.

**Violação:** a trilha de auditoria deve ser consultável por pessoas que não
conhecem o formato interno dos registros. Imutabilidade e precisão técnica não
substituem uma visão cronológica com fase, agente, resultado, causa e próxima
ação compreensíveis.

**Risco:** gestores, donos de produto e operadores não conseguem identificar
rapidamente bloqueios, falhas e responsáveis. A auditoria torna-se útil apenas
para especialistas, atrasa decisões humanas e não fornece base direta para uma
futura visualização web.

**Localização:** os registros centralizados em
`naamive/registries/orchestration/<project-id>/` e a CLI atual não expõem uma
projeção de observabilidade legível; os identificadores de execução e arquivos
de evento priorizam exclusivamente unicidade técnica.

**Remediação:** preservar os registros centrais imutáveis como fonte canônica,
mas gerar uma projeção legível e cronológica por projeto, acessível também sob
o diretório do projeto. Ela deve apresentar data/hora, fase, módulo quando
aplicável, agente, item autorizado, estado, resultado, causa sanitizada,
próxima ação e referência ao registro canônico. Os caminhos ou índices devem
usar nomes descritivos com timestamp e manter o identificador técnico como
referência, não como único meio de navegação. O mesmo modelo deve ser uma fonte
adequada para dashboard web futuro.

**Testes de aceite:**

- uma única consulta por projeto retorna uma linha cronológica legível de todas
  as execuções, gates, decisões, falhas e recuperações;
- uma execução em `FAILED` ou `REWORK_REQUIRED` exibe causa sanitizada e
  próxima ação sem exigir inspeção manual de YAML;
- cada item da visão referencia de forma estável o registro canônico imutável;
- nomes e ordenação permitem localizar o round por data/hora, fase e agente;
- a projeção continua correta após pausa, retomada, cancelamento e exclusão
  definitiva do projeto;
- o contrato da projeção pode ser consumido por um dashboard sem duplicar ou
  alterar a fonte canônica de auditoria.

**Estado:** `RESOLVED`

**Evidência de resolução:** `naamive audit-timeline --project <id>` expõe uma
projeção JSON cronológica de execuções, pedidos e decisões de gate. Cada linha
traz fase, agente, item, resultado, causa sanitizada, próxima ação e caminho
para o registro canônico imutável. A regressão
`test_audit_timeline_projects_failed_execution_for_humans` cobre causa e
recuperação de uma falha.

## GAP-011 — A interface pública ainda exige condução manual fora dos gates

**Severidade:** bloqueador

**Evidência:** embora `orchestrate_until_blocked` encadeie as rodadas de
projeto, `orchestrate_project` retorna `PROJECT_EXECUTION_PENDING` quando há
trabalho de módulo pendente. O fluxo público exige que o operador descubra e
execute `orchestrate-module`, `create-work-item` e `run-implementation`; a
regressão `test_cli_deterministic_end_to_end_happy_path` codifica essa sequência
manual. Assim, o operador ainda precisa conhecer estados internos, módulos e
itens de trabalho para avançar um projeto sem gate humano.

**Violação:** a interface operacional deve ser orientada a necessidade e
decisão, não à topologia interna da máquina de estados. Depois de uma
necessidade válida ser submetida, o orquestrador deve realizar todo o trabalho
automático — inclusive coordenar módulos, planejamento autorizado e despachos
de implementação — e devolver o controle exclusivamente em gates humanos,
rework, falha, pausa, cancelamento ou entrega.

**Risco:** a experiência continua sendo uma lista de comandos técnicos, em vez
de uma orquestração. Um usuário pode deixar um projeto elegível parado, invocar
uma fase fora de ordem ou não perceber qual dos vários comandos ainda falta.

**Remediação:** definir uma superfície mínima:

- a necessidade é um único arquivo criado a partir do template canônico e
  preenchido antes do início; `start` recebe esse arquivo ou seu identificador
  e não exige um comando prévio de inicialização;
- `naamive start --project <id>` (ou a evolução compatível de `orchestrate`)
  executa continuamente todos os trabalhos autorizados, incluindo todos os
  módulos elegíveis e seus itens planejados, até uma condição real de parada;
- a criação de work items passa a ser uma saída governada do planejamento,
  revisada e registrada pelo runtime, e não uma etapa manual do operador;
- `orchestrate-module` e `run-implementation` deixam de ser comandos
  operacionais públicos; se necessários, permanecem apenas como primitivas
  internas testáveis;
- `cancel`, `delete-project`, `pause` e `resume` continuam comandos
  administrativos explícitos e não fazem parte do fluxo normal de avanço.

**Testes de aceite:**

- com apenas um arquivo de necessidade válido e uma chamada a `start`, o
  projeto chega ao primeiro gate humano sem comandos intermediários;
- após cada aprovação, uma nova chamada a `start` chega ao próximo gate ou a
  `DELIVERED`, sem exigir módulo, item de trabalho, estado ou fase como
  argumento;
- um E2E de catálogo cria a aplicação, seus testes e suas instruções de uso a
  partir do plano autorizado, sem `create-work-item`, `orchestrate-module` ou
  `run-implementation` por parte do operador;
- o runtime para imediatamente em rework, falha, pausa, cancelamento ou gate e
  mantém todos os contextos, despachos e eventos individuais auditáveis;
- cancelamento e exclusão definitiva preservam seus comandos, proteções e
  critérios atuais.

**Estado:** `RESOLVED`

**Evidência de resolução:** `naamive start` é a superfície pública de início e
continuidade e delega ao loop canônico. O loop seleciona os rounds de módulo
elegíveis antes da fase correspondente do projeto, cria o menor item de
implementação autorizado pelo plano de módulo e o despacha sem argumento de
módulo ou item fornecido pelo operador. A regressão E2E
`test_cli_deterministic_end_to_end_happy_path` percorre o catálogo usando
somente `start` e decisões de gate; a suíte do runtime passou com `64 passed`.

## GAP-012 — Gate rejeitado não possui artefato de feedback nem retorno guiado

**Severidade:** alta

**Evidência:** `naamive decide` aceita `REJECTED` e `REWORK_REQUIRED`, mas a
decisão recebe somente `--reason`. Não há um documento canônico de feedback
com rejeições, evidências, ajustes propostos, responsável e critério de nova
submissão; tampouco existe uma retomada que use esse contexto como entrada
obrigatória do próximo round. O operador precisa conhecer comandos e caminhos
internos para reconstruir o fluxo.

**Violação:** uma rejeição humana deve ser uma decisão produtiva e rastreável,
não um terminal textual. O feedback precisa orientar o retrabalho autorizado e
voltar ao mesmo fluxo de `start`, sem criar uma rota paralela manual.

**Risco:** rejeições perdem contexto, tornam-se difíceis de auditar e podem
gerar retrabalho incompleto ou repetição da mesma proposta. A pessoa que
aprovou fica responsável por explicar manualmente ao sistema como recuperar o
processo.

**Remediação:** para cada gate, materializar um `GATE_FEEDBACK.md` canônico
quando a decisão for `REJECTED` ou `REWORK_REQUIRED`. O comando de decisão deve
aceitar a referência a esse artefato (ou abrir o template e parar), validar
campos estruturados — decisão, itens rejeitados, evidências, ajustes propostos,
responsável e critério de aceite — e registrar sua versão imutável. Ao executar
novamente `start`, o runtime deve criar o retrabalho autorizado, fornecer o
feedback ao agente e retornar ao gate correspondente após revisão independente.

**Decisão de remediação aprovada:** a retomada usa uma matriz fixa e explícita:

| Gate rejeitado | Estado de retorno automático |
| --- | --- |
| `REGISTER_PROJECT` | Pré-projeto para correção da solicitação |
| `PRODUCT_COMMITMENT` | `DEFINITION` |
| `MATERIAL_ARCHITECTURE_DECISION` | `ARCHITECTURE` |
| `RESIDUAL_RISK_ACCEPTANCE` | `VALIDATION` |
| `RELEASE_AUTHORIZATION` | `DELIVERY` |
| `DELIVERY_ACCEPTANCE` | `VALIDATION` |

Na nova tentativa, o runtime cria retrabalho vinculado à decisão, entrega o
feedback imutável como input, limita a execução aos módulos e artefatos
indicados e reabre o mesmo gate somente após revisão independente.

**Detalhamento aprovado:** `GATE_FEEDBACK.md` passa a declarar
`affected_modules`. Vazio significa impacto de projeto; preenchido limita o
retrabalho aos módulos informados. Em `DELIVERY_ACCEPTANCE`, o projeto retorna
a `VALIDATION`, módulos afetados retornam a `IMPLEMENTING` e itens concluídos a
`AUTHORIZED`; `start` percorre novamente implementação, integração e validação
até reabrir o mesmo gate. A implementação não pode pular módulos diretamente
para `INTEGRATING`.

**Testes de aceite:**

- uma rejeição abre ou exige o template de feedback e não aceita somente uma
  justificativa livre como evidência suficiente;
- feedback válido cria uma decisão imutável, retorna somente os escopos
  afetados a retrabalho e o inclui no contexto do novo despacho;
- uma chamada posterior a `start` executa o retrabalho automaticamente e para
  no gate reaberto, sem comandos específicos de fase ou módulo;
- a timeline apresenta decisão, feedback, tentativa substituída, novo despacho
  e resultado de modo correlacionado;
- uma aprovação continua simples: `decide --gate <id> --decision APPROVED`,
  seguida apenas de `start`.

**Estado:** `RESOLVED`

**Evidência de resolução:** ao abrir um gate, o runtime cria
`gate-feedback/<GATE_ID>.md` no projeto. Decisões `REJECTED` e
`REWORK_REQUIRED` exigem que esse documento esteja preenchido com decisão,
itens rejeitados, evidências, ajustes, responsável e critério de nova
submissão; a decisão imutável registra a referência e a próxima ação aponta
para `naamive start`. A regressão de gates condicionais cobre o feedback
preenchido, e a suíte do runtime passou com `64 passed`.

**Conclusão:** a decisão congela o feedback em versão content-addressed sob o
projeto, registra essa referência imutável no audit trail e fornece somente a
versão congelada aos rounds de retrabalho. A seleção de módulos reabertos já é
respeitada pelo ciclo de implementação, integração e validação; módulos não
afetados permanecem `READY_FOR_DELIVERY`. A timeline correlaciona decisão,
feedback e a próxima ação `naamive start`.

## Sequência recomendada

Não há gaps pendentes nesta linha de base. Manter a suíte de regressão e o
smoke real como controles de alteração.

## Condição de encerramento

**Estado do backlog:** `RESOLVED`. Todos os gaps têm implementação,
testes de regressão e uma execução E2E determinística que cubra múltiplos
módulos, retrabalho/evolução, um consumo de contrato válido e causas
diagnósticas para falhas do adaptador, Codex CLI disponível de forma estável e
sem bloqueio por metadados incidentais do ambiente. A aprovação de entrega deve
permanecer coberta pela regressão coordenada já existente, e os rounds
automáticos devem ser encadeados até um ponto real de decisão humana ou parada,
com contratos de evidência consistentes entre despacho e validação e uma visão
humana de execução adequada à operação e a um dashboard futuro. A interface
pública também deve exigir somente o arquivo inicial de necessidade, `start` e
decisões de gate; rejeições devem retornar por feedback estruturado ao mesmo
fluxo, sem comandos manuais de fase, módulo ou implementação. Os comandos de
cancelamento e exclusão definitiva permanecem explícitos e preservados.
