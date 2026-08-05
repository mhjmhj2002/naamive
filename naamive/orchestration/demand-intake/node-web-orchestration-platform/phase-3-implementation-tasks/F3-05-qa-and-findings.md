---
task: F3-05
status: DONE
---

# F3-05 — QA congelado, findings e revalidação

## Referências

- [Roadmap: F3-05](../01_DELIVERY_ROADMAP.md) e [planejamento: QA/rework](../09_PHASE_3_PLANNING.md)
- [Artefatos](../03_ARTIFACT_STORAGE_AND_AUDIT_CONTRACT.md)
- Runtime: `src/phase3.ts`, `src/git-delivery.ts`, `src/phase3.e2e.test.ts`, `src/phase3-http.e2e.test.ts`, migrations `016_phase_3_module_delivery.sql`+.

## Implementar

1. Executar somente matriz congelada no worktree/SHA revisado, persistindo comando, diretório, timeout, critério e resultado sanitizado.
2. Criar findings `DELIVERY_QA` ligados à delivery/SHA, deduplicados por regra/fingerprint, com severidade e bloqueio corretos.
3. Fechar finding somente por QA aprovado de delivery posterior, registrando revalidação; risco aceito não equivale a fechamento.
4. Validar candidata em worktree detached no SHA congelado, com manifesto, matriz e findings `CANDIDATE_VALIDATION` responsáveis e não ambíguos.
5. Persistir `qa-report` e `integration-candidate-validation` JSON/Markdown/hash/correlação; nunca aceitar resultado ou SHA do HTTP.

## Aceite e comandos

Cobrir sucesso, falha, timeout sanitizado, severidade, deduplicação, revalidação e candidata falhando/passando no SHA congelado. QA não avança sem F3-04 válida.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
docker compose up -d postgres
npm run migrate && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
