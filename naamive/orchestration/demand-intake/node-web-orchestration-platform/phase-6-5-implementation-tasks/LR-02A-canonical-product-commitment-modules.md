---
task: LR-02A
status: DONE
title: Canonical Product Commitment Modules
depends_on: [LR-01, GAT-01, GAT-03, REC-01]
blocks: []
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# LR-02A — Canonical Product Commitment Modules

## Objetivo

Publicar a fonte canônica, persistida e versionada de `candidate_modules` que
o `PRODUCT_COMMITMENT` aprovado assume. Ela permite a LR-02 materializar cada
módulo comprometido idempotentemente, sem reconstruir texto livre, metadata,
payload transitório ou resposta de agente.

## Dependências, ordem e fronteira

Depende de LR-01 (workflow/versionamento), GAT-01 (contrato do gate), GAT-03
(identidade/RBAC da decisão) e ocorre após REC-01 na ordem serial conservadora:
`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01 → LR-02A → LR-02 → AUT-02`.
REC-01 é uma barreira de ordem já concluída, não uma autoridade sobre este
contrato de dados. LR-02A bloqueia LR-02; não implementa agregação macro,
AUT-02, GAT-02, materialização efetiva ou rollout.

LR-02A implementará somente o snapshot, sua validação, revisões imutáveis,
binding ao gate GAT-01, API/read model e a **estrutura** de lineage de
materialização. LR-02 consumirá a revisão `APPROVED`, criará intents, módulos
e `module_revisions`, fará retries/replay parcial/reconciliação e preencherá
efetivamente esse lineage. LR-02A nunca chama `materializeModule()` apenas para
preencher a tabela de lineage.

O contrato pré-validado está em
[`LR-02A-canonical-product-commitment-modules-prevalidation.md`](LR-02A-canonical-product-commitment-modules-prevalidation.md).

## Comportamento esperado e invariantes

- somente uma `ProductCommitmentRevision` `APPROVED` pode ser consumida por LR-02;
- cada módulo possui `module_key` estável e validado pelo servidor;
- snapshot, hash, vínculo aos requisitos/evidências e decisão de gate são
  imutáveis e auditáveis;
- rework cria nova revisão e preserva lineage; não edita nem apaga snapshot
  aprovado;
- materialização futura é identificada por
  `(project_id, product_commitment_revision_id, module_key)`;
- legado sem contrato canônico permanece `PRESERVE_LEGACY`.

## Estratégia de implementação

Criar migration aditiva para a revisão de compromisso, itens canônicos e
lineage de materialização; validar/canonicalizar a proposta de discovery no
servidor; abrir o gate com referência e hash da revisão; tornar aprovação e
imutabilidade transacionais; e publicar eventos/intents recuperáveis. Não
tratar artefato como autoridade, embora seus hashes permaneçam evidência.

## Critérios de aceite

- schema `PRODUCT_COMMITMENT_MODULES:v1` validado no servidor;
- revisão aprovada congelada e vinculada ao gate/requisitos;
- replay, concorrência e alteração de payload não duplicam nem alteram o
  compromisso;
- `module_key`, dependências, hash e a estrutura de lineage de materialização
  são determinísticos;
- nenhuma instância histórica é reconstruída automaticamente.

## Testes obrigatórios

Schema e validação negativa; revisão, rework e supersession; hash determinístico
e independente da ordem; gate autorizado/obsoleto/concorrente; schema de
lineage (FK, unicidade e consistência cross-project); coexistência legado e
PostgreSQL real para constraints, locks e atomicidade. Materialização de um ou
vários módulos, replay parcial A/B/C, retries e reconciliador pertencem a LR-02.

## Evidência de implementação — 2026-08-23

LR-02A está `DONE`. A migration aditiva
`061_phase_6_5_canonical_product_commitment_modules.sql` publica revisões,
itens e a infraestrutura vazia de materialization lineage, com FKs compostas,
unicidade, imutabilidade e guards de gate/projeto. `product-commitment.ts`
implementa `PRODUCT_COMMITMENT_MODULES:v1`, DAG, canonical JSON/SHA-256,
allocation sob lock de projeto, replay, rework/supersession, abertura e decisão
atômicas via GAT-01/GAT-03, eventos e read model HTTP.

Os testes unitários e PostgreSQL cobrem schema negativo, determinismo, replay,
corridas de criação/decisão/supersession, stale version, RBAC, adulteração,
lineage cross-project e coexistência legado. Migrations, build e regressões de
gate, auth, discovery, workflow, HTTP, projection, AUT-01, REC-01 e Phase 3
passaram. Nenhum módulo ou `module_revision` é criado pelo fluxo LR-02A; LR-02,
AUT-02, GAT-02 e REC-02 não foram iniciadas.

### Correção LR-02A-FIX-01 — evolução aprovada

A migration aditiva `062_phase_6_5_product_commitment_approved_succession.sql`
fecha o gap auditado de sucessão de uma revisão `APPROVED`. Uma proposta
sucessora agora mantém a autoridade anterior aprovada enquanto está pendente;
na aprovação, gate, predecessor `SUPERSEDED`, sucessora `APPROVED` e eventos
são confirmados na mesma transação. O índice estrutural de uma única `APPROVED`
foi preservado e foi acrescentada unicidade para uma única
`PENDING_APPROVAL` por projeto.

Após rejeição de uma sucessora, a revisão aprovada corrente permanece intacta.
A rodada seguinte aponta para a revisão rejeitada e a aprovação resolve a
autoridade substituída por sua cadeia ancestral. Testes PostgreSQL comprovam
replay, corridas de criação/aprovação, múltiplas gerações, imutabilidade e
rollback após superseder a predecessora. LR-02A retorna a `DONE`; LR-02 segue
`TO_DO / NEXT / READY_FOR_IMPLEMENTATION`.
