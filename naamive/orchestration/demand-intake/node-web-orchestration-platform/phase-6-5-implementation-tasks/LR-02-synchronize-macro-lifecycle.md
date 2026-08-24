---
task: LR-02
status: TO DO
title: Sincronizar macro-lifecycle
depends_on: [LR-01, GAT-01, AUT-01, REC-01, LR-02A]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# LR-02 — Sincronizar macro-lifecycle

## Objetivo e problema corrigido

Fazer projeto e módulo refletirem atomicamente análise, definição, arquitetura,
planejamento, implementação, integração, validação e entrega. Corrige o projeto
parado em `READY_FOR_MODULE_MATERIALIZATION`, o módulo parado em
`WORK_ITEMS_ACTIVE`, o início manual da descoberta, a materialização manual dos
módulos comprometidos e os avanços macro ausentes descritos na auditoria.

## Contexto e comportamento atual

O runtime cria trabalhos e integrações sem um agregador canônico. O gate de
registro não inicia descoberta; módulos candidatos são redigitados; eventos de
WI/candidata não promovem os agregados; estados normativos não são alcançados.

## Comportamento esperado e invariantes

- `REGISTER_PROJECT` aprovado despacha análise automaticamente.
- `PRODUCT_COMMITMENT` materializa idempotentemente os módulos comprometidos
  pela `COMMITTED_MODULE_EVOLUTION_POLICY:v1`: `SAME`, `CHANGED`, `ADDED` e
  `REMOVED` possuem efeitos explícitos e auditáveis.
- Eventos aceitos de WIs/candidatas reavaliam módulo e projeto na mesma unidade
  recuperável, sem contagens heurísticas.
- Nenhum módulo ultrapassa o projeto; nenhum agregado avança sem evidência.
- Finding/rework reabre a fase correta e preserva histórico.
- `EffectiveRequiredModuleSet:v1`, e não apenas os candidatos da revisão
  corrente, é a autoridade dos predicados universais; remoção de candidato
  permanece requerida até decisão GAT-02 persistida.
- `commitmentMaterializationComplete(revision_id)` impede avanço prematuro e
  torna materialização parcial recuperável e observável.

## Componentes prováveis

`src/service.ts`, `src/phase3.ts`, workflow service, agregador novo, jobs/outbox,
eventos, projeções e migrations/índices necessários.

## Dependências e restrições

Depende conceitual e funcionalmente de LR-01, GAT-01, AUT-01, REC-01 e
LR-02A. LR-02A publica a fonte canônica e imutável dos módulos comprometidos;
sem ela, a materialização automática seria reconstrução proibida de texto livre.
GAT-03 é guardrail de identidade/RBAC para qualquer ação humana, mas não é
dependência mecânica da agregação automática. A ordem serial é
`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01 → LR-02A → LR-02`.

O contrato detalhado, incluindo a política
`COMMITTED_MODULE_EVOLUTION_POLICY:v1`, está em
[`LR-02-synchronize-macro-lifecycle-prevalidation.md`](LR-02-synchronize-macro-lifecycle-prevalidation.md).
Ele está `PREVALIDATION_READY_FOR_IMPLEMENTATION` após a conclusão de LR-02A.
Não implementa pipeline interno de WI (AUT-02),
aceite final/pausa/cancelamento (GAT-02) nem altera históricos certificados.
LR-02 detecta `REMOVED` e registra divergência de escopo, mas somente GAT-02
pode retirar obrigação, cancelar ou autorizar a transição correspondente.

## Estratégia de implementação e compatibilidade

1. Definir regras agregadas por evento/evidência e versão de workflow.
2. Encadear registro → análise e compromisso → materialização/delta via outbox,
   com intents determinísticas, lineage e evolução de revision.
3. Implementar agregador transacional idempotente para projeto/módulo.
4. Reconciliar eventos perdidos/repetidos e crashes entre fato e projeção.
5. Manter versões antigas no comportamento certificado; migração ativa exige
   classificação LR-01 e reavaliação explícita.

## Critérios de aceite

- descoberta e materialização iniciam sem clique/redigitação adicional;
- `SAME` reutiliza módulo/revision e somente grava lineage; `CHANGED` preserva
  o módulo lógico, cria revision/round sucessores e reabre por fato; `ADDED`
  cria somente a chave nova; `REMOVED` não cancela nem reduz required-set;
- lineage responde a candidate/commitment fonte e predecessor de cada nova
  module revision; `EffectiveRequiredModuleSet` e
  `commitmentMaterializationComplete` governam os universais e a projeção;
- projeto e módulo avançam e reabrem coerentemente com um ou vários módulos;
- nenhum evento duplicado produz transição duplicada;
- projeto não fica em materialização durante implementação;
- transições inválidas ou sem evidência falham sem mudar estado.

## Testes obrigatórios

Unitários das regras agregadas; PostgreSQL de atomicidade/concorrência;
integração de registro, compromisso, um/múltiplos módulos e rework; crash/replay;
regressão de versões antigas e API/SSE do macro-estado.

Inclui a execução funcional transferida de LR-02A: intents e criação efetiva de
um/vários módulos, replay parcial A/B/C, retries, reconciliador de
materialização e preenchimento operacional do materialization lineage.
Inclui a matriz de delta, crash/replay, concorrência, recovery e required-set
publicada na pré-validação; ela é normativa e não é repetida aqui.

## Riscos e evidências esperadas

Riscos: avanço prematuro, deadlock, agregação por contagem e reabertura incorreta.
Evidências: tabela evento→estado, logs/eventos correlacionados, testes de corrida,
snapshots de projeção e relatório de coexistência.
