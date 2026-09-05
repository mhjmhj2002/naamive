---
document_type: phase-renumbering-impact-analysis
status: DRAFT_FOR_HUMAN_VALIDATION
created_at: 2026-08-06
scope: documentation, roadmap, contracts, backlog, and planning only; no runtime implementation authorization
---

# Análise de Impacto — Reorganização para Oito Fases

## Decisão proposta

O roadmap vivo passa a ter oito fases:

| Release | Fase | Resultado |
| --- | --- | --- |
| 1 | Fase 1 | Projeto iniciado e registrado. |
| 2 | Fase 2 | Descoberta e compromisso de produto. |
| 3 | Fase 3 | Ciclo de módulo, desenvolvimento, QA e rework. |
| 4 | Fase 4 | Runtime multi-provider de agentes e observabilidade de IA. |
| 5 | Fase 5 | Baseline tecnológica aprovada antes da primeira materialização de módulo. |
| 6 | Fase 6 | Agent Supervision & Assurance: aceite técnico independente e assistência a bloqueios. |
| 7 — MVP completo | Fase 7 | Projeto entregue, aceito e PR draft auditável. |
| 8 | Fase 8 | Operação sustentável e expansão segura. |

O MVP completo termina na Fase 7. A Fase 4 entrega uma capacidade de plataforma,
a Fase 5 fixa a baseline tecnológica e a Fase 6 torna o aceite de trabalho
delegado independente da declaração do produtor.

## Divergência encontrada e tratamento

Após a reorganização anterior que introduziu o runtime multi-provider na Fase 4
e a baseline na Fase 5, testes práticos revelaram a necessidade de uma nova Fase
6 de supervisão e assurance. Assim, a entrega final anterior (Fase 6) foi
renumerada para Fase 7 e a operação anterior (Fase 7) para Fase 8, sem alteração
de escopo.

A proposta preserva o escopo não implementado da baseline como a própria Fase 5,
antes da materialização de novos módulos. A Fase 6 é documental até receber
autorização de implementação; entrega e operação são Fases 7 e 8. Não há
migração de dados nem reescrita de eventos nesta reorganização.

Esta decisão precisa de aprovação humana antes de alterar o status aprovado do
roadmap, renomear IDs publicados ou iniciar implementação.

## Inventário de referências afetadas

| Local | Natureza | Ação proposta |
| --- | --- | --- |
| `00_PRODUCT_NORTH_STAR.md` | Documento vivo. | Atualizar releases e limite do MVP para Fases 1–7; operação é Fase 8. |
| `01_DELIVERY_ROADMAP.md` | Documento vivo. | Inserir assurance na Fase 6; deslocar entrega para Fase 7 e operação para Fase 8. |
| `15_PHASE_6_AGENT_SUPERVISION_AND_ASSURANCE.md` | Novo planejamento. | Registrar micro-lifecycle, findings, rework, blocks, routing e limites sem runtime. |
| `09_PHASE_3_PLANNING.md` | Planejamento vivo. | Corrigir PR/release para Fase 7. |
| `10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md` | Planejamento não implementado. | Consolidar como plano normativo da Fase 5. |
| `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` | Referência de produção. | Corrigir a referência para a Fase 8. |
| `08_FUTURE_IMPROVEMENTS_BACKLOG.md` | M-001 cita Codex e M-003 sugere separar histórico por adaptador/modelo. | Promover/referenciar no backlog F4, sem apagar a origem. |
| `07_PHASE_2_AGENT_EXECUTION_GUIDE.md`, contratos, runtime Node, migrations e testes | Referências de execução Codex e contratos atuais. | Não renumerar dados históricos; migrar somente na F4 por contratos aditivos e testes de paridade. |
| `orchestration/history/**` | Histórico certificado. | Imutável; acrescentar nota de mapeamento apenas se um documento histórico voltar a ser publicado. |
| `runtime/python/**` e migrations de Fase 3 | Histórico/código já entregue. | Sem alteração nesta task. |

As buscas textuais também encontraram referências indiretas a “próxima fase”,
“MVP completo”, “evolução operacional” e “última fase”. Elas devem ser
revalidadas no pull request de documentação; nenhuma pode inferir que Fase 4 é
o fechamento do MVP.

## Regras de histórico e identificadores

1. Eventos, migrations aplicadas, testes certificados, branches e evidências
   nunca são reetiquetados retroativamente.
2. Documento histórico preserva a numeração vigente e inclui nota com data,
   decisão e correspondência se sua leitura puder gerar ambiguidade.
3. Documento vivo usa a nova sequência aprovada; documentos históricos preservam seu contexto.
4. IDs novos da plataforma multi-provider são `F4-01` a `F4-12`.
5. A baseline usa `F5-01` a `F5-06`; assurance usa `F6-01` a `F6-06`; a entrega
   usa `F7-01` a `F7-08`; a operação usa `F8-01` a `F8-05`. Nenhum ID é reutilizado
   com outro significado.

## Impacto técnico futuro

Fases 5, 6, 7 e 8 só podem chamar `AgentExecutionService`; não podem importar
launcher, SDK, endpoint, credencial, provider ou modelo. Provider/modelo são
metadados de tentativa de execução, não estados do domínio. A máquina de
estados continua autorizando trabalho, gates e efeitos; o router decide somente
como executar trabalho já autorizado.

## Riscos e pendências de aprovação

| Risco | Mitigação |
| --- | --- |
| Inconsistência entre documentos vivos e a nova sequência. | Manter baseline na Fase 5, assurance na Fase 6, entrega/operação nas Fases 7/8 no mesmo conjunto documental. |
| Mudança de comportamento ao encapsular Codex. | Modo inicial Codex-only, adapter de paridade e testes de regressão. |
| Fallback duplicar efeitos Git. | Intenção persistida, idempotência, worktree/SHA, reconciliação e resultado estruturado. |
| Vazamento de contexto/credenciais. | Classificação, allowlist, sanitização antes do adapter e referências de segredo. |
| Custo ou cardinalidade sem controle. | Limites por política, preço versionado, métricas sem IDs únicos como labels. |
