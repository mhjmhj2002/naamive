---
task: F3-07
status: DONE
---

# F3-07 — Candidata, integração e recuperação Git

## Referências

- [Roadmap: F3-07](../01_DELIVERY_ROADMAP.md)
- [Planejamento: estratégia Git, tentativa e workflow](../09_PHASE_3_PLANNING.md)
- Runtime: `src/phase3.ts`, `src/git-delivery.ts`, migration `020_phase_3_integration_recovery.sql`, `src/git-delivery.test.ts`, `src/phase3-http.e2e.test.ts`.

## Implementar

1. Congelar SHA e manifesto exato de work items `MERGED_TO_PHASE`; impedir subconjunto manual e validar candidata antes de integrar.
2. Criar `integration_attempt` antes de efeito Git, com chave, candidata, pais esperados, operação e intenção de artefato.
3. Integrar a partir de worktree detached no SHA da candidata; confirmar segundo pai, SHA anterior, merge/push observados e evidência.
4. Reconciliar `NOT_APPLIED`, `APPLIED_UNRECORDED` e `DIVERGED` antes de retry; nunca repetir merge/push cegamente.
5. Aplicar guards de `blocked_kind` para validação transitória, defeito de código, Git recuperável e divergência.
6. Arquivar durante integração de modo governado, consultando remoto antes de declarar arquivado.

## Aceite e comandos

Usar remoto bare temporário para merge/push, conflito, remoto adiantado, push recusado/protegido, merge já aplicado, crash, retry/reconciliação e arquivamento; verificar SHAs, pais e eventos.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
docker compose up -d postgres
npm run migrate && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
