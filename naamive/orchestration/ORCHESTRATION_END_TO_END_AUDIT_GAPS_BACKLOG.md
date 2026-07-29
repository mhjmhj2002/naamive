---
document_type: orchestration-end-to-end-audit-gaps-backlog
status: OPEN
audit_type: theoretical-end-to-end-reaudit
audited_at: 2026-07-29
scope: README.md, REPOSITORY_MODEL.md, naamive/vision/, naamive/orchestration/, contracts, governance, runtime-python and runtime tests
supersedes: Historical remediation backlog closed on 2026-07-29
test_evidence: 53 passed in 10.76s (.venv/bin/pytest -q naamive/tests/runtime_python)
next_action: Corrigir GAP-001 antes de expor o comando run-agent a operadores.
---

# Backlog de Gaps — Nova Auditoria Ponta a Ponta da Orquestração

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

| Prioridade | Gap | Efeito no fluxo |
| --- | --- | --- |
| Bloqueador | GAP-001 | Um operador pode executar um agente fora da orquestração e sem trilha auditável. |
| Alta | GAP-002 | Um projeto não consegue materializar mais de um módulo pelo fluxo público. |
| Alta | GAP-003 | Retrabalho, pausa, retomada e evolução previstos nas máquinas não são operáveis ponta a ponta. |
| Média | GAP-004 | O consumo entre projetos pode registrar contrato inexistente ou pertencente a outro projeto. |

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

## Sequência recomendada

1. Fechar GAP-001, pois a rota alternativa reduz as garantias de todos os
   demais fluxos.
2. Fechar GAP-002 e acrescentar E2E multi-módulo; ele é a prova central do
   modelo de produto.
3. Fechar GAP-003 para tornar exceções e evolução executáveis, não apenas
   documentadas.
4. Fechar GAP-004 antes de declarar reutilização entre projetos suportada.

## Condição de encerramento

Este backlog pode ser fechado quando todos os gaps tiverem implementação,
testes de regressão e uma execução E2E determinística que cubra múltiplos
módulos, retrabalho/evolução e um consumo de contrato válido. A aprovação de
entrega deve permanecer coberta pela regressão coordenada já existente.
