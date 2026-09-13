# VI-001 — Authenticated Project Context

**Module owner:** MOD-001 — Project Context  
**Candidate DeliveryTarget:** DT-001 v1 — REQUIRED_FOR_TARGET  
**Technical correspondence:** VS-01 — Authenticated Project Context  
**Impact:** MATERIAL

## Beneficiário

```text
human NAAMIVE operator / Project participant
```

## Declaração de valor

Um principal humano com autoridade válida pode entrar no NAAMIVE, ver somente
Projects dentro do seu escopo e abrir um contexto explícito com visibilidade
factual de atividade.

## Escopo

Inclui login por username/password, sessão durável server-side, authority/grants
com escopo, bootstrap, fonte canônica de leitura de Project, lista autorizada,
seleção explícita, AppShell, Activity Center inicial e invalidação SSE seguida de
refetch canônico. Exclui mutação de lifecycle de Project, motor de execução,
autonomia de agentes, Delivery, provisionamento HML/PROD e armazenamento externo
de evidência/blob.

## Critérios de valor

A entrega deve provar autenticação válida, sessão server-side e restart-safe,
revogação segura, autoridade aplicada no servidor, Projects não autorizados
ocultos e negados, seleção explícita, projeção reconstruível e jornadas E2E
críticas sobre PostgreSQL real.

Os Work Items, seu estado e a navegação para cada um pertencem a
[STATUS.md](STATUS.md). Este arquivo é a definição do incremento, não seu
status board.
