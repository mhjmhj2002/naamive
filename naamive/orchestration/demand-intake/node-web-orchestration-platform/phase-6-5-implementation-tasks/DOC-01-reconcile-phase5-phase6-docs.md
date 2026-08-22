---
task: DOC-01
status: TO DO
title: Reconciliar documentação F5, F6 e F6.5
depends_on: [TST-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# DOC-01 — Reconciliar documentação F5/F6/F6.5

## Objetivo e problema corrigido

Reconciliar Compass, protocolo, roadmap, F5-22, planejamento F6, guia operacional
e documentos afetados com o contrato comprovado ao final da Fase 6.5, sem
reescrever o histórico. Corrige F6 marcada como concluída mas descrita como
futura, F5-22 `TODO` frente a implementação parcial e vocabulários divergentes.

## Contexto, atual e esperado

Documentos normativos, planejamento histórico e runtime cumprem papéis distintos.
A atualização deve declarar escopo efetivamente certificado, limitações e versões;
tasks históricas preservam seus fatos e recebem, quando apropriado, nota aditiva
de reconciliação, não status fabricado.

## Invariantes

- a auditoria baseline não é modificada;
- história de F5/F6 não é reescrita para aparentar aderência anterior;
- documento normativo descreve o contrato vigente comprovado por TST-01;
- roadmap preserva F7 e só a desbloqueia após aceite integral da Fase 6.5;
- links, diagramas, estados, gates e termos possuem mapeamento único.

## Componentes prováveis

`LIFECYCLE_COMPASS.md`, `ORCHESTRATION_PROTOCOL.md`, lifecycles de projeto/
módulo, `GATE_POLICY.md`, roadmap, F5-22/F5-23, planning F6, guia do usuário,
README/runtime docs e planning/tasks F6.5.

## Dependências e restrições

Depende de TST-01. Não antecipar comportamento não testado, não apagar texto
histórico sem preservar contexto e não mudar task antiga de status apenas para
eliminar inconsistência visual.

## Estratégia de implementação e compatibilidade

Inventariar afirmações por documento; classificar normativa/histórica/operacional;
mapear cada afirmação ao workflow/version/teste; atualizar fontes vigentes;
adicionar notas de alcance/legado; validar links/diagramas e revisão cruzada.

## Critérios de aceite

- F6 é descrita conforme alcance real e expansão F6.5 comprovada;
- F5-22 e F5-23 distinguem intenção, entrega histórica e correção posterior;
- Compass/protocolo não chamam capacidade entregue de futura;
- estados/gates/ações usam vocabulário único e versões explícitas;
- roadmap só libera F7 se todos os critérios da Fase 6.5 estiverem aceitos;
- auditoria permanece byte a byte inalterada.

## Testes obrigatórios

Links relativos, referências de arquivos, lint Markdown se disponível, render de
Mermaid, busca por afirmações futuras/status conflitantes, comparação de hash da
auditoria e revisão manual da matriz documento→contrato→teste.

## Riscos e evidências esperadas

Riscos: falsificar histórico ou documentar aspiração como entrega. Evidências:
inventário de divergências e decisões, diff documental, links validados, hash da
auditoria e referência ao relatório TST-01.
