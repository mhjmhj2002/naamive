---
task: F3-04
status: DONE
issue: I-023
---

# F3-04 — Desenvolvimento isolado, auditável e recuperável

## Referências

- [Roadmap: F3-04 e I-023](../01_DELIVERY_ROADMAP.md)
- [Planejamento: modelo, Git, evidências e validação](../09_PHASE_3_PLANNING.md)
- [North star](../00_PRODUCT_NORTH_STAR.md) e [artefatos](../03_ARTIFACT_STORAGE_AND_AUDIT_CONTRACT.md)
- Runtime: `src/phase3.ts`, `src/git-delivery.ts`, `src/worker.ts`, `src/agent.ts`, `src/phase3-http.e2e.test.ts`, `src/git-delivery.test.ts`.

## Implementar

### Sequência de execução aprovada (2026-08-04)

1. Reservar `START_DEVELOPMENT` como operação/job com lease e retry; o endpoint não executa Git nem agente.
2. Executar o agente somente no worktree reservado e persistir apenas fatos sanitizados.
3. Validar alteração útil, autoria, assunto, trailers, SHAs, commits e paths; então materializar `development-delivery` imutável antes da QA.
4. Converter violações de política em bloqueio/escalonamento auditável.
5. Antes de rework, sincronizar `phases/3` e registrar SHA anterior, ponta, nova base e diff.
6. Reconciliar crash/restart e remover worktree somente se limpo, encerrado e sem ref ativa.
7. Executar o aceite PostgreSQL/HTTP/E2E integral; só então atualizar I-023 para `RESOLVED` e F3-04 para `DONE`.

1. `START_DEVELOPMENT` reserva intenção/operação/job/lease idempotentes; Git/agente ficam fora da transação e restart/crash não duplicam delivery, worktree ou side effect.
2. Executar Dev no worktree exclusivo do item, sem fatos Git ou resultado do agente vindos do HTTP; nunca persistir prompt, saída bruta, tokens, segredos ou ambiente.
3. Exigir mudança útil e commits de `naamive-bot` com formato `<tipo>(<work-item>): <resumo>` e trailers `Naamive-Project`, `Naamive-Phase`, `Naamive-Execution`, `Naamive-Work-Item`; validar autoria, histórico, SHAs e todos os commits.
4. Persistir delivery com execução, branch/worktree, SHAs, commits, paths e validações; criar `development-delivery` JSON/Markdown com hash antes de QA.
5. Aplicar política incremental a rename/delete proibido, symlink escapando, submodule e hook; bloquear/escalonar com evento/evidência sanitizados.
6. Antes de rework, sincronizar `phases/3`, registrar SHA anterior/ponta/nova base e calcular diff a partir dela.
7. Reconciliar propriedade, existência, limpeza e SHA; remover worktree apenas limpo, de execução encerrada e ref inativa — nunca `--force` como recuperação.

## Aceite e comandos

Cobrir commit válido, ausência de mudança, autoria/trailer inválido, paths, sincronização, idempotência, lease, restart, `DIRTY`/`MISSING`/`DIVERGED` e crash entre intenção/Git/persistência, sem edição manual fora do runtime.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
docker compose up -d postgres
npm run migrate && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

Resolver `I-023` e marcar F3-04 `DONE` somente após esse aceite.
