---
task: GAT-01
status: TO DO
title: Catálogo server-side de gates e autoridade
depends_on: [LR-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# GAT-01 — Catálogo server-side de gates e autoridade

## Objetivo e problema corrigido

Publicar uma fonte server-side versionada que determine quais gates podem abrir,
sob quais condições, para qual autoridade e com quais decisões/consequências.
Corrige `MODULE_APPROVAL`, arquitetura e baseline universais, gates implícitos e
`WAITING_FOR_ESCALATION` sem contrato completo.

## Contexto, atual e esperado

Gates legítimos existem de forma dispersa e estados técnicos viraram aprovações.
O servidor deve preservar `REGISTER_PROJECT`, `PRODUCT_COMMITMENT`,
`MODULE_PLAN_APPROVAL` e aceite final; avaliar materialidade para arquitetura,
risco, segurança/compliance, independência e rework esgotado; impedir qualquer
gate não publicado.

## Invariantes

- controles automatizados/review independente avançam sem humano quando passam;
- gate condicional só abre com condição/materialidade e evidência;
- cada gate informa motivo, espera, autoridade, decisões, efeitos e continuação;
- decisão é versionada, idempotente, auditável e validada no servidor;
- agente/advisory/governance não substitui autoridade humana.

## Componentes prováveis

Gate policy evaluator, catálogos/contratos, `workflow_transitions`, gate records,
APIs/projeções, assurance routing e migrations aditivas.

## Dependências e restrições

Depende de LR-01. Autenticação é GAT-03; entrega/pausa/cancelamento é GAT-02.
Não remover gate legítimo nem preservar gate universal por conveniência histórica.

## Estratégia de implementação e compatibilidade

Inventariar gates/consumidores; publicar catálogo/conditions; centralizar abertura
e decisão; desativar gates implícitos no workflow novo; preservar leitura de
decisões históricas com sua versão; exigir evidência de materialidade.

## Critérios de aceite

- apenas gates catalogados abrem;
- fluxo ordinário não abre `MODULE_APPROVAL` nem arquitetura humana universal;
- gates condicionais abrem somente quando a regra passa;
- `WAITING_FOR_ESCALATION` projeta contrato completo;
- decisão obsoleta/não autorizada não altera estado;
- todos os gates normativos possuem testes de presença e ausência.

## Testes obrigatórios

Gates ordinários/condicionais, materialidade positiva/negativa, versão obsoleta,
autoridade incorreta, replay, concorrência, ausência de gate no happy path e
coexistência histórica.

## Riscos e evidências esperadas

Riscos: remover controle material ou criar aprovação recorrente. Evidências:
catálogo/version/hash, matriz gate→condição→autoridade, decisões auditadas e E2E.
