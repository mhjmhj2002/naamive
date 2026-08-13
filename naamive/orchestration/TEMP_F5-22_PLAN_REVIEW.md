# Pendência temporária — revisão da proposta F5-22

Data: 2026-08-11

## Módulo em revisão

`registro-de-solicitacoes` — proposta de plano, revisão 1.

## Parecer

Não aprovar a proposta atual. Embora passe no contrato estrutural mínimo, ela
tem um único work item genérico, `Implementar registro-de-solicitacoes`, e não
é suficientemente auditável para o escopo aprovado.

Lacunas observadas:

- o item único mistura persistência, regras de status/histórico, API,
  interface e medição de primeira resposta;
- o critério de aceite `funcionalidade entregue` não demonstra os critérios
  de aceite do módulo;
- não há decomposição de dependências;
- a allowlist `src` é ampla demais;
- a única QA, `npm test`, não cobre integração PostgreSQL, fluxos funcionais,
  histórico/status nem primeira resposta;
- dependências de negócio do módulo (canais, dados mínimos e status
  permitidos) foram ignoradas.

## Feedback sugerido para `REQUEST_PLAN_ADJUSTMENT`

> Divida a proposta em work items auditáveis para: modelo e persistência da
> solicitação/histórico; API REST de registro, consulta e atualização de
> status; interface de operação; cálculo e consulta de primeira resposta; e
> testes unitários, integração PostgreSQL e E2E. Para cada item, detalhe
> critérios de aceite rastreáveis aos critérios do módulo, allowlist
> específica, dependências e matriz de QA. Considere explicitamente as
> definições pendentes de canais, dados mínimos e status permitidos.

## Causa a tratar depois

O fallback determinístico de `PLAN_MODULE_WORK_ITEMS` gera uma proposta
estruturalmente válida, mas genérica. O planejador precisa receber o contexto
sanitizado do módulo, arquitetura e baseline e produzir uma decomposição real
via agente, preservando o fallback somente para falha controlada.
