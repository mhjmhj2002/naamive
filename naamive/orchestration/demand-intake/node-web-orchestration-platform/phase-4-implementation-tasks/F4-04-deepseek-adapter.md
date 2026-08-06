---
task: F4-04
status: DONE
---

# F4-04 — Adapter OPENAI_COMPATIBLE_HTTP para DeepSeek

## Referências

- [Plano: configuração e DeepSeek](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: configuração aprovada](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Implementar `OpenAiCompatibleHttpAdapter` somente para o endpoint HTTPS allowlisted e o modelo DeepSeek aprovados, com certificado validado e sem redirects.
2. Resolver `BEARER_TOKEN` exclusivamente via `SecretResolver`; nunca incluir segredo, headers, request/response completos ou URL assinada em persistência/log/evidência.
3. Mapear respostas estruturadas para o contrato, incluindo uso/custo quando disponível e `retry-after`; validar conteúdo somente por referência estruturada.
4. Classificar erros oficiais de HTTP/API sem inferência frágil por texto; nenhuma chamada real integra a suíte determinística.

## Aceite e comandos

Cobrir fake HTTP para sucesso, 429/retry-after, autenticação, endpoint/modelo inválidos, timeout, resposta inválida, erro sanitizado e sentinelas de segredo; smoke real é opcional, confirmado e descartável.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
git -C /home/mhj/git/naamive diff --check
```
