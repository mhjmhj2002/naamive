---
task: F6-12
status: TODO
depends_on: [F6-10, F6-11]
---

# F6-12 — UI operacional de supervision e blocks

## Diretrizes para o agente

Construa a UI exclusivamente sobre projeções sanitizadas e comandos governados. Ela informa e coleta decisões autorizadas; não toma decisão técnica/humana nem exibe material confidencial. Marque andamento nos itens; ao concluir, atualize status, valide o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Exibir o micro-lifecycle e a distinção explícita entre `OUTPUT_SUBMITTED` e `ACCEPTED`, com estado, reviewer, decisões, findings, evidência permitida e próxima ação.
- [ ] **TO_DO:** Exibir lifecycle de block, diagnóstico, alternativas, impactos/trade-offs/confiança, routing e escalonamento, deixando claro quando há decisão humana pendente.
- [ ] **TO_DO:** Oferecer somente ações autorizadas ao ator (selecionar resolução, pausar, cancelar, escalar, registrar gate ou reconciliar manualmente); reconciliação aparece exclusivamente ao On-call Owner, exige motivo/evidência/confirmação e informa resultado idempotente e sanitizado.
- [ ] **TO_DO:** Atualizar por SSE com recuperação de cursor, estados de carregamento/degradação e acessibilidade; não derivar aceite, autoridade ou transição no client-side.

## Aceite

Cobrir estados pendente/aceito/rework/bloqueado/escalado, permissões — inclusive reconciliação manual de On-call —, reconexão SSE e ausência de conteúdo proibido.
