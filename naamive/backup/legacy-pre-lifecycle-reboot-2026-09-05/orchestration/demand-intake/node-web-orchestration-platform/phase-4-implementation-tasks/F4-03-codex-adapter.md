---
task: F4-03
status: DONE
---

# F4-03 — Adapter CODEX_CLI com paridade controlada

## Referências

- [Plano: Codex e responsabilidades](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: matriz de consumidores](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Encapsular o launcher atual em `CodexCliAdapter`, preservando workdir isolado, ambiente mínimo, arquivo de contexto, timeout, cancelamento e sessão CLI.
2. Receber somente request validado, configuração congelada e segredo resolvido quando autorizado; descartar stdout/stderr, prompt e contexto bruto.
3. Converter somente resultado estruturado e sanitizado no contrato de tentativa; validar a saída no serviço, não no launcher.
4. Manter a equivalência Codex-only enquanto a flag de serviço estiver desligada e não introduzir comportamento específico fora do adapter.

## Aceite e comandos

Cobrir sucesso, timeout, cancelamento, sessão/autenticação inválida, saída inválida, contexto isolado e paridade de input/output/transição/artefato/erro com o launcher atual.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
git -C /home/mhj/git/naamive diff --check
```
