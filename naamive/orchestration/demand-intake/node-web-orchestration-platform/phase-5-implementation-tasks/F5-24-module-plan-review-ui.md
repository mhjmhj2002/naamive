---
task: F5-24
status: TODO
---

# F5-24 — Revisão visual e auditável da proposta de planejamento do módulo

## Objetivo

Permitir que o operador compare e decida uma revisão de plano sem inspecionar
JSON bruto, deixando cobertura, riscos, dependências, QA, escopo permitido e
consequência da aprovação explícitos.

## Implementar

1. Projetar módulo, revisão atual, gate, WIs, critérios do módulo, baseline,
   evidências e estado de jobs de forma sanitizada.
2. Exibir resumo com módulo/objetivo/revisão, estado, baseline, hashes de
   evidência, total de WIs, dependências bloqueadas, itens elegíveis e
   cobertura de critérios.
3. Criar tabela comparativa segura com: `WI`, `Entrega`, `Dependências`,
   `Cobertura de critérios`, `QA`, `Risco` e `Situação`.
4. Ao selecionar um WI, abrir detalhe expansível/lateral com entradas, saída,
   critérios, allowlist, denylist, dependências, QA e evidências, sem perder a
   seleção ou navegar para outra página.
5. Exibir alertas não bloqueantes para WI excessivamente amplo, critério sem
   cobertura, allowlist ampla, QA de integração/E2E ausente e dependência de
   negócio ausente.
6. Mostrar histórico de revisão, feedback anterior, autor, data e relação de
   supersessão. Revisões anteriores são somente leitura.
7. **Aprovar plano** deve confirmar número de WIs materializados e
   agendamento automático; **Solicitar ajustes** exige feedback e oferece
   sugestões rápidas. Ambas as ações preservam estado em caso de falha.
8. Manter um único renderizador do painel; SSE apenas solicita refresh e não
   pode causar loop de renderização. Preservar seleção e texto de feedback
   durante refresh da mesma revisão.

## Critérios de aceite e testes

- tabela compara múltiplos WIs e torna visível quando há apenas um WI amplo;
- detalhe apresenta todos os campos contratuais sem abrir JSON;
- riscos e cobertura aparecem antes da aprovação;
- revisões/gates obsoletos não oferecem ação ativa;
- testes unitários cobrem cobertura/riscos, HTTP cobre projeção sanitizada e
  UI/E2E cobrem tabela, detalhe, duas revisões e SSE sem loop.

