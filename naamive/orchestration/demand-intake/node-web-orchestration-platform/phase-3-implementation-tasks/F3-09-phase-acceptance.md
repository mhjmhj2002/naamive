---
task: F3-09
status: DONE
---

# F3-09 — Aceite controlado e certificação da Fase 3

## Referências

- [Roadmap: F3-09 e issues](../01_DELIVERY_ROADMAP.md)
- [Planejamento: testes, sequência e critério de aceite](../09_PHASE_3_PLANNING.md)
- [North star](../00_PRODUCT_NORTH_STAR.md)
- Runtime: suítes `*.e2e.test.ts`, `src/git-delivery.test.ts`, `package.json`, migrations e `docker-compose.yml` em `runtime/node-web`.

## Implementar

1. Consolidar aceite com migrations, artefatos isolados, adaptador controlado e remoto bare temporário por cenário, sem vazamento entre testes.
2. Demonstrar dois itens: Dev auditável, QA aprovado e reprovado, finding, correção, revalidação e fechamento correto; incluir finding de candidata que reabre módulo concluído, retorna o item a rework e produz candidata nova.
3. Demonstrar candidata congelada, validação obrigatória, integração cujo segundo pai é a candidata e exclusão dos commits do item pendente/reprovado.
4. Cobrir sincronização de fase antes do rework e validação incremental de escopo: alteração trazida pela sincronização fora da allowlist não bloqueia o Dev, mas alteração nova do agente nesse path é bloqueada. Cobrir também restart, lease, timeout, interrupção, reconciliação Git, crash entre push/persistência, cursor SSE e causas sanitizadas.
5. Fazer `npm run e2e` falhar sem `DATABASE_URL` ou se cenário obrigatório for pulado. Smoke remoto é separado, descartável e não substitui o aceite local.

## Comandos finais

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate
npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

## Conclusão e evidências

Aceite concluído definitivamente em 2026-08-05. Migrations, build, unitários e
E2E PostgreSQL passaram. O E2E usa artefatos e remoto bare temporários por
cenário, executa serialmente e falha tanto sem `DATABASE_URL` quanto se qualquer
cenário obrigatório for pulado.

As suites cobrem os dois work items (QA aprovado e reprovado, finding, correção,
revalidação e fechamento), candidata congelada e integração auditável, finding de
candidata que reabre módulo concluído e produz candidata nova, sincronização da
fase com validação incremental de escopo, restart/lease/timeout/interrupção,
reconciliação Git, crash entre push e persistência, cursor SSE e sanitização de
causas. O teardown antecipado e a asserção global obrigatória garantiram a
remoção de todo diretório `.phase3-http-*`; o aceite HTTP passou 5/5 e a
implementação foi versionada no commit `a1787a7`.
