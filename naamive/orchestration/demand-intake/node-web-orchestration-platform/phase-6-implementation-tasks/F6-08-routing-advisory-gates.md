---
task: F6-08
status: TODO
depends_on: [F6-01, F6-02, F6-07]
---

# F6-08 — Routing, advisory e gates humanos auditados

## Diretrizes para o agente

Implemente autoridade explícita e auditável, sem inventar agente oficial novo. A decisão sobre `engineering-advisor` deve avaliar capability/task type antes de alterar taxonomia. Atualize os checkboxes, depois o status, valide o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Implementar matriz versionada de routing: ambiguidade para requirements-engineering, arquitetura para solution-architecture, integração para integration-engineering, segurança para security-assurance e operacional para papel aplicável.
- [ ] **TO_DO:** Garantir que orquestrador apenas controle lifecycle/routing/retry/rework/escalonamento e dispatch corretivo delimitado; governance verifica processo/autoridade/gate, QA verifica qualidade e reviewer avalia completude.
- [ ] **TO_DO:** Persistir propostas advisory como recomendação/evidência sem transição de requisito, arquitetura, política, risco aceito ou encerramento crítico.
- [ ] **TO_DO:** Implementar gates humanos auditados para exceção de independência, escopo/arquitetura/política, risco aceito e fechamento escalado, com autoridade de On-call e Tech Lead/dono do repositório conforme planning.

## Aceite

Cobrir roteamento, proposta não executável e cada gate humano, incluindo rejeição de ator não autorizado.

